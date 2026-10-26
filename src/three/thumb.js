/* ============================================================
   3D 缩略图渲染器
   ------------------------------------------------------------
   用一个独立的离屏 WebGL 上下文，把「素体 + 某个部件」渲成 PNG，
   供搭配间右侧的选项按钮使用。
   · 单例 renderer，避免多上下文
   · 结果按 key 缓存，同一个选项只渲一次
   · 与主画面共用同一套建模代码 → 缩略图与实物一致
   ============================================================ */

import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { makeMats, disposeTree } from './geo'
import { BODY_SPECS, BUILDERS } from './parts'
import { HEADS } from '@/data/studio3d'

const THUMB_PALETTE = {
  skin: '#f3d3b8',
  hair: '#4a3527',
  main: '#e3d3b4',
  accent: '#b9855c',
  shoe: '#7b5b3a'
}

let renderer = null
let envTex = null
const cache = new Map()

function ensureRenderer () {
  if (renderer) return renderer
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true
  })
  renderer.setPixelRatio(1.5)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.shadowMap.enabled = false
  const pmrem = new THREE.PMREMGenerator(renderer)
  envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  pmrem.dispose()
  return renderer
}

/**
 * 渲染一张缩略图
 * @param {string} key      缓存键
 * @param {Function} build  (spec, mats) => THREE.Object3D
 * @param {string} specKey  素体类型
 * @param {number} size     像素边长
 */
export function renderThumb (key, build, specKey = 'vinyl', size = 160) {
  if (cache.has(key)) return cache.get(key)

  const r = ensureRenderer()
  const spec = BODY_SPECS[specKey] || BODY_SPECS.vinyl
  const M = makeMats(THUMB_PALETTE, { skinRough: spec.skinRough })

  const scene = new THREE.Scene()
  scene.environment = envTex
  scene.environmentIntensity = 0.85

  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 200)
  const k = new THREE.DirectionalLight(0xffffff, 2.6)
  k.position.set(5, 9, 7)
  scene.add(k)
  const rim = new THREE.DirectionalLight(0xdfe6ff, 1.4)
  rim.position.set(-6, 4, -6)
  scene.add(rim)
  scene.add(new THREE.HemisphereLight(0xffffff, 0xdfd9d0, 0.75))

  const obj = build(spec, M)
  scene.add(obj)

  // 按包围盒取景
  const box = new THREE.Box3().setFromObject(obj)
  let url = ''
  if (!box.isEmpty()) {
    const c = box.getCenter(new THREE.Vector3())
    const s = box.getSize(new THREE.Vector3())
    const vFov = cam.fov * Math.PI / 180
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * cam.aspect)
    const dV = (s.y * 1.16 / 2) / Math.tan(vFov / 2)
    const dH = (s.x * 1.55 / 2) / Math.tan(hFov / 2)
    const d = Math.max(dV, dH, 8)
    cam.position.set(0, c.y + s.y * 0.03, d)
    cam.lookAt(0, c.y, 0)
    cam.updateProjectionMatrix()

    r.setSize(size, size, false)
    r.render(scene, cam)
    url = r.domElement.toDataURL('image/png')
  }

  disposeTree(obj)
  scene.clear()
  cache.set(key, url)
  return url
}

export function clearThumbs () {
  cache.clear()
}

/* ---------------- 部位缩略图（带素体） ---------------- */

/* 需要把部件穿到素体上显示 */
const ON_BODY = new Set(['head', 'hat', 'top', 'bottom', 'shoes', 'charm', 'strap'])

/**
 * 渲染某个「部位选项」的缩略图
 * @param {string} slot    body | head | hat | top | bottom | shoes | charm | strap
 * @param {string} id      选项 id
 * @param {string} specKey 素体类型（仅 body 槽使用）
 */
export function renderSlotThumb (slot, id, specKey = 'vinyl') {
  const key = `${slot}:${id}`
  if (cache.has(key)) return cache.get(key)

  if (slot === 'body') {
    return renderThumb(key, (spec, M) => BUILDERS.body(spec, M, 'round'), id)
  }

  /* 头部槽：脸 + 发一体，整颗头连头发一起换 */
  if (slot === 'head') {
    const head = HEADS.find(h => h.id === id)
    if (!head) return ''
    return renderThumb(key, (spec, M) => {
      const g = new THREE.Group()
      g.add(BUILDERS.body(spec, M, head.face))
      g.add(BUILDERS.wig(spec, M, head.wig))
      return g
    }, 'vinyl')
  }

  const build = BUILDERS[slot]
  if (!build) return ''

  return renderThumb(key, (spec, M) => {
    const g = new THREE.Group()
    if (ON_BODY.has(slot)) g.add(BUILDERS.body(spec, M, 'round'))
    g.add(build(spec, M, id))
    return g
  }, specKey)
}
