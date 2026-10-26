<script setup>
import { useI18n } from 'vue-i18n'
import { CONFIG, LINKS } from '@/data/config'
import { openWhatsApp, openFacebook } from '@/composables/useSend'
import { useReveal } from '@/composables/useReveal'

const { t } = useI18n()
useReveal()

const cards = [
  { key: 'wa', icon: 'wa', href: LINKS.wa(''), ext: true },
  { key: 'fb', icon: 'fb', href: LINKS.fb(), ext: true },
  { key: 'mail', icon: 'mail', href: LINKS.mail('Enquiry'), ext: false }
]
</script>

<template>
  <div class="wrap page">
    <p class="eyebrow">{{ t('contact.eyebrow') }}</p>
    <h1 class="h2">{{ t('contact.title') }}</h1>
    <p class="lead">{{ t('contact.sub') }}</p>

    <div class="cards">
      <a
        v-for="c in cards" :key="c.key"
        class="card cc reveal"
        :href="c.href"
        :target="c.ext ? '_blank' : undefined"
        :rel="c.ext ? 'noopener' : undefined"
      >
        <div class="ico" :class="c.icon">
          <svg v-if="c.icon === 'wa'" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91C21.96 6.45 17.5 2 12.04 2zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.18 8.18 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.25-8.23a8.24 8.24 0 0 1 0 16.47zm4.52-6.16c-.25-.13-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.14.16-.29.18-.54.06-.25-.13-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.44.13-.14.17-.24.25-.41.08-.16.04-.3-.02-.44-.06-.12-.56-1.35-.77-1.85-.2-.48-.4-.42-.56-.43h-.48c-.16 0-.43.06-.65.31-.22.25-.85.83-.85 2.03 0 1.2.87 2.35.99 2.51.12.17 1.71 2.61 4.14 3.66.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.22-.16-.47-.28z" />
          </svg>
          <svg v-else-if="c.icon === 'fb'" viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.55-1.5h1.65V3.6c-.29-.04-1.27-.12-2.41-.12-2.38 0-4.01 1.45-4.01 4.12V9.9H7.6V13h2.68v8h3.22z" />
          </svg>
          <svg v-else viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6">
            <rect x="3" y="5" width="18" height="14" rx="2.5" />
            <path d="m3.5 7 8.5 6 8.5-6" />
          </svg>
        </div>
        <h3>{{ t('contact.' + c.key) }}</h3>
        <p>{{ t('contact.' + c.key + 'Desc') }}</p>
        <span class="go">{{ c.key === 'mail' ? CONFIG.email : t('contact.' + c.key) }} →</span>
      </a>
    </div>

    <div class="quick">
      <button class="pill" @click="openWhatsApp('')">{{ t('contact.wa') }}</button>
      <button class="pill ghost" @click="openFacebook('')">{{ t('contact.fb') }}</button>
    </div>
  </div>
</template>

<style scoped>
.page { padding: 48px 0 90px; }
.cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; margin: 34px 0 28px; }
.cc { padding: 24px 22px; display: grid; gap: 8px; }
.ico { width: 44px; height: 44px; border-radius: 12px; display: grid; place-items: center; color: #fff; margin-bottom: 6px; }
.ico.wa { background: #25d366; }
.ico.fb { background: #1877f2; }
.ico.mail { background: var(--ink); }
.cc h3 { margin: 0; font-size: 17px; font-weight: 600; }
.cc p { margin: 0; font-size: 13.5px; color: var(--ink-3); line-height: 1.55; }
.go { margin-top: 6px; font-size: 13px; color: var(--accent-ink); font-weight: 500; }
.quick { display: flex; gap: 12px; }
@media (max-width: 900px) { .cards { grid-template-columns: 1fr; } }
</style>
