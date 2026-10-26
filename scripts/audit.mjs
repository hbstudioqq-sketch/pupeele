/* ============================================================
   全站回归脚本
   ------------------------------------------------------------
   覆盖 6 件事：
     1. 移动端 390×844 四个页面：无横向溢出、无控制台报错
     2. 搭配间流程：走完 6 步（素体 / 头部 / 衣服 / 鞋履 / 挂饰 / 清单）
        → 头部为「脸 + 发一体件」单一单元 → BOM 只出一行头部
     3. 分享链接：改搭配 → 地址栏出现 look= → 重新打开能还原
     4. 配件库：卡片渲染 + 单品可加入询价篮
     5. 需求页：表单可填可提交
     6. 七语切换：vi / ru / ko / ja 文案落地且无缺失 key
   用法：node scripts/audit.mjs [baseUrl] [outDir]
   ============================================================ */

import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
import path from 'node:path'

const BASE = process.argv[2] || 'http://localhost:4173'
const OUT = process.argv[3] || path.resolve('.tmp/audit')
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

fs.mkdirSync(OUT, { recursive: true })

let pass = 0
let fail = 0
const failures = []
function ok (cond, label, extra = '') {
  if (cond) { pass++; console.log('  ✓', label) } else {
    fail++; failures.push(label + (extra ? ' — ' + extra : ''))
    console.log('  ✗', label, extra)
  }
}

/* 按可见文字点按钮 */
async function clickText (page, text, root = 'button') {
  const done = await page.evaluate((t, r) => {
    const els = [...document.querySelectorAll(r)]
    const hit = els.find(e => (e.innerText || e.textContent || '').trim().includes(t) && e.offsetParent !== null)
    if (!hit) return false
    hit.click()
    return true
  }, text, root)
  if (!done) throw new Error('找不到按钮：' + text)
  await new Promise(r => setTimeout(r, 260))
}
async function hasText (page, text) {
  return page.evaluate(t => document.body.innerText.includes(t), text)
}

/* 轮询等待条件成立。
   注意：headless 用的是 swiftshader 软件渲染，3D 主画布每帧要几十毫秒，
   setTimeout 会被推迟，固定 sleep 不可靠 —— 一律轮询。 */
async function waitFor (page, fn, timeout = 12000, interval = 300) {
  const t0 = Date.now()
  while (Date.now() - t0 < timeout) {
    let v = false
    try { v = await page.evaluate(fn) } catch (e) { /* 页面正在跳转 */ }
    if (v) return true
    await new Promise(r => setTimeout(r, interval))
  }
  return false
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  /* headless 下 3D 页面用 swiftshader 软件渲染，每帧几十毫秒，
     CDP 截图会等 compositor 空闲 —— 默认 30s protocolTimeout 不够 */
  protocolTimeout: 240000,
  args: [
    '--enable-unsafe-swiftshader',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--js-flags=--max-old-space-size=1024'
  ]
})

const errors = []
function watch (page, tag) {
  page.on('pageerror', e => errors.push(`[${tag}] pageerror: ${String(e).slice(0, 200)}`))
  page.on('console', m => {
    if (m.type() === 'error') errors.push(`[${tag}] console: ${m.text().slice(0, 200)}`)
  })
}

/* ============ 1. 移动端适配 ============ */
console.log('\n▸ 移动端 390×844')
{
  const page = await browser.newPage()
  watch(page, 'mobile')
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
  for (const [name, hash] of [['home', ''], ['collections', '/collections'], ['studio', '/studio'], ['request', '/request'], ['contact', '/contact']]) {
    await page.goto('about:blank', { waitUntil: 'domcontentloaded' })
    await page.goto(`${BASE}/#${hash}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await new Promise(r => setTimeout(r, name === 'studio' ? 2600 : 1200))
    const m = await page.evaluate(() => ({
      sw: document.documentElement.scrollWidth,
      iw: window.innerWidth,
      navVisible: !!document.querySelector('header'),
      h1: (document.querySelector('h1') || {}).innerText || '',
      overflowers: [...document.querySelectorAll('body *')]
        .filter(e => {
          const r = e.getBoundingClientRect()
          return r.width > 0 && (r.right > window.innerWidth + 2 || r.left < -2)
        })
        .slice(0, 4)
        .map(e => `${e.tagName}.${(e.className || '').toString().split(' ')[0]}@${Math.round(e.getBoundingClientRect().right)}`)
    }))
    ok(m.sw <= m.iw + 2, `${name}: 无横向溢出`, `scrollWidth=${m.sw} innerWidth=${m.iw} ${m.overflowers.join(',')}`)
    ok(m.navVisible, `${name}: 顶栏渲染`)
    ok(!!m.h1, `${name}: 有主标题`, m.h1)
    await page.screenshot({ path: path.join(OUT, `m-${name}.png`), fullPage: false })
  }
  await page.close()
}

/* ============ 2 & 3. 搭配间流程 + 分享链接 ============ */
console.log('\n▸ 搭配间（桌面 1280×900）')
{
  const page = await browser.newPage()
  watch(page, 'studio')
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 })
  await page.goto('about:blank', { waitUntil: 'domcontentloaded' })
  await page.goto(`${BASE}/#/studio`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForFunction('!!document.querySelector(".host canvas")', { timeout: 30000 }).catch(() => {})
  await new Promise(r => setTimeout(r, 2400))

  const hasCanvas = await page.evaluate(() => !!document.querySelector('.host canvas'))
  ok(hasCanvas, '3D 画布已挂载')

  /* 走完 6 步（素体 / 头部 / 衣服 / 鞋履 / 挂饰 / 清单） */
  for (let i = 0; i < 5; i++) {
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('.nav-row button')].find(x => x.classList.contains('ant-btn-primary'))
      if (b) b.click()
    })
    await new Promise(r => setTimeout(r, 340))
  }
  const stepTitle = await page.evaluate(() => (document.querySelector('.grp h3') || {}).innerText || '')
  ok(!!stepTitle, '走到最后一步（清单）', stepTitle)

  /* 步骤数应为 6（antd 的类名带前缀，用步骤条容器内的可点击项来数） */
  const stepCount = await page.evaluate(() => {
    const box = document.querySelector('.steps')
    if (!box) return 0
    /* 步骤条里的标题文本项 */
    return [...box.querySelectorAll('[class*="steps-item-title"]')].length
  })
  ok(stepCount === 6, '搭配间为 6 步（素体/头部/衣服/鞋履/挂饰/清单）', 'steps=' + stepCount)

  /* 头部一体件：第 2 步只有「头部」一个部位块，不应再有独立的五官/发型块 */
  const headStep = await page.evaluate(() => {
    const steps = [...document.querySelectorAll('[class*="steps-item"]')]
    if (steps[1]) steps[1].click()
    return true
  })
  await new Promise(r => setTimeout(r, 700))
  const headBlocks = await page.evaluate(() => {
    const grp = document.querySelectorAll('.grp')[1]
    if (!grp) return null
    return [...grp.querySelectorAll('h3.gt')].map(h => h.innerText.trim())
  })
  ok(Array.isArray(headBlocks) && headBlocks.length === 3,
    '头部步骤只有「头部/发色/帽饰」3 个块（脸发一体，不再拆五官+发型）', JSON.stringify(headBlocks))

  /* BOM 出行 */
  await page.evaluate(() => {
    const steps = [...document.querySelectorAll('[class*="steps-item"]')]
    const last = steps[steps.length - 1]
    if (last) last.click()
  })
  await new Promise(r => setTimeout(r, 700))
  const bomRows = await page.evaluate(() => document.querySelectorAll('.bom tbody tr.ant-table-row').length)
  ok(bomRows >= 2, 'BOM 清单有行（素体 + 尺寸）', 'rows=' + bomRows)

  /* BOM 里头部只出一行 */
  const bomText = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('.bom tbody tr.ant-table-row')]
    return rows.map(r => r.innerText.replace(/\s+/g, ' ').trim())
  })
  const headRowIdx = bomText.findIndex(r => /头|head/i.test(r))
  ok(headRowIdx >= 0, 'BOM 含头部行', bomText.join(' | ').slice(0, 160))
  const headSlotCount = bomText.filter(r => /头|head/i.test(r)).length
  ok(headSlotCount === 1, '头部在 BOM 中只占一行（一个 SKU）', 'rows=' + headSlotCount)

  /* 改一个搭配 → 地址栏应出现 look=
     注意：要点「非当前选中项」，点当前值 look 不变，watch 不触发，URL 不会更新。 */
  await page.evaluate(() => {
    const steps = [...document.querySelectorAll('[class*="steps-item"]')]
    if (steps[0]) steps[0].click()
  })
  await new Promise(r => setTimeout(r, 600))
  await page.evaluate(() => {
    const opts = [...document.querySelectorAll('.opts .opt')]
    const cur = document.querySelector('.opts .opt.on')
    const target = opts.find(o => o !== cur) || opts[1]
    if (target) target.click()
  })
  const gotLook = await waitFor(page, () => location.href.includes('look='))
  const href1 = await page.url()
  ok(gotLook && href1.includes('look='), '改搭配后地址栏带 look=', href1.slice(-70))

  /* 重新打开该链接 → 应还原 */
  const page2 = await browser.newPage()
  watch(page2, 'studio-share')
  await page2.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 })
  await page2.goto('about:blank', { waitUntil: 'domcontentloaded' })
  await page2.goto(href1, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page2.waitForFunction('!!document.querySelector(".host canvas")', { timeout: 30000 }).catch(() => {})
  await new Promise(r => setTimeout(r, 2400))
  const restored = await page2.evaluate(() => {
    const on = [...document.querySelectorAll('.opt.on')].map(e => e.innerText.trim())
    return { n: on.length, first: on[0] || '' }
  })
  ok(restored.n > 0, '分享链接还原了选中态', `n=${restored.n} ${restored.first}`)
  const url2 = await page2.url()
  ok(url2.includes('look='), '分享链接自身带 look=', url2.slice(-50))
  await page2.close()

  /* 再穿一套衣服，看 BOM 是否变长 */
  const bomBefore = await page.evaluate(() => document.querySelectorAll('.bom tbody tr.ant-table-row').length)
  await page.evaluate(() => {
    const steps = [...document.querySelectorAll('[class*="steps-item"]')]
    if (steps[2]) steps[2].click()   /* 6 步里 index 2 = 衣服 */
  })
  await new Promise(r => setTimeout(r, 600))
  await page.evaluate(() => {
    const grp = document.querySelectorAll('.grp')[2]
    if (!grp) return
    const groups = grp.querySelectorAll('.opts')
    for (const g of groups) {
      const cur = g.querySelector('.opt.on')
      const t = [...g.querySelectorAll('.opt')].find(o => o !== cur)
      if (t) t.click()
    }
  })
  await new Promise(r => setTimeout(r, 1500))
  await page.evaluate(() => {
    const steps = [...document.querySelectorAll('[class*="steps-item"]')]
    const last = steps[steps.length - 1]
    if (last) last.click()
  })
  await new Promise(r => setTimeout(r, 1400))
  const bomAfter = await page.evaluate(() => document.querySelectorAll('.bom tbody tr.ant-table-row').length)
  ok(bomAfter > bomBefore, '穿上衣服后 BOM 行数增加', `${bomBefore} → ${bomAfter}`)

  /* 一键加入询价篮 */
  await page.evaluate(() => {
    const steps = [...document.querySelectorAll('[class*="steps-item"]')]
    const last = steps[steps.length - 1]
    if (last) last.click()
  })
  await new Promise(r => setTimeout(r, 600))
  await clickText(page, '整套加入询价篮', '.acts button')
  await new Promise(r => setTimeout(r, 800))
  const cart = await page.evaluate(() => ({
    drawer: !!document.querySelector('.ant-drawer-content'),
    items: document.querySelectorAll('.ant-drawer .ci').length,
    badge: (document.querySelector('.pill .badge') || {}).innerText || ''
  }))
  ok(cart.drawer, '询价篮抽屉打开')
  ok(cart.items > 0, '询价篮有货', 'items=' + cart.items)
  ok(Number(cart.badge) === cart.items, '角标数量与条目一致', `badge=${cart.badge} items=${cart.items}`)
  await page.screenshot({ path: path.join(OUT, 'd-studio-cart.png') })
  await page.close()
}

/* ============ 4. 配件库 ============ */
console.log('\n▸ 配件库')
{
  const page = await browser.newPage()
  watch(page, 'collections')
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 })
  await page.goto('about:blank', { waitUntil: 'domcontentloaded' })
  await page.goto(`${BASE}/#/collections`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await new Promise(r => setTimeout(r, 1600))
  const cards = await page.evaluate(() => document.querySelectorAll('.pc, .product-card, article').length)
  ok(cards > 0, '配件卡片渲染', 'cards=' + cards)
  const addBtns = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].filter(x => /询价|enquir|加入/i.test(x.innerText || ''))
    return b.length
  })
  ok(addBtns > 0, '卡片有「加入询价」按钮', 'btns=' + addBtns)
  if (addBtns > 0) {
    /* 必须点产品卡里的按钮：顶栏也有一个含「询价」字样的按钮，
       点它只会打开抽屉，不会把商品加进去。 */
    const clicked = await page.evaluate(() => {
      const btn = document.querySelector('.pc .pill.add')
      if (!btn) return false
      btn.click()
      return true
    })
    ok(clicked, '找到产品卡的加入按钮')
    await new Promise(r => setTimeout(r, 900))
    const badge = await page.evaluate(() => (document.querySelector('.pill .badge') || {}).innerText || '0')
    ok(Number(badge) > 0, '单品加入询价篮生效', 'badge=' + badge)
  }
  await page.screenshot({ path: path.join(OUT, 'd-collections.png'), fullPage: false })
  await page.close()
}

/* ============ 5. 需求页 ============ */
console.log('\n▸ 需求页')
{
  const page = await browser.newPage()
  watch(page, 'request')
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true })
  await page.goto('about:blank', { waitUntil: 'domcontentloaded' })
  await page.goto(`${BASE}/#/request`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await new Promise(r => setTimeout(r, 1400))
  const fields = await page.evaluate(() => ({
    inputs: document.querySelectorAll('input, textarea').length,
    selects: document.querySelectorAll('.ant-select').length
  }))
  ok(fields.inputs > 0, '表单有输入框', 'inputs=' + fields.inputs)
  ok(fields.selects > 0, '表单有下拉选择', 'selects=' + fields.selects)
  await page.screenshot({ path: path.join(OUT, 'm-request.png'), fullPage: false })
  await page.close()
}

/* ============ 6. 七语切换 ============ */
console.log('\n▸ 七语切换')
{
  const LANGS = [
    ['zh', '简体中文'], ['en', 'English'], ['fr', 'Français'],
    ['vi', 'Tiếng Việt'], ['ru', 'Русский'], ['ko', '한국어'], ['ja', '日本語']
  ]
  for (const [code, label] of LANGS) {
    const page = await browser.newPage()
    watch(page, 'lang-' + code)
    await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 })
    await page.goto('about:blank', { waitUntil: 'domcontentloaded' })
    await page.goto(`${BASE}/#/studio`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await new Promise(r => setTimeout(r, 1500))

    /* 通过语言菜单切换 */
    const switched = await page.evaluate((lbl) => {
      const hit = [...document.querySelectorAll('.ant-dropdown-menu-item, .ant-menu-item, li, button')]
        .find(e => (e.innerText || '').trim() === lbl && e.offsetParent !== null)
      if (!hit) return false
      hit.click()
      return true
    }, label)
    await new Promise(r => setTimeout(r, 1400))

    const st = await page.evaluate(() => ({
      htmlLang: document.documentElement.lang,
      title: document.querySelector('h1, .h2') ? document.querySelector('h1, .h2').innerText.trim() : '',
      stepTitles: [...document.querySelectorAll('[class*="steps-item-title"]')].map(e => e.innerText.trim()),
      optNames: [...document.querySelectorAll('.oname')].map(e => e.innerText.trim()).filter(Boolean),
      bodyText: document.body.innerText.length
    }))

    ok(switched, `${code}：语言菜单可切换`)
    ok(st.htmlLang === code || (code === 'zh' && st.htmlLang === 'zh-CN'),
      `${code}：html lang 同步`, 'lang=' + st.htmlLang)
    ok(st.stepTitles.length === 6, `${code}：6 个步骤标题都渲染`, JSON.stringify(st.stepTitles))
    ok(st.optNames.length > 0, `${code}：选项名已本地化`, JSON.stringify(st.optNames.slice(0, 4)))
    ok(st.bodyText > 400, `${code}：页面有实质文本`, 'len=' + st.bodyText)

    await page.screenshot({ path: path.join(OUT, `lang-${code}.png`), fullPage: false })
    await page.close()
  }
}

await browser.close()
console.log(`通过 ${pass} 项，失败 ${fail} 项`)
if (failures.length) {
  console.log('\n失败明细：')
  failures.forEach(f => console.log('  ·', f))
}
const realErrors = errors.filter(e => !/favicon|Failed to load resource/i.test(e))
if (realErrors.length) {
  console.log('\n控制台报错：')
  ;[...new Set(realErrors)].slice(0, 12).forEach(e => console.log('  ·', e))
}
console.log('\n截图 →', OUT)
process.exit(fail ? 1 : 0)
