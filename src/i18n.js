import { createI18n } from 'vue-i18n'
import { messages, detectLang } from './locales'

const saved = localStorage.getItem('pupee.lang')
const start = saved && saved !== 'auto' ? saved : detectLang()

export const i18n = createI18n({
  legacy: false,
  locale: start,
  fallbackLocale: 'en',
  messages
})

export function applyHtmlLang (code) {
  const hit = {
    zh: 'zh-CN', en: 'en', fr: 'fr',
    vi: 'vi', ru: 'ru', ko: 'ko', ja: 'ja'
  }[code] || 'en'
  document.documentElement.lang = hit
}
applyHtmlLang(start)
