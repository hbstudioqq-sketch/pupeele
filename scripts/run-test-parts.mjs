import { spawnSync } from 'node:child_process'
import fs from 'node:fs'

const out = '.tmp/test-parts.bundle.mjs'
const r = spawnSync('node_modules/.bin/esbuild', [
  'scripts/test-parts.mjs',
  '--bundle', '--platform=node', '--format=esm', '--outfile=' + out,
  '--external:three', '--alias:@=./src', '--log-level=warning'
], { stdio: 'inherit' })
if (r.status !== 0) process.exit(r.status || 1)
const r2 = spawnSync('node', [out], { stdio: 'inherit' })
process.exit(r2.status || 1)
