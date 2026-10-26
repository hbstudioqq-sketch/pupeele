/* ============================================================
   搭配间 · 3D 数据层
   ------------------------------------------------------------
   与旧版（src/data/studio.js）的区别：
   1) 选项不再是「SVG 路径数组」，而是「建模函数 + 元信息」。
      缩略图与主画面共用同一套建模代码，所见即所得。
   2) 每个选项都带 sku，能直接映射回真实物料 → BOM 不虚。
   3) 默认搭配是「素体裸身」：从零开始往上搭。
   ============================================================ */

import { BODY_SPECS, SIZE_SCALE } from '@/three/spec'

export { BODY_SPECS, SIZE_SCALE }

/* ---------------- 素体类型 ---------------- */
export const BODY_TYPES = [
  { id: 'vinyl', nameKey: 'opt.body.vinyl', sku: 'b1' },
  { id: 'cotton', nameKey: 'opt.body.cotton', sku: 'b1' },
  { id: 'plush', nameKey: 'opt.body.plush', sku: 'b2' }
]

/* ---------------- 头部（脸 + 发一体成型） ----------------
   ------------------------------------------------------------
   厂商供货的头部件是「脸与头发一体成型」的单件，不能拆开分别换表情与发型。
   所以搭配间里五官和发型不再是两个独立选项，而是合成一个「头部」SKU：
     id    内部 id
     face  该款对应的五官（渲染用）
     wig   该款对应的发型（渲染用）
     sku   物料编码，直接进 BOM
   ------------------------------------------------------------ */
export const HEADS = [
  { id: 'h-classic', face: 'round', wig: 'long-straight', nameKey: 'opt.head.h-classic', sku: 'h1' },
  { id: 'h-soft', face: 'sleepy', wig: 'bob', nameKey: 'opt.head.h-soft', sku: 'h2' },
  { id: 'h-dreamy', face: 'star', wig: 'curly', nameKey: 'opt.head.h-dreamy', sku: 'h3' },
  { id: 'h-playful', face: 'wink', wig: 'twin-tail', nameKey: 'opt.head.h-playful', sku: 'h4' },
  { id: 'h-casual', face: 'round', wig: 'short-fluffy', nameKey: 'opt.head.h-casual', sku: 'h5' },
  { id: 'h-plain', face: 'blank', wig: 'bald', nameKey: 'opt.head.h-plain', sku: 'h6' }
]

/* 五官 / 发型的 id 仍被 3D 层引用，但不再作为可选项出现在界面上 */
export const FACES = [
  { id: 'round' }, { id: 'sleepy' }, { id: 'star' }, { id: 'wink' }, { id: 'blank' }
]
export const WIGS = [
  { id: 'long-straight' }, { id: 'curly' }, { id: 'bob' },
  { id: 'twin-tail' }, { id: 'short-fluffy' }, { id: 'bald' }
]

/* ---------------- 帽饰 ---------------- */
export const HATS = [
  { id: 'none', nameKey: 'opt.hat.none', sku: null },
  { id: 'beret', nameKey: 'opt.hat.beret', sku: 'o3' },
  { id: 'beanie', nameKey: 'opt.hat.beanie', sku: 'o4' },
  { id: 'hood', nameKey: 'opt.hat.hood', sku: 'o4' },
  { id: 'bucket', nameKey: 'opt.hat.bucket', sku: 'o3' }
]

/* ---------------- 上装 ---------------- */
export const TOPS = [
  { id: 'none', nameKey: 'opt.top.none', sku: null },
  { id: 'knit', nameKey: 'opt.top.knit', sku: 'o1' },
  { id: 'tee', nameKey: 'opt.top.tee', sku: 'o3' },
  { id: 'gown', nameKey: 'opt.top.gown', sku: 'o2' },
  { id: 'shell', nameKey: 'opt.top.shell', sku: 'o4' }
]

/* ---------------- 下装 ---------------- */
export const BOTTOMS = [
  { id: 'none', nameKey: 'opt.bottom.none', sku: null },
  { id: 'pants', nameKey: 'opt.bottom.pants', sku: 'o1' },
  { id: 'shorts', nameKey: 'opt.bottom.shorts', sku: 'o4' },
  { id: 'skirt', nameKey: 'opt.bottom.skirt', sku: 'o3' },
  { id: 'long-skirt', nameKey: 'opt.bottom.long-skirt', sku: 'o2' }
]

/* ---------------- 鞋履 ---------------- */
export const SHOES = [
  { id: 'none', nameKey: 'opt.shoes.none', sku: null },
  { id: 'leather', nameKey: 'opt.shoes.leather', sku: 's1' },
  { id: 'canvas', nameKey: 'opt.shoes.canvas', sku: 's2' },
  { id: 'jelly', nameKey: 'opt.shoes.jelly', sku: 's3' }
]

/* ---------------- 挂饰 ---------------- */
export const CHARMS = [
  { id: 'none', nameKey: 'opt.charm.none', sku: null },
  { id: 'clasp', nameKey: 'opt.charm.clasp', sku: 'c1' },
  { id: 'star', nameKey: 'opt.charm.star', sku: 'c2' },
  { id: 'beads', nameKey: 'opt.charm.beads', sku: 'c3' },
  { id: 'heart', nameKey: 'opt.charm.heart', sku: 'c2' }
]

/* ---------------- 挂绳 ---------------- */
export const STRAPS = [
  { id: 'none', nameKey: 'opt.strap.none', sku: null },
  { id: 'bead-chain', nameKey: 'opt.strap.bead-chain', sku: 'c3' },
  { id: 'leather-cord', nameKey: 'opt.strap.leather-cord', sku: 'c1' },
  { id: 'ribbon', nameKey: 'opt.strap.ribbon', sku: 'c2' }
]

/* ---------------- 配色方案 ---------------- */
export const PALETTES = {
  sweet: { main: '#f7d9e3', accent: '#e087a8', hair: '#a9714d', skin: '#f9e2d0', shoe: '#c9809c' },
  retro: { main: '#e3d3b4', accent: '#b9855c', hair: '#4a3527', skin: '#f1d6bd', shoe: '#7b5b3a' },
  gothic: { main: '#3a3644', accent: '#8a76b0', hair: '#221f26', skin: '#f0e2da', shoe: '#2a2730' },
  street: { main: '#dfe4ea', accent: '#3f4a5a', hair: '#3a2e28', skin: '#e8c9ac', shoe: '#f4f6f8' },
  couture: { main: '#efe6d8', accent: '#c9a227', hair: '#8a6a4a', skin: '#f6e2d2', shoe: '#b9945f' },
  forest: { main: '#cdd9c2', accent: '#7d8f6a', hair: '#6b5236', skin: '#f0d8c2', shoe: '#6f7a5c' },
  minimal: { main: '#eceae6', accent: '#a9a29a', hair: '#5c5248', skin: '#f2dcc8', shoe: '#8d8578' }
}

export const SKIN_TONES = ['#fbe3d1', '#f3d3b8', '#e5b892', '#c99568', '#9c6f4c', '#6f4f37']
export const HAIR_COLORS = ['#241d1b', '#4a3527', '#8a6a4a', '#c9a227', '#b05c7a', '#5a7d9e', '#8e8e9c', '#c25f3c']
export const FABRIC_COLORS = ['#f7f2ec', '#e8dcc8', '#d9c3a5', '#c9a27e', '#a98c6f', '#7d8f6a', '#8fa3b8', '#c98ba6', '#3f4a5a', '#2f2b33']

/* ---------------- 步骤 ---------------- */
export const STEPS = [
  { key: 'body', icon: 'body' },
  { key: 'head', icon: 'face' },
  { key: 'outfit', icon: 'dress' },
  { key: 'shoes', icon: 'shoe' },
  { key: 'charm', icon: 'clasp' },
  { key: 'review', icon: 'check' }
]

/* ---------------- 默认状态：素体裸身 ---------------- */
export const DEFAULT_LOOK = {
  size: '10',
  body: 'vinyl',
  skin: '#f3d3b8',
  head: 'h-classic',
  hair: '#4a3527',
  hat: 'none',
  top: 'none',
  bottom: 'none',
  main: '#e8dcc8',
  accent: '#c9a27e',
  shoes: 'none',
  shoe: '#8d6e56',
  charm: 'none',
  strap: 'none',
  style: 'minimal'
}

/* ---------------- 选项索引 ---------------- */
export const SLOT_OPTIONS = {
  head: HEADS,
  hat: HATS,
  top: TOPS,
  bottom: BOTTOMS,
  shoes: SHOES,
  charm: CHARMS,
  strap: STRAPS
}

export function findOption (slot, id) {
  const list = SLOT_OPTIONS[slot] || []
  return list.find(x => x.id === id) || list[0]
}

/* ---------------- 配色 ---------------- */
export function paletteOf (look) {
  return {
    skin: look.skin,
    hair: look.hair,
    main: look.main,
    accent: look.accent,
    shoe: look.shoe
  }
}

/* ---------------- BOM 清单 ---------------- */
export function buildBOM (look, t) {
  const rows = []
  const push = (slot, obj, extra) => {
    if (!obj) return
    rows.push({
      slot,
      slotLabel: t('studio.slot.' + slot),
      nameKey: obj.nameKey,
      sku: obj.sku || null,
      extra: extra || ''
    })
  }
  const bodyType = BODY_TYPES.find(b => b.id === look.body)
  push('body', bodyType, `${look.size} cm`)
  /* 头部是脸 + 发一体成型的单件 → BOM 只占一行、一个 SKU */
  const head = HEADS.find(h => h.id === look.head)
  push('head', head, '')
  /* 帽饰是独立配件，另起一行（槽位也叫 head 会让人误以为是同一个 SKU） */
  const hat = HATS.find(h => h.id === look.hat)
  if (hat && hat.id !== 'none') push('hat', hat, '')
  const top = TOPS.find(x => x.id === look.top)
  if (top && top.id !== 'none') push('outfit', top, '')
  const bottom = BOTTOMS.find(x => x.id === look.bottom)
  if (bottom && bottom.id !== 'none') push('outfit', bottom, '')
  const shoe = SHOES.find(x => x.id === look.shoes)
  if (shoe && shoe.id !== 'none') push('shoes', shoe, '')
  const charm = CHARMS.find(x => x.id === look.charm)
  if (charm && charm.id !== 'none') push('charm', charm, '')
  const strap = STRAPS.find(x => x.id === look.strap)
  if (strap && strap.id !== 'none') push('charm', strap, '')
  return rows
}

/* ---------------- 分享码 ---------------- */
const ORDER = ['size', 'body', 'skin', 'head', 'hair', 'hat', 'top', 'bottom', 'main', 'accent', 'shoes', 'shoe', 'charm', 'strap', 'style']

/* 分享码用 base64url：标准 base64 的 '+' '/' 在 URL 里会被当成
   空格或路径分隔符，直接把链接分享出去就会丢参数。
   解码端同时兼容旧的 base64 字符，老链接不会失效。 */
export function encodeLook (look) {
  const s = ORDER.map(k => `${k}:${look[k]}`).join('|')
  return btoa(unescape(encodeURIComponent(s)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function decodeLook (code) {
  try {
    const b64 = String(code).replace(/-/g, '+').replace(/_/g, '/')
    const s = decodeURIComponent(escape(atob(b64)))
    const out = {}
    s.split('|').forEach(pair => {
      const [k, v] = pair.split(':')
      if (k) out[k] = v
    })
    return { ...DEFAULT_LOOK, ...out }
  } catch {
    return { ...DEFAULT_LOOK }
  }
}
