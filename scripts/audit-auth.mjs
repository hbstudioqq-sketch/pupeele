/* 轻量回归：账户 / 订阅 / 询价门禁链路
   固定 locale=en 后再测，避免按浏览器语言自动切换导致文案不一致。
   用 /contact 拉起账户弹窗，避开 3D 重渲染省内存。 */
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'

const BASE = process.argv[2] || 'http://127.0.0.1:4175'
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
fs.mkdirSync('.tmp/auth', { recursive: true })

let pass = 0, fail = 0
const ok = (c, l, e = '') => { if (c) { pass++; console.log('  ✓', l) } else { fail++; console.log('  ✗', l, e) } }

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new', protocolTimeout: 120000,
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox', '--disable-dev-shm-usage', '--no-proxy-server', '--js-flags=--max-old-space-size=1024']
})

const errors = []
async function fresh () {
  const page = await browser.newPage()
  page.on('pageerror', e => errors.push('pageerror: ' + String(e).slice(0, 160)))
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 160)) })
  // 固定英文，避免自动语言切换
  await page.evaluateOnNewDocument(() => localStorage.setItem('pupee.lang', 'en'))
  await page.goto(BASE + '/#/contact', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForSelector('.nav', { timeout: 15000 }).catch(() => {})
  await new Promise(r => setTimeout(r, 400))
  return page
}
const sleep = ms => new Promise(r => setTimeout(r, ms))
const clickText = (page, txt, root = 'button') => page.evaluate((t, r) => {
  const el = [...document.querySelectorAll(r)].find(e => (e.innerText || '').includes(t) && e.offsetParent !== null)
  if (el) { el.click(); return true } return false
}, txt, root)
/* 给 antd input 写入值（绕过 v-model 的 setter） */
const fill = (page, selector, val) => page.evaluate((sel, v) => {
  const el = document.querySelector(sel)
  if (!el) return false
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  setter.call(el, v)
  el.dispatchEvent(new Event('input', { bubbles: true }))
  return true
}, selector, val)
const fillN = (page, selector, idx, val) => page.evaluate((sel, i, v) => {
  const el = document.querySelectorAll(sel)[i]
  if (!el) return false
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
  setter.call(el, v)
  el.dispatchEvent(new Event('input', { bubbles: true }))
  return true
}, selector, idx, val)

/* 1. 未登录时点击询价 → 弹账户窗且聚焦订阅（gate） */
console.log('\n▸ 询价门禁（未登录）')
{
  const page = await fresh()
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForSelector('.nav'); await sleep(400)
  await clickText(page, 'Enquiry')
  await sleep(700)
  const gate = await page.evaluate(() => !!document.querySelector('.gate'))
  ok(gate, '未登录点击询价 → 弹出订阅提示（门禁生效）')
  await page.close()
}

/* 2. 注册 + 订阅链路 */
console.log('\n▸ 注册 → 订阅 → 询价可用')
{
  const page = await fresh()
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForSelector('.nav'); await sleep(400)
  await clickText(page, 'Account')
  await sleep(600)
  await fill(page, '.ant-modal input.ant-input', 'buyer@test.com')
  const pw = '.ant-modal input[type="password"]'
  await fillN(page, pw, 0, 'Abcd123!')
  await fillN(page, pw, 1, 'Abcd123!')
  await sleep(300)
  await clickText(page, 'Create account')
  await sleep(800)
  const loggedIn = await page.evaluate(() => /buyer/.test(document.querySelector('.ant-modal')?.innerText || ''))
  ok(loggedIn, '注册后显示已登录邮箱')

  await clickText(page, 'Subscribe')
  await sleep(500)
  await clickText(page, 'Subscribe', '.ant-modal .plan button')
  await sleep(800)
  const active = await page.evaluate(() => /Active/.test(document.querySelector('.ant-modal')?.innerText || ''))
  ok(active, '订阅后状态显示 Active')

  await page.evaluate(() => document.querySelector('.ant-modal-close')?.click())
  await sleep(400)
  await clickText(page, 'Enquiry')
  await sleep(500)
  const drawer = await page.evaluate(() => !!document.querySelector('.ant-drawer'))
  ok(drawer, '订阅后点击询价 → 打开询价篮抽屉（门禁放行）')
  await page.close()
}

/* 3. 弱密码被拒 */
console.log('\n▸ 密码强度校验')
{
  const page = await fresh()
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForSelector('.nav'); await sleep(400)
  await clickText(page, 'Account')
  await sleep(600)
  await fill(page, '.ant-modal input.ant-input', 'weak@test.com')
  const pw2 = '.ant-modal input[type="password"]'
  await fillN(page, pw2, 0, 'abc')
  await fillN(page, pw2, 1, 'abc')
  await sleep(300)
  await clickText(page, 'Create account')
  await sleep(600)
  const blocked = await page.evaluate(() => /too weak/i.test(document.querySelector('.ant-modal')?.innerText || ''))
  ok(blocked, '弱密码被拒绝（提示强度过低）')
  await page.close()
}

await browser.close()
console.log(`\n=========== 账户回归：${pass} 通过 / ${fail} 失败 ===========`)
if (errors.length) { console.log('\n控制台/页面错误：'); errors.forEach(e => console.log('  ! ' + e)) }
process.exit(fail ? 1 : 0)
