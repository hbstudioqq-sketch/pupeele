/* 表单类目（三语） */
export const DOLL_TYPES = [
  { id: 'vinyl', icon: 'body', nameKey: 'tax.dolltype.vinyl', tint: ['#efe6dc', '#d8c4b0'] },
  { id: 'cotton', icon: 'dress', nameKey: 'tax.dolltype.cotton', tint: ['#f0e9ea', '#d5c3c6'] },
  { id: 'plush', icon: 'wig', nameKey: 'tax.dolltype.plush', tint: ['#eeeae2', '#cfc6b6'] },
  { id: 'figure', icon: 'clasp', nameKey: 'tax.dolltype.figure', tint: ['#e7e8ee', '#c2c5d6'] },
  { id: 'other', icon: 'magnet', nameKey: 'tax.dolltype.other', tint: ['#e9e9e7', '#c9c9c5'] }
]

export const SIZES = [
  { id: '6', nameKey: 'tax.size.6' },
  { id: '10', nameKey: 'tax.size.10' },
  { id: '15', nameKey: 'tax.size.15' },
  { id: '20', nameKey: 'tax.size.20' },
  { id: 'mix', nameKey: 'tax.size.mix' }
]

export const STYLES = [
  { id: 'sweet', nameKey: 'tax.style.sweet' },
  { id: 'retro', nameKey: 'tax.style.retro' },
  { id: 'gothic', nameKey: 'tax.style.gothic' },
  { id: 'street', nameKey: 'tax.style.street' },
  { id: 'couture', nameKey: 'tax.style.couture' },
  { id: 'forest', nameKey: 'tax.style.forest' },
  { id: 'minimal', nameKey: 'tax.style.minimal' }
]

export const LEADS = [
  { id: '30', nameKey: 'tax.lead.30' },
  { id: '60', nameKey: 'tax.lead.60' },
  { id: '90', nameKey: 'tax.lead.90' },
  { id: 'flex', nameKey: 'tax.lead.flex' }
]

/* 旧版 24×24 线稿图标 path —— 已由 @/components/CategoryArt.vue 的插画式图形取代。
   保留仅作兼容，新代码请直接用 CategoryArt。 */
export const GLYPH = {
  dress: 'M9 3 6 6l1.7 2.3L9 7.5V21h6V7.5l1.3.8L18 6l-3-3h-2l-1 2h-2z',
  wig: 'M12 4c-4 0-7 2.6-7 6.2 0 1.7.5 3.1 1 4.3.5 1.2.4 6.5.4 6.5h11.2s-.1-5.3.4-6.5c.5-1.2 1-2.6 1-4.3C19 6.6 16 4 12 4z',
  shoe: 'M3 17.5h11l6 3v2.5H3v-6zM3 17.5 4.5 11h4l2.2 6.5',
  clasp: 'M12 5.2a6.8 6.8 0 1 0 0 13.6 6.8 6.8 0 0 0 0-13.6zM12 9v6',
  body: 'M12 3.4a2.9 2.9 0 1 1 0 5.8 2.9 2.9 0 0 1 0-5.8zM6.8 21v-5.8a5.2 5.2 0 0 1 10.4 0V21',
  magnet: 'M6 4v8.2a6 6 0 0 0 12 0V4h-4v8.2a2 2 0 0 1-4 0V4H6z'
}
