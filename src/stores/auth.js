import { defineStore } from 'pinia'
import message from 'ant-design-vue/es/message'
import { i18n } from '@/i18n'
import { supabase } from '@/supabase'
import {
  fetchProfile,
  saveProfile,
  fetchSubscription,
  saveSubscription
} from '@/api/account'

/* ============================================================
   账户 / 订阅
   ------------------------------------------------------------
   - 注册：邮箱 + 密码，客户端校验邮箱格式与密码强度，服务端二次校验
   - 登录：signInWithPassword；Gmail 一键登录走 Google OAuth 跳转
   - 资料 / 订阅 / 通知偏好：登录后从 Supabase 同步，见 supabase/account.sql
   - 订阅为演示方案：即时生效，同时写入 subscriptions 表
   - 询价门禁：订阅有效（isActive）才能发起询价
   ============================================================ */

const KEY_SUB = 'pupee.sub' // 未登录时的本地订阅缓存

const MONTH_MS = 30 * 24 * 60 * 60 * 1000
const YEAR_MS = 365 * 24 * 60 * 60 * 1000

function load (k, fallback) {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback } catch { return fallback }
}
function save (k, v) { localStorage.setItem(k, JSON.stringify(v)) }

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const COUNTRIES = [] // 预留：如需国家下拉可在页面里替换

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

const DEFAULT_PREFS = { new: true, price: true, lookbook: false }

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

function dateOf (v) {
  if (!v) return null
  const n = typeof v === 'number' ? v : Date.parse(v)
  return Number.isFinite(n) ? n : null
}

/* 毫秒时间戳 → YYYY-MM-DD */
function fmtDate (ms) {
  if (!ms) return ''
  const d = new Date(ms)
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,                     // Supabase user（未登录为 null）
    email: null,                    // 当前登录邮箱（未登录为 null）
    sub: load(KEY_SUB, null),       // { tier: 'none'|'monthly'|'yearly', since, expires }
    profile: null,                  // profiles 行
    prefs: { ...DEFAULT_PREFS },    // 通知偏好
    accountReady: false,            // 资料 + 订阅是否已从云端拉取
    accountError: false,            // 云端不可用（表未建 / 网络异常）
    redirectToAccount: false        // 登录成功后由 App 跳到 /account
  }),
  getters: {
    isLoggedIn: s => !!s.email,
    isActive: s => !!s.sub && s.sub.tier !== 'none' && Date.now() < s.sub.expires,
    canEnquire: s => !!s.sub && s.sub.tier !== 'none' && Date.now() < s.sub.expires,
    /* 邮箱注册的账号才有密码；Google 登录的账号默认没有 */
    hasPassword: s => (s.user?.app_metadata?.providers || []).includes('email'),
    planLabel: s => s.sub ? s.sub.tier : 'none',
    displayName: s => s.profile?.full_name || (s.email ? s.email.split('@')[0] : ''),
    initial: s => {
      const n = (s.profile?.full_name || s.email || '?').trim()
      return [...n][0]?.toUpperCase() || '?'
    },
    memberSince: s => (s.profile?.created_at || s.user?.created_at || ''),
    expiryDate: s => (s.sub && s.sub.expires ? fmtDate(dateOf(s.sub.expires)) : ''),
    sinceDate: s => (s.sub && s.sub.since ? fmtDate(dateOf(s.sub.since)) : '')
  },
  actions: {
    /* 启动时同步既有会话，并订阅后续登录/登出事件（含 OAuth 回跳） */
    init () {
      /* 只有 OAuth 回跳（URL 里带 token / code）才需要在会话恢复后跳「我的页面」；
         普通刷新不应把用户从当前页面拽走。 */
      this._oauthReturn = /access_token=|[?&#]code=/.test(window.location.hash + window.location.search)
      supabase.auth.getSession().then(({ data }) => this._set(data.session))
      supabase.auth.onAuthStateChange((evt, session) => this._set(session, evt))
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
    _set (session, evt) {
      const prevId = this.user?.id || null
      this.user = session?.user ?? null
      this.email = this.user?.email ?? null

      if (!this.user) {
        this.profile = null
        this.accountReady = false
        this.accountError = false
        return
      }
      if (evt === 'SIGNED_IN' && this._oauthReturn) {
        this._oauthReturn = false
        this.redirectToAccount = true
      }
      if (prevId !== this.user.id || !this.accountReady) this.loadAccount()
    },
    /* 拉取资料 + 订阅；首次登录时自动补建默认行 */
    async loadAccount () {
      if (!this.user) return
      const id = this.user.id
      try {
        let [profile, subRow] = await Promise.all([
          fetchProfile(id),
          fetchSubscription(id)
        ])
        if (id !== this.user?.id) return // 拉取过程中切了账号

        if (!profile) {
          profile = await saveProfile(id, { email: this.email })
        }
        this.profile = profile

        if (!subRow) {
          subRow = await saveSubscription(id, {
            plan: 'none',
            ...prefsToCols(DEFAULT_PREFS)
          })
        }
        this.prefs = {
          new: subRow.notify_new !== false,
          price: subRow.notify_price !== false,
          lookbook: !!subRow.notify_lookbook
        }
        this.sub = {
          tier: subRow.plan || 'none',
          since: dateOf(subRow.started_at),
          expires: dateOf(subRow.expires_at)
        }
        this._persistSub()
        this.accountError = false
      } catch (e) {
        console.warn('[account] sync failed（是否已执行 supabase/account.sql？）', e)
        this.accountError = true
      } finally {
        this.accountReady = true
      }
    },
    /* 保存个人资料 */
    async saveProfile (patch) {
      if (!this.user) throw new Error('notLoggedIn')
      const row = await saveProfile(this.user.id, {
        email: this.email,
        full_name: patch.full_name?.trim() || null,
        company: patch.company?.trim() || null,
        phone: patch.phone?.trim() || null,
        country: patch.country?.trim() || null,
        lang: patch.lang || null
      })
      this.profile = row
      return row
    },
    /* 保存通知偏好 */
    async savePrefs (patch) {
      this.prefs = { ...this.prefs, ...patch }
      this.accountError = false
      if (!this.user) return
      try {
        await saveSubscription(this.user.id, prefsToCols(this.prefs))
      } catch (e) {
        console.warn('[account] prefs save failed', e)
        this.accountError = true
      }
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
      /* 注册即登录（未开启邮箱确认）时，直接进入「我的页面」 */
      if (data.session) this.redirectToAccount = true
      return { needsConfirm: !data.session }
    },
    async login (email, pw) {
      email = (email || '').trim().toLowerCase()
      if (!EMAIL_RE.test(email)) throw new Error('invalidEmail')
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: pw })
      if (error) throw new Error(mapErr(error, 'badCreds'))
      this._set(data.session)
      this.redirectToAccount = true
    },
    /* 修改密码：邮箱账号先用当前密码重新验一次身份；Google 账号直接设置新密码 */
    async changePassword (currentPw, newPw) {
      if (!this.user) throw new Error('notLoggedIn')
      if (pwdScore(newPw) < 4) throw new Error('weakPwd')
      if (this.hasPassword) {
        const { error } = await supabase.auth.signInWithPassword({
          email: this.email,
          password: currentPw
        })
        if (error) {
          throw new Error(/invalid login credentials/i.test(error.message) ? 'pwdWrong' : mapErr(error))
        }
      }
      const { error } = await supabase.auth.updateUser({ password: newPw })
      if (error) throw new Error(mapErr(error))
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
      /* 本地会话优先清掉：即使网络异常，也应立刻退出当前账号 */
      try { await supabase.auth.signOut() } catch (e) { console.warn('[auth] signOut failed', e) }
      this._set(null)
    },
    _persistSub () { save(KEY_SUB, this.sub) },
    async subscribe (tier) {
      const dur = tier === 'yearly' ? YEAR_MS : MONTH_MS
      const now = Date.now()
      this.sub = { tier, since: now, expires: now + dur }
      this._persistSub()
      if (!this.user) return
      try {
        await saveSubscription(this.user.id, {
          plan: tier,
          started_at: new Date(now).toISOString(),
          expires_at: new Date(now + dur).toISOString()
        })
      } catch (e) {
        console.warn('[account] subscription save failed', e)
        this.accountError = true
      }
    },
    async cancel () {
      this.sub = { tier: 'none', since: null, expires: null }
      this._persistSub()
      if (!this.user) return
      try {
        await saveSubscription(this.user.id, {
          plan: 'none',
          started_at: null,
          expires_at: null
        })
      } catch (e) {
        console.warn('[account] subscription cancel failed', e)
        this.accountError = true
      }
    }
  }
})

function prefsToCols (p) {
  return {
    notify_new: !!p.new,
    notify_price: !!p.price,
    notify_lookbook: !!p.lookbook
  }
}

export { DEFAULT_PREFS, fmtDate }
