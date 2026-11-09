<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import message from 'ant-design-vue/es/message'
import { CATEGORIES, PRODUCTS, SOURCED } from '@/data/catalog'
import { useStandingStore } from '@/stores/standing'
import CategoryArt from '@/components/CategoryArt.vue'

/* 详情页 = line-sheet：标注图集 + 完整规格（净重/箱规/认证）+
   参考成本区间 + 常备单操作。买手不用往返邮件就能判断能不能下单。 */
const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const standing = useStandingStore()

const ALL = [...SOURCED, ...PRODUCTS]
const p = computed(() => ALL.find(x => x.id === route.params.id))
const source = computed(() => p.value && p.value.retailUSD !== undefined ? 'sourced' : 'product')
const cat = computed(() => CATEGORIES.find(c => c.id === p.value?.cat) || CATEGORIES[0])

/* 参考价：现货显示成本区间（按款式），定制品显示报价区间；均以询价单为准 */
const priceLabel = computed(() => {
  if (!p.value) return ''
  if (source.value === 'sourced') {
    if (p.value.styles?.length) {
      const cs = p.value.styles.map(s => s.costCNY)
      return '¥' + Math.min(...cs).toFixed(2) + ' – ' + Math.max(...cs).toFixed(2)
    }
    return '¥' + Number(p.value.costCNY).toFixed(2)
  }
  return p.value.price
})

const styleIdx = ref(p.value?.styles ? 0 : -1)
watch(() => route.params.id, () => {
  styleIdx.value = p.value?.styles ? 0 : -1
  qty.value = p.value?.moq || 1
  thumb.value = 0
})

/* 数量默认 = 起订量，符合 B2B 补货习惯 */
const qty = ref(p.value?.moq || 1)

/* 标注图集：0=白底主图，1-4=细节/包装/场景/尺寸参照（参数化 SVG 变体） */
const thumb = ref(0)
const thumbs = [
  { v: 1, k: 'ls.cap2' },
  { v: 2, k: 'ls.cap3' },
  { v: 3, k: 'ls.cap4' },
  { v: 4, k: 'ls.cap5' }
]

const standingKey = computed(() =>
  p.value ? p.value.id + (styleIdx.value >= 0 ? '-' + styleIdx.value : '') : ''
)
const inStanding = computed(() => standing.qtyOf(standingKey.value))

const meta = computed(() => p.value
  ? `${p.value.size} · MOQ ${p.value.moq} · ${priceLabel.value}`
  : '')

function addStanding () {
  if (!p.value) return
  const existed = standing.has(standingKey.value)
  standing.put({
    key: standingKey.value,
    id: p.value.id,
    nameKey: p.value.nameKey,
    styleLabelKey: styleIdx.value >= 0 ? p.value.styles[styleIdx.value].labelKey : null,
    price: priceLabel.value,
    qty: qty.value,
    meta: meta.value,
    size: p.value.size,
    moq: p.value.moq,
    cat: p.value.cat,
    tint: p.value.tint,
    image: p.value.image || '',
    source: source.value
  })
  message.success(existed ? t('pd.updatedStanding') : t('pd.addedStanding'))
}

/* 相关推荐：同类目优先，补足 4 个 */
const related = computed(() => {
  if (!p.value) return []
  const same = ALL.filter(x => x.id !== p.value.id && x.cat === p.value.cat)
  const rest = ALL.filter(x => x.id !== p.value.id && x.cat !== p.value.cat)
  return [...same, ...rest].slice(0, 4)
})
const relPrice = x => x.retailUSD !== undefined
  ? '$' + Number(x.retailUSD).toFixed(2)
  : (x.costCNY !== undefined ? '¥' + Number(x.costCNY).toFixed(2) : x.price)

const points = [
  { k: 'pd.b1t', d: 'pd.b1d' },
  { k: 'pd.b2t', d: 'pd.b2d' },
  { k: 'pd.b3t', d: 'pd.b3d' }
]
</script>

<template>
  <div class="wrap page">
    <template v-if="p">
      <nav class="crumb">
        <router-link to="/">{{ t('nav.home') }}</router-link>
        <span>/</span>
        <router-link to="/collections">{{ t('pd.crumb') }}</router-link>
        <span>/</span>
        <span v-if="p.sku" class="mono">{{ p.sku }}</span>
        <span v-if="p.sku">/</span>
        <span class="cur">{{ t(p.nameKey) }}</span>
      </nav>

      <div class="pd">
        <!-- 左：标注图集 -->
        <div class="vis">
          <div class="hero-ph" :style="{ '--t0': p.tint[0], '--t1': p.tint[1] }">
            <img v-if="p.image" :src="p.image" :alt="t(p.nameKey)" />
            <div v-else class="art">
              <CategoryArt :id="cat.icon" :variant="thumb" :tint="p.tint" />
            </div>
            <span class="cap">{{ t(thumb === 0 ? 'ls.cap1' : thumbs[thumb - 1].k) }}</span>
            <span v-if="p.ip === 'white'" class="badge-white">{{ t('store.white') }}</span>
            <span class="badge-src">{{ source === 'sourced' ? t('pd.instock') : t('pd.custom') }}</span>
          </div>
          <div class="thumbs">
            <button class="th" :class="{ on: thumb === 0 }" @click="thumb = 0">
              <CategoryArt :id="cat.icon" :variant="0" :tint="p.tint" />
              <span>{{ t('ls.cap1') }}</span>
            </button>
            <button
              v-for="x in thumbs" :key="x.v"
              class="th" :class="{ on: thumb === x.v }"
              @click="thumb = x.v"
            >
              <CategoryArt :id="cat.icon" :variant="x.v" :tint="p.tint" />
              <span>{{ t(x.k) }}</span>
            </button>
          </div>
          <div v-if="p.sku" class="pack">
            <h3>{{ t('ls.packTitle') }}</h3>
            <ul>
              <li>{{ t('ls.pack1') }}</li>
              <li>{{ t('ls.pack2', { i: p.inner || '—', o: p.outer || '—' }) }}</li>
              <li>{{ t('ls.pack3') }}</li>
            </ul>
          </div>
        </div>

        <!-- 右：信息 + 常备单操作 -->
        <div class="info">
          <p class="eyebrow">
            {{ t(cat.nameKey) }}
            <span v-if="p.sku" class="mono">· {{ p.sku }}</span>
            <span v-if="p.ip === 'white'" class="ok">{{ t('store.white') }}</span>
          </p>
          <h1 class="ttl">{{ t(p.nameKey) }}</h1>
          <p class="desc">{{ t(p.descKey) }}</p>
          <div class="price">
            {{ priceLabel }}
            <small>{{ t('ls.priceNote') }}</small>
          </div>

          <dl class="sp">
            <div><dt>{{ t('pd.size') }}</dt><dd>{{ p.size }}</dd></div>
            <div><dt>{{ t('pd.material') }}</dt><dd>{{ t(p.matKey) }}</dd></div>
            <div v-if="p.netWeight"><dt>{{ t('pd.netWeight') }}</dt><dd>{{ p.netWeight }} / pcs</dd></div>
            <div><dt>{{ t('pd.moq') }}</dt><dd>{{ p.moq }}+</dd></div>
            <div v-if="source === 'product'"><dt>{{ t('pd.lead') }}</dt><dd>{{ t(p.leadKey) }}</dd></div>
            <template v-else>
              <div><dt>{{ t('pd.supplier') }}</dt><dd>{{ p.supplier }}</dd></div>
              <div><dt>{{ t('pd.ship') }}</dt><dd>{{ t('pd.ship48') }}</dd></div>
            </template>
            <div v-if="p.inner && p.outer"><dt>{{ t('pd.inner') }} / {{ t('pd.outer') }}</dt><dd>{{ p.inner }} / {{ p.outer }}</dd></div>
            <div v-if="p.cert"><dt>{{ t('pd.cert') }}</dt><dd>{{ p.cert }}</dd></div>
            <div v-if="p.ip === 'white'"><dt>{{ t('pd.ip') }}</dt><dd class="ok">{{ t('pd.ipWhite') }}</dd></div>
          </dl>

          <!-- 常备单核心操作区 -->
          <section class="standing-box">
            <div class="sb-head">
              <h2>{{ t('pd.standingTitle') }}</h2>
              <p>{{ t('pd.qtyHint') }}</p>
            </div>
            <div class="sb-row">
              <label class="qty-lb">{{ t('pd.qty') }}</label>
              <a-input-number
                v-model:value="qty" :min="1" :max="999999"
                class="qty-input" :step="p.moq || 1"
              />
              <button class="pill go" @click="addStanding">
                {{ inStanding ? t('pd.updateStanding') : t('pd.addStanding') }}
              </button>
            </div>
            <p v-if="qty < p.moq" class="moq-hint">{{ t('pd.moqHint', { n: p.moq }) }}</p>
            <div v-if="inStanding" class="sb-state">
              <span>{{ t('pd.inStanding', { n: inStanding }) }}</span>
              <router-link class="lnk" to="/standing">{{ t('pd.viewStanding') }} →</router-link>
            </div>
          </section>

          <div class="minor">
            <button class="pill ghost sm" @click="standing.open = true">{{ t('pd.viewStanding') }}</button>
          </div>
        </div>
      </div>

      <!-- 常备单价值说明 -->
      <section class="why">
        <div class="center">
          <p class="eyebrow">{{ t('nav.standing') }}</p>
          <h2 class="h2">{{ t('pd.whyTitle') }}</h2>
          <p class="lead">{{ t('pd.standingSub') }}</p>
        </div>
        <div class="pts">
          <div v-for="b in points" :key="b.k" class="pt">
            <h3>{{ t(b.k) }}</h3>
            <p>{{ t(b.d) }}</p>
          </div>
        </div>
      </section>

      <!-- 相关推荐 -->
      <section class="rel" v-if="related.length">
        <h2 class="h2 sm-h">{{ t('pd.related') }}</h2>
        <p class="lead rel-sub">{{ t('pd.relatedSub') }}</p>
        <div class="rel-grid">
          <router-link v-for="r in related" :key="r.id" :to="'/product/' + r.id" class="rel-card card">
            <span class="rel-ph" :style="{ '--t0': r.tint[0], '--t1': r.tint[1] }">
              <CategoryArt :id="(CATEGORIES.find(c => c.id === r.cat) || CATEGORIES[0]).icon" :variant="0" :tint="r.tint" />
            </span>
            <span class="rel-bd">
              <strong>{{ t(r.nameKey) }}</strong>
              <span class="rel-meta">{{ relPrice(r) }} · MOQ {{ r.moq }}</span>
            </span>
          </router-link>
        </div>
      </section>
    </template>

    <a-empty v-else :description="t('pd.notFound')">
      <button class="pill" @click="router.push('/collections')">{{ t('pd.back') }}</button>
    </a-empty>
  </div>
</template>

<style scoped>
.page { padding: 34px 0 80px; }
.crumb { display: flex; align-items: center; gap: 9px; font-size: 12.5px; color: var(--ink-4); margin-bottom: 26px; flex-wrap: wrap; }
.crumb a:hover { color: var(--ink); }
.crumb .cur { color: var(--ink-2); }
.mono { font-family: ui-monospace, monospace; font-size: 11.5px; }

.pd { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: start; }

.vis { position: sticky; top: calc(var(--nav-h) + 20px); }
.hero-ph {
  position: relative; aspect-ratio: 1; border-radius: 16px; overflow: hidden;
  display: grid; place-items: center;
  background: radial-gradient(115% 85% at 50% 6%, rgba(255,255,255,.85), rgba(255,255,255,0) 60%),
              linear-gradient(158deg, var(--t0), var(--t1));
  border: 1px solid var(--line-soft);
}
.hero-ph img { width: 100%; height: 100%; object-fit: cover; }
.art { width: 62%; aspect-ratio: 1; filter: drop-shadow(0 14px 24px rgba(28,27,25,.1)); }
.cap {
  position: absolute; left: 14px; bottom: 12px;
  font-size: 11px; color: var(--ink-2);
  background: rgba(255,255,255,.85); padding: 4px 10px; border-radius: 6px;
}
.badge-white, .badge-src {
  position: absolute; top: 16px; font-size: 11px; font-weight: 500;
  padding: 5px 11px; border-radius: 999px;
}
.badge-white { right: 16px; color: var(--green); background: rgba(255,255,255,.92); border: 1px solid #c6e3d2; }
.badge-src { left: 16px; color: var(--ink-2); background: rgba(255,255,255,.86); }

.thumbs { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-top: 10px; }
.th {
  border: 1px solid var(--line-soft); border-radius: 10px; background: #faf8f5;
  padding: 8px 4px 6px; cursor: pointer; display: grid; gap: 4px; justify-items: center;
  transition: border-color .2s;
}
.th :deep(svg) { width: 44%; aspect-ratio: 1; }
.th span { font-size: 9.5px; color: var(--ink-4); line-height: 1.3; text-align: center; }
.th.on { border-color: var(--ink); background: #fff; }
.th:hover { border-color: var(--ink-3); }

.pack { margin-top: 20px; font-size: 12.5px; color: var(--ink-2); }
.pack h3 { font-size: 13px; font-weight: 650; margin: 0 0 7px; }
.pack ul { margin: 0; padding-left: 16px; display: grid; gap: 5px; line-height: 1.55; }

.info .eyebrow { margin-bottom: 10px; display: flex; gap: 8px; align-items: baseline; flex-wrap: wrap; }
.eyebrow .ok { color: var(--green); font-weight: 600; }
.ttl { font-size: clamp(24px, 2.8vw, 34px); line-height: 1.14; font-weight: 700; letter-spacing: -.022em; margin: 0 0 10px; }
.desc { font-size: 14.5px; color: var(--ink-3); line-height: 1.6; margin: 0 0 16px; }
.price { font-size: 26px; font-weight: 700; letter-spacing: -.02em; margin-bottom: 4px; font-variant-numeric: tabular-nums; }
.price small { display: block; font-size: 12px; color: var(--ink-4); font-weight: 400; margin-top: 4px; letter-spacing: 0; }

.sp { margin: 18px 0 22px; display: grid; gap: 0; font-size: 13px; }
.sp > div { display: flex; justify-content: space-between; gap: 16px; padding: 10px 0; border-bottom: 1px solid var(--line-soft); }
.sp dt { color: var(--ink-4); }
.sp dd { margin: 0; color: var(--ink-2); text-align: right; font-variant-numeric: tabular-nums; }
.sp dd.ok { color: var(--green); font-weight: 600; }

.standing-box {
  background: var(--accent-soft); border: 1px solid #ecd8c7;
  border-radius: 14px; padding: 20px 22px;
}
.sb-head h2 { font-size: 16.5px; font-weight: 650; margin: 0 0 6px; }
.sb-head p { font-size: 12.5px; color: var(--ink-3); line-height: 1.5; margin: 0 0 14px; }
.sb-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.qty-lb { font-size: 13px; color: var(--ink-2); flex: none; }
.qty-input { width: 120px !important; }
.go { flex: 1; min-width: 160px; height: 42px; }
.moq-hint { font-size: 12px; color: var(--accent-ink); margin: 10px 0 0; }
.sb-state {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  margin-top: 14px; padding-top: 12px; border-top: 1px solid #ecd8c7;
  font-size: 12.5px; color: var(--ink-2);
}
.lnk { border: none; background: none; padding: 0; font: inherit; color: var(--accent-ink); cursor: pointer; text-decoration: underline; text-underline-offset: 3px; }

.minor { display: flex; gap: 10px; margin-top: 14px; flex-wrap: wrap; }
.pill.sm { height: 34px; padding: 0 16px; font-size: 13px; }
.pill.ghost.sm { background: none; border: 1px solid var(--line); color: var(--ink-2); }
.pill.ghost.sm:hover { background: var(--bg-soft); }

.why { margin-top: 84px; padding: 56px 0; border-top: 1px solid var(--line-soft); }
.pts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; margin-top: 40px; }
.pt h3 { font-size: 15.5px; font-weight: 650; margin: 0 0 8px; }
.pt p { font-size: 13.5px; color: var(--ink-3); line-height: 1.6; margin: 0; }

.rel { margin-top: 20px; }
.sm-h { font-size: 24px; }
.rel-sub { font-size: 14px; margin-bottom: 24px; }
.rel-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.rel-card { display: grid; gap: 0; }
.rel-ph { aspect-ratio: 4/3; display: grid; place-items: center; background: linear-gradient(150deg, var(--t0), var(--t1)); }
.rel-ph :deep(svg) { width: 46%; }
.rel-bd { padding: 12px 14px 14px; display: grid; gap: 4px; }
.rel-bd strong { font-size: 13.5px; font-weight: 600; }
.rel-meta { font-size: 12px; color: var(--ink-4); font-variant-numeric: tabular-nums; }

@media (max-width: 900px) {
  .pd { grid-template-columns: 1fr; gap: 30px; }
  .vis { position: static; }
  .pts { grid-template-columns: 1fr; gap: 18px; }
  .rel-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 560px) {
  .rel-grid { grid-template-columns: 1fr 1fr; }
  .go { min-width: 100%; }
  .thumbs { grid-template-columns: repeat(3, 1fr); }
}
</style>
