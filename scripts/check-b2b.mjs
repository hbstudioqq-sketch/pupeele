import puppeteer from 'puppeteer-core'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const URL = 'http://127.0.0.1:4175/'
const sleep = ms => new Promise(r => setTimeout(r, ms))
const errors = []

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--js-flags=--max-old-space-size=512']
})
const p = await browser.newPage()
await p.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 })
p.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
p.on('pageerror', e => errors.push('PAGEERROR: ' + e.message))
await p.evaluateOnNewDocument(() => {
  localStorage.setItem('pupee.lang', 'en')
})

const setNum = async (sel, val) => {
  await p.waitForSelector(sel)
  await sleep(600)
  const el = await p.$(sel)
  await el.click()
  await p.keyboard.press('End')
  for (let i = 0; i < 8; i++) await p.keyboard.press('Backspace')
  await p.keyboard.type(String(val))
  await p.keyboard.press('Tab')
  await sleep(400)
}

/* ── 1. 首页 ── */
await p.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
await sleep(800)
console.log('1. hero search / trust cells / cat tiles / quick rows:',
  await p.$$eval('.search input', e => e.length), '/',
  await p.$$eval('.t-cell', e => e.length), '/',
  await p.$$eval('.cats .cat', e => e.length), '/',
  await p.$$eval('.qtable tbody tr', e => e.length))
const retailWording = await p.evaluate(() =>
  /add to cart|checkout|enquiry list/i.test(document.body.innerText))
console.log('   retired wording on home?', retailWording ? 'FOUND (FAIL)' : 'none (ok)')

/* ── 2. 快补表加常备单 → 徽章 ── */
await p.click('.qtable tbody tr:first-child .pill.sm')
await sleep(400)
console.log('2. standing badge after quickAdd:', await p.$eval('.standing-pill .badge', e => e.textContent.trim()).catch(() => 'MISSING (FAIL)'))

/* ── 3. hero 搜索 → 目录 ── */
await p.type('.search input', 'plush')
await p.keyboard.press('Enter')
await p.waitForFunction(() => location.hash.includes('/collections'), { timeout: 12000 })
await sleep(700)
console.log('3. catalog url:', await p.evaluate(() => location.hash),
  '· count:', await p.$eval('.count', e => e.textContent.trim().replace(/\s+/g, ' ')))

/* ── 4. MOQ 筛选 ── */
const chips = await p.$$('.bar .chip')
for (const c of chips) {
  const txt = await c.evaluate(e => e.textContent)
  if (txt.includes('MOQ')) { await c.click(); break }
}
await sleep(500)
console.log('4. after MOQ filter:', await p.$eval('.count', e => e.textContent.trim().replace(/\s+/g, ' ')))

/* ── 5. 详情 line-sheet ── */
await p.goto(URL + '#/product/sk1', { waitUntil: 'networkidle2' })
await sleep(900)
console.log('5. sku crumb:', await p.$$eval('.crumb .mono', e => e.map(x => x.textContent.trim()).join('|')),
  '· thumbs:', await p.$$eval('.thumbs .th', e => e.length),
  '· price:', await p.$eval('.price', e => e.textContent.trim().split('\n')[0]))
await p.click('.thumbs .th:nth-child(3)')
await sleep(300)
console.log('   cap after thumb switch:', await p.$eval('.cap', e => e.textContent.trim()))
const specTxt = await p.$eval('.sp', e => e.textContent)
console.log('   spec has net/carton/cert?',
  /net weight/i.test(specTxt) && /master carton/i.test(specTxt) && /certification/i.test(specTxt) ? 'yes (ok)' : 'MISSING (FAIL)')

/* ── 6. 加常备单（黑按钮）→ /standing 页 ── */
await setNum('.qty-input input', 800)
await p.click('.standing-box .go')
await sleep(400)
const goBg = await p.$eval('.standing-box .go', e => getComputedStyle(e).backgroundColor)
console.log('6. main CTA bg:', goBg, '(expect rgb(28, 27, 25))')
await p.goto(URL + '#/standing', { waitUntil: 'networkidle2' })
await sleep(900)
console.log('   standing page rows:', await p.$$eval('.panel .si', e => e.length),
  '· side visible:', await p.$eval('.side', e => getComputedStyle(e).display !== 'none'))

/* ── 7. 门禁：未订阅一键询价被拦 ── */
await p.click('.panel .acts .go')
await sleep(800)
const gated = await p.evaluate(() => !document.body.innerText.includes('× 800'))
console.log('7. gate blocked (no sheet):', gated ? 'true (ok)' : 'false (FAIL)')

/* ── 8. 注入订阅后再询价（reload 让 auth store 重新读到订阅） ── */
await p.evaluate(() => localStorage.setItem('pupee.sub', JSON.stringify({ tier: 'yearly', expires: Date.now() + 86400000 })))
await p.reload({ waitUntil: 'networkidle2' })
await sleep(900)
await setNum('.panel .si-qty input', 1200)
await p.click('.panel .acts .go')
await sleep(900)
const sheetTxt = await p.evaluate(() => {
  const ta = document.querySelector('.ant-modal textarea')
  return ta ? ta.value.includes('× 1200') : false
})
console.log('8. enquiry sheet has × 1200:', sheetTxt ? 'yes (ok)' : 'no (FAIL)')

/* ── 9. 移动端 ── */
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 })
await p.goto(URL + '#/', { waitUntil: 'networkidle2' })
await sleep(800)
const burgerVisible = await p.$eval('.burger', e => getComputedStyle(e).display !== 'none')
const navLinksHidden = await p.$eval('.nav-links', e => getComputedStyle(e).display === 'none')
console.log('9. mobile: burger', burgerVisible, '· nav-links hidden', navLinksHidden)
await p.screenshot({ path: '/tmp/b2b-mobile.png' })
await p.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 })
await p.goto(URL + '#/', { waitUntil: 'networkidle2' })
await sleep(800)
await p.screenshot({ path: '/tmp/b2b-home.png' })

console.log('CONSOLE ERRORS:', errors.length ? errors.join('\n') : 'none')
await browser.close()
