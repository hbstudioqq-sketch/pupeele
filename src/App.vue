<script setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter, useRoute } from 'vue-router'
import message from 'ant-design-vue/es/message'
import { useLangStore } from '@/stores/lang'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { useStandingStore } from '@/stores/standing'
import { useStandingEnquire } from '@/composables/standingEnquiry'
import { LANGS } from '@/locales'
import { CONFIG, LINKS } from '@/data/config'
import { openWhatsApp, openFacebook } from '@/composables/useSend'
import SendSheet from '@/components/SendSheet.vue'
import AccountModal from '@/components/AccountModal.vue'
import StandingDrawer from '@/components/StandingDrawer.vue'

const { t, locale } = useI18n()
const router = useRouter()
const route = useRoute()
const lang = useLangStore()
const auth = useAuthStore()
const ui = useUiStore()
const standing = useStandingStore()
const { sendOpen, sendText, sendFilename, enquire } = useStandingEnquire()

const menuOpen = ref(false)

const theme = {
  token: {
    colorPrimary: '#1c1b19',
    colorLink: '#1c1b19',
    borderRadius: 10,
    fontSize: 14
  }
}

/* 一级导航按买手任务排序：找货 → 常备 → 定制 → 关于。
   Studio 按拍板降级为首页模块入口；合规说明保留在页脚。 */
const navs = [
  { to: '/collections', key: 'nav.collections' },
  { to: '/standing', key: 'nav.standing' },
  { to: '/request', key: 'nav.request' },
  { to: '/contact', key: 'nav.contact' }
]

/* 询价与常备单一键询价的门禁、文本生成、SendSheet、落库
   已统一收拢到 composables/standingEnquiry.js（页面与抽屉共用） */

/* 已登录 → 进入我的页面；未登录 → 打开登录弹窗 */
function onAccount () {
  if (auth.isLoggedIn) router.push('/account')
  else ui.openAccount()
}

function setDefault (code) {
  lang.setLang(code)
  message.success(t('toast.langSaved'))
}

watch(() => lang.lang, v => { locale.value = v })

/* 登录 / 注册 / Gmail 回跳成功后，直接进入「我的页面」 */
watch(() => auth.redirectToAccount, v => {
  if (!v) return
  auth.redirectToAccount = false
  ui.accountOpen = false
  if (route.name !== 'account') router.push('/account')
})

/* 标题与描述跟随语言 + 路由变化，避免切页后标签页总显示首页标题 */
watch([() => locale.value, () => route.meta.nav], () => {
  document.title = route.meta?.nav
    ? `${t(route.meta.nav)} · ${CONFIG.brand}`
    : t('meta.title')
  document.querySelector('meta[name="description"]')?.setAttribute('content', t('meta.desc'))
}, { immediate: true })

const year = new Date().getFullYear()
</script>

<template>
  <a-config-provider :theme="theme">
    <a class="skip-link" href="#main">{{ t('nav.skip') }}</a>
    <header class="nav">
      <div class="wrap nav-inner">
        <button
          class="burger"
          :aria-label="t('nav.menu')"
          :aria-expanded="menuOpen ? 'true' : 'false'"
          aria-controls="mobile-nav"
          @click="menuOpen = true"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
        <router-link to="/" class="brand">{{ CONFIG.brand }}</router-link>
        <nav class="nav-links">
          <router-link v-for="n in navs" :key="n.to" :to="n.to" active-class="active" exact-active-class="active">
            {{ t(n.key) }}
          </router-link>
        </nav>
        <div class="spacer" />
        <a-dropdown placement="bottomRight" trigger="click">
          <button class="lang-btn" :aria-label="t('foot.defaultLang')">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.6">
              <circle cx="12" cy="12" r="9" />
              <path d="M3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18" />
            </svg>
            <span>{{ LANGS.find(l => l.code === lang.lang)?.short || 'EN' }}</span>
          </button>
          <template #overlay>
            <a-menu>
              <a-menu-item v-for="l in LANGS" :key="l.code" @click="setDefault(l.code)">
                {{ l.label }}
              </a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
        <button class="pill ghost standing-pill" @click="standing.open = true">
          {{ t('nav.standing') }}
          <span v-if="standing.count" class="badge">{{ standing.count }}</span>
        </button>
        <button class="pill ghost account-pill" @click="onAccount">
          <template v-if="auth.isLoggedIn">{{ auth.displayName }}</template>
          <template v-else>{{ t('nav.account') }}</template>
        </button>
      </div>
    </header>

    <!-- 移动端菜单（≤860px 显示汉堡按钮） -->
    <a-drawer v-model:open="menuOpen" placement="left" :width="272" :title="CONFIG.brand">
      <nav id="mobile-nav" class="mnav">
        <router-link
          v-for="n in navs" :key="n.to" :to="n.to"
          active-class="active"
          @click="menuOpen = false"
        >{{ t(n.key) }}</router-link>
        <button class="mnav-account mnav-sub" @click="menuOpen = false; standing.open = true">
          {{ t('nav.standing') }}<span v-if="standing.count"> ({{ standing.count }})</span>
        </button>
        <button class="mnav-account" @click="menuOpen = false; onAccount()">
          {{ auth.isLoggedIn ? auth.displayName : t('nav.account') }}
        </button>
      </nav>
    </a-drawer>

    <main id="main" tabindex="-1">
      <router-view />
    </main>

    <footer class="footer">
      <div class="wrap">
        <div class="f-top">
          <div class="f-brand">
            <div class="f-logo">{{ CONFIG.brand }}</div>
            <p class="f-tagline">{{ t('foot.tagline') }}</p>
            <nav class="f-nav">
              <router-link v-for="n in navs" :key="n.to" :to="n.to">{{ t(n.key) }}</router-link>
            </nav>
          </div>
          <div class="f-contact">
            <h4>{{ t('nav.contact') }}</h4>
            <a :href="LINKS.wa('')" target="_blank" rel="noopener">WhatsApp</a>
            <a :href="LINKS.fb()" target="_blank" rel="noopener">Facebook</a>
            <a :href="LINKS.mail('Enquiry')">{{ CONFIG.email }}</a>
          </div>
        </div>

        <div class="f-legal">
          <div>
            <h4>{{ t('foot.ip') }}</h4>
            <p>{{ t('foot.ipText') }}</p>
          </div>
          <div>
            <h4>{{ t('foot.legal') }}</h4>
            <p>{{ t('foot.legalText') }}</p>
          </div>
        </div>

        <div class="f-bottom">
          <span>© {{ year }} {{ CONFIG.brand }}. {{ t('foot.rights') }}</span>
        </div>
      </div>
    </footer>

    <!-- 悬浮按钮 -->
    <button class="fab wa" :aria-label="t('contact.wa')" @click="openWhatsApp('')">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.18 8.18 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.25-8.23a8.24 8.24 0 0 1 0 16.47zm4.52-6.16c-.25-.13-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.14.16-.29.18-.54.06-.25-.13-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.44.13-.14.17-.24.25-.41.08-.16.04-.3-.02-.44-.06-.12-.56-1.35-.77-1.85-.2-.48-.4-.42-.56-.43h-.48c-.16 0-.43.06-.65.31-.22.25-.85.83-.85 2.03 0 1.2.87 2.35.99 2.51.12.17 1.71 2.61 4.14 3.66.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.22-.16-.47-.28z" />
      </svg>
    </button>
    <button class="fab fb" :aria-label="t('contact.fb')" @click="openFacebook('')">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
        <path d="M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.55-1.5h1.65V3.6c-.29-.04-1.27-.12-2.41-.12-2.38 0-4.01 1.45-4.01 4.12V9.9H7.6V13h2.68v8h3.22z" />
      </svg>
    </button>

    <SendSheet
      v-model:open="sendOpen"
      :title="t('send.title')"
      :sub="t('send.sub')"
      :text="sendText"
      :filename="sendFilename"
    />

    <AccountModal v-model:open="ui.accountOpen" />
    <StandingDrawer />
  </a-config-provider>
</template>

<style scoped>
.spacer { flex: 1; }
.lang-btn {
  display: inline-flex; align-items: center; gap: 6px;
  background: none; border: none; cursor: pointer;
  font-size: 13px; color: var(--ink-2); padding: 4px 6px; border-radius: 8px;
}
.lang-btn:hover { background: var(--bg-soft); }
.badge {
  display: inline-grid; place-items: center;
  min-width: 18px; height: 18px; padding: 0 5px;
  margin-left: 7px; border-radius: 999px;
  background: rgba(255, 255, 255, .28); font-size: 11px;
}
.pill.ghost .badge { background: var(--ink); color: #fff; }
.pill.ghost { background: none; border: 1px solid var(--line-soft); color: var(--ink-2); }
.pill.ghost:hover { background: var(--bg-soft); }
.account-pill { max-width: 148px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: inline-block; line-height: 32px; }

.burger {
  display: none; align-items: center; justify-content: center;
  width: 32px; height: 32px; padding: 0;
  border: none; background: none; border-radius: 8px;
  color: var(--ink-2); cursor: pointer;
}
.burger:hover { background: var(--bg-soft); }

.mnav { display: grid; gap: 2px; }
.mnav a,
.mnav-account {
  display: block; width: 100%; text-align: left;
  padding: 11px 12px; border: none; border-radius: 10px;
  background: none; color: var(--ink-2);
  font-size: 15px; font-weight: 500; cursor: pointer;
}
.mnav a:hover,
.mnav a.active { background: var(--bg-soft); color: var(--ink); }
.mnav-account {
  margin-top: 10px; padding-top: 16px;
  border-top: 1px solid var(--line-soft); border-radius: 0;
  font-size: 13.5px; color: var(--ink-3);
  overflow: hidden; text-overflow: ellipsis;
}
.mnav-account.mnav-sub {
  margin-top: 0; padding-top: 11px;
  border-top: none; border-radius: 10px;
}

@media (max-width: 860px) {
  .burger { display: inline-flex; }
  .nav-inner { gap: 14px; }
  .pill.ghost { display: none; }
}
</style>
