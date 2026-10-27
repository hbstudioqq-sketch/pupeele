<script setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import message from 'ant-design-vue/es/message'
import { useAuthStore, pwdChecks, pwdScore, EMAIL_RE } from '@/stores/auth'

const props = defineProps({
  open: { type: Boolean, default: false }
})
const emit = defineEmits(['update:open'])

const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()

const mode = ref('signup')        // signup | login
const email = ref('')
const pw = ref('')
const pw2 = ref('')
const err = ref('')
const busy = ref(false)     // 邮箱注册/登录中
const busyG = ref(false)    // Gmail 跳转中

watch(() => props.open, (v) => {
  if (v) {
    err.value = ''
    if (!auth.isLoggedIn) mode.value = 'signup'
  }
})

/* 密码强度 */
const checks = computed(() => pwdChecks(pw.value))
const score = computed(() => pwdScore(pw.value))
const strength = computed(() => {
  if (pw.value.length === 0) return { idx: 0, label: '', pct: 0 }
  if (score.value <= 2) return { idx: 1, label: t('auth.weak'), pct: 33 }
  if (score.value === 3) return { idx: 2, label: t('auth.fair'), pct: 60 }
  if (score.value === 4) return { idx: 3, label: t('auth.good'), pct: 82 }
  return { idx: 4, label: t('auth.strong'), pct: 100 }
})
const strengthClass = ['', 's-weak', 's-fair', 's-good', 's-strong'][strength.value.idx]

function close () { emit('update:open', false) }

function doRegister () {
  err.value = ''
  if (!EMAIL_RE.test(email.value.trim())) { err.value = 'invalidEmail'; return }
  if (pwdScore(pw.value) < 4) { err.value = 'weakPwd'; return }
  if (pw.value !== pw2.value) { err.value = 'mismatch'; return }
  busy.value = true
  auth.register(email.value, pw.value)
    .then((r) => {
      if (r.needsConfirm) {
        // Supabase 开启了「确认邮件」：注册成功但需查收邮件后才能登录
        message.info(t('auth.checkEmail'))
        mode.value = 'login'
        pw.value = ''; pw2.value = ''
      } else {
        message.success(t('auth.okSignup'))
        afterAuth()
      }
    })
    .catch(e => { err.value = e.message })
    .finally(() => { busy.value = false })
}
function doLogin () {
  err.value = ''
  if (!EMAIL_RE.test(email.value.trim())) { err.value = 'invalidEmail'; return }
  busy.value = true
  auth.login(email.value, pw.value)
    .then(() => { message.success(t('auth.okLogin')); afterAuth() })
    .catch(e => { err.value = e.message })
    .finally(() => { busy.value = false })
}
function doGoogle () {
  err.value = ''
  busyG.value = true
  auth.loginWithGoogle()
    .catch(e => { err.value = e.message; busyG.value = false })
}
function afterAuth () {
  // 登录 / 注册成功：关闭弹窗，进入「我的页面」（订阅与资料均在那里管理）
  email.value = ''; pw.value = ''; pw2.value = ''
  close()
  router.push('/account')
}
function goAccount () {
  close()
  router.push('/account')
}
</script>

<template>
  <a-modal
    :open="props.open"
    :title="t('nav.account')"
    :width="480"
    :footer="null"
    centered
    @cancel="close"
  >
    <!-- 已登录：顶部欢迎 + 退出 -->
    <div v-if="auth.isLoggedIn" class="welcome">
      <div>
        <div class="w-name">{{ t('auth.welcome') }}</div>
        <div class="w-mail">{{ auth.email }}</div>
      </div>
      <div class="w-acts">
        <a-button size="small" type="primary" @click="goAccount">{{ t('acct.title') }}</a-button>
        <a-button size="small" @click="auth.logout()">{{ t('auth.logout') }}</a-button>
      </div>
    </div>

    <!-- 账户面板：只负责注册 / 登录，订阅与资料在「我的页面」里管理 -->
    <div>
      <div class="seg">
        <button :class="{ on: mode === 'signup' }" @click="mode = 'signup'">{{ t('auth.tab.signup') }}</button>
        <button :class="{ on: mode === 'login' }" @click="mode = 'login'">{{ t('auth.tab.login') }}</button>
      </div>

      <div class="field">
        <label>{{ t('auth.email') }}</label>
        <a-input v-model:value="email" :placeholder="t('auth.emailPlaceholder')" size="large" />
      </div>
      <div class="field">
        <label>{{ t('auth.password') }}</label>
        <a-input-password v-model:value="pw" :placeholder="t('auth.pwdPlaceholder')" size="large" />
      </div>

      <!-- 注册时的强度校验 -->
      <div v-if="mode === 'signup'" class="pwd">
        <div class="meter"><span :class="strengthClass" :style="{ width: strength.pct + '%' }" /></div>
        <div class="mrow">
          <span class="mlabel">{{ t('auth.strength') }}:</span>
          <span :class="strengthClass">{{ strength.label }}</span>
        </div>
        <ul class="rules">
          <li v-for="c in checks" :key="c.key" :class="{ ok: c.ok }">
            <span class="dot" />{{ t('auth.rule.' + c.key) }}
          </li>
        </ul>
      </div>

      <div v-if="mode === 'signup'" class="field">
        <label>{{ t('auth.confirm') }}</label>
        <a-input-password v-model:value="pw2" :placeholder="t('auth.confirm')" size="large" />
      </div>

      <p v-if="err" class="err">{{ t('auth.' + err) }}</p>

      <a-button
        v-if="mode === 'signup'"
        type="primary" size="large" block class="submit"
        :loading="busy" :disabled="busyG"
        @click="doRegister"
      >{{ t('auth.signup') }}</a-button>
      <a-button
        v-else
        type="primary" size="large" block class="submit"
        :loading="busy" :disabled="busyG"
        @click="doLogin"
      >{{ t('auth.login') }}</a-button>

      <!-- Gmail 一键登录 -->
      <div class="oauth">
        <a-divider plain>{{ t('auth.or') }}</a-divider>
        <a-button size="large" block class="google" :loading="busyG" :disabled="busy" @click="doGoogle">
          <template #icon>
            <svg class="glogo" viewBox="0 0 48 48" width="18" height="18" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
          </template>
          {{ t('auth.google') }}
        </a-button>
      </div>

      <p class="switch">
        <template v-if="mode === 'signup'">{{ t('auth.already') }}
          <a @click="mode = 'login'">{{ t('auth.tab.login') }}</a>
        </template>
        <template v-else>{{ t('auth.noAccount') }}
          <a @click="mode = 'signup'">{{ t('auth.tab.signup') }}</a>
        </template>
      </p>
    </div>
  </a-modal>
</template>

<style scoped>
.welcome {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 14px; border: 1px solid var(--line-soft); border-radius: 12px;
  margin-bottom: 14px; background: var(--bg-soft);
}
.w-name { font-weight: 600; }
.w-mail { font-size: 12.5px; color: var(--ink-4); word-break: break-all; }
.w-acts { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
.seg { display: flex; gap: 8px; margin-bottom: 16px; }
.seg button {
  flex: 1; padding: 8px; border-radius: 9px; border: 1px solid var(--line-soft);
  background: none; color: var(--ink-3); cursor: pointer;
}
.seg button.on { background: var(--bg-soft); color: var(--ink-1); font-weight: 600; }
.field { margin-bottom: 14px; }
.field label { display: block; font-size: 13px; color: var(--ink-3); margin-bottom: 6px; }
.pwd { margin: -4px 0 14px; }
.meter { height: 6px; border-radius: 999px; background: var(--bg-soft); overflow: hidden; }
.meter > span { display: block; height: 100%; transition: width .25s, background .25s; }
.mrow { display: flex; gap: 6px; font-size: 12.5px; margin: 6px 0; color: var(--ink-3); }
.mlabel { color: var(--ink-4); }
.rules { list-style: none; padding: 0; margin: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 4px 12px; }
.rules li { font-size: 12px; color: var(--ink-4); display: flex; align-items: center; gap: 6px; }
.rules li.ok { color: #2faa6a; }
.dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; opacity: .5; }
.rules li.ok .dot { opacity: 1; }
.err { color: #e5484d; font-size: 13px; margin: 0 0 12px; }
.submit { margin-top: 4px; }
.oauth { margin-top: 4px; }
.oauth :deep(.ant-divider) { color: var(--ink-4); font-size: 12.5px; margin: 16px 0 12px; }
.google { background: #fff; border: 1px solid var(--line-soft); color: var(--ink-1); font-weight: 600; }
.google:hover { border-color: var(--ink-3); background: #fff; color: var(--ink-1); }
.glogo { flex: none; }
.switch { text-align: center; font-size: 13px; color: var(--ink-4); margin: 14px 0 0; }
.switch a { color: var(--ink-1); cursor: pointer; margin-left: 4px; }
</style>
