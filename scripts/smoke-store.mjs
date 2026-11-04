import puppeteer from 'puppeteer-core'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const URL = 'http://127.0.0.1:4175/'

const errors = []
const log = (...a) => console.log(...a)

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--js-flags=--max-old-space-size=512']
})
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 })
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message))

// 锁英文，避免中文文案干扰断言
await page.evaluateOnNewDocument(() => localStorage.setItem('pupee.lang', 'en'))

await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })

// 1) 现货区卡片数
await page.waitForSelector('.store-grid .sc', { timeout: 15000 })
const cards = await page.$$eval('.store-grid .sc', els => els.length)
log('store cards:', cards)

// 2) 白牌徽章存在
const whiteBadge = await page.$$eval('.store-grid .badge-white', els => els.length)
log('white-label badges:', whiteBadge)

// 3) 第一个卡片的零售价文本
const firstPrice = await page.$eval('.store-grid .sc .price', el => el.textContent.trim())
log('first retail price:', firstPrice)

await page.screenshot({ path: '/tmp/store-home.png' })

// 4) 加入购物车（第一个 Add to cart）
const addBtn = await page.$('.store-grid .sc .buy')
await addBtn.click()
await new Promise(r => setTimeout(r, 600))

// 5) 打开购物车抽屉（导航购物车按钮）
await page.click('.cart-pill')
await new Promise(r => setTimeout(r, 800))
// 只统计“打开中的抽屉”内的 .ci，避免把询价篮的 .ci 也算进来
const cartItems = await page.$$eval('.ant-drawer-open .ci', els => els.length).catch(() => 0)
log('cart drawer items after add (open drawer only):', cartItems)

// 6) 结账（antd primary 按钮类名是 .ant-btn-primary）
const checkoutBtn = await page.$('.ci-foot .ant-btn-primary')
if (checkoutBtn) {
  await checkoutBtn.click()
  await new Promise(r => setTimeout(r, 2600))
}
// 7) 成功提示
const success = await page.evaluate(() => {
  const els = [...document.querySelectorAll('.ant-message-notice, .ant-message')]
  return els.map(e => e.innerText).join(' | ')
})
log('toast after checkout:', success)
await page.screenshot({ path: '/tmp/store-cart.png' })

log('CONSOLE ERRORS:', errors.length ? errors.join('\n') : 'none')
await browser.close()
