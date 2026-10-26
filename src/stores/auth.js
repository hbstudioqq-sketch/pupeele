import { defineStore } from 'pinia'
import message from 'ant-design-vue/es/message'
import { i18n } from '@/i18n'
import { supabase } from '@/supabase'

/* ============================================================
   账户 / 订阅（认证走 Supabase Auth，订阅为本地 demo 数据）
   ------------------------------------------------------------
   - 注册：邮箱 + 密码，客户端校验邮箱格式与密码强度，服务端二次校验
   - 项目若开启「确认邮件」，注册成功后返回 needsConfirm，需查收邮件再登录
   - 登录：signInWithPassword；Gmail 一键登录走 Google OAuth 跳转
   - 订阅：月付 $9.9 / 年付 $99，demo 中即时生效（localStorage）
   - 询价门禁：isActive（订阅有效）才能发起询价
   ============================================================ */

const KEY_SUB = 'pupee.sub' // { tier, since, expires }

const MONTH_MS = 30 * 24 * 60 * 60 * 1000
const YEAR_MS = 365 * 24 * 60 * 60 * 1000

function load (k, fallback) {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback } catch { return fallback }
}
function save (k, v) { localStorage.setItem(k, JSON.stringify(v)) }

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/* 密码强度评分：5 条规则各 1 分 */
export function pwdChecks (pw = '') {
  return [
    { key: 'len', ok: pw.length >= 8 },
    { key: 'upper', ok: /[A-Z]/.test(pw) },
    { key: 'lower', ok: /[a-z]/.test(pw) },
    { key: 'num', ok: /\d/.test(pw) },
    { key: 'sym', ok: /[^A-Za-z0-9]/.test(pw) }
  ]
}
export function pwdScore (pw = '') {
  return pwdChecks(pw).filter(c => c.ok).length
}

function fmtDate (ms) {
  const d = new Date(ms)
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/* Supabase 错误文案 → i18n key（auth.*） */
function mapErr (e, fallback = 'netError') {
  const m = String(e?.message || '')
  if (/already registered|already been registered|user already/i.test(m)) return 'emailTaken'
  if (/password should be|at least 6/i.test(m)) return 'weakPwd'
  if (/invalid email|validate email|unable to parse email/i.test(m)) return 'invalidEmail'
  if (/rate limit/i.test(m)) return 'rateLimited'
  if (/invalid login credentials/i.test(m)) return 'badCreds'
  if (/email not confirmed|confirm.*email/i.test(m)) return 'notConfirmed'
  return fallback
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,                     // Supabase user（未登录为 null）
    email: null,                    // 当前登录邮箱（未登录为 null）
    sub: load(KEY_SUB, null)        // { tier: 'none'|'monthly'|'yearly', since, expires }
  }),
  getters: {
    isLoggedIn: s => !!s.email,
    isActive: s => !!s.sub && s.sub.tier !== 'none' && Date.now() < s.sub.expires,
    canEnquire: s => !!s.sub && s.sub.tier !== 'none' && Date.now() < s.sub.expires,
    planLabel: s => s.sub ? s.sub.tier : 'none',
    expiryDate: s => (s.sub && s.sub.expires ? fmtDate(s.sub.expires) : ''),
    sinceDate: s => (s.sub && s.sub.since ? fmtDate(s.sub.since) : '')
  },
  actions: {
    /* 启动时同步既有会话，并订阅后续登录/登出事件（含 OAuth 回跳） */
    init () {
      supabase.auth.getSession().then(({ data }) => this._set(data.session))
      supabase.auth.onAuthStateChange((_evt, session) => this._set(session))
      this._consumeOAuthError()
    },
    /* OAuth 回跳可能带 #error=…（如未启用 Google provider），提示后清理 URL */
    _consumeOAuthError () {
      const p = new URLSearchParams(window.location.hash.slice(1))
      const code = p.get('error_code') || p.get('error')
      if (!code) return
      const key = code === 'provider_disabled'
        ? 'googleFailed'
        : code === 'access_denied'
          ? 'oauthDenied'
          : 'netError'
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
      message.error(i18n.global.t('auth.' + key))
    },
    _set (session) {
      this.user = session?.user ?? null
      this.email = this.user?.email ?? null
    },
    /* 邮箱注册。返回 { needsConfirm }：true 表示需要查收确认邮件后再登录 */
    async register (email, pw) {
      email = (email || '').trim().toLowerCase()
      if (!EMAIL_RE.test(email)) throw new Error('invalidEmail')
      if (pwdScore(pw) < 4) throw new Error('weakPwd')
      const { data, error } = await supabase.auth.signUp({ email, password: pw })
      if (error) throw new Error(mapErr(error))
      // 已注册未确认的邮箱会返回 identities 为空的 user
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        throw new Error('emailTaken')
      }
      this._set(data.session)
      return { needsConfirm: !data.session }
    },
    async login (email, pw) {
      email = (email || '').trim().toLowerCase()
      if (!EMAIL_RE.test(email)) throw new Error('invalidEmail')
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: pw })
      if (error) throw new Error(mapErr(error, 'badCreds'))
      this._set(data.session)
    },
    /* Gmail 一键登录：跳转 Google 授权，回跳后由 init() 的监听接住会话 */
    async loginWithGoogle () {
      // 先确认项目已启用 Google provider，避免跳到 supabase.co 的 400 死页
      if (!(await this._googleEnabled())) throw new Error('googleFailed')
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
      })
      if (error) throw new Error('googleFailed')
    },
    /* GET /auth/v1/settings 返回 external.google；检查失败时放行跳转 */
    async _googleEnabled () {
      try {
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/settings`, {
          headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY }
        })
        if (!res.ok) return true
        return !!(await res.json())?.external?.google
      } catch { return true }
    },
    async logout () {
      await supabase.auth.signOut()
      this._set(null)
    },
    _persistSub () { save(KEY_SUB, this.sub) },
    subscribe (tier) {
      const dur = tier === 'yearly' ? YEAR_MS : MONTH_MS
      const now = Date.now()
      this.sub = { tier, since: now, expires: now + dur }
      this._persistSub()
    },
    cancel () {
      this.sub = { tier: 'none', since: null, expires: null }
      this._persistSub()
    }
  }
})

export { fmtDate }
