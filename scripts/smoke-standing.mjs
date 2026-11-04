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
await p.evaluateOnNewDocument(() => localStorage.setItem('pupee.lang', 'en'))

async function setNum (sel, val) {
  await p.waitForSelector(sel)
  await sleep(600) // 抽屉/组件入场动画结束，否则 clickablePoint 取不到
  const el = await p.$(sel)
  if (!el) throw new Error('missing input: ' + sel)
  await el.click()
  await p.keyboard.press('End')
  for (let i = 0; i < 8; i++) await p.keyboard.press('Backspace') // 清空旧值，不靠三击选中
  await p.keyboard.type(String(val))
  await p.keyboard.press('Tab')
  await sleep(500)
}

await p.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })

// 1) 整卡点击 → 详情页
await p.waitForSelector('.store-grid .sc')
await p.click('.store-grid .sc .ph')
await p.waitForFunction(() => location.hash.includes('/product/'), { timeout: 12000 })
console.log('1. detail url:', await p.evaluate(() => location.hash))

await p.waitForSelector('.standing-box')
console.log('2. detail title / price:',
  await p.$eval('.ttl', e => e.textContent.trim()), '/',
  await p.$eval('.price', e => e.textContent.trim()))
console.log('   spec rows:', await p.$$eval('.sp > div', els => els.length))

// 3) 设数量 500 → 加入常备单
await setNum('.qty-input input', 500)
await p.click('.standing-box .go')
await sleep(500)
const badge = await p.$eval('.standing-pill .badge', e => e.textContent.trim()).catch(() => 'none')
console.log('3. standing nav badge:', badge)
const state = await p.$eval('.sb-state span', e => e.textContent.trim()).catch(() => 'none')
console.log('   detail state:', state)
await p.screenshot({ path: '/tmp/pd-detail.png' })

// 4) 打开常备单抽屉，改数量 800
await p.click('.standing-pill')
await p.waitForSelector('.ant-drawer-open .si')
await sleep(700)
const siCount = await p.$$eval('.ant-drawer-open .si', els => els.length)
const qty0 = await p.$eval('.ant-drawer-open .si-qty input', e => e.value)
const sum0 = await p.$eval('.ant-drawer-open .sum strong', e => e.textContent.trim())
console.log('4. drawer items / qty / sum:', siCount, qty0, sum0)
await setNum('.ant-drawer-open .si-qty input', 800)
const sum1 = await p.$eval('.ant-drawer-open .sum strong', e => e.textContent.trim())
console.log('   after edit qty=800, sum:', sum1)
await p.screenshot({ path: '/tmp/pd-standing.png' })

// 5) 未订阅 → 一键询价应被门禁拦截（SendSheet 无 textarea）
await p.click('.ant-drawer-open .acts .ant-btn-primary')
await sleep(900)
const gatedSheet = await p.$eval('.ant-modal textarea', e => e.value).catch(() => null)
console.log('5. gate blocked (no enquiry sheet):', gatedSheet === null)

// 6) 注入有效订阅 → 刷新 → 一键询价
await p.evaluate(() => {
  localStorage.setItem('pupee.sub', JSON.stringify({
    tier: 'monthly', since: Date.now() - 1000, expires: Date.now() + 30 * 86400000
  }))
})
await p.reload({ waitUntil: 'networkidle2' })
await sleep(800)
await p.click('.standing-pill')
await p.waitForSelector('.ant-drawer-open .si')
await sleep(800)
const qty2 = await p.$eval('.ant-drawer-open .si-qty input', e => e.value)
console.log('6. persisted qty after reload:', qty2)
await p.click('.ant-drawer-open .acts .ant-btn-primary')
await sleep(1000)
const text = await p.$eval('.ant-modal textarea', e => e.value).catch(() => null)
console.log('   enquiry sheet text:\n' + (text ? text.split('\n').slice(0, 9).join('\n') : 'NOT OPEN'))
await p.screenshot({ path: '/tmp/pd-enquiry.png' })

console.log('CONSOLE ERRORS:', errors.length ? errors.join('\n') : 'none')
await browser.close()
