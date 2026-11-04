import puppeteer from 'puppeteer-core'
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox','--disable-gpu','--disable-dev-shm-usage'] })
const p = await b.newPage()
await p.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 })
await p.evaluateOnNewDocument(() => localStorage.setItem('pupee.lang','en'))
await p.goto('http://127.0.0.1:4175/', { waitUntil: 'networkidle2', timeout: 60000 })
await p.waitForSelector('.store-grid .sc')
await p.$eval('.store-grid', el => el.scrollIntoView({ block: 'center' }))
await new Promise(r => setTimeout(r, 600))
await p.screenshot({ path: '/tmp/store-section.png' })
await b.close()
console.log('shot saved')
