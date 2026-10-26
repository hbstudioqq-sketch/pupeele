import { defineStore } from 'pinia'
import { i18n, applyHtmlLang } from '@/i18n'
import { detectLang } from '@/locales'

const KEY_LANG = 'pupee.lang'

export const useLangStore = defineStore('lang', {
  state: () => ({
    lang: (localStorage.getItem(KEY_LANG) && localStorage.getItem(KEY_LANG) !== 'auto')
      ? localStorage.getItem(KEY_LANG)
      : detectLang()
  }),
  actions: {
    setLang (code) {
      this.lang = code
      localStorage.setItem(KEY_LANG, code)
      i18n.global.locale.value = code
      applyHtmlLang(code)
    }
  }
})
