/* ============================================================
   3D 几何与材质工具箱
   ------------------------------------------------------------
   所有部件都由这些原语拼出来，不依赖任何外部模型文件。
   关键能力：
   - lathe / sph      旋转体 / 球扇区（做贴合头部的发帽与脸片）
   - bone             两点之间的带球关节肢体（搪胶娃的关键特征）
   - taperTube        变半径管（发尾、挂绳、鞋带）
   - fixOutward       自动修正旋转体法线朝向，避免「里外翻转」
   ============================================================ */

import * as THREE from 'three'

export const D2R = Math.PI / 180

/* ---------------- 基础几何 ---------------- */

export function lathe (profile, opts = {}) {
  const { phiStart = 0, phiLength = Math.PI * 2, seg = 56 } = opts
  const pts = profile.map(p => new THREE.Vector2(Math.max(p[0], 0.001), p[1]))
  const g = new THREE.LatheGeometry(pts, seg, phiStart, phiLength)
  return fixOutward(g)
}

/* 球扇区：用来做「贴在头上的发帽 / 脸片」，天然贴合椭球 */
export function sph (phiStart, phiLength, thetaStart, thetaLength, wSeg = 56, hSeg = 36) {
  return new THREE.SphereGeometry(1, wSeg, hSeg, phiStart, phiLength, thetaStart, thetaLength)
}

export function mesh (geo, mat, opts = {}) {
  const { pos, rot, scale, shadow = true } = opts
  const m = new THREE.Mesh(geo, mat)
  if (pos) m.position.set(pos[0], pos[1], pos[2])
  if (rot) m.rotation.set(rot[0], rot[1], rot[2])
  if (scale !== undefined) {
    if (typeof scale === 'number') m.scale.setScalar(scale)
    else m.scale.set(scale[0], scale[1], scale[2])
  }
  m.castShadow = shadow
  m.receiveShadow = shadow
  return m
}

/* 两点之间的肢体：圆柱 + 两端球头（搪胶娃的球关节） */
export function bone (a, b, r, mat, { round = true, r2 = null, seg = 18 } = {}) {
  const g = new THREE.Group()
  const A = new THREE.Vector3(a[0], a[1], a[2])
  const B = new THREE.Vector3(b[0], b[1], b[2])
  const dir = new THREE.Vector3().subVectors(B, A)
  const len = dir.length()
  const cyl = new THREE.CylinderGeometry(r, r2 === null ? r : r2, len, seg, 1, true)
  const m = new THREE.Mesh(cyl, mat)
  m.position.copy(A).addScaledVector(dir, 0.5)
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize())
  /* 把圆柱接缝转到背面（默认接缝在本地 +Z，也就是正面） */
  m.rotateY(Math.PI)
  m.castShadow = true
  m.receiveShadow = true
  g.add(m)
  if (round) {
    const s1 = new THREE.Mesh(new THREE.SphereGeometry(r, seg, seg), mat)
    s1.position.copy(A)
    s1.castShadow = s1.receiveShadow = true
    const s2 = new THREE.Mesh(new THREE.SphereGeometry(r2 === null ? r : r2, seg, seg), mat)
    s2.position.copy(B)
    s2.castShadow = s2.receiveShadow = true
    g.add(s1, s2)
  }
  return g
}

/* 变半径管：发尾、挂绳、鞋带 */
export function taperTube (pts, rFn, mat, { seg = 44, rad = 14, capStart = true, capEnd = true } = {}) {
  const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0], p[1], p[2])))
  const frames = curve.computeFrenetFrames(seg, false)
  const positions = []
  const normals = []
  const uvs = []
  const indices = []
  for (let i = 0; i <= seg; i++) {
    const t = i / seg
    const P = curve.getPointAt(t)
    const N = frames.normals[i]
    const B = frames.binormals[i]
    const r = typeof rFn === 'function' ? rFn(t) : rFn
    for (let j = 0; j <= rad; j++) {
      const v = (j / rad) * Math.PI * 2
      const sv = Math.sin(v)
      const cv = -Math.cos(v)
      const nx = cv * N.x + sv * B.x
      const ny = cv * N.y + sv * B.y
      const nz = cv * N.z + sv * B.z
      positions.push(P.x + r * nx, P.y + r * ny, P.z + r * nz)
      normals.push(nx, ny, nz)
      uvs.push(t, j / rad)
    }
  }
  for (let i = 1; i <= seg; i++) {
    for (let j = 1; j <= rad; j++) {
      const a = (rad + 1) * (i - 1) + (j - 1)
      const b = (rad + 1) * i + (j - 1)
      const c = (rad + 1) * i + j
      const d = (rad + 1) * (i - 1) + j
      indices.push(a, b, d, b, c, d)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setIndex(indices)
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  if (capStart) {
    const c = new THREE.Mesh(new THREE.SphereGeometry(typeof rFn === 'function' ? rFn(0) : rFn, 12, 8), mat)
    c.position.copy(curve.getPointAt(0))
    c.castShadow = c.receiveShadow = true
    const grp = new THREE.Group()
    grp.add(new THREE.Mesh(geo, mat), c)
    grp.children[0].castShadow = grp.children[0].receiveShadow = true
    return grp
  }
  const m = new THREE.Mesh(geo, mat)
  m.castShadow = m.receiveShadow = true
  return m
}

/* 扁带：截面是椭圆（宽 > 厚），用于缎带挂绳。
   与 taperTube 同源，只是把副法线方向的半径按 flat 压扁。 */
export function taperBand (pts, rFn, mat, { seg = 44, rad = 12, flat = 0.28 } = {}) {
  const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0], p[1], p[2])))
  const frames = curve.computeFrenetFrames(seg, false)
  const positions = []
  const normals = []
  const uvs = []
  const indices = []
  for (let i = 0; i <= seg; i++) {
    const t = i / seg
    const P = curve.getPointAt(t)
    const N = frames.normals[i]
    const B = frames.binormals[i]
    const r = typeof rFn === 'function' ? rFn(t) : rFn
    for (let j = 0; j <= rad; j++) {
      const v = (j / rad) * Math.PI * 2
      const sv = Math.sin(v)
      const cv = -Math.cos(v)
      const nx = cv * N.x + sv * B.x * flat
      const ny = cv * N.y + sv * B.y * flat
      const nz = cv * N.z + sv * B.z * flat
      const inv = 1 / Math.sqrt(nx * nx + ny * ny + nz * nz)
      positions.push(P.x + r * nx, P.y + r * ny, P.z + r * nz)
      normals.push(nx * inv, ny * inv, nz * inv)
      uvs.push(t, j / rad)
    }
  }
  for (let i = 1; i <= seg; i++) {
    for (let j = 1; j <= rad; j++) {
      const a = (rad + 1) * (i - 1) + (j - 1)
      const b = (rad + 1) * i + (j - 1)
      const c = (rad + 1) * i + j
      const d = (rad + 1) * (i - 1) + j
      indices.push(a, b, d, b, c, d)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setIndex(indices)
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  const grp = new THREE.Group()
  const m = new THREE.Mesh(geo, mat)
  m.castShadow = m.receiveShadow = true
  grp.add(m)
  /* 两端补半球：否则缎带端头是敞口圆管，近看会露出内壁 */
  const r0 = typeof rFn === 'function' ? rFn(0) : rFn
  const r1 = typeof rFn === 'function' ? rFn(1) : rFn
  for (const [t, r] of [[0, r0], [1, r1]]) {
    const c = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), mat)
    c.position.copy(curve.getPointAt(t))
    c.scale.set(1, 1, flat)
    c.castShadow = c.receiveShadow = true
    grp.add(c)
  }
  return grp
}

/* 自动修正法线朝向：找到半径最大的顶点，判断法线是否朝外
   注意：绝不能无条件调用 computeVertexNormals()——旋转体/圆柱体的
   接缝顶点是「复制」而非「共享」的一对，重算法线会让这对顶点各取
   一侧的平均值，在正前方留下一道可见的竖向折痕。
   所以只在确实需要翻转时才重算。 */
export function fixOutward (geo) {
  if (!geo.attributes.normal) geo.computeVertexNormals()
  const pos = geo.attributes.position
  const nor = geo.attributes.normal
  let best = 0
  let bestR = -1
  for (let i = 0; i < pos.count; i++) {
    const r = Math.hypot(pos.getX(i), pos.getZ(i))
    if (r > bestR) { bestR = r; best = i }
  }
  const nx = nor.getX(best)
  const nz = nor.getZ(best)
  const px = pos.getX(best)
  const pz = pos.getZ(best)
  if (nx * px + nz * pz < 0) {
    const idx = geo.index
    if (idx) {
      const arr = idx.array
      for (let i = 0; i < arr.length; i += 3) {
        const t = arr[i]
        arr[i] = arr[i + 2]
        arr[i + 2] = t
      }
      idx.needsUpdate = true
    }
    geo.computeVertexNormals()
  }
  return geo
}

/* 扫掠曲面：按 (t, u) 采样生成一张「布」。
   用来做头发的后发壳——因为旋转体的包裹角是固定的，
   做不出「发根盖住头顶、发梢落到肩后」这种上宽下窄的形态。 */
export function sweptSheet (cols, rows, fn) {
  const positions = []
  const uvs = []
  const indices = []
  for (let i = 0; i <= rows; i++) {
    const t = i / rows
    for (let j = 0; j <= cols; j++) {
      const u = j / cols
      const p = fn(t, u)
      positions.push(p[0], p[1], p[2])
      uvs.push(u, t)
    }
  }
  for (let i = 1; i <= rows; i++) {
    for (let j = 1; j <= cols; j++) {
      const a = (cols + 1) * (i - 1) + (j - 1)
      const b = (cols + 1) * i + (j - 1)
      const c = (cols + 1) * i + j
      const d = (cols + 1) * (i - 1) + j
      indices.push(a, d, b, b, d, c)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setIndex(indices)
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geo.computeVertexNormals()
  return geo
}

/* 圆角盒（鞋、纽扣、配件盒） */
export function roundBox (w, h, d, r = 0.08, seg = 3) {
  const shape = new THREE.Shape()
  const x = w / 2 - r
  const y = h / 2 - r
  shape.moveTo(-x - r, -y)
  shape.lineTo(-x - r, y)
  shape.quadraticCurveTo(-x - r, y + r, -x, y + r)
  shape.lineTo(x, y + r)
  shape.quadraticCurveTo(x + r, y + r, x + r, y)
  shape.lineTo(x + r, -y)
  shape.quadraticCurveTo(x + r, -y - r, x, -y - r)
  shape.lineTo(-x, -y - r)
  shape.quadraticCurveTo(-x - r, -y - r, -x - r, -y)
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: d,
    bevelEnabled: true,
    bevelThickness: Math.min(r * 0.6, d * 0.2),
    bevelSize: Math.min(r * 0.5, d * 0.15),
    bevelSegments: seg,
    curveSegments: 8
  })
  geo.translate(0, 0, -d / 2)
  return geo
}

/* 五角星挤出（挂饰） */
export function starGeo (rOuter = 0.5, rInner = 0.22, depth = 0.12, points = 5) {
  const shape = new THREE.Shape()
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? rInner : rOuter
    const a = (Math.PI / points) * i - Math.PI / 2
    const x = Math.cos(a) * r
    const y = Math.sin(a) * r
    if (i === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  }
  shape.closePath()
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 2,
    curveSegments: 6
  })
  geo.center()
  return geo
}

/* 爱心挤出（挂饰） */
export function heartGeo (s = 0.5, depth = 0.12) {
  const shape = new THREE.Shape()
  shape.moveTo(0, s * 0.75)
  shape.bezierCurveTo(-s * 1.1, s * 0.05, -s * 0.75, -s * 0.85, 0, -s * 0.28)
  shape.bezierCurveTo(s * 0.75, -s * 0.85, s * 1.1, s * 0.05, 0, s * 0.75)
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 2,
    curveSegments: 10
  })
  geo.center()
  return geo
}

/* 圆环（拉链头、项链圈） */
export function ring (r, tube, seg = 28) {
  return new THREE.TorusGeometry(r, tube, 10, seg)
}

/* ---------------- 材质 ---------------- */

export function skinMat (color, rough = 0.42) {
  return new THREE.MeshPhysicalMaterial({
    color, roughness: rough, metalness: 0,
    clearcoat: 0.22, clearcoatRoughness: 0.6,
    sheen: 0.12, sheenRoughness: 0.7
  })
}

export function clothMat (color, { rough = 0.93, sheen = 0.35 } = {}) {
  const c = new THREE.Color(color)
  return new THREE.MeshPhysicalMaterial({
    color, roughness: rough, metalness: 0,
    sheen, sheenRoughness: 0.85,
    sheenColor: c.clone().lerp(new THREE.Color('#ffffff'), 0.55)
  })
}

export function hairMat (color) {
  const c = new THREE.Color(color)
  /* 高光要克制：sheen/clearcoat 拉满会把每绺头发都打成一条亮银色反光条，
     远看像塑料面条而不是头发。 */
  return new THREE.MeshPhysicalMaterial({
    color, roughness: 0.46, metalness: 0,
    clearcoat: 0.30, clearcoatRoughness: 0.55,
    sheen: 0.30, sheenRoughness: 0.55,
    sheenColor: c.clone().lerp(new THREE.Color('#ffffff'), 0.35)
  })
}

export function metalMat (color = '#c9c3b6') {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.26, metalness: 0.95 })
}

export function jellyMat (color) {
  return new THREE.MeshPhysicalMaterial({
    color, roughness: 0.06, metalness: 0,
    transmission: 0.92, thickness: 0.55, ior: 1.45,
    transparent: true, opacity: 1, side: THREE.DoubleSide
  })
}

export function glassMat (color) {
  return new THREE.MeshPhysicalMaterial({
    color, roughness: 0.05, metalness: 0,
    transmission: 0.9, thickness: 0.3, ior: 1.45,
    transparent: true, opacity: 1, side: THREE.DoubleSide
  })
}

/* 一次性创建整套材质：角色 → 材质，改色时只改 color */
export function makeMats (pal, opts = {}) {
  const rough = opts.skinRough ?? 0.42
  return {
    skin: skinMat(pal.skin, rough),
    hair: hairMat(pal.hair),
    main: clothMat(pal.main),
    accent: clothMat(pal.accent),
    shoe: clothMat(pal.shoe, { rough: 0.58, sheen: 0.2 }),
    metal: metalMat(),
    jelly: jellyMat(pal.shoe),
    glass: glassMat('#dfe8ee'),
    dark: new THREE.MeshStandardMaterial({ color: '#3b3531', roughness: 0.35, metalness: 0 }),
    blush: new THREE.MeshBasicMaterial({ color: '#f0908a', transparent: true, opacity: 0.32, depthWrite: false })
  }
}

/* 角色色表：改 look 时按角色刷一遍 */
export const ROLE_COLOR = {
  skin: 'skin', hair: 'hair', main: 'main', accent: 'accent',
  shoe: 'shoe', jelly: 'shoe'
}

/* 递归改色 */
export function recolor (root, pal) {
  root.traverse(o => {
    const role = o.userData && o.userData.role
    if (!role || !o.material || !o.material.color) return
    const key = ROLE_COLOR[role] || role
    if (pal[key]) o.material.color.set(pal[key])
  })
}

/* 释放一棵子树的几何与材质 */
export function disposeTree (root) {
  root.traverse(o => {
    if (o.geometry) o.geometry.dispose()
    if (o.material) {
      const list = Array.isArray(o.material) ? o.material : [o.material]
      list.forEach(m => m.dispose())
    }
  })
}

/* 确定性伪随机（保证每次渲染一致） */
export function seeded (seed) {
  let s = seed >>> 0 || 1
  return () => {
    s ^= s << 13; s >>>= 0
    s ^= s >> 17
    s ^= s << 5; s >>>= 0
    return s / 4294967296
  }
}
