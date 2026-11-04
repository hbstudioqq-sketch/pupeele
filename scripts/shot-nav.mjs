import puppeteer from 'puppeteer-core'
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'] })
const p = await b.newPage()
await p.evaluateOnNewDocument(() => localStorage.setItem('pupee.lang', 'en'))

for (const w of [1440, 1280, 1024, 390]) {
  await p.setViewport({ width: w, height: 800, deviceScaleFactor: 1 })
  await p.goto('http://127.0.0.1:4175/#/product/sk1', { waitUntil: 'networkidle2', timeout: 60000 })
  await new Promise(r => setTimeout(r, 400))
  const r = await p.evaluate(() => {
    const nav = document.querySelector('.nav-inner')
    const nr = nav.getBoundingClientRect()
    const kids = [...nav.children].map(el => {
      const q = el.getBoundingClientRect()
      return { cls: String(el.className).split(' ')[0] || el.tagName, l: Math.round(q.left), r: Math.round(q.right), w: Math.round(q.width) }
    })
    const links = document.querySelector('.nav-links')
    const lang = document.querySelector('.lang-btn')
    const overlap = links && lang && getComputedStyle(links).display !== 'none'
      ? Math.round(links.getBoundingClientRect().right - lang.getBoundingClientRect().left)
      : 0
    return { navL: Math.round(nr.left), navR: Math.round(nr.right), kids, overlap }
  })
  const out = r.kids.filter(k => k.r > r.navR + 1 || (k.w > 0 && k.l < r.navL - 1))
  console.log(`${w}px navR=${r.navR} linksOverlap=${r.overlap}px overflow=[${out.map(k => k.cls + ':' + k.r).join(', ') || 'none'}]`)
  if (w === 1280 || w === 390) await p.screenshot({ path: `/tmp/nav-${w}.png`, clip: { x: 0, y: 0, width: w, height: 110 } })
}
await b.close()
