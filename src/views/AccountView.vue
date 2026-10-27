<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import message from 'ant-design-vue/es/message'
import { useAuthStore, fmtDate, pwdChecks, pwdScore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { listEnquiries, listRequests } from '@/api/account'
import { LANGS } from '@/locales'
import { DOLL_TYPES, SIZES, STYLES, LEADS } from '@/data/taxonomy'
import { CATEGORIES } from '@/data/catalog'
import { useReveal } from '@/composables/useReveal'

const { t, locale } = useI18n()
const router = useRouter()
const auth = useAuthStore()
const ui = useUiStore()
useReveal()

const tab = ref('profile')
const tabs = [
  { id: 'profile', key: 'acct.tab.profile', icon: 'user' },
  { id: 'orders', key: 'acct.tab.orders', icon: 'orders' },
  { id: 'subs', key: 'acct.tab.subs', icon: 'bell' }
]

/* 询价门禁等入口会把目标面板放在 ui.accountTab 上，进来后直接落到对应面板 */
watch(() => ui.accountTab, v => {
  if (!v) return
  tab.value = v
  ui.accountTab = ''
}, { immediate: true })

/* ---------- 个人信息 ---------- */
const form = reactive({
  full_name: '',
  company: '',
  phone: '',
  country: '',
  lang: locale.value
})
const saving = ref(false)

function fill () {
  const p = auth.profile || {}
  form.full_name = p.full_name || ''
  form.company = p.company || ''
  form.phone = p.phone || ''
  form.country = p.country || ''
  form.lang = p.lang || locale.value
}
watch(() => auth.profile, fill, { immediate: true })

async function saveProfile () {
  saving.value = true
  try {
    await auth.saveProfile(form)
    message.success(t('acct.saved'))
  } catch (e) {
    console.warn('[account] profile save failed', e)
    message.error(t('auth.netError'))
  } finally {
    saving.value = false
  }
}

/* ---------- 修改密码 ---------- */
const pwForm = reactive({ current: '', next: '', confirm: '' })
const pwSaving = ref(false)
const pwRules = computed(() => pwdChecks(pwForm.next))

const PW_ERR = {
  pwdWrong: 'acct.pwdWrong',
  weakPwd: 'auth.weakPwd',
  rateLimited: 'auth.rateLimited',
  notLoggedIn: 'auth.netError'
}

async function changePassword () {
  if (auth.hasPassword && !pwForm.current) {
    message.warning(t('acct.pwdNeedCurrent'))
    return
  }
  if (pwdScore(pwForm.next) < 4) {
    message.warning(t('auth.weakPwd'))
    return
  }
  if (pwForm.next !== pwForm.confirm) {
    message.warning(t('auth.mismatch'))
    return
  }
  pwSaving.value = true
  try {
    await auth.changePassword(pwForm.current, pwForm.next)
    pwForm.current = ''
    pwForm.next = ''
    pwForm.confirm = ''
    message.success(t('acct.pwdChanged'))
  } catch (e) {
    console.warn('[account] password change failed', e)
    message.error(t(PW_ERR[e?.message] || 'auth.netError'))
  } finally {
    pwSaving.value = false
  }
}

/* ---------- 我的询价单 ---------- */
const orders = ref([])
const ordersLoading = ref(false)
const ordersError = ref(false)
const filter = ref('all')
const openId = ref('')

const filters = [
  { id: 'all', key: 'acct.ordersAll' },
  { id: 'enquiry', key: 'acct.ordersEnquiry' },
  { id: 'request', key: 'acct.ordersRequest' }
]

const counts = computed(() => ({
  all: orders.value.length,
  enquiry: orders.value.filter(o => o.kind === 'enquiry').length,
  request: orders.value.filter(o => o.kind === 'request').length
}))

const filtered = computed(() =>
  filter.value === 'all' ? orders.value : orders.value.filter(o => o.kind === filter.value)
)

async function loadOrders () {
  if (!auth.user) return
  ordersLoading.value = true
  ordersError.value = false
  try {
    const [enq, req] = await Promise.all([
      listEnquiries(auth.user.id),
      listRequests(auth.user.id)
    ])
    orders.value = [
      ...enq.map(e => ({
        ...e,
        kind: 'enquiry',
        status: e.status || 'new',
        items: Array.isArray(e.items) ? e.items : []
      })),
      ...req.map(r => ({ ...r, kind: 'request', status: r.status || 'new' }))
    ].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
  } catch (e) {
    console.warn('[account] orders load failed', e)
    ordersError.value = true
  } finally {
    ordersLoading.value = false
  }
}

watch(() => auth.isLoggedIn, v => {
  if (v) loadOrders()
  else { orders.value = []; openId.value = '' }
}, { immediate: true })

const STATUSES = ['new', 'quoted', 'closed']
const statusOf = s => (STATUSES.includes(s) ? s : 'new')

const labelOf = (list, id) => {
  const hit = list.find(x => x.id === id)
  return hit ? t(hit.nameKey) : ''
}

function orderSummary (o) {
  if (o.kind === 'enquiry') return t('acct.ordersItems', { n: o.item_count || o.items.length })
  return [
    labelOf(DOLL_TYPES, o.doll_type),
    labelOf(SIZES, o.size),
    labelOf(STYLES, o.style)
  ].filter(Boolean).join(' · ') || t('acct.ordersRequest')
}

const dateText = v => fmtDate(Date.parse(v))
const refOf = id => String(id || '').slice(0, 8).toUpperCase()
const catText = ids => (ids || []).map(id => {
  const c = CATEGORIES.find(x => x.id === id)
  return c ? t(c.nameKey) : id
}).join(' · ')

/* ---------- 我的订阅 ---------- */
const prefs = reactive({ new: true, price: true, lookbook: false })
const prefsSaving = ref(false)

watch(() => auth.prefs, p => Object.assign(prefs, p), { deep: true, immediate: true })

const prefRows = [
  { id: 'new', key: 'acct.subsNew' },
  { id: 'price', key: 'acct.subsPrice' },
  { id: 'lookbook', key: 'acct.subsLook' }
]

const tier = computed(() => auth.sub?.tier || 'none')
const planName = computed(() =>
  tier.value === 'none' ? t('acct.subsNone') : t('auth.tier.' + tier.value)
)
const expiryText = computed(() => {
  if (tier.value === 'none' || !auth.sub?.expires) return ''
  return t(auth.isActive ? 'auth.expires' : 'auth.expired', { date: auth.expiryDate })
})

async function subscribe (plan) {
  await auth.subscribe(plan)
  message.success(t('auth.okSub'))
}
async function cancelPlan () {
  await auth.cancel()
  message.success(t('auth.okCancel'))
}
async function savePrefs () {
  prefsSaving.value = true
  try {
    await auth.savePrefs({ ...prefs })
    message.success(t('acct.subsSaved'))
  } finally {
    prefsSaving.value = false
  }
}

/* ---------- 其他 ---------- */
const memberDate = computed(() => fmtDate(Date.parse(auth.memberSince)))
const langOpts = LANGS.map(l => ({ value: l.code, label: l.label }))

function goLogin () { ui.openAccount('account') }
function goLogout () {
  auth.logout()
  router.push('/')
}
function goCollections () { router.push('/collections') }
</script>

<template>
  <div class="acct">
    <!-- 未登录引导 -->
    <section v-if="!auth.isLoggedIn" class="wrap guest">
      <div class="guest-card reveal">
        <span class="lock">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6">
            <rect x="4" y="10" width="16" height="10" rx="3" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          </svg>
        </span>
        <h2 class="h2">{{ t('acct.guestTitle') }}</h2>
        <p class="lead">{{ t('acct.guestText') }}</p>
        <button class="pill" @click="goLogin">{{ t('acct.guestCta') }}</button>
      </div>
    </section>

    <template v-else>
      <!-- 顶部资料条 -->
      <section class="acct-head">
        <div class="wrap head-in">
          <div class="avatar" aria-hidden="true">{{ auth.initial }}</div>
          <div class="head-txt">
            <p class="eyebrow">{{ t('acct.title') }}</p>
            <h1 class="acct-h">{{ t('acct.hello', { name: auth.displayName }) }}</h1>
            <p class="head-meta">
              <span>{{ auth.email }}</span>
              <span v-if="memberDate">· {{ t('acct.member', { date: memberDate }) }}</span>
            </p>
          </div>
          <span class="plan-chip" :class="{ on: auth.isActive }">
            {{ auth.isActive ? planName : t('auth.tier.none') }}
          </span>
        </div>
      </section>

      <section class="wrap acct-body">
        <!-- 侧边菜单 -->
        <aside class="side">
          <button
            v-for="tb in tabs" :key="tb.id"
            class="side-item" :class="{ on: tab === tb.id }"
            @click="tab = tb.id"
          >
            <svg v-if="tb.icon === 'user'" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6">
              <circle cx="12" cy="8" r="3.5" /><path d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6" />
            </svg>
            <svg v-else-if="tb.icon === 'orders'" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6">
              <rect x="5" y="3" width="14" height="18" rx="2.5" />
              <path d="M9 8h6M9 12h6M9 16h4" />
            </svg>
            <svg v-else viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6">
              <path d="M18 8a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6" />
              <path d="M10.5 20a1.8 1.8 0 0 0 3 0" />
            </svg>
            <span>{{ t(tb.key) }}</span>
          </button>
          <button class="side-item logout" @click="goLogout">{{ t('auth.logout') }}</button>
        </aside>

        <!-- 面板 -->
        <div class="panel">
          <p v-if="auth.accountError" class="warn">{{ t('auth.netError') }}</p>

          <!-- 个人信息 -->
          <div v-if="tab === 'profile'" class="pane">
            <div class="p-head">
              <h2>{{ t('acct.tab.profile') }}</h2>
              <p>{{ t('acct.emailHint') }}</p>
            </div>
            <div class="form-grid">
              <label class="fld">
                <span>{{ t('acct.name') }}</span>
                <a-input v-model:value="form.full_name" :placeholder="t('acct.namePh')" size="large" />
              </label>
              <label class="fld">
                <span>{{ t('acct.company') }}</span>
                <a-input v-model:value="form.company" :placeholder="t('acct.companyPh')" size="large" />
              </label>
              <label class="fld">
                <span>{{ t('acct.phone') }}</span>
                <a-input v-model:value="form.phone" :placeholder="t('acct.phonePh')" size="large" />
              </label>
              <label class="fld">
                <span>{{ t('acct.country') }}</span>
                <a-input v-model:value="form.country" :placeholder="t('acct.countryPh')" size="large" />
              </label>
              <label class="fld">
                <span>{{ t('auth.email') }}</span>
                <a-input :value="auth.email" disabled size="large" />
              </label>
              <label class="fld">
                <span>{{ t('acct.lang') }}</span>
                <a-select v-model:value="form.lang" size="large" :options="langOpts" />
              </label>
            </div>
            <div class="acts">
              <a-button type="primary" size="large" :loading="saving" @click="saveProfile">
                {{ t('acct.save') }}
              </a-button>
            </div>

            <!-- 修改密码 -->
            <section class="pwd-sec">
              <h3 class="pwd-h">{{ t('acct.pwdTitle') }}</h3>
              <p class="hint">{{ t('acct.pwdHint') }}</p>
              <p v-if="!auth.hasPassword" class="hint note">{{ t('acct.pwdOauth') }}</p>
              <div class="form-grid">
                <label v-if="auth.hasPassword" class="fld">
                  <span>{{ t('acct.pwdCurrent') }}</span>
                  <a-input-password v-model:value="pwForm.current" size="large" autocomplete="current-password" />
                </label>
                <label class="fld">
                  <span>{{ t('acct.pwdNew') }}</span>
                  <a-input-password
                    v-model:value="pwForm.next" size="large"
                    :placeholder="t('auth.pwdPlaceholder')" autocomplete="new-password"
                  />
                </label>
                <label class="fld">
                  <span>{{ t('acct.pwdConfirm') }}</span>
                  <a-input-password v-model:value="pwForm.confirm" size="large" autocomplete="new-password" />
                </label>
              </div>
              <ul v-if="pwForm.next" class="pw-rules">
                <li v-for="c in pwRules" :key="c.key" :class="{ ok: c.ok }">
                  {{ t('auth.rule.' + c.key) }}
                </li>
              </ul>
              <div class="acts">
                <a-button type="primary" size="large" :loading="pwSaving" @click="changePassword">
                  {{ t('acct.pwdSave') }}
                </a-button>
              </div>
            </section>
          </div>

          <!-- 我的询价单 -->
          <div v-else-if="tab === 'orders'" class="pane">
            <div class="p-head">
              <h2>{{ t('acct.tab.orders') }}</h2>
            </div>
            <div class="filters">
              <button
                v-for="f in filters" :key="f.id"
                class="chip" :class="{ on: filter === f.id }"
                @click="filter = f.id"
              >
                {{ t(f.key) }}<em v-if="counts[f.id]">{{ counts[f.id] }}</em>
              </button>
            </div>

            <div v-if="ordersLoading" class="skel">
              <span v-for="i in 3" :key="i" />
            </div>

            <div v-else-if="ordersError" class="empty">
              <h3>{{ t('auth.netError') }}</h3>
              <button class="pill" @click="loadOrders">{{ t('acct.retry') }}</button>
            </div>

            <div v-else-if="!filtered.length" class="empty">
              <h3>{{ t('acct.ordersEmpty') }}</h3>
              <p>{{ t('acct.ordersEmptyText') }}</p>
              <button class="pill" @click="goCollections">{{ t('acct.ordersCta') }}</button>
            </div>

            <ul v-else class="orders">
              <li v-for="o in filtered" :key="o.id" class="order">
                <div class="o-top">
                  <span class="kind" :class="o.kind">{{ t(o.kind === 'enquiry' ? 'acct.ordersEnquiry' : 'acct.ordersRequest') }}</span>
                  <span class="ref">{{ t('acct.ordersNo') }} {{ refOf(o.id) }}</span>
                  <time>{{ dateText(o.created_at) }}</time>
                  <span class="st" :class="'s-' + statusOf(o.status)">{{ t('acct.status.' + statusOf(o.status)) }}</span>
                </div>
                <p class="sum">{{ orderSummary(o) }}</p>
                <button class="more" @click="openId = openId === o.id ? '' : o.id">
                  {{ openId === o.id ? t('acct.ordersHide') : t('acct.ordersDetail') }}
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"
                       :class="{ up: openId === o.id }"><path d="M6 9l6 6 6-6" /></svg>
                </button>

                <div v-if="openId === o.id" class="detail">
                  <template v-if="o.kind === 'enquiry'">
                    <ul class="items">
                      <li v-for="(it, i) in o.items" :key="i">
                        <strong>{{ it.name }}</strong>
                        <span v-if="it.meta">{{ it.meta }}</span>
                      </li>
                    </ul>
                  </template>
                  <template v-else>
                    <dl class="spec">
                      <div v-if="o.qty"><dt>{{ t('f.qty') }}</dt><dd>{{ o.qty }}</dd></div>
                      <div v-if="o.target"><dt>{{ t('f.target') }}</dt><dd>{{ o.target }}</dd></div>
                      <div v-if="o.lead"><dt>{{ t('f.lead') }}</dt><dd>{{ labelOf(LEADS, o.lead) }}</dd></div>
                      <div v-if="o.categories?.length"><dt>{{ t('f.cats') }}</dt><dd>{{ catText(o.categories) }}</dd></div>
                      <div v-if="o.contact"><dt>{{ t('f.contact') }}</dt><dd>{{ o.contact }}</dd></div>
                    </dl>
                    <p v-if="o.notes" class="notes">{{ o.notes }}</p>
                  </template>
                </div>
              </li>
            </ul>
          </div>

          <!-- 我的订阅 -->
          <div v-else class="pane">
            <div class="p-head">
              <h2>{{ t('acct.tab.subs') }}</h2>
              <p v-if="auth.email">{{ t('acct.subsSendTo', { email: auth.email }) }}</p>
            </div>

            <div class="plan-card" :class="{ on: auth.isActive }">
              <div>
                <p class="plan-k">{{ t('acct.subsPlan') }}</p>
                <p class="plan-name">{{ planName }}</p>
                <p v-if="expiryText" class="plan-meta">{{ expiryText }}</p>
              </div>
              <span class="pbadge" :class="{ on: auth.isActive }">
                {{ auth.isActive ? t('auth.active') : t('auth.tier.none') }}
              </span>
            </div>

            <div class="plan-acts">
              <button class="pill" @click="subscribe('monthly')">
                {{ t('auth.plan.monthly') }} · {{ t('auth.plan.priceMonth') }}
              </button>
              <button class="pill ghost" @click="subscribe('yearly')">
                {{ t('auth.plan.yearly') }} · {{ t('auth.plan.priceYear') }}
              </button>
              <button v-if="auth.isActive" class="text-link" @click="cancelPlan">{{ t('auth.cancel') }}</button>
            </div>

            <h3 class="h3">{{ t('acct.subsPrefs') }}</h3>
            <p class="hint">{{ t('acct.subsPrefsHint') }}</p>

            <div class="prefs">
              <div v-for="p in prefRows" :key="p.id" class="pref">
                <span>{{ t(p.key) }}</span>
                <button
                  class="switch" :class="{ on: prefs[p.id] }"
                  role="switch" :aria-checked="prefs[p.id] ? 'true' : 'false'"
                  :aria-label="t(p.key)"
                  @click="prefs[p.id] = !prefs[p.id]"
                ><i /></button>
              </div>
            </div>

            <div class="acts">
              <a-button type="primary" size="large" :loading="prefsSaving" @click="savePrefs">
                {{ t('acct.save') }}
              </a-button>
            </div>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
/* ---------- 未登录 ---------- */
.guest { padding: clamp(64px, 10vw, 120px) 0; }
.guest-card {
  max-width: 520px;
  margin: 0 auto;
  text-align: center;
  border: 1px solid var(--line-soft);
  border-radius: 24px;
  padding: 44px 36px;
  background: #fff;
  box-shadow: var(--shadow);
}
.lock {
  width: 52px; height: 52px; margin: 0 auto 20px;
  display: grid; place-items: center;
  border-radius: 50%;
  background: var(--bg-soft);
  color: var(--ink-2);
}
.guest-card .lead { margin: 0 auto 26px; }

/* ---------- 顶部 ---------- */
.acct-head {
  background: var(--bg-soft);
  border-bottom: 1px solid var(--line-soft);
  padding: 46px 0 42px;
}
.head-in { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
.avatar {
  flex: none;
  width: 64px; height: 64px;
  border-radius: 50%;
  display: grid; place-items: center;
  background: var(--ink);
  color: #fff;
  font-size: 26px;
  font-weight: 600;
  letter-spacing: .02em;
  box-shadow: 0 6px 18px rgba(0, 0, 0, .12);
}
.head-txt { min-width: 0; }
.head-txt .eyebrow { margin-bottom: 8px; }
.acct-h {
  margin: 0 0 6px;
  font-size: clamp(22px, 3vw, 32px);
  font-weight: 700;
  letter-spacing: -0.022em;
  line-height: 1.15;
}
.head-meta {
  margin: 0;
  font-size: 13.5px;
  color: var(--ink-3);
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  word-break: break-all;
}
.plan-chip {
  margin-left: auto;
  font-size: 12.5px;
  padding: 7px 14px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: #fff;
  color: var(--ink-3);
}
.plan-chip.on { border-color: rgba(185, 133, 92, .45); color: var(--accent-ink); background: rgba(185, 133, 92, .08); }

/* ---------- 布局 ---------- */
.acct-body {
  display: grid;
  grid-template-columns: 210px minmax(0, 1fr);
  gap: 44px;
  padding-top: 40px;
  padding-bottom: 88px;
}
.side {
  position: sticky;
  top: calc(var(--nav-h) + 24px);
  align-self: start;
  display: grid;
  gap: 4px;
}
.side-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 14px;
  border: 1px solid transparent;
  border-radius: 11px;
  background: none;
  color: var(--ink-3);
  font-size: 14px;
  cursor: pointer;
  text-align: left;
  transition: background .2s, color .2s, border-color .2s;
}
.side-item svg { flex: none; opacity: .75; }
.side-item:hover { background: var(--bg-soft); color: var(--ink); }
.side-item.on {
  background: #fff;
  border-color: var(--line-soft);
  color: var(--ink);
  font-weight: 600;
  box-shadow: var(--shadow);
}
.side-item.on svg { opacity: 1; }
.side-item.logout {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--line-soft);
  border-radius: 0;
  color: var(--ink-4);
  font-size: 13px;
}

.panel {
  min-width: 0;
  border: 1px solid var(--line-soft);
  border-radius: 20px;
  background: #fff;
  padding: 32px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, .03);
}
.pane { animation: paneIn .32s var(--ease); }
@keyframes paneIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: none; }
}
.p-head { margin-bottom: 26px; }
.p-head h2 {
  margin: 0 0 6px;
  font-size: 21px;
  font-weight: 700;
  letter-spacing: -0.02em;
}
.p-head p { margin: 0; font-size: 13.5px; color: var(--ink-3); }
.warn {
  margin: 0 0 18px;
  padding: 10px 14px;
  border-radius: 10px;
  background: #fff7e8;
  color: #8a5a00;
  font-size: 12.5px;
}

/* ---------- 个人信息 ---------- */
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px 20px;
}
.fld { display: grid; gap: 7px; }
.fld > span { font-size: 12.5px; color: var(--ink-3); }
.acts { margin-top: 26px; display: flex; gap: 12px; }

/* ---------- 修改密码 ---------- */
.pwd-sec {
  margin-top: 34px;
  padding-top: 28px;
  border-top: 1px solid var(--line-soft);
}
.pwd-h { margin: 0 0 6px; font-size: 15.5px; font-weight: 600; }
.pwd-sec .hint { margin-bottom: 16px; }
.pwd-sec .hint.note {
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--bg-soft);
  color: var(--ink-3);
}
.pw-rules {
  list-style: none;
  padding: 0;
  margin: 14px 0 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px 16px;
}
.pw-rules li { font-size: 12px; color: var(--ink-4); }
.pw-rules li::before { content: '·'; margin-right: 6px; opacity: .55; }
.pw-rules li.ok { color: #2faa6a; }
.pw-rules li.ok::before { content: '✓'; margin-right: 6px; opacity: 1; }

/* ---------- 询价单 ---------- */
.filters { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 22px; }
.filters .chip { font-size: 13px; padding: 6px 13px; }
.filters .chip em { font-style: normal; margin-left: 6px; opacity: .55; font-size: 11.5px; }

.skel { display: grid; gap: 14px; }
.skel span {
  display: block;
  height: 92px;
  border-radius: 14px;
  background: linear-gradient(100deg, #f2f2f4 30%, #fafafa 45%, #f2f2f4 60%);
  background-size: 220% 100%;
  animation: shimmer 1.3s infinite linear;
}
@keyframes shimmer { to { background-position: -120% 0; } }

.empty {
  text-align: center;
  padding: 54px 20px;
  border: 1px dashed var(--line);
  border-radius: 16px;
  background: linear-gradient(180deg, #fff, #fbfbfc);
}
.empty h3 { margin: 0 0 8px; font-size: 16px; font-weight: 600; }
.empty p { margin: 0 auto 20px; max-width: 42ch; font-size: 13.5px; color: var(--ink-3); line-height: 1.6; }

.orders { list-style: none; padding: 0; margin: 0; display: grid; gap: 12px; }
.order {
  border: 1px solid var(--line-soft);
  border-radius: 14px;
  padding: 16px 18px;
  background: #fff;
  transition: border-color .25s, box-shadow .25s;
}
.order:hover { border-color: var(--line); box-shadow: 0 6px 20px rgba(0, 0, 0, .05); }
.o-top { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.kind {
  font-size: 11.5px;
  padding: 3px 9px;
  border-radius: 999px;
  background: var(--bg-soft);
  color: var(--ink-2);
}
.kind.request { background: rgba(185, 133, 92, .12); color: var(--accent-ink); }
.ref { font-size: 11.5px; color: var(--ink-4); letter-spacing: .04em; }
.o-top time { margin-left: auto; font-size: 12px; color: var(--ink-4); }
.st { font-size: 11.5px; padding: 3px 9px; border-radius: 999px; }
.st.s-new { background: rgba(242, 169, 59, .16); color: #9a6200; }
.st.s-quoted { background: rgba(47, 170, 106, .14); color: #1f7f4d; }
.st.s-closed { background: var(--bg-soft); color: var(--ink-4); }
.sum { margin: 10px 0 0; font-size: 14px; color: var(--ink-2); }
.more {
  margin-top: 10px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0;
  border: none;
  background: none;
  color: var(--ink-3);
  font-size: 12.5px;
  cursor: pointer;
}
.more:hover { color: var(--ink); }
.more svg { transition: transform .25s var(--ease); }
.more svg.up { transform: rotate(180deg); }

.detail {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--line-soft);
  animation: paneIn .3s var(--ease);
}
.items { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
.items li { display: flex; justify-content: space-between; gap: 16px; font-size: 13px; }
.items strong { font-weight: 500; }
.items span { color: var(--ink-4); text-align: right; }
.spec { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin: 0; }
.spec > div { display: flex; justify-content: space-between; gap: 12px; font-size: 13px; }
.spec dt { color: var(--ink-4); margin: 0; }
.spec dd { margin: 0; color: var(--ink-2); text-align: right; }
.notes {
  margin: 14px 0 0;
  padding: 12px 14px;
  border-radius: 10px;
  background: var(--bg-soft);
  font-size: 13px;
  line-height: 1.6;
  color: var(--ink-2);
  white-space: pre-wrap;
}

/* ---------- 订阅 ---------- */
.plan-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 20px 22px;
  border-radius: 16px;
  border: 1px solid var(--line-soft);
  background: linear-gradient(150deg, #fbfbfc, #f5f5f7);
}
.plan-card.on { border-color: rgba(185, 133, 92, .4); background: linear-gradient(150deg, #fffdfa, #fdf7f0); }
.plan-k { margin: 0 0 4px; font-size: 11.5px; letter-spacing: .1em; text-transform: uppercase; color: var(--ink-4); }
.plan-name { margin: 0; font-size: 19px; font-weight: 700; }
.plan-meta { margin: 5px 0 0; font-size: 12.5px; color: var(--ink-3); }
.pbadge { font-size: 11.5px; padding: 4px 10px; border-radius: 999px; background: #fff; color: var(--ink-4); border: 1px solid var(--line-soft); }
.pbadge.on { color: #1f7f4d; background: rgba(47, 170, 106, .1); border-color: rgba(47, 170, 106, .2); }
.plan-acts { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-top: 16px; }
.text-link { border: none; background: none; color: var(--ink-4); font-size: 12.5px; cursor: pointer; text-decoration: underline; text-underline-offset: 3px; }
.text-link:hover { color: var(--ink-2); }

.h3 { margin: 34px 0 6px; font-size: 15.5px; font-weight: 600; }
.hint { margin: 0 0 16px; font-size: 12.5px; color: var(--ink-4); line-height: 1.6; }
.prefs { display: grid; gap: 2px; border-top: 1px solid var(--line-soft); }
.pref {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 14px 0;
  border-bottom: 1px solid var(--line-soft);
  font-size: 14px;
}
.switch {
  flex: none;
  width: 42px; height: 24px;
  border-radius: 999px;
  border: none;
  background: var(--line);
  position: relative;
  cursor: pointer;
  transition: background .25s var(--ease);
}
.switch i {
  position: absolute;
  top: 3px; left: 3px;
  width: 18px; height: 18px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, .2);
  transition: transform .25s var(--ease);
}
.switch.on { background: var(--ink); }
.switch.on i { transform: translateX(18px); }

/* ---------- 响应式 ---------- */
@media (max-width: 900px) {
  .acct-body { grid-template-columns: 1fr; gap: 24px; padding-top: 28px; padding-bottom: 64px; }
  .side {
    position: static;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding-bottom: 4px;
  }
  .side-item { white-space: nowrap; padding: 9px 12px; font-size: 13.5px; gap: 8px; }
  .side-item.logout { margin: 0 0 0 auto; padding-top: 9px; border-top: none; border-left: 1px solid var(--line-soft); border-radius: 0; }
  .panel { padding: 24px 20px; }
  .form-grid { grid-template-columns: 1fr; }
  .spec { grid-template-columns: 1fr; }
  .plan-chip { margin-left: 0; }
}
@media (max-width: 560px) {
  .acct-head { padding: 32px 0 30px; }
  .avatar { width: 52px; height: 52px; font-size: 21px; }
  .panel { padding: 20px 16px; border-radius: 16px; }
  .guest-card { padding: 34px 22px; }
  .o-top time { margin-left: 0; order: 4; }
  .more { padding: 4px 0; }
  /* 给右下角悬浮联系按钮留出空间，避免遮住开关 */
  .pref { padding-right: 54px; }
}
</style>
