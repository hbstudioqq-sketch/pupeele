import { defineStore } from 'pinia'
import { i18n, applyHtmlLang } from '@/i18n'
import { detectLang } from '@/locales'

const KEY_LANG = 'pupee.lang'
const KEY_AUTO = 'pupee.auto'

function readAuto () {
  return localStorage.getItem(KEY_AUTO) !== 'off'
}

export const useLangStore = defineStore('lang', {
  state: () => ({
    auto: readAuto(),
    lang: (localStorage.getItem(KEY_LANG) && localStorage.getItem(KEY_LANG) !== 'auto')
      ? localStorage.getItem(KEY_LANG)
      : detectLang()
  }),
  actions: {
    setLang (code) {
      this.lang = code
      localStorage.setItem(KEY_LANG, code)
      localStorage.setItem(KEY_AUTO, 'off')
      this.auto = false
      i18n.global.locale.value = code
      applyHtmlLang(code)
    },
    setAuto (on) {
      this.auto = on
      localStorage.setItem(KEY_AUTO, on ? 'on' : 'off')
      if (on) {
        localStorage.setItem(KEY_LANG, 'auto')
        const d = detectLang()
        this.lang = d
        i18n.global.locale.value = d
        applyHtmlLang(d)
      }
    },
    resetToBrowser () {
      this.setAuto(true)
    }
  }
})
