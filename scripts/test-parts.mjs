/* ============================================================
   3D 部件库数据层自检（Node 直跑，不依赖 WebGL）
   ------------------------------------------------------------
   穷举所有「素体 × 品类 × 选项」组合，检查：
     1. 顶点不含 NaN / Infinity
     2. 包围盒尺寸合理（不过大、不为零、不倒挂）
     3. 旋转体法线朝外（修好 fixOutward 后仍须成立）
     4. 部件的空间位置与身体解剖位置吻合
   用法：node scripts/test-parts.mjs
   ============================================================ */

import * as THREE from 'three'
import { BODY_SPECS } from '../src/three/spec.js'
import { BUILDERS } from '../src/three/parts.js'
import { makeMats } from '../src/three/geo.js'
import { BODY_TYPES, HEADS, HATS, TOPS, BOTTOMS, SHOES, CHARMS, STRAPS } from '../src/data/studio3d.js'

/* ---------- Node 环境下的 canvas 桩 ----------
   parts.js 的五官是画进 canvas 贴图的，Node 里没有 canvas，
   这里给一个「只记录不渲染」的 2D 上下文桩，
   目的不是看画面，而是让 buildBody 能跑完、几何能被校验。 */
function stubCtx () {
  const noop = () => {}
  return {
    fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, lineCap: 'butt',
    save: noop, restore: noop, translate: noop, scale: noop, rotate: noop,
    beginPath: noop, closePath: noop, fill: noop, stroke: noop,
    moveTo: noop, lineTo: noop, quadraticCurveTo: noop, bezierCurveTo: noop,
    arc: noop, ellipse: noop, fillRect: noop, strokeRect: noop, clearRect: noop,
    drawImage: noop, setTransform: noop, getImageData: () => ({ data: new Uint8ClampedArray(4) }),
    putImageData: noop, createLinearGradient: () => ({ addColorStop: noop })
  }
}
globalThis.document = {
  createElement (tag) {
    if (tag !== 'canvas') return {}
    const cv = { width: 1, height: 1, nodeName: 'CANVAS', style: {} }
    cv.getContext = () => stubCtx()
    cv.toDataURL = () => 'data:image/png;base64,'
    return cv
  }
}

const PAL = {
  skin: '#f3d3b8', hair: '#4a3527', main: '#e8dcc8',
  accent: '#c9a27e', shoe: '#8d6e56'
}

let fails = 0
let checks = 0
function ok (cond, msg) {
  checks++
  if (!cond) { fails++; console.log('  ✗ ' + msg) }
}

/* 递归收集网格 */
function meshes (root) {
  const out = []
  root.traverse(o => { if (o.isMesh) out.push(o) })
  return out
}

function boxOf (root) {
  const b = new THREE.Box3()
  let any = false
  root.updateMatrixWorld(true)
  root.traverse(o => {
    if (!o.isMesh) return
    o.geometry.computeBoundingBox()
    const bb = o.geometry.boundingBox.clone()
    bb.applyMatrix4(o.matrixWorld)
    b.union(bb)
    any = true
  })
  return any ? b : null
}

/* NaN 检测 */
function nanCheck (root, label) {
  let bad = 0
  root.traverse(o => {
    if (!o.isMesh) return
    const p = o.geometry.attributes.position
    if (!p) { bad++; return }
    const arr = p.array
    for (let i = 0; i < arr.length; i++) {
      if (!Number.isFinite(arr[i])) { bad++; break }
    }
  })
  ok(bad === 0, `${label}: 顶点含 NaN/Inf (${bad} 个网格)`)
}

/* 法线朝外校验：取每个网格中「半径最大」的顶点，
   检查法线在该点是否与「从轴心指向顶点」的方向同向。
   对球体/旋转体/圆柱这类凸形才成立。 */
function outwardCheck (root, label) {
  let bad = 0
  meshes(root).forEach(m => {
    const g = m.geometry
    if (!g.attributes.normal || !g.attributes.position) return
    const pos = g.attributes.position
    const nor = g.attributes.normal
    if (pos.count < 12) return
    /* 求几何中心 */
    const c = new THREE.Vector3()
    for (let i = 0; i < pos.count; i++) c.add(new THREE.Vector3().fromBufferAttribute(pos, i))
    c.divideScalar(pos.count)
    /* 找离中心最远的顶点 */
    let far = 0, farD = -1
    for (let i = 0; i < pos.count; i++) {
      const d = new THREE.Vector3().fromBufferAttribute(pos, i).distanceTo(c)
      if (d > farD) { farD = d; far = i }
    }
    const v = new THREE.Vector3().fromBufferAttribute(pos, far).sub(c)
    const n = new THREE.Vector3().fromBufferAttribute(nor, far)
    if (v.lengthSq() < 1e-6) return
    if (n.dot(v) < -0.25) bad++
  })
  ok(bad === 0, `${label}: ${bad} 个网格法线朝内（旋转体朝向错误）`)
}

console.log('\n=========== 3D 部件库数据层自检 ===========\n')

const SLOTS = [
  ['hat', HATS], ['top', TOPS], ['bottom', BOTTOMS],
  ['shoes', SHOES], ['charm', CHARMS], ['strap', STRAPS]
]

for (const bt of BODY_TYPES) {
  const spec = BODY_SPECS[bt.id]
  const M = makeMats(PAL, { skinRough: spec.skinRough })
  console.log(`▸ 素体 ${bt.id}（头高 ${spec.head.cy}，肩宽 ${spec.sh.half}）`)

  /* 身体 */
  const body = BUILDERS.body(spec, M, 'round')
  nanCheck(body, 'body')
  outwardCheck(body, 'body')
  const bb = boxOf(body)
  ok(bb && Math.abs(bb.min.y) < 0.06, `body: 脚底未贴合地面 minY=${bb?.min.y.toFixed(3)}`)
  ok(bb && bb.max.y > 9.2, `body: 总高异常 maxY=${bb?.max.y.toFixed(2)}`)
  ok(bb && bb.max.x > 1.6 && bb.max.x < 3.2, `body: 横向过宽 x=${bb?.max.x.toFixed(2)}`)
  ok(bb && bb.max.x - bb.min.x > bb.max.z - bb.min.z * 0.8, 'body: 手臂未外移（横向应大于纵向）')

  /* 头部一体件（脸 + 发一体成型，只有 head 一个可换单元） */
  for (const h of HEADS) {
    const hb = BUILDERS.body(spec, M, h.face)
    nanCheck(hb, `head:${h.id}/face:${h.face}`)
    const wg = BUILDERS.wig(spec, M, h.wig)
    nanCheck(wg, `head:${h.id}/wig:${h.wig}`)
    if (h.wig === 'bald') {
      ok(boxOf(wg) === null, `head:${h.id}: 秃发款却生成了几何`)
      continue
    }
    outwardCheck(wg, `head:${h.id}/wig:${h.wig}`)
    const wb = boxOf(wg)
    ok(wb !== null, `head:${h.id}: 头发没有可见几何`)
    if (!wb) continue
    ok(wb.max.y > spec.head.cy + spec.head.ry * 0.6,
      `head:${h.id}: 头发未覆盖头顶 maxY=${wb.max.y.toFixed(2)}`)
    ok(wb.max.y < spec.height + 4.5, `head:${h.id}: 头部过高 y=${wb.max.y.toFixed(2)}`)
    ok(wb.min.y > -1.2, `head:${h.id}: 头部过低 y=${wb.min.y.toFixed(2)}`)
  }

  /* 各品类 */
  for (const [slot, list] of SLOTS) {
    for (const opt of list) {
      const label = `${slot}:${opt.id}`
      const g = BUILDERS[slot](spec, M, opt.id)
      nanCheck(g, label)
      if (opt.id === 'none' || opt.id === 'bald') {
        /* 「不加」类选项本来就没有几何，只要求不报错 */
        ok(boxOf(g) === null, `${label}: 空选项却生成了几何`)
        continue
      }
      if (slot === 'hat' || slot === 'top' || slot === 'bottom') {
        outwardCheck(g, label)
      }
      const b = boxOf(g)
      ok(b !== null, `${label}: 没有可见几何`)
      if (!b) continue
      const size = new THREE.Vector3()
      b.getSize(size)
      ok(size.y > 0.05 || size.x > 0.05 || size.z > 0.05, `${label}: 包围盒退化`)
      ok(b.max.y < spec.height + 4.5, `${label}: 顶部过高 y=${b.max.y.toFixed(2)}`)
      ok(b.min.y > -1.2, `${label}: 底部过低 y=${b.min.y.toFixed(2)}`)
      ok(size.x < 9 && size.y < 14 && size.z < 9, `${label}: 尺寸异常 ${size.x.toFixed(1)}×${size.y.toFixed(1)}×${size.z.toFixed(1)}`)
      /* 服装类应与躯干区间重叠 */
      if (slot === 'top') {
        ok(b.min.y < 5.4 && b.max.y > 4.2, `${label}: 上衣未覆盖躯干 y=[${b.min.y.toFixed(2)},${b.max.y.toFixed(2)}]`)
      }
      if (slot === 'bottom') {
        ok(b.min.y < 4.0, `${label}: 下装未落在腰部以下 minY=${b.min.y.toFixed(2)}`)
      }
      if (slot === 'shoes') {
        ok(b.min.y < 1.4, `${label}: 鞋子未落在脚部 minY=${b.min.y.toFixed(2)}`)
      }
      /* 落地基准：除了长裙/礼服，所有部件都不该低于地面 */
      if (slot === 'shoes') {
        ok(Math.abs(b.min.y) < 0.06, `${label}: 鞋底未贴合地面 minY=${b.min.y.toFixed(3)}`)
      }
      if (slot === 'bottom' && opt.id !== 'long-skirt') {
        ok(b.min.y > 0.4, `${label}: 下装拖到地面 minY=${b.min.y.toFixed(2)}`)
      }
      if (slot === 'top' && opt.id !== 'gown') {
        ok(b.min.y > 3.0, `${label}: 上装下摆过低 minY=${b.min.y.toFixed(2)}`)
      }
    }
  }
  console.log(`  ✓ ${bt.id} 全部通过`)
}

console.log(`\n=========== ${checks} 项检查，失败 ${fails} 项 ===========\n`)
process.exit(fails ? 1 : 0)
