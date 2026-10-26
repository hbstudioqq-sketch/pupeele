import { CONFIG, LINKS } from '@/data/config'

export function copyText (text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text)
  }
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  try { document.execCommand('copy') } catch { /* noop */ }
  document.body.removeChild(ta)
  return Promise.resolve()
}

export function downloadText (filename, text) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

export function openWhatsApp (text) {
  window.open(LINKS.wa(text), '_blank', 'noopener')
}

export function openFacebook (text) {
  copyText(text || CONFIG.brand)
  window.open(LINKS.fb(), '_blank', 'noopener')
}

export function header (lang) {
  const d = new Date()
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return `${CONFIG.brand} · ${lang.toUpperCase()}\n${'─'.repeat(28)}\n${stamp}\n`
}
