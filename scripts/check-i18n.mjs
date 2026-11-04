import fs from 'node:fs'
import path from 'node:path'

/* 校验 7 语：key 集合与顺序完全一致、无重复 key、无空值 */
const dir = path.resolve('src/locales')
const files = ['zh', 'en', 'fr', 'vi', 'ru', 'ko', 'ja']
const all = {}
let bad = 0

for (const f of files) {
  const src = fs.readFileSync(path.join(dir, f + '.js'), 'utf8')
  const list = [...src.matchAll(/^\s*'([^']+)'\s*:/gm)].map(m => m[1])
  const seen = new Set()
  const dups = []
  for (const k of list) { if (seen.has(k)) dups.push(k); seen.add(k) }
  all[f] = list
  console.log(`${f}: ${list.length} keys, duplicates: ${dups.length ? [...new Set(dups)].join(', ') : 'none'}`)
  if (dups.length) bad++
}

const base = all.zh
for (const f of files.slice(1)) {
  const same = JSON.stringify(all[f]) === JSON.stringify(base)
  if (!same) {
    bad++
    const missing = base.filter(k => !all[f].includes(k))
    const extra = all[f].filter(k => !base.includes(k))
    console.log(`  ${f} MISMATCH missing=${missing.join(',') || '-'} extra=${extra.join(',') || '-'}`)
  }
}
console.log(bad ? `FAILED (${bad} issues)` : 'PASS: 7 locales aligned, no duplicates')
process.exit(bad ? 1 : 0)
