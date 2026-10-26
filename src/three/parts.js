/* ============================================================
   3D 部件建模库
   ------------------------------------------------------------
   全部程序化生成，不依赖任何外部 3D 文件。
   素体比例参数（BODY_SPECS）决定一切：
     头身比 / 四肢粗细 / 关节位置 都从参数推导，
     所以同一套部件代码能生成搪胶娃 / 棉花娃 / 毛绒娃三种体型。

   材质角色（role）：skin hair main accent shoe metal jelly glass
   改配色时只换 material.color，不重建几何。
   ============================================================ */

import * as THREE from 'three'
import {
  D2R, lathe, sph, mesh, bone, taperTube, taperBand, roundBox, starGeo, heartGeo, ring, sweptSheet
} from './geo'
import { BODY_SPECS, SIZE_SCALE } from './spec'

export { BODY_SPECS, SIZE_SCALE }

/* ---------------- 通用几何助手 ---------------- */

/* 站立基准：场景地面在 y=0，所有「着地」的部件都以它为准。
   footPrint 给出脚掌椭球的半径、半高与中心高度，
   保证裸脚、鞋底、裤脚三者落在同一个平面上，不会出现「悬空」或「陷进地里」。 */
const GROUND = 0
function footPrint (spec) {
  const L = spec.leg
  const F = spec.foot || { r: L.r2 * 1.05, sx: 0.72, sy: 0.58, sz: 1.30, z: 0.22 }
  const r = F.r
  const h = r * F.sy
  return { r, h, sx: F.sx, sy: F.sy, sz: F.sz, cy: GROUND + h, cz: L.ankle[2] + F.z }
}

function headSurface (spec, thetaDeg, phiDeg, inflate = 0) {
  const h = spec.head
  const th = thetaDeg * D2R
  const ph = phiDeg * D2R
  const st = Math.sin(th)
  return [
    -(h.rx + inflate) * Math.cos(ph) * st,
    h.cy + (h.ry + inflate) * Math.cos(th),
    (h.rz + inflate) * Math.sin(ph) * st
  ]
}

function torsoShell (spec, mat, pad, opts = {}) {
  const { yTop, yBot, zScale, seg = 48 } = opts
  const prof = spec.torso
    .filter(p => (yTop === undefined || p[1] <= yTop) && (yBot === undefined || p[1] >= yBot))
    .map(p => [Math.max(p[0] + pad, 0.02), p[1]])
  /* phiStart = π：把旋转体的接缝转到正后方，避免出现在正面 */
  const m = mesh(lathe(prof, { seg, phiStart: Math.PI }), mat)
  m.scale.z = zScale ?? spec.torsoZ
  return m
}

function legTube (spec, mat, pad, endY) {
  const g = new THREE.Group()
  const L = spec.leg
  const r = L.r + pad
  const knee = L.knee
  const ankle = [L.ankle[0], endY, L.ankle[2]]
  g.add(bone(L.hip, knee, r, mat, { r2: r * 0.92 }))
  g.add(bone(knee, ankle, r * 0.92, mat, { r2: r * 0.84 }))
  return g
}

function armTube (spec, mat, pad, endY, fromSh) {
  const g = new THREE.Group()
  const A = spec.arm
  const r = A.r + pad
  const sh = fromSh || A.sh
  g.add(bone(sh, A.elbow, r, mat, { r2: r * 0.93 }))
  g.add(bone(A.elbow, [A.wrist[0], endY, A.wrist[2]], r * 0.93, mat, { r2: r * 0.86 }))
  return g
}

/* 脖子：从肩部向上外扩、融进球形头部。
   早期版本用直圆柱，结果头像是「球插在木棍上」，非常机械。
   这里用旋转体做出下细上粗的喇叭口，交界处与头部球面相切，
   才有搪胶娃那种「脖子和头是一体的」感觉。 */
function neckMesh (spec, M) {
  const N = spec.neck
  const y0 = N.bot
  /* 喇叭口的上半段必须比头在同一高度处的截面还细，
     否则脖子会在下巴下面鼓成一圈「领子」，头看起来像卡在瓶口上。 */
  const prof = [
    [N.r * 1.30, y0],
    [N.r * 1.02, y0 + 0.16],
    [N.r * 0.95, y0 + 0.34],
    [N.r * 1.05, y0 + 0.50],
    [N.r * 1.18, y0 + 0.62],
    [N.r * 1.40, y0 + 0.78],
    [N.r * 1.70, y0 + 0.92],
    [N.r * 1.95, y0 + 1.04]
  ]
  return mesh(lathe(prof, { seg: 40 }), M.skin)
}

/* ---------------- 素体 ---------------- */
export function buildBody (spec, M, faceId = 'round') {
  const g = new THREE.Group()
  const H = spec.head

  /* 头部：单独一份材质，把五官烘进贴图 */
  const headMat = M.skin.clone()
  headMat.map = faceTexture('#' + M.skin.color.getHexString(), faceId)
  headMat.color.set('#ffffff')
  headMat.needsUpdate = true

  const headGeo = sph(0, Math.PI * 2, 0, Math.PI)
  /* 头下半部收窄 14%：球体直接当头用会读成「灯泡」，
     收出一点下巴/颧骨线才像娃。 */
  {
    const hp = headGeo.attributes.position
    for (let i = 0; i < hp.count; i++) {
      const y = hp.getY(i)
      if (y < 0) {
        const k = 1 - 0.14 * y * y
        hp.setX(i, hp.getX(i) * k)
        hp.setZ(i, hp.getZ(i) * k)
      }
    }
    hp.needsUpdate = true
    headGeo.computeVertexNormals()
  }
  const head = mesh(headGeo, headMat, { pos: [0, H.cy, 0] })
  head.scale.set(H.rx, H.ry, H.rz)
  g.add(head)

  g.add(neckMesh(spec, M))

  g.add(torsoShell(spec, M.skin, 0, {}))

  const soft = spec.limbSoft
  for (const s of [-1, 1]) {
    const mul = v => (s < 0 ? -v : v)
    const A = spec.arm
    g.add(bone([mul(A.sh[0]), A.sh[1], A.sh[2]], [mul(A.elbow[0]), A.elbow[1], A.elbow[2]], A.r, M.skin, { r2: A.r * soft }))
    g.add(bone([mul(A.elbow[0]), A.elbow[1], A.elbow[2]], [mul(A.wrist[0]), A.wrist[1], A.wrist[2]], A.r * soft, M.skin, { r2: A.r2 }))
    const hand = mesh(new THREE.SphereGeometry(A.r2 * 1.06, 18, 14), M.skin, {
      pos: [mul(A.wrist[0]), A.wrist[1] - 0.06, A.wrist[2] + 0.03]
    })
    hand.scale.set(0.92, 1.16, 0.82)
    g.add(hand)

    const L = spec.leg
    g.add(bone([mul(L.hip[0]), L.hip[1], L.hip[2]], [mul(L.knee[0]), L.knee[1], L.knee[2]], L.r, M.skin, { r2: L.r * soft }))
    g.add(bone([mul(L.knee[0]), L.knee[1], L.knee[2]], [mul(L.ankle[0]), L.ankle[1], L.ankle[2]], L.r * soft, M.skin, { r2: L.r2 }))

    /* 脚掌：底面严格落在 y=0（站立地面），与鞋子共用同一套基准 */
    const F = footPrint(spec)
    const foot = mesh(new THREE.SphereGeometry(F.r, 20, 14), M.skin, {
      pos: [mul(L.ankle[0]), F.cy, F.cz]
    })
    foot.scale.set(F.sx, F.sy, F.sz)
    g.add(foot)
  }
  return g
}

/* ---------------- 五官（烘进头部贴图） ----------------
   早期版本把五官做成独立面片贴在头上，靠 0.4% 的半径差避免 Z 冲突 ——
   实测深度缓冲精度不够，面片会被头骨吃掉（脸直接消失）。
   现在改成把五官画进头部球体的等距柱状贴图：
     · 头部材质带 map，颜色由贴图决定（color 设为白）
     · 五官随头一起转、一起受光，没有任何深度问题
     · 也更接近真实娃「印刷脸」的工艺
   坐标系：u = phi/360°，v 行 = theta/180°
   ------------------------------------------------------------ */
const TEX_W = 1024
const TEX_H = 512
const FACE_ARC = { phiStart: 51.5, phiLength: 77, thetaStart: 66, thetaLength: 74 }

function faceTexture (skinHex, faceId) {
  const cv = document.createElement('canvas')
  cv.width = TEX_W
  cv.height = TEX_H
  const g = cv.getContext('2d')

  // 底色 = 肤色，整颗头都是这张图
  g.fillStyle = skinHex
  g.fillRect(0, 0, TEX_W, TEX_H)

  /* 旧坐标系的五官定义（512×512 铺满脸部扇区）；
     这里换算到新的等距柱状坐标系：
       新 x = phi/360 × 1024   新行 = theta/180 × 512
       脸部扇区中心 phi=90° → x=256，theta=103° → 行=293 */
  const Sx = (TEX_W / 360) / (512 / FACE_ARC.phiLength)
  const Sy = (TEX_H / 180) / (512 / FACE_ARC.thetaLength)
  g.save()
  g.translate(256, 293)
  g.scale(Sx, Sy)
  g.translate(-256, -256)

  const S = 512
  const exL = 143
  const exR = 369
  const ey = 152
  const my = 360
  const INK = '#2b2521'

  const blush = () => {
    g.fillStyle = 'rgba(240,144,138,.42)'
    g.beginPath(); g.ellipse(78, 249, 34, 24, 0, 0, Math.PI * 2); g.fill()
    g.beginPath(); g.ellipse(434, 249, 34, 24, 0, 0, Math.PI * 2); g.fill()
  }
  const eyeDot = (ex, r = 25) => {
    g.fillStyle = INK
    g.beginPath(); g.ellipse(ex, ey, r, r * 1.28, 0, 0, Math.PI * 2); g.fill()
    g.fillStyle = 'rgba(255,255,255,.95)'
    g.beginPath(); g.arc(ex - r * 0.36, ey - r * 0.46, r * 0.40, 0, Math.PI * 2); g.fill()
    g.beginPath(); g.arc(ex + r * 0.38, ey + r * 0.42, r * 0.18, 0, Math.PI * 2); g.fill()
  }
  const eyeClosed = (ex, r = 24) => {
    g.strokeStyle = INK
    g.lineWidth = 9
    g.lineCap = 'round'
    g.beginPath()
    g.arc(ex, ey - 6, r, 0.14 * Math.PI, 0.86 * Math.PI)
    g.stroke()
  }
  const eyeStar = (ex, r = 27) => {
    g.fillStyle = INK
    g.beginPath()
    for (let i = 0; i < 10; i++) {
      const rr = i % 2 ? r * 0.44 : r
      const a = (Math.PI / 5) * i - Math.PI / 2
      const x = ex + Math.cos(a) * rr
      const y = ey + Math.sin(a) * rr
      i ? g.lineTo(x, y) : g.moveTo(x, y)
    }
    g.closePath()
    g.fill()
  }
  const mouthSmile = () => {
    g.strokeStyle = INK; g.lineWidth = 9; g.lineCap = 'round'
    g.beginPath()
    g.moveTo(232, my - 12)
    g.quadraticCurveTo(256, my + 20, 280, my - 12)
    g.stroke()
  }
  const mouthOpen = () => {
    g.fillStyle = INK
    g.beginPath()
    g.moveTo(238, my - 14)
    g.quadraticCurveTo(256, my + 34, 274, my - 14)
    g.quadraticCurveTo(256, my - 4, 238, my - 14)
    g.fill()
    g.fillStyle = '#e58b8b'
    g.beginPath(); g.ellipse(256, my + 12, 11, 8, 0, 0, Math.PI * 2); g.fill()
  }
  const mouthO = () => {
    g.fillStyle = INK
    g.beginPath(); g.ellipse(256, my - 2, 14, 18, 0, 0, Math.PI * 2); g.fill()
  }

  switch (faceId) {
    case 'sleepy':
      eyeClosed(exL); eyeClosed(exR); mouthSmile(); blush(); break
    case 'star':
      eyeStar(exL); eyeStar(exR); mouthOpen(); blush(); break
    case 'wink':
      eyeClosed(exL); eyeDot(exR); mouthO(); blush(); break
    case 'blank':
      eyeDot(exL, 27); eyeDot(exR, 27); blush(); break
    default:
      eyeDot(exL); eyeDot(exR); mouthSmile(); blush(); break
  }
  void S
  g.restore()

  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

/* ---------------- 假发 ----------------
   造型逻辑：
   · 后发主体 = 旋转体（profile 由下往上，符合 three 的外法线约定），
     正面留出 ±55° 的开口给脸
   · 刘海 = 头部椭球的球扇区（前上方），天然贴合头型，不会穿模
   · 两种发长/卷度都只改参数，不改代码

   ⚠️ 相位约定（这是最容易踩坑的地方）：
   three 的 SphereGeometry 与 LatheGeometry 对同一个 phi 的解释不同：
     球面：x = -r·cosφ·sinθ,  z =  r·sinφ·sinθ   → φ=90° 才是正脸(+Z)
     旋转体：x = r·sinφ,          z =  r·cosφ       → φ=0°  才是正脸(+Z)
   所以这里统一用「方向角 δ」来描述部件位置：
     δ = 0° 正脸(+Z)，δ = 90° 右侧(+X)，δ = 180° 后脑(-Z)，δ = 270° 左侧(-X)
     球面 φ_s = δ + 90°        旋转体 φ_l = δ
   只要统一走 δ，混用两个几何体就不会再错位。            */
/* ============================================================
   头发系统：头皮帽 + 刘海绺 + 侧发绺
   ------------------------------------------------------------
   为什么不再用「一整片旋转体/球扇区」：
     · 整片壳的下缘是一条硬边 → 读成「扣了顶头盔」
     · 壳没有厚度，正面只能看到一条细边 → 读成「两条飘带」
   现在改成三件套：
     1. hairCap   贴着颅骨的薄壳，负责整体轮廓（头皮）
     2. hairBangs 一绺一绺的刘海，末端圆头，天然有层次
     3. hairLocks 脸两侧垂下的发绺，正面看是有宽度的
   ============================================================ */
const FACE_PHI = 90

/* 方向角 δ 下的头部表面点（球面约定） */
function headSurfaceAt (spec, thetaDeg, deltaDeg, inflate = 0) {
  return headSurface(spec, thetaDeg, deltaDeg + FACE_PHI, inflate)
}

/* 头皮帽：沿颅骨从头顶包到耳后，正面留一个开口给脸 */
function hairCap (spec, M, { thetaEnd = 100, wrap = 252, inflate = 0.16 } = {}) {
  const tEnd = thetaEnd * D2R
  const rows = 16
  const geo = sweptSheet(46, rows, (t, u) => {
    /* t 必须由下往上走：sweptSheet 的绕序假定「沿 t 上升」，
       反过来会让整张壳的法线朝内（头会变成一层看不见的内衬）。 */
    const th = tEnd - (tEnd - 2 * D2R) * t
    const half = wrap * D2R / 2
    const d = 180 * D2R - half + u * (2 * half)   /* δ：0=正脸 180=后脑 */
    const p = headSurface(spec, th / D2R, d / D2R + FACE_PHI, inflate)
    return p
  })
  const m = mesh(geo, M.hair)
  return m
}

/* 一绺头发：沿颅骨走一段，再脱离头皮自由垂下 */
function hairLock (spec, M, {
  delta, thetaTop = 10, thetaEnd = 100, bottom = null,
  r0 = 0.18, r1 = 0.11, swell = 1.0, forward = 0.06
} = {}) {
  const pts = []
  const steps = 5
  for (let i = 0; i <= steps; i++) {
    const th = thetaTop + (thetaEnd - thetaTop) * (i / steps)
    const infl = 0.14 + 0.05 * Math.sin((i / steps) * Math.PI)
    pts.push(headSurfaceAt(spec, th, delta, infl))
  }
  const last = pts[pts.length - 1]
  if (bottom !== null) {
    const drop = last[1] - bottom
    if (drop > 0.08) {
      /* 脱离头皮后向前飘一点，再收拢 —— 避免变成贴着身体的一根棍 */
      pts.push([last[0] * 1.02 + forward * 0.4, last[1] - drop * 0.30, last[2] * 1.05 + forward])
      pts.push([last[0] * 0.99 + forward * 0.2, last[1] - drop * 0.68, last[2] * 1.02 + forward * 0.7])
      pts.push([last[0] * 0.93, bottom, last[2] * 0.90 + forward * 0.5])
    }
  }
  return taperTube(pts, t => {
    const s = Math.sin(Math.min(1, t * 1.25) * Math.PI)
    let r = (r0 + (r1 - r0) * t) * (1 + (swell - 1) * s)
    /* 末端快速收细：taperTube 的端帽是个球，不收细的话发梢像香肠 */
    if (t > 0.84) r *= 1 - (t - 0.84) / 0.16 * 0.52
    return r
  }, M.hair, { seg: 34, rad: 12 })
}

/* 刘海：若干绺，每绺长度不同（中间短两侧长），末端圆头 */
function hairBangs (spec, M, {
  count = 6, spread = 54, thetas = null, r0 = 0.175, r1 = 0.135, lift = 0.15
} = {}) {
  const g = new THREE.Group()
  const def = thetas || [80, 70, 63, 63, 70, 80]
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1)
    const delta = -spread + 2 * spread * t
    /* 两端稍长、中间短 */
    const edge = Math.abs(t - 0.5) * 2
    const thEnd = def[i % def.length] - edge * 6
    const pts = []
    const steps = 4
    for (let k = 0; k <= steps; k++) {
      const th = 6 + (thEnd - 6) * (k / steps)
      const infl = lift + 0.05 * Math.sin((k / steps) * Math.PI)
      pts.push(headSurfaceAt(spec, th, delta, infl))
    }
    /* 末梢往外翘一点，像被吹过 */
    const last = pts[pts.length - 1]
    pts.push([last[0] * 1.04, last[1] - 0.10, last[2] * 1.05 + 0.04])
    g.add(taperTube(pts, t => {
      let r = r0 + (r1 - r0) * t
      if (t > 0.80) r *= 1 - (t - 0.80) / 0.20 * 0.48
      return r
    }, M.hair, { seg: 26, rad: 12 }))
  }
  return g
}

/* 头皮上随机撒点（卷发用），避开正面的开口 */
function hairScatter (spec, M, count, seed, { rMin = 0.22, rMax = 0.34, inflate = 0.18 } = {}) {
  const g = new THREE.Group()
  let s = seed >>> 0 || 7
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff }
  for (let i = 0; i < count; i++) {
    const delta = 62 + rnd() * 236          /* δ ∈ [62, 298]：绕开正脸开口 */
    const theta = (18 + rnd() * 74) * D2R
    const p = headSurfaceAt(spec, theta / D2R, delta, inflate + rnd() * 0.12)
    const b = mesh(new THREE.SphereGeometry(rMin + rnd() * (rMax - rMin), 14, 10), M.hair, { pos: p })
    g.add(b)
  }
  return g
}

/* 一组侧发绺：左右对称 */
function hairLocks (spec, M, { deltas, bottom, r0 = 0.185, r1 = 0.11, thetaEnd = 100, swell = 1.0 }) {
  const g = new THREE.Group()
  for (const d of deltas) {
    g.add(hairLock(spec, M, { delta: d, bottom, r0, r1, thetaEnd, swell }))
    g.add(hairLock(spec, M, { delta: -d, bottom, r0, r1, thetaEnd, swell }))
  }
  return g
}

export function buildWig (spec, M, wigId) {
  const g = new THREE.Group()
  switch (wigId) {
    case 'bald':
      break

    case 'curly': {
      g.add(hairCap(spec, M, { thetaEnd: 102, wrap: 248, inflate: 0.15 }))
      g.add(hairBangs(spec, M, { count: 9, spread: 58, thetas: [84, 76, 68, 62, 62, 68, 76, 84, 80], r0: 0.24, r1: 0.17 }))
      g.add(hairLocks(spec, M, { deltas: [58, 74, 90, 106, 122, 140], bottom: 6.35, r0: 0.25, r1: 0.19, thetaEnd: 104, swell: 1.15 }))
      g.add(hairScatter(spec, M, 30, 20240))
      break
    }

    case 'bob': {
      g.add(hairCap(spec, M, { thetaEnd: 100, wrap: 252, inflate: 0.14 }))
      g.add(hairBangs(spec, M, { count: 9, spread: 56, r0: 0.24, r1: 0.17 }))
      g.add(hairLocks(spec, M, { deltas: [58, 74, 90, 106, 122, 140], bottom: 5.92, r0: 0.25, r1: 0.16, thetaEnd: 102 }))
      break
    }

    case 'twin-tail': {
      g.add(hairCap(spec, M, { thetaEnd: 98, wrap: 250, inflate: 0.14 }))
      g.add(hairBangs(spec, M, { count: 9, spread: 58, thetas: [82, 74, 66, 60, 60, 66, 74, 82, 78], r0: 0.23, r1: 0.16 }))
      g.add(hairLocks(spec, M, { deltas: [64, 92], bottom: 6.74, r0: 0.21, r1: 0.15, thetaEnd: 100 }))
      /* 双马尾：扎在后脑偏上（δ = ±128°），顺着后脑垂到肩后 */
      for (const delta of [120, -120]) {
        const a = headSurfaceAt(spec, 64, delta, 0.14)
        const b = headSurfaceAt(spec, 84, delta, 0.12)
        const c = [a[0] * 1.02, 6.20, a[2] * 1.06]
        const d = [a[0] * 0.96, 5.05, a[2] * 1.12]
        g.add(taperTube([a, b, c, d], t => {
          let r = 0.31 * (1 - t * 0.55)
          if (t > 0.86) r *= 1 - (t - 0.86) / 0.14 * 0.45
          return r
        }, M.hair, { seg: 32, rad: 14 }))
        /* 发圈：竖着箍住马尾根部 */
        const tie = mesh(new THREE.TorusGeometry(0.15, 0.055, 8, 18), M.accent, { pos: b })
        tie.rotation.set(Math.PI / 2, 0, delta * D2R)
        g.add(tie)
      }
      break
    }

    case 'short-fluffy': {
      g.add(hairCap(spec, M, { thetaEnd: 96, wrap: 248, inflate: 0.18 }))
      g.add(hairBangs(spec, M, { count: 9, spread: 60, thetas: [86, 78, 70, 64, 62, 64, 70, 78, 86], r0: 0.25, r1: 0.18 }))
      g.add(hairLocks(spec, M, { deltas: [58, 76, 94, 112, 132], bottom: 6.55, r0: 0.26, r1: 0.20, thetaEnd: 100, swell: 1.2 }))
      /* 蓬松感集中在头顶与后脑（δ ∈ [62, 298]），不糊在脸上 */
      const puffs = [
        [26, 232, 0.20], [32, 262, 0.21], [30, 300, 0.19], [40, 248, 0.21],
        [38, 288, 0.22], [44, 214, 0.18], [46, 318, 0.19], [50, 272, 0.20],
        [22, 196, 0.17], [24, 340, 0.17]
      ]
      for (const [th, delta, rr] of puffs) {
        const p = headSurfaceAt(spec, th, delta, 0.18)
        const b = mesh(new THREE.SphereGeometry(rr, 12, 9), M.hair, { pos: p })
        b.scale.set(1.10, 0.86, 1.10)
        g.add(b)
      }
      break
    }

    default: { // long-straight
      g.add(hairCap(spec, M, { thetaEnd: 102, wrap: 252, inflate: 0.14 }))
      g.add(hairBangs(spec, M, { count: 9, spread: 56, r0: 0.24, r1: 0.17 }))
      g.add(hairLocks(spec, M, { deltas: [62, 78, 94, 110, 126, 144], bottom: 4.25, r0: 0.25, r1: 0.13, thetaEnd: 104 }))
      break
    }
  }
  return g
}

/* ---------------- 帽饰 ---------------- */
export function buildHat (spec, M, hatId) {
  const g = new THREE.Group()
  const H = spec.head
  const top = H.cy + H.ry
  switch (hatId) {
    case 'beret': {
      const b = mesh(new THREE.SphereGeometry(1, 26, 18), M.accent, {
        pos: [H.rx * 0.10, top - H.ry * 0.16, -H.rz * 0.08]
      })
      b.scale.set(H.rx * 0.92, H.ry * 0.34, H.rz * 0.92)
      g.add(b)
      g.add(mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.18, 12), M.main, {
        pos: [H.rx * 0.10, top + H.ry * 0.10, -H.rz * 0.08]
      }))
      break
    }
    case 'beanie': {
      const prof = [
        [0.05, top + H.ry * 0.33],
        [H.rx * 0.32, top + H.ry * 0.30],
        [H.rx * 0.66, top + H.ry * 0.19],
        [H.rx * 0.93, top - H.ry * 0.06],
        [H.rx * 1.02, top - H.ry * 0.30]
      ]
      const cap = mesh(lathe(prof, { seg: 44 }), M.accent)
      cap.scale.z = 0.96
      g.add(cap)
      const brim = mesh(new THREE.CylinderGeometry(H.rx * 1.10, H.rx * 1.06, H.ry * 0.22, 44), M.main, {
        pos: [0, top - H.ry * 0.38, 0]
      })
      brim.scale.z = 0.96
      g.add(brim)
      g.add(mesh(new THREE.SphereGeometry(H.rx * 0.17, 18, 12), M.main, { pos: [0, top + H.ry * 0.34, 0] }))
      break
    }
    case 'hood': {
      /* 连帽：套在头发外面的帽壳 + 前缘滚边 + 抽绳。
         早期版本用旋转体做，包裹角固定 → 正面缺口变成两堵直墙，
         看起来像折起来的纸板。这里改用扫掠曲面，包裹角随高度收拢。
         关键：帽壳半径必须大于「头发最外表面」
         （头半径 + hairCap.inflate 0.14 + 发绺半径 0.25 ≈ +0.39），
         否则帽子整个沉进头发里，正面只剩两条滚边像白飘带。 */
      const tStart = 100 * D2R
      const bot = spec.sh.y - 0.52
      const yJoin = H.cy + H.ry * Math.cos(tStart)
      const HAT = 0.56
      const rJoin = H.rx * Math.sin(tStart) + HAT
      const prof = [
        { y: bot, r: rJoin + 0.30 },
        { y: bot + (yJoin - bot) * 0.42, r: rJoin + 0.46 },
        { y: yJoin - 0.44, r: rJoin + 0.24 },
        { y: yJoin - 0.08, r: rJoin + 0.05 }
      ]
      const N = 12
      for (let i = 0; i <= N; i++) {
        const th = tStart * (1 - i / N)
        /* 顶部收口，否则帽壳在头顶留一个圆洞 */
        const cap = th < 0.30 ? th / 0.30 : 1
        prof.push({
          y: H.cy + H.ry * Math.cos(th),
          r: Math.max(0.05, (H.rx * Math.sin(th) + HAT) * cap)
        })
      }
      const rows = prof.length - 1
      const sample = t => {
        const f = Math.min(rows - 0.0001, t * rows)
        const i = Math.floor(f)
        const k = f - i
        const a = prof[i]
        const b = prof[i + 1]
        return { y: a.y + (b.y - a.y) * k, r: a.r + (b.r - a.r) * k }
      }
      const pointAt = (t, u) => {
        const p = sample(t)
        const k = Math.max(0, Math.min(1, (p.y - bot) / Math.max(0.001, yJoin - bot)))
        const wrap = 250 - 80 * (1 - k)
        const half = wrap * D2R / 2
        const a = 180 * D2R - half + u * (2 * half)
        return [p.r * Math.sin(a), p.y, p.r * Math.cos(a) * (H.rz / H.rx)]
      }
      g.add(mesh(sweptSheet(44, rows, pointAt), M.main))
      /* 前缘滚边：两条细绳，只包住帽口上半圈（往下会像两条粗绳索） */
      for (const u of [0, 1]) {
        const pts = []
        for (let i = 0; i <= 14; i++) pts.push(pointAt(0.34 + (i / 14) * 0.66, u))
        g.add(taperTube(pts, t => 0.055 * (1 - t * 0.22), M.accent, { seg: 24, rad: 8 }))
      }
      /* 抽绳：从帽口下缘两侧垂到胸前。
         起点必须推到脸侧外侧（p[0]*0.62 / p[2]*0.55），
         否则绳会斜穿过脸颊，看起来像两根挂在脸上的面条。 */
      for (const u of [0, 1]) {
        const p = pointAt(0.22, u)
        const s = Math.sign(p[0]) || 1
        g.add(taperTube([
          [p[0] * 0.62, p[1] + 0.10, p[2] * 0.55],
          [s * 0.80, spec.sh.y - 0.26, H.rz * 0.62],
          [s * 0.66, spec.sh.y - 0.82, H.rz * 0.54]
        ], t => 0.045 * (1 - t * 0.25), M.accent, { seg: 20, rad: 8 }))
      }
      break
    }
    case 'bucket': {
      const prof = [
        [0.05, top + H.ry * 0.26],
        [H.rx * 0.34, top + H.ry * 0.23],
        [H.rx * 0.66, top + H.ry * 0.11],
        [H.rx * 0.93, top - H.ry * 0.14],
        [H.rx * 1.0, top - H.ry * 0.30]
      ]
      const cap = mesh(lathe(prof, { seg: 40 }), M.main)
      cap.scale.z = 0.96
      g.add(cap)
      /* 渔夫帽是短檐直筒，不是宽檐礼帽：半径收到头围 + 一点，檐口略微下撇 */
      const brim = mesh(new THREE.CylinderGeometry(H.rx * 1.13, H.rx * 1.19, 0.30, 44), M.accent, {
        pos: [0, top - H.ry * 0.40, 0]
      })
      brim.scale.z = 0.96
      g.add(brim)
      break
    }
  }
  return g
}

/* ---------------- 服装辅助 ---------------- */

/* 躯干在某个高度的实际半径（用来做贴合的腰带/领口，避免悬空） */
function torsoRadiusAt (spec, y) {
  const p = spec.torso
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[i]
    const b = p[i + 1]
    if ((y >= a[1] && y <= b[1]) || (y <= a[1] && y >= b[1])) {
      const t = Math.abs(b[1] - a[1]) < 1e-6 ? 0 : (y - a[1]) / (b[1] - a[1])
      return a[0] + (b[0] - a[0]) * t
    }
  }
  return p[p.length - 1][0]
}

/* 躯干顶端的收口高度（也是「领口」所在高度） */
function torsoTop (spec) {
  return spec.torso[spec.torso.length - 1][1]
}

/* 贴合身体的腰带：半径取自躯干轮廓，不会像悬空圆环那样出戏 */
function beltRing (spec, mat, y, { tube = 0.055, extra = 0.02, pad = 0 } = {}) {
  const r = torsoRadiusAt(spec, y) + extra + pad
  const t = mesh(new THREE.TorusGeometry(r, tube, 8, 40), mat, { pos: [0, y, 0] })
  t.rotation.x = Math.PI / 2
  t.scale.z = spec.torsoZ
  return t
}

/* 领口：套在脖子根部（躯干顶收口处），不是埋在胸口里 */
function collarRing (spec, mat, { lift = 0.05, scale = 1.04, tube = 0.07 } = {}) {
  const r = spec.neck.r * scale
  const c = mesh(new THREE.TorusGeometry(r, tube, 10, 32), mat, {
    pos: [0, torsoTop(spec) + lift, 0]
  })
  c.rotation.x = Math.PI / 2
  return c
}

/* 立领（冲锋衣 / 连帽衫）：脖子外一圈开口的筒 */
function standCollar (spec, mat, { lift = 0.12, h = 0.34 } = {}) {
  const c = mesh(
    new THREE.CylinderGeometry(spec.neck.r * 1.34, spec.neck.r * 1.18, h, 26, 1, true),
    mat,
    { pos: [0, torsoTop(spec) + lift + h / 2 - 0.06, 0] }
  )
  return c
}

/* 袖子：起点埋进躯干、末端圆角收口，不会出现开口/穿模 */
function sleeve (spec, mat, { endY, r0 = 0.24, r1 = 0.33 }) {
  const g = new THREE.Group()
  const A = spec.arm
  for (const s of [-1, 1]) {
    const mul = v => (s < 0 ? -v : v)
    const p0 = [mul(A.sh[0] * 0.58), spec.sh.y + 0.10, 0]
    const p1 = [mul(A.sh[0] * 0.99), A.sh[1] - 0.12, 0]
    const p2 = [mul(A.elbow[0] * 0.98), A.elbow[1] + 0.26, 0.02]
    const p3 = [mul(A.elbow[0] * 1.01), endY, 0.03]
    g.add(taperTube([p0, p1, p2, p3], t => r0 + (r1 - r0) * t, mat, { seg: 26, rad: 12 }))
  }
  return g
}

/* 裤腿：从髋部包到脚踝，两端圆角。
   路径往外撑一点、面料厚度收一点，否则两条裤腿会粘成一根柱子。 */
function trouserLeg (spec, mat, { topY, endY, pad = 0.07, taper = 0.30 }) {
  const g = new THREE.Group()
  const L = spec.leg
  for (const s of [-1, 1]) {
    const mul = v => (s < 0 ? -v : v)
    /* 裤腿顶端往中间收，两腿在腰部连成一片，被臀部块盖住 */
    const p0 = [mul(L.hip[0] * 0.56), topY, 0]
    const p1 = [mul(L.hip[0] * 1.06), L.hip[1], 0]
    const p2 = [mul(L.knee[0] * 1.10), L.knee[1], L.knee[2]]
    const p3 = [mul(L.ankle[0] * 1.02), endY, L.ankle[2]]
    g.add(taperTube([p0, p1, p2, p3], t => (L.r + pad) * (1 - t * taper), mat, { seg: 30, rad: 12 }))
  }
  return g
}

/* ---------------- 上装 ---------------- */
export function buildTop (spec, M, topId) {
  const g = new THREE.Group()
  switch (topId) {
    case 'knit': {
      g.add(torsoShell(spec, M.main, 0.075, { yTop: 6.38 }))
      g.add(sleeve(spec, M.main, { endY: spec.arm.elbow[1] - 0.42, r0: 0.23, r1: 0.30 }))
      g.add(beltRing(spec, M.accent, spec.hip.y + 0.12, { tube: 0.05, pad: 0.115 }))
      g.add(beltRing(spec, M.accent, spec.hip.y + 0.28, { tube: 0.04, extra: 0.035, pad: 0.115 }))
      g.add(collarRing(spec, M.accent, { lift: 0.05, scale: 1.06, tube: 0.075 }))
      break
    }
    case 'tee': {
      g.add(torsoShell(spec, M.main, 0.055, { yTop: 6.30 }))
      g.add(sleeve(spec, M.main, { endY: spec.arm.elbow[1] + 0.28, r0: 0.21, r1: 0.27 }))
      g.add(collarRing(spec, M.accent, { lift: 0.03, scale: 1.10, tube: 0.065 }))
      g.add(mesh(new THREE.CircleGeometry(0.15, 20), M.accent, {
        pos: [-spec.sh.half * 0.42, spec.sh.y + 0.56, spec.sh.half * 0.66]
      }))
      break
    }
    case 'gown': {
      g.add(torsoShell(spec, M.main, 0.05, { yTop: 6.24 }))
      /* 及地长裙：从腰部垂到接近地面 */
      const hemY = 0.22
      const gh = spec.hip.y - hemY
      const skirt = mesh(new THREE.CylinderGeometry(spec.hip.half * 1.02, spec.hip.half * 1.70, gh, 44, 1, true), M.main, {
        pos: [0, hemY + gh / 2, 0]
      })
      skirt.scale.z = 0.92
      g.add(skirt)
      const cap = mesh(new THREE.CircleGeometry(spec.hip.half * 1.70, 44), M.main, {
        pos: [0, hemY, 0]
      })
      cap.rotation.x = Math.PI / 2
      cap.scale.z = 0.92
      g.add(cap)
      /* 领口一排珍珠：贴着胸口曲面走，不能浮在空中 */
      for (let i = 0; i < 5; i++) {
        const dx = (i - 2) * 0.22
        const dy = torsoTop(spec) - 0.10 - Math.abs(i - 2) * 0.055
        const rr = torsoRadiusAt(spec, dy) + 0.05
        g.add(mesh(new THREE.SphereGeometry(0.085, 12, 8), M.accent, {
          pos: [dx, dy, Math.sqrt(Math.max(0.004, rr * rr - dx * dx)) * spec.torsoZ]
        }))
      }
      break
    }
    case 'shell': {
      g.add(torsoShell(spec, M.main, 0.135, { yTop: 6.40 }))
      g.add(sleeve(spec, M.main, { endY: spec.arm.elbow[1] - 0.22, r0: 0.27, r1: 0.34 }))
      g.add(mesh(roundBox(0.06, 1.5, 0.05, 0.02), M.accent, {
        pos: [0, spec.sh.y - 0.52, spec.sh.half * 0.82]
      }))
      g.add(mesh(roundBox(0.40, 0.30, 0.06, 0.05), M.accent, {
        pos: [spec.sh.half * 0.52, spec.sh.y - 0.60, spec.sh.half * 0.76]
      }))
      g.add(standCollar(spec, M.accent, { lift: 0.10, h: 0.36 }))
      break
    }
  }
  return g
}

/* ---------------- 下装 ---------------- */
export function buildBottom (spec, M, bottomId) {
  const g = new THREE.Group()
  const hip = spec.hip
  /* 臀部块：上宽下收的连续曲线。
     早期版本下沿收到 hip.half*0.56 且垂到髋线以下 0.28，
     渲染出来就是一坨盖在腿根上的「尿布」。 */
  const hipBlock = (mat, yTop) => {
    const m = mesh(lathe([
      [hip.half * 0.82, hip.y - 0.28],
      [hip.half * 0.95, hip.y - 0.02],
      [hip.half, hip.y + 0.20],
      [hip.half * 0.94, yTop]
    ], { seg: 40 }), mat)
    m.scale.z = spec.torsoZ
    return m
  }
  switch (bottomId) {
    case 'pants': {
      /* 裤脚停在鞋面之上（不是拖到地上） */
      g.add(trouserLeg(spec, M.main, { topY: spec.leg.hip[1] + 0.10, endY: spec.leg.ankle[1] + 0.22, pad: 0.075, taper: 0.32 }))
      g.add(hipBlock(M.main, hip.y + 0.46))
      g.add(beltRing(spec, M.accent, hip.y + 0.30, { tube: 0.055, pad: 0.09 }))
      break
    }
    case 'shorts': {
      g.add(trouserLeg(spec, M.main, { topY: spec.leg.hip[1] + 0.10, endY: hip.y - 0.74, pad: 0.075 }))
      g.add(hipBlock(M.main, hip.y + 0.42))
      break
    }
    case 'skirt': {
      const skirt = mesh(new THREE.CylinderGeometry(hip.half * 0.99, hip.half * 1.55, 1.45, 44, 1, true), M.main, {
        pos: [0, hip.y - 0.70, 0]
      })
      skirt.scale.z = 0.92
      g.add(skirt)
      const cap = mesh(new THREE.CircleGeometry(hip.half * 1.55, 44), M.main, { pos: [0, hip.y - 1.42, 0] })
      cap.rotation.x = Math.PI / 2
      cap.scale.z = 0.92
      g.add(cap)
      g.add(beltRing(spec, M.accent, hip.y + 0.04, { tube: 0.06, pad: 0.08 }))
      break
    }
    case 'long-skirt': {
      const mat = M.main.clone()
      mat.transparent = true
      mat.opacity = 0.84
      mat.side = THREE.DoubleSide
      /* 及地长裙：下摆落到接近地面 */
      const lh = hip.y - 0.18
      const skirt = mesh(new THREE.CylinderGeometry(hip.half * 0.97, hip.half * 1.78, lh, 44, 1, true), mat, {
        pos: [0, 0.18 + lh / 2, 0]
      })
      skirt.scale.z = 0.94
      g.add(skirt)
      const cap = mesh(new THREE.CircleGeometry(hip.half * 1.78, 44), mat, { pos: [0, 0.18, 0] })
      cap.rotation.x = Math.PI / 2
      cap.scale.z = 0.94
      g.add(cap)
      g.add(beltRing(spec, M.accent, hip.y + 0.04, { tube: 0.06, pad: 0.08 }))
      break
    }
  }
  return g
}

/* ---------------- 鞋履 ----------------
   所有鞋都以 GROUND(y=0) 为基准：鞋底板贴地，鞋面从鞋底板往上长，
   这样裸脚和穿鞋两种状态下脚都不会穿地或悬空。 */
export function buildShoes (spec, M, shoeId) {
  const g = new THREE.Group()
  const L = spec.leg
  const F = footPrint(spec)
  for (const s of [-1, 1]) {
    const x = s < 0 ? -L.ankle[0] : L.ankle[0]
    const z = L.ankle[2]
    if (shoeId === 'leather') {
      const soleH = 0.07
      const shoeR = F.r * 1.05
      const shoeHY = shoeR * 0.66
      const shoe = mesh(new THREE.SphereGeometry(shoeR, 20, 16), M.shoe, {
        pos: [x, GROUND + soleH * 0.8 + shoeHY * 0.94, F.cz - 0.06]
      })
      shoe.scale.set(0.96, 0.68, 1.44)
      g.add(shoe)
      /* 鞋底：比鞋面小一圈的软底，不然会像踩了块砖 */
      const sole = mesh(roundBox(F.r * 1.06, soleH, F.r * 1.58, 0.055), M.dark, {
        pos: [x, GROUND + soleH / 2, F.cz - 0.02]
      })
      g.add(sole)
      /* 鞋面压线 */
      g.add(mesh(new THREE.TorusGeometry(F.r * 0.94, 0.035, 8, 26), M.dark, {
        pos: [x, GROUND + soleH + shoeHY * 1.45, F.cz - 0.16]
      }))
    } else if (shoeId === 'canvas') {
      const soleH = 0.10
      const shoeR = F.r * 1.08
      const shoeHY = shoeR * 0.70
      /* 高帮鞋筒：套住脚踝 */
      const shaft = mesh(new THREE.CylinderGeometry(L.r2 * 1.32, L.r2 * 1.55, 0.42, 20, 1, true), M.shoe, {
        pos: [x, L.ankle[1] + 0.16, z]
      })
      g.add(shaft)
      const shoe = mesh(new THREE.SphereGeometry(shoeR, 20, 16), M.shoe, {
        pos: [x, GROUND + soleH * 0.8 + shoeHY * 0.94, F.cz - 0.04]
      })
      shoe.scale.set(1.0, 0.70, 1.40)
      g.add(shoe)
      const sole = mesh(roundBox(F.r * 1.12, soleH, F.r * 1.62, 0.055), M.dark, {
        pos: [x, GROUND + soleH / 2, F.cz + 0.02]
      })
      g.add(sole)
      /* 鞋带 */
      for (let i = 0; i < 3; i++) {
        g.add(mesh(new THREE.TorusGeometry(L.r2 * 1.30, 0.028, 6, 22), M.dark, {
          pos: [x, L.ankle[1] + 0.04 + i * 0.14, z]
        }))
      }
    } else if (shoeId === 'jelly') {
      const shoeR = F.r * 1.12
      const shoeHY = shoeR * 0.72
      const shoe = mesh(new THREE.SphereGeometry(shoeR, 22, 16), M.jelly, {
        pos: [x, GROUND + shoeHY, F.cz - 0.02]
      })
      shoe.scale.set(1.0, 0.72, 1.44)
      shoe.castShadow = false
      g.add(shoe)
    }
  }
  return g
}

/* ============================================================
   挂绳与挂饰
   ------------------------------------------------------------
   产品语义：这是「包挂 + 斜挎挂绳」的组合，不是戴在头上的装饰。
     · 挂绳 = 一条从左肩斜挎到右髋外侧、末端垂下的绳
     · 挂饰 = 吊在挂绳末端的小物件（龙虾扣 / 星 / 珠串 / 心）
   所以挂饰必须吊在绳子的末端，两边共用同一个锚点，
   否则挂饰会凭空悬浮在身体旁边。
   ============================================================ */

/* 斜挎绳末端的挂点（挂绳和挂饰共用） */
function strapAnchor (spec) {
  /* 锚点必须在身体轮廓之外（腰半宽 1.19 / 髋 1.22），
     否则挂饰会被裙子或大腿整个吞掉。 */
  return [1.62, 3.66, 0.50]
}

/* 斜挎绳路径：贴着躯干前表面从左肩走到右髋，再自由垂下 */
function strapPath (spec) {
  const pts = []
  const yTop = 6.10
  const yHip = 4.28
  const yEnd = 3.72
  const N = 9
  for (let i = 0; i <= N; i++) {
    const t = i / N
    const y = yTop + (yEnd - yTop) * t
    /* 肩 → 髋的斜线，末端甩到身体外侧 */
    const x = -1.05 + 2.35 * Math.pow(t, 1.55)
    const r = torsoRadiusAt(spec, Math.min(y, spec.torso[spec.torso.length - 1][1] - 0.02))
    let z = Math.sqrt(Math.max(0, r * r - x * x)) * spec.torsoZ + 0.07
    /* 低于髋部后绳身脱离身体，自由垂下 */
    if (y < yHip) z = Math.max(0.30, z - (yHip - y) * 0.22)
    pts.push([x, y, z])
  }
  return pts
}

/* ---------------- 挂绳 ---------------- */
export function buildStrap (spec, M, strapId) {
  const g = new THREE.Group()
  if (!strapId || strapId === 'none') return g
  const path = strapPath(spec)
  const anchor = strapAnchor(spec)
  switch (strapId) {
    case 'bead-chain': {
      /* 珠链：沿路径等距排珠，最后几颗收到锚点 */
      const n = 30
      for (let i = 0; i <= n; i++) {
        const t = i / n
        const idx = t * (path.length - 1)
        const i0 = Math.min(path.length - 2, Math.floor(idx))
        const k = idx - i0
        const a = path[i0]
        const b = path[i0 + 1]
        const p = [
          a[0] + (b[0] - a[0]) * k,
          a[1] + (b[1] - a[1]) * k,
          a[2] + (b[2] - a[2]) * k
        ]
        const r = i === n ? 0.105 : 0.10
        g.add(mesh(new THREE.SphereGeometry(r, 12, 9), i % 3 === 0 ? M.accent : M.metal, { pos: p }))
      }
      /* 末端挂环 */
      const link = mesh(new THREE.TorusGeometry(0.10, 0.032, 8, 18), M.metal, { pos: anchor })
      link.rotation.y = 0.4
      g.add(link)
      break
    }
    case 'leather-cord': {
      g.add(taperTube(path, t => 0.072 * (1 - t * 0.18), M.accent, { seg: 46, rad: 10 }))
      /* 末端金属环 + 皮扣 */
      const link = mesh(new THREE.TorusGeometry(0.115, 0.035, 8, 18), M.metal, { pos: anchor })
      link.rotation.set(0.3, 0.4, 0)
      g.add(link)
      g.add(mesh(roundBox(0.16, 0.22, 0.07, 0.04), M.metal, {
        pos: [anchor[0] - 0.02, anchor[1] + 0.18, anchor[2]]
      }))
      break
    }
    case 'ribbon': {
      /* 缎带：扁截面沿斜挎路径铺过去，末端打一个蝴蝶结 */
      g.add(taperBand(path, t => 0.13 * (1 - t * 0.14), M.accent, { seg: 52, rad: 12, flat: 0.26 }))
      const bowY = anchor[1] + 0.16
      const bowZ = anchor[2] - 0.06
      /* 两片实心缎带瓣：空心圆环从正面读成「两个圈」，
         实心压扁的椭圆瓣才读得出蝴蝶结。 */
      for (const s of [-1, 1]) {
        const lobe = mesh(new THREE.SphereGeometry(0.30, 18, 12), M.accent, {
          pos: [anchor[0] + s * 0.30, bowY, bowZ]
        })
        lobe.scale.set(1.05, 0.44, 0.30)
        lobe.rotation.set(0.10, 0.34, s * 0.34)
        g.add(lobe)
      }
      const knot = mesh(roundBox(0.22, 0.16, 0.14, 0.05), M.main, { pos: [anchor[0], bowY, bowZ + 0.02] })
      knot.rotation.z = 0.12
      g.add(knot)
      /* 飘带：两条从结心垂下 */
      for (const s of [-1, 1]) {
        g.add(taperBand([
          [anchor[0] + s * 0.06, bowY - 0.06, bowZ + 0.01],
          [anchor[0] + s * 0.16, bowY - 0.30, bowZ - 0.02],
          [anchor[0] + s * 0.10, bowY - 0.52, bowZ - 0.06]
        ], t => 0.085 * (1 - t * 0.28), M.accent, { seg: 20, rad: 10, flat: 0.28 }))
      }
      break
    }
  }
  return g
}

/* ---------------- 挂饰（吊在挂绳末端） ---------------- */
export function buildCharm (spec, M, charmId) {
  const g = new THREE.Group()
  if (!charmId || charmId === 'none') return g
  const A = strapAnchor(spec)
  /* 与挂绳末端相连的金属环 */
  const link = mesh(new THREE.TorusGeometry(0.115, 0.034, 8, 18), M.metal, { pos: [A[0], A[1] - 0.08, A[2]] })
  link.rotation.set(0.25, 0.45, 0)
  g.add(link)
  /* 主体吊在环下 */
  const bodyY = A[1] - 0.66
  switch (charmId) {
    case 'clasp': {
      /* 龙虾扣：扣环 + 钩体 */
      const ring = mesh(new THREE.TorusGeometry(0.15, 0.045, 8, 20), M.metal, {
        pos: [A[0], bodyY, A[2]]
      })
      ring.rotation.y = 0.5
      g.add(ring)
      const hook = mesh(new THREE.TorusGeometry(0.20, 0.05, 8, 22, Math.PI * 1.45), M.metal, {
        pos: [A[0] + 0.02, bodyY - 0.36, A[2]]
      })
      hook.rotation.set(0.2, 0.5, 0.4)
      g.add(hook)
      g.add(mesh(roundBox(0.10, 0.22, 0.08, 0.03), M.accent, {
        pos: [A[0] + 0.01, bodyY - 0.18, A[2]]
      }))
      break
    }
    case 'star': {
      const st = mesh(starGeo(0.40, 0.175, 0.11), M.accent, { pos: [A[0], bodyY, A[2]] })
      st.rotation.set(0.16, 0.55, -0.12)
      g.add(st)
      break
    }
    case 'beads': {
      const cols = [M.accent, M.main, M.metal]
      for (let i = 0; i < 5; i++) {
        g.add(mesh(new THREE.SphereGeometry(0.125, 14, 10), cols[i % 3], {
          pos: [A[0] - 0.02, bodyY - 0.16 - i * 0.24, A[2] + 0.02]
        }))
      }
      break
    }
    case 'heart': {
      const h = mesh(heartGeo(0.38, 0.12), M.accent, { pos: [A[0], bodyY, A[2]] })
      h.rotation.set(0.14, 0.5, -0.10)
      g.add(h)
      break
    }
  }
  return g
}

/* ---------------- 统一入口 ---------------- */
export const BUILDERS = {
  body: (spec, M, faceId) => buildBody(spec, M, faceId || 'round'),
  wig: (spec, M, id) => buildWig(spec, M, id),
  hat: (spec, M, id) => buildHat(spec, M, id),
  top: (spec, M, id) => buildTop(spec, M, id),
  bottom: (spec, M, id) => buildBottom(spec, M, id),
  shoes: (spec, M, id) => buildShoes(spec, M, id),
  charm: (spec, M, id) => buildCharm(spec, M, id),
  strap: (spec, M, id) => buildStrap(spec, M, id)
}

export { ring }
