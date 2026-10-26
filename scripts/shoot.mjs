/* ============================================================
   3D 搭配间视觉回归截图
   ------------------------------------------------------------
   用本机 Chrome（不下载浏览器）跑真实页面，把关键搭配组合拍下来，
   便于逐帧检查「穿得进、看不穿帮」。
   走的是产品自带的分享链接通道（?look=<shareCode>），
   不依赖任何调试钩子，等于顺带回归了分享码功能。
   用法：node scripts/shoot.mjs [baseUrl] [outDir]
   ============================================================ */

import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
import path from 'node:path'

const BASE = process.argv[2] || 'http://localhost:4173'
const OUT = process.argv[3] || path.resolve('.tmp/shots')
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

fs.mkdirSync(OUT, { recursive: true })

const ORDER = ['size', 'body', 'skin', 'face', 'wig', 'hair', 'hat', 'top', 'bottom', 'main', 'accent', 'shoes', 'shoe', 'charm', 'strap', 'style']
const BASE_LOOK = {
  size: '10', body: 'vinyl', skin: '#f3d3b8', face: 'round',
  wig: 'bald', hair: '#4a3527', hat: 'none',
  top: 'none', bottom: 'none', main: '#e8dcc8', accent: '#c9a27e',
  shoes: 'none', shoe: '#8d6e56', charm: 'none', strap: 'none', style: 'minimal'
}
function encodeLook (look) {
  const s = ORDER.map(k => `${k}:${look[k]}`).join('|')
  return Buffer.from(s, 'utf8').toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/* 组合：[文件名, look 覆盖] */
const SHOTS = [
  ['01-bare', { wig: 'bald', top: 'none', bottom: 'none', shoes: 'none', charm: 'none', strap: 'none' }],
  ['02-longhair', { wig: 'long-straight', top: 'none', bottom: 'none', shoes: 'none', charm: 'none', strap: 'none' }],
  ['03-curly', { wig: 'curly', top: 'none', bottom: 'none', shoes: 'none' }],
  ['04-bob', { wig: 'bob', top: 'none', bottom: 'none', shoes: 'none' }],
  ['05-twintail', { wig: 'twin-tail', top: 'none', bottom: 'none', shoes: 'none' }],
  ['06-fluffy', { wig: 'short-fluffy', top: 'none', bottom: 'none', shoes: 'none' }],
  ['07-knit-pants', { wig: 'long-straight', top: 'knit', bottom: 'pants', shoes: 'leather' }],
  ['08-tee-shorts', { wig: 'bob', top: 'tee', bottom: 'shorts', shoes: 'canvas' }],
  ['09-gown', { wig: 'long-straight', top: 'gown', bottom: 'none', shoes: 'none' }],
  ['10-shell-skirt', { wig: 'short-fluffy', top: 'shell', bottom: 'skirt', shoes: 'jelly' }],
  ['11-longskirt', { wig: 'curly', top: 'tee', bottom: 'long-skirt', shoes: 'none' }],
  ['12-hat-charm', { wig: 'bob', hat: 'bucket', top: 'knit', bottom: 'pants', shoes: 'leather', charm: 'star', strap: 'leather-cord' }],
  ['12b-strap-ribbon', { wig: 'twin-tail', top: 'tee', bottom: 'long-skirt', shoes: 'canvas', charm: 'heart', strap: 'ribbon' }],
  ['12c-strap-beads', { wig: 'curly', top: 'gown', bottom: 'none', shoes: 'none', charm: 'beads', strap: 'bead-chain' }],
  ['13-hood', { wig: 'long-straight', hat: 'hood', top: 'shell', bottom: 'pants', shoes: 'canvas' }],
  ['14-cotton', { body: 'cotton', wig: 'twin-tail', top: 'tee', bottom: 'pants', shoes: 'canvas' }],
  ['15-plush', { body: 'plush', wig: 'curly', top: 'knit', bottom: 'shorts', shoes: 'jelly' }],
  ['16-faces', { face: 'star', wig: 'bob', top: 'knit', bottom: 'skirt' }]
]

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: [
    '--enable-unsafe-swiftshader',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--no-sandbox',
    '--disable-dev-shm-usage'
  ]
})

const page = await browser.newPage()
await page.setViewport({ width: 1100, height: 900, deviceScaleFactor: 2 })
page.on('pageerror', e => console.log('  [pageerror]', String(e).slice(0, 300)))
page.on('console', m => { if (m.type() === 'error') console.log('  [console]', m.text().slice(0, 200)) })

/* 只拍指定组合：node scripts/shoot.mjs <base> <out> <名字1,名字2> */
const only = process.argv[4]
const LIST = only ? SHOTS.filter(x => only.split(',').includes(x[0])) : SHOTS

for (const [name, patch] of LIST) {
  const code = encodeLook({ ...BASE_LOOK, ...patch })
  /* 先跳空白页再进目标地址：保证是整页加载，走「粘贴分享链接」的完整路径 */
  await page.goto('about:blank', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.goto(`${BASE}/#/studio?look=${encodeURIComponent(code)}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForFunction('!!document.querySelector(".host canvas")', { timeout: 30000 }).catch(() => {})
  await new Promise(r => setTimeout(r, 1700))
  const el = await page.$('.canvas')
  if (!el) { console.log('  ! 没有找到 3D 画布', name); continue }
  await el.screenshot({ path: path.join(OUT, name + '.png') })
  console.log('  ✓', name)
}

/* 再拍一张整页（含 BOM 表格 / 步骤条） */
const code = encodeLook({ ...BASE_LOOK, wig: 'long-straight', top: 'knit', bottom: 'pants', shoes: 'leather' })
await page.goto('about:blank', { waitUntil: 'domcontentloaded' })
await page.goto(`${BASE}/#/studio?look=${encodeURIComponent(code)}`, { waitUntil: 'domcontentloaded' })
await page.waitForFunction('!!document.querySelector(".host canvas")', { timeout: 30000 }).catch(() => {})
await new Promise(r => setTimeout(r, 2200))
await page.screenshot({ path: path.join(OUT, '00-page.png'), fullPage: true })
console.log('  ✓ 00-page')

await browser.close()
console.log('done →', OUT)
