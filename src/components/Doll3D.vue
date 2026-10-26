<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { makeMats, disposeTree } from '@/three/geo'
import { BUILDERS, BODY_SPECS, SIZE_SCALE } from '@/three/parts'
import { paletteOf, HEADS } from '@/data/studio3d'

const props = defineProps({
  look: { type: Object, required: true },
  bg: { type: String, default: 'soft' }
})

const { t } = useI18n()
const host = ref(null)
const autoRotate = ref(true)
const ready = ref(false)

const THEMES = {
  light: { bgTop: '#ffffff', bgBot: '#d8d9dd', floor: '#e4e5e9', fog: '#d8d9dd', key: 1.85, rim: 1.0, amb: 0.42, env: 0.5, exposure: 0.92 },
  soft: { bgTop: '#fbfbfd', bgBot: '#c2c4cc', floor: '#d8d9e0', fog: '#c2c4cc', key: 2.0, rim: 1.2, amb: 0.45, env: 0.55, exposure: 0.95 },
  dark: { bgTop: '#2a2c36', bgBot: '#060709', floor: '#101116', fog: '#060709', key: 2.5, rim: 1.9, amb: 0.3, env: 0.42, exposure: 1.05 }
}

let renderer = null
let scene = null
let camera = null
let pivot = null
let doll = null
let floor = null
let keyLight = null
let rimLight = null
let hemi = null
let envRT = null
let raf = 0
let ro = null

const view = { az: 0.28, tilt: 0.04, vel: 0, dragging: false, lx: 0, ly: 0, sway: 0 }
const size = { w: 400, h: 600 }

/* ---------------- 背景渐变 ---------------- */
function makeBgTexture (top, bottom) {
  const c = document.createElement('canvas')
  c.width = 8
  c.height = 256
  const g = c.getContext('2d')
  const grad = g.createLinearGradient(0, 0, 0, 256)
  grad.addColorStop(0, top)
  grad.addColorStop(1, bottom)
  g.fillStyle = grad
  g.fillRect(0, 0, 8, 256)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/* ---------------- 场景 ---------------- */
function initScene () {
  const el = host.value
  scene = new THREE.Scene()

  camera = new THREE.PerspectiveCamera(26, 2 / 3, 1, 120)
  camera.position.set(0, 5.2, 24)

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  el.appendChild(renderer.domElement)

  const pmrem = new THREE.PMREMGenerator(renderer)
  envRT = pmrem.fromScene(new RoomEnvironment(), 0.04)
  scene.environment = envRT.texture
  pmrem.dispose()

  keyLight = new THREE.DirectionalLight(0xffffff, 2.7)
  keyLight.position.set(6.5, 12, 8)
  keyLight.castShadow = true
  keyLight.shadow.mapSize.set(2048, 2048)
  keyLight.shadow.camera.near = 1
  keyLight.shadow.camera.far = 40
  keyLight.shadow.camera.left = -9
  keyLight.shadow.camera.right = 9
  keyLight.shadow.camera.top = 12
  keyLight.shadow.camera.bottom = -3
  keyLight.shadow.bias = -0.0009
  keyLight.shadow.normalBias = 0.022
  keyLight.shadow.radius = 4
  scene.add(keyLight)

  rimLight = new THREE.DirectionalLight(0xdfe7ff, 1.5)
  rimLight.position.set(-7, 7.5, -8)
  scene.add(rimLight)

  hemi = new THREE.HemisphereLight(0xffffff, 0xdedad2, 0.8)
  scene.add(hemi)

  floor = new THREE.Mesh(
    new THREE.CircleGeometry(60, 64),
    new THREE.MeshStandardMaterial({ color: '#e2e3e8', roughness: 0.96, metalness: 0 })
  )
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  scene.add(floor)

  pivot = new THREE.Group()
  scene.add(pivot)

  applyTheme(props.bg)
  resize()
  ro = new ResizeObserver(resize)
  ro.observe(el)
  loop()
  ready.value = true
}

function applyTheme (name) {
  if (!scene) return
  const th = THEMES[name] || THEMES.soft
  if (scene.background && scene.background.isTexture) scene.background.dispose()
  scene.background = makeBgTexture(th.bgTop, th.bgBot)
  scene.environmentIntensity = th.env
  scene.fog = new THREE.Fog(new THREE.Color(th.fog), 16, 46)
  floor.material.color.set(th.floor)
  keyLight.intensity = th.key
  rimLight.intensity = th.rim
  hemi.intensity = th.amb
  renderer.toneMappingExposure = th.exposure
}

function resize () {
  const el = host.value
  if (!el || !renderer) return
  const w = el.clientWidth || 400
  const h = el.clientHeight || 600
  size.w = w
  size.h = h
  renderer.setSize(w, h, false)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  frame()
}

/* ---------------- 取景 ---------------- */
function frame () {
  if (!doll || !camera) return
  const box = new THREE.Box3().setFromObject(doll)
  if (box.isEmpty()) return
  const c = box.getCenter(new THREE.Vector3())
  const s = box.getSize(new THREE.Vector3())
  const vFov = camera.fov * Math.PI / 180
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect)
  /* 竖屏时 d 由垂直方向决定，1.16 的余量刚好会把脚切掉一截，
     底部还要留给落地阴影，取 1.26。 */
  const dV = (s.y * 1.26 / 2) / Math.tan(vFov / 2)
  const dH = (s.x * 1.6 / 2) / Math.tan(hFov / 2)
  const d = Math.max(dV, dH, 9)
  /* 视线保持水平（相机高度 = 注视高度），否则俯角会把脚挤出画面下沿 */
  camera.position.set(0, c.y, d)
  camera.lookAt(0, c.y, 0)
}

/* ---------------- 建模 ---------------- */
function buildDoll () {
  if (!scene) return
  if (doll) {
    pivot.remove(doll)
    disposeTree(doll)
    doll = null
  }
  const look = props.look
  const spec = BODY_SPECS[look.body] || BODY_SPECS.vinyl
  const M = makeMats(paletteOf(look), { skinRough: spec.skinRough })
  const g = new THREE.Group()

  /* 头部是脸 + 发一体成型的部件：按 head id 解出五官与发型，
     两者一起建，外面再套帽子。 */
  const head = HEADS.find(h => h.id === look.head) || HEADS[0]
  g.add(BUILDERS.body(spec, M, head.face))
  g.add(BUILDERS.wig(spec, M, head.wig))
  g.add(BUILDERS.hat(spec, M, look.hat))
  g.add(BUILDERS.top(spec, M, look.top))
  g.add(BUILDERS.bottom(spec, M, look.bottom))
  g.add(BUILDERS.shoes(spec, M, look.shoes))
  g.add(BUILDERS.charm(spec, M, look.charm))
  g.add(BUILDERS.strap(spec, M, look.strap))

  const sc = SIZE_SCALE[look.size] || 1
  g.scale.setScalar(sc)
  doll = g
  pivot.add(doll)
  frame()
}

/* ---------------- 交互 ---------------- */
function onDown (e) {
  view.dragging = true
  view.lx = e.clientX
  view.ly = e.clientY
  view.vel = 0
  autoRotate.value = false
  host.value.setPointerCapture?.(e.pointerId)
}
function onMove (e) {
  if (!view.dragging) return
  const dx = e.clientX - view.lx
  const dy = e.clientY - view.ly
  view.lx = e.clientX
  view.ly = e.clientY
  view.az += dx * 0.009
  view.tilt = Math.max(-0.30, Math.min(0.30, view.tilt + dy * 0.0035))
  view.vel = dx * 0.009
}
function onUp (e) {
  view.dragging = false
  host.value?.releasePointerCapture?.(e.pointerId)
}
function onWheel (e) {
  e.preventDefault()
  const d = camera.position.z * (1 + Math.sign(e.deltaY) * 0.08)
  camera.position.z = Math.max(9, Math.min(46, d))
}

function resetView () {
  view.az = 0.28
  view.tilt = 0.04
  view.vel = 0
  view.sway = 0
  frame()
}

/* ---------------- 渲染循环 ---------------- */
function loop () {
  raf = requestAnimationFrame(loop)
  if (!renderer) return
  if (!view.dragging) {
    if (autoRotate.value) {
      /* 缓慢左右摆动，让正面始终可见（比整圈旋转更适合看款式） */
      view.sway += 0.006
      view.az = 0.26 + Math.sin(view.sway) * 0.42
    } else if (Math.abs(view.vel) > 0.0001) {
      view.az += view.vel
      view.vel *= 0.94
    }
  }
  pivot.rotation.y = view.az
  pivot.rotation.x = view.tilt
  renderer.render(scene, camera)
}

/* ---------------- 导出 ---------------- */
function download () {
  if (!renderer) return
  const prevW = size.w
  const prevH = size.h
  const prevAspect = camera.aspect
  renderer.setSize(900, 1380, false)
  camera.aspect = 900 / 1380
  camera.updateProjectionMatrix()
  frame()
  renderer.render(scene, camera)
  const url = renderer.domElement.toDataURL('image/png')
  const a = document.createElement('a')
  a.href = url
  a.download = 'pupeele-look.png'
  a.click()
  renderer.setSize(prevW, prevH, false)
  camera.aspect = prevAspect
  camera.updateProjectionMatrix()
  frame()
  renderer.render(scene, camera)
}

defineExpose({ download, resetView })

/* ---------------- 生命周期 ---------------- */
onMounted(() => {
  initScene()
  buildDoll()
  const el = host.value
  el.addEventListener('pointerdown', onDown)
  el.addEventListener('pointermove', onMove)
  el.addEventListener('pointerup', onUp)
  el.addEventListener('pointercancel', onUp)
  el.addEventListener('wheel', onWheel, { passive: false })
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  ro?.disconnect()
  if (doll) disposeTree(doll)
  if (envRT) envRT.dispose()
  renderer?.dispose()
  const el = host.value
  if (el) {
    el.removeEventListener('pointerdown', onDown)
    el.removeEventListener('pointermove', onMove)
    el.removeEventListener('pointerup', onUp)
    el.removeEventListener('pointercancel', onUp)
    el.removeEventListener('wheel', onWheel)
  }
})

watch(() => props.look, () => buildDoll(), { deep: true })
watch(() => props.bg, v => applyTheme(v))
</script>

<template>
  <div class="canvas" :class="bg">
    <div ref="host" class="host" :class="{ ready }" />
    <div class="hud">
      <button class="hud-btn" :class="{ on: autoRotate }" :title="t('studio.autoRotate')" @click="autoRotate = !autoRotate">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
          <path d="M20 12a8 8 0 1 1-2.6-5.9" />
          <path d="M20 4v4h-4" />
        </svg>
      </button>
      <button class="hud-btn" :title="t('studio.resetView')" @click="resetView">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
          <circle cx="12" cy="12" r="3.2" />
          <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
        </svg>
      </button>
    </div>
    <div class="hint">{{ t('studio.dragHint') }}</div>
  </div>
</template>

<style scoped>
.canvas {
  position: relative;
  border-radius: 22px;
  border: 1px solid var(--line-soft);
  overflow: hidden;
  background: #f2f2f4;
  aspect-ratio: 300 / 440;
  transition: background .4s, border-color .4s;
}
.canvas.dark { border-color: #23242b; }

.host { position: absolute; inset: 0; touch-action: none; cursor: grab; }
.host:active { cursor: grabbing; }
.host :deep(canvas) { display: block; width: 100% !important; height: 100% !important; }

.hud {
  position: absolute;
  right: 12px;
  top: 12px;
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.hud-btn {
  width: 32px; height: 32px;
  display: grid; place-items: center;
  border-radius: 50%;
  border: 1px solid rgba(0,0,0,.08);
  background: rgba(255,255,255,.78);
  backdrop-filter: blur(8px);
  color: #3a3a3e;
  cursor: pointer;
  transition: all .22s var(--ease);
}
.hud-btn:hover { background: #fff; transform: scale(1.06); }
.hud-btn.on { background: #1d1d1f; color: #fff; border-color: #1d1d1f; }
.canvas.dark .hud-btn {
  background: rgba(255,255,255,.1);
  border-color: rgba(255,255,255,.16);
  color: #e9e9ec;
}
.canvas.dark .hud-btn.on { background: rgba(255,255,255,.88); color: #141416; }

.hint {
  position: absolute;
  left: 14px; bottom: 12px;
  font-size: 11px;
  letter-spacing: .02em;
  color: rgba(60,60,64,.72);
  pointer-events: none;
}
.canvas.dark .hint { color: rgba(255,255,255,.55); }
</style>
