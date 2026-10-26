/* ============================================================
   多语言注册中心
   ------------------------------------------------------------
   每个语种一个独立文件（src/locales/<code>.js），
   包含两段内容：
     1. UI 文案（nav.* / hero.* / studio.* …）
     2. 数据层文案（cat.* / p.* / opt.* / tax.* / stat.*）
   数据层改成 key 引用后，加语种只需新增一个文件，
   不必再回头改 catalog.js / studio3d.js / taxonomy.js。

   ⚠️ 新增语种时注意：
     - 7 个文件的 key 集合与顺序必须完全一致（scripts/test-i18n.mjs 会校验）
     - 浏览器语言检测在 detectLang() 里补一条
     - i18n.js 的 applyHtmlLang 也要补 html lang 映射
   ============================================================ */

import zh from './zh'
import en from './en'
import fr from './fr'
import vi from './vi'
import ru from './ru'
import ko from './ko'
import ja from './ja'

export const LANGS = [
  { code: 'zh', html: 'zh-CN', label: '简体中文', short: '中' },
  { code: 'en', html: 'en', label: 'English', short: 'EN' },
  { code: 'fr', html: 'fr', label: 'Français', short: 'FR' },
  { code: 'vi', html: 'vi', label: 'Tiếng Việt', short: 'VI' },
  { code: 'ru', html: 'ru', label: 'Русский', short: 'RU' },
  { code: 'ko', html: 'ko', label: '한국어', short: 'KO' },
  { code: 'ja', html: 'ja', label: '日本語', short: 'JA' }
]

export const messages = { zh, en, fr, vi, ru, ko, ja }

/* 浏览器语言 → 站点语言 */
export function detectLang () {
  const nav = (navigator.language || 'zh').toLowerCase()
  if (nav.startsWith('zh')) return 'zh'
  if (nav.startsWith('fr')) return 'fr'
  if (nav.startsWith('vi')) return 'vi'
  if (nav.startsWith('ru')) return 'ru'
  if (nav.startsWith('ko')) return 'ko'
  if (nav.startsWith('ja')) return 'ja'
  return 'en'
}
