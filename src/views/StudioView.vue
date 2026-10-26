<script setup>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount, defineAsyncComponent } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import message from 'ant-design-vue/es/message'
import {
  BODY_TYPES, HEADS, HATS, TOPS, BOTTOMS, SHOES, CHARMS, STRAPS,
  PALETTES, SKIN_TONES, HAIR_COLORS, FABRIC_COLORS,
  DEFAULT_LOOK, STEPS, encodeLook, decodeLook, buildBOM
} from '@/data/studio3d'
import { SIZES, STYLES } from '@/data/taxonomy'
import Thumb3D from '@/components/Thumb3D.vue'
import Swatches from '@/components/Swatches.vue'
import SendSheet from '@/components/SendSheet.vue'
import { header, copyText } from '@/composables/useSend'
import { useEnquiryStore } from '@/stores/enquiry'

const Doll3D = defineAsyncComponent(() => import('@/components/Doll3D.vue'))

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const enquiry = useEnquiryStore()

const look = reactive({ ...DEFAULT_LOOK })
const step = ref(0)
const bg = ref('soft')
const canvasRef = ref(null)
const sendOpen = ref(false)
const sendText = ref('')

/* 选项名走 locale key（数据层已 key 化），切换语言即时生效 */
const nm = o => (o && o.nameKey ? t(o.nameKey) : '')

/* ---- 分享链接 ----
   必须 watch 而不是只在 onMounted 读一次：
   同一个页面里从分享链接 A 切到分享链接 B 时组件不会重新挂载，
   只读 onMounted 会导致链接看起来「没生效」。 */
watch(() => route.query.look, v => {
  if (v) Object.assign(look, decodeLook(String(v)))
}, { immediate: true })
let syncTimer = null
watch(look, () => {
  clearTimeout(syncTimer)
  syncTimer = setTimeout(() => {
    router.replace({ query: { ...route.query, look: encodeLook(look) } })
  }, 400)
}, { deep: true })

/* ---------------- 3D 缩略图 ---------------- */
const thumbs = reactive({})
const queue = []
let timer = null
let thumbMod = null

function thumbKey (slot, id) { return `${slot}:${id}` }

function enqueue (slot, list) {
  list.forEach(o => {
    const k = thumbKey(slot, o.id)
    if (thumbs[k] !== undefined) return
    thumbs[k] = ''
    queue.push({ k, slot, id: o.id })
  })
  schedule()
}

function schedule () {
  if (timer || !queue.length) return
  /* 用 requestIdleCallback 把主线程让出来：
     缩略图渲染要 readPixels（GPU stall），一张能卡掉几十毫秒，
     一次性渲 42 张会把页面卡住好几秒，连分享链接的 URL 同步都会被拖慢。 */
  const idle = window.requestIdleCallback || (fn => setTimeout(() => fn({ timeRemaining: () => 8 }), 60))
  timer = idle(() => pump())
}

async function pump () {
  timer = null
  const job = queue.shift()
  if (!job) return
  try {
    if (!thumbMod) thumbMod = await import('@/three/thumb')
    thumbs[job.k] = thumbMod.renderSlotThumb(job.slot, job.id, 'vinyl')
  } catch (e) {
    thumbs[job.k] = ''
    console.warn('thumb failed', job.slot, job.id, e)
  }
  if (queue.length) schedule()
}

/* 步骤 → 需要渲染缩略图的槽位。
   只渲染当前这一步要用的，其余等用户切到那一步再渲染。 */
const STEP_SLOTS = [
  ['body'],
  ['head', 'hat'],
  ['top', 'bottom'],
  ['shoes'],
  ['charm', 'strap'],
  []
]
const SLOT_LIST = {
  body: BODY_TYPES, head: HEADS, hat: HATS,
  top: TOPS, bottom: BOTTOMS, shoes: SHOES, charm: CHARMS, strap: STRAPS
}
function loadStepThumbs (i) {
  const slots = STEP_SLOTS[i] || []
  slots.forEach(sl => enqueue(sl, SLOT_LIST[sl] || []))
}
watch(step, i => loadStepThumbs(i))
onMounted(() => loadStepThumbs(step.value))
onBeforeUnmount(() => { if (timer) { clearTimeout(timer); timer = null } })

/* ---------------- 选项组 ---------------- */
const optionGroups = computed(() => ({
  body: BODY_TYPES,
  head: HEADS,
  hat: HATS,
  top: TOPS,
  bottom: BOTTOMS,
  shoes: SHOES,
  charm: CHARMS,
  strap: STRAPS
}))

/* ---------------- 交互 ---------------- */
function applyStyle (id) {
  const p = PALETTES[id]
  if (!p) return
  look.style = id
  look.main = p.main
  look.accent = p.accent
  look.hair = p.hair
  look.shoe = p.shoe
  look.skin = p.skin
}
function pickRandom (arr) { return arr[Math.floor(Math.random() * arr.length)] }
function randomise () {
  applyStyle(pickRandom(Object.keys(PALETTES)))
  look.body = pickRandom(BODY_TYPES).id
  look.size = pickRandom(['6', '10', '15'])
  look.skin = pickRandom(SKIN_TONES)
  look.head = pickRandom(HEADS).id
  look.hat = pickRandom(HATS).id
  look.top = pickRandom(TOPS).id
  look.bottom = pickRandom(BOTTOMS).id
  look.shoes = pickRandom(SHOES).id
  look.charm = pickRandom(CHARMS).id
  look.strap = pickRandom(STRAPS).id
}
function reset () { Object.assign(look, DEFAULT_LOOK) }

function next () { if (step.value < STEPS.length - 1) step.value++ }
function prev () { if (step.value > 0) step.value-- }

/* ---- BOM ---- */
const bom = computed(() => buildBOM(look, t))
const bomColumns = computed(() => [
  { title: t('studio.bom.slot'), dataIndex: 'slotLabel', width: 96 },
  { title: t('studio.bom.item'), dataIndex: 'name' },
  { title: t('studio.bom.sku'), dataIndex: 'sku', width: 90 },
  { title: t('studio.bom.note'), dataIndex: 'extra', width: 90 }
])
const bomRows = computed(() => bom.value.map((r, i) => ({
  key: i,
  slotLabel: r.slotLabel,
  name: r.nameKey ? t(r.nameKey) : '—',
  sku: r.sku || '—',
  extra: r.extra || '—'
})))

function addAll () {
  bom.value.filter(r => r.sku).forEach(r => {
    enquiry.add({
      id: 'look-' + r.sku,
      nameKey: r.nameKey,
      meta: `${t('studio.slot.' + r.slot)} · ${r.sku}`,
      sku: r.sku
    })
  })
  message.success(t('studio.addedAll'))
  enquiry.open = true
}

function buildLookText () {
  const L = locale.value
  const line = (k, v) => `${t(k)}: ${v}`
  const bodyType = BODY_TYPES.find(b => b.id === look.body)
  const rows = [
    header(L),
    '',
    `【${t('studio.reviewTitle')}】`,
    line('studio.size', look.size + ' cm'),
    line('studio.bodyType', nm(bodyType)),
    line('studio.head', nm(HEADS.find(h => h.id === look.head))),
    `${t('studio.hairColor')}: ${look.hair}`,
    `${t('studio.hat')}: ${nm(HATS.find(h => h.id === look.hat))}`,
    `${t('studio.top')}: ${nm(TOPS.find(o => o.id === look.top))}  ·  ${t('studio.mainColor')} ${look.main} / ${t('studio.accentColor')} ${look.accent}`,
    `${t('studio.bottom')}: ${nm(BOTTOMS.find(o => o.id === look.bottom))}`,
    `${t('studio.shoes')}: ${nm(SHOES.find(o => o.id === look.shoes))}  ·  ${t('studio.shoeColor')} ${look.shoe}`,
    `${t('studio.charm')}: ${nm(CHARMS.find(o => o.id === look.charm))}`,
    `${t('studio.strap')}: ${nm(STRAPS.find(o => o.id === look.strap))}`,
    `${t('studio.skin')}: ${look.skin}`,
    '',
    `${t('studio.copyLink')}: ${location.href}`
  ]
  void L
  return rows.join('\n')
}
function sendLook () {
  sendText.value = buildLookText()
  sendOpen.value = true
}
function copyLink () {
  copyText(location.href)
  message.success(t('studio.linkCopied'))
}
function shot () { canvasRef.value?.download() }
</script>

<template>
  <div class="studio">
    <section class="wrap head">
      <p class="eyebrow">{{ t('studio.eyebrow') }}</p>
      <h1 class="h2">{{ t('studio.title') }}</h1>
      <p class="lead">{{ t('studio.sub') }}</p>
    </section>

    <div class="wrap grid">
      <!-- 左：实时 3D 预览 -->
      <aside class="left">
        <div class="canvas-holder">
        <Doll3D :look="look" :bg="bg" />
        </div>
        <div class="canvas-tools">
          <div class="seg">
            <button v-for="b in ['light', 'soft', 'dark']" :key="b" class="chip" :class="{ on: bg === b }" @click="bg = b">
              {{ b === 'light' ? '白底' : b === 'soft' ? '柔光' : '深色' }}
            </button>
          </div>
          <a-button size="small" @click="shot">{{ t('studio.download') }}</a-button>
        </div>
        <div class="tip">
          <strong>{{ t('studio.tipTitle') }}</strong>
          <p>{{ t('studio.tip') }}</p>
        </div>
      </aside>

      <!-- 右：分步面板 -->
      <section class="right">
        <a-steps :current="step" size="small" class="steps" @change="v => step = v">
        <a-step v-for="s in STEPS" :key="s.key" :title="t('studio.step.' + s.key)" />
        </a-steps>

        <div class="panel">
          <!-- 0 素体 -->
          <div v-show="step === 0" class="grp">
            <h3 class="gt">{{ t('studio.bodyType') }}</h3>
            <div class="opts cols3">
              <button
                v-for="o in optionGroups.body" :key="o.id"
                class="opt" :class="{ on: look.body === o.id }"
                @click="look.body = o.id"
              >
              <span class="thumb"><Thumb3D :src="thumbs[thumbKey('body', o.id)]" /></span>
                <span class="oname">{{ nm(o) }}</span>
              </button>
            </div>

            <h3 class="gt">{{ t('studio.size') }}</h3>
            <a-segmented v-model:value="look.size" :options="SIZES.map(s => ({ label: t(s.nameKey), value: s.id }))" />

            <h3 class="gt">{{ t('studio.skin') }}</h3>
            <Swatches :colors="SKIN_TONES" />
          </div>

          <!-- 1 头部（脸 + 发一体成型） -->
          <div v-show="step === 1" class="grp">
            <h3 class="gt">{{ t('studio.head') }}</h3>
            <div class="opts cols3">
              <button
                v-for="o in optionGroups.head" :key="o.id"
                class="opt" :class="{ on: look.head === o.id }"
                @click="look.head = o.id"
              >
              <span class="thumb"><Thumb3D :src="thumbs[thumbKey('head', o.id)]" /></span>
                <span class="oname">{{ nm(o) }}</span>
              </button>
            </div>
            <p class="hint">{{ t('studio.headHint') }}</p>
            <h3 class="gt">{{ t('studio.hairColor') }}</h3>
            <Swatches :colors="HAIR_COLORS" />
            <h3 class="gt">{{ t('studio.hat') }}</h3>
            <div class="opts cols4">
              <button
                v-for="o in optionGroups.hat" :key="o.id"
                class="opt" :class="{ on: look.hat === o.id }"
                @click="look.hat = o.id"
              >
              <span class="thumb"><Thumb3D :src="thumbs[thumbKey('hat', o.id)]" /></span>
                <span class="oname">{{ nm(o) }}</span>
              </button>
            </div>
          </div>

          <!-- 2 服装 -->
          <div v-show="step === 2" class="grp">
            <h3 class="gt">{{ t('studio.stylePreset') }}</h3>
            <div class="chips">
              <button
                v-for="s in STYLES" :key="s.id"
                class="chip" :class="{ on: look.style === s.id }"
                @click="applyStyle(s.id)"
              >{{ t(s.nameKey) }}</button>
            </div>
            <p class="hint">{{ t('studio.presetHint') }}</p>

            <h3 class="gt">{{ t('studio.top') }}</h3>
            <div class="opts cols3">
              <button
                v-for="o in optionGroups.top" :key="o.id"
                class="opt" :class="{ on: look.top === o.id }"
                @click="look.top = o.id"
              >
              <span class="thumb"><Thumb3D :src="thumbs[thumbKey('top', o.id)]" /></span>
                <span class="oname">{{ nm(o) }}</span>
              </button>
            </div>

            <h3 class="gt">{{ t('studio.bottom') }}</h3>
            <div class="opts cols3">
              <button
                v-for="o in optionGroups.bottom" :key="o.id"
                class="opt" :class="{ on: look.bottom === o.id }"
                @click="look.bottom = o.id"
              >
              <span class="thumb"><Thumb3D :src="thumbs[thumbKey('bottom', o.id)]" /></span>
                <span class="oname">{{ nm(o) }}</span>
              </button>
            </div>

            <h3 class="gt">{{ t('studio.mainColor') }}</h3>
            <Swatches :colors="FABRIC_COLORS" />
            <h3 class="gt">{{ t('studio.accentColor') }}</h3>
            <Swatches :colors="FABRIC_COLORS" />
            <p class="hint">{{ t('studio.fabricHint') }}</p>
          </div>

          <!-- 3 鞋履 -->
          <div v-show="step === 3" class="grp">
            <h3 class="gt">{{ t('studio.shoes') }}</h3>
            <div class="opts cols4">
              <button
                v-for="o in optionGroups.shoes" :key="o.id"
                class="opt" :class="{ on: look.shoes === o.id }"
                @click="look.shoes = o.id"
              >
              <span class="thumb"><Thumb3D :src="thumbs[thumbKey('shoes', o.id)]" /></span>
                <span class="oname">{{ nm(o) }}</span>
              </button>
            </div>
            <h3 class="gt">{{ t('studio.shoeColor') }}</h3>
            <Swatches :colors="FABRIC_COLORS" />
          </div>

          <!-- 4 挂饰 -->
          <div v-show="step === 4" class="grp">
            <h3 class="gt">{{ t('studio.charm') }}</h3>
            <div class="opts cols4">
              <button
                v-for="o in optionGroups.charm" :key="o.id"
                class="opt" :class="{ on: look.charm === o.id }"
                @click="look.charm = o.id"
              >
              <span class="thumb"><Thumb3D :src="thumbs[thumbKey('charm', o.id)]" /></span>
                <span class="oname">{{ nm(o) }}</span>
              </button>
            </div>
            <h3 class="gt">{{ t('studio.strap') }}</h3>
            <div class="opts cols3">
              <button
                v-for="o in optionGroups.strap" :key="o.id"
                class="opt" :class="{ on: look.strap === o.id }"
                @click="look.strap = o.id"
              >
              <span class="thumb"><Thumb3D :src="thumbs[thumbKey('strap', o.id)]" /></span>
                <span class="oname">{{ nm(o) }}</span>
              </button>
            </div>
          </div>

          <!-- 5 完成 -->
          <div v-show="step === 5" class="grp">
            <h3 class="gt">{{ t('studio.reviewTitle') }}</h3>
            <p class="hint">{{ t('studio.reviewSub') }}</p>
            <a-table
              <a-table :columns="bomColumns" :data-source="bomRows"
              size="small" :pagination="false" class="bom"
            />
            <div class="acts">
              <a-button type="primary" size="large" block @click="sendLook">{{ t('studio.sendLook') }}</a-button>
              <div class="row">
                <a-button size="large" block @click="addAll">{{ t('studio.addAllEnquiry') }}</a-button>
                <a-button size="large" block @click="copyLink">{{ t('studio.copyLink') }}</a-button>
              </div>
            </div>
          </div>
        </div>

        <div class="nav-row">
        <a-button :disabled="step === 0" @click="prev">{{ t('studio.prev') }}</a-button>
          <div class="spacer" />
          <a-button @click="reset">{{ t('studio.reset') }}</a-button>
          <a-button @click="randomise">{{ t('studio.random') }}</a-button>
          <a-button v-if="step < STEPS.length - 1" type="primary" @click="next">{{ t('studio.next') }}</a-button>
        </div>
      </section>
    </div>

    <SendSheet :open="sendOpen" :title="t('send.title')" :sub="t('send.sub')" :text="sendText" filename="pupeele-look.txt" />
  </div>
</template>

<style scoped>
.studio { padding-bottom: 80px; }
.head { padding: 48px 0 28px; }

.grid {
  display: grid;
  grid-template-columns: minmax(300px, 430px) 1fr;
  gap: 40px;
  align-items: start;
}

.left { position: sticky; top: calc(var(--nav-h) + 20px); }
.canvas-holder { width: 100%; }
.canvas-tools {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; margin-top: 12px; flex-wrap: wrap;
}
.seg { display: flex; gap: 6px; }
.seg .chip { padding: 5px 12px; font-size: 13px; }

.tip {
  margin-top: 14px; padding: 14px 16px;
  background: var(--bg-soft); border-radius: var(--radius-sm);
  font-size: 12.5px; color: var(--ink-3); line-height: 1.55;
}
.tip strong { display: block; color: var(--ink); font-size: 13px; margin-bottom: 4px; }
.tip p { margin: 0; }

.steps { margin-bottom: 22px; }
.panel { min-height: 420px; }

.grp { display: grid; gap: 0; }
.gt {
  font-size: 13px; font-weight: 600; color: var(--ink);
  margin: 22px 0 10px; letter-spacing: -0.005em;
}
.gt:first-child { margin-top: 0; }
.hint { font-size: 12.5px; color: var(--ink-4); margin: 8px 0 0; line-height: 1.5; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; }

.opts { display: grid; gap: 10px; }
.opts.cols3 { grid-template-columns: repeat(3, 1fr); }
.opts.cols4 { grid-template-columns: repeat(4, 1fr); }

.opt {
  border: 1px solid var(--line-soft);
  background: #fff;
  border-radius: 14px;
  padding: 8px 8px 10px;
  cursor: pointer;
  display: grid;
  gap: 6px;
  transition: all .28s var(--ease);
  text-align: center;
}
.opt:hover { border-color: var(--line); transform: translateY(-2px); }
.opt.on { border-color: var(--ink); box-shadow: 0 0 0 1px var(--ink) inset; }
.thumb {
  display: block;
  height: 96px;
  background:
    radial-gradient(120% 100% at 50% 18%, #ffffff 0%, #f2f2f5 58%, #e9e9ee 100%);
  border-radius: 10px;
  overflow: hidden;
  padding: 6px;
}
.opts.cols4 .thumb { height: 78px; }
.oname { font-size: 12.5px; color: var(--ink-2); line-height: 1.3; }
.opt.on .oname { color: var(--ink); font-weight: 600; }

.bom { margin-top: 14px; font-size: 13px; }
.acts { margin-top: 18px; display: grid; gap: 10px; }
.row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

.nav-row {
  display: flex; align-items: center; gap: 10px;
  margin-top: 26px; padding-top: 20px; border-top: 1px solid var(--line-soft);
}
.spacer { flex: 1; }

@media (max-width: 900px) {
  .grid { grid-template-columns: 1fr; gap: 28px; }
  .left { position: static; max-width: 400px; margin: 0 auto; }
  .opts.cols4 { grid-template-columns: repeat(2, 1fr); }
}
</style>
