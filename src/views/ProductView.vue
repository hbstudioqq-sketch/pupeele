<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import message from 'ant-design-vue/es/message'
import { CATEGORIES, PRODUCTS, SOURCED } from '@/data/catalog'
import { useStandingStore } from '@/stores/standing'
import { useEnquiryStore } from '@/stores/enquiry'
import { useCartStore } from '@/stores/cart'
import CategoryArt from '@/components/CategoryArt.vue'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const standing = useStandingStore()
const enquiry = useEnquiryStore()
const cart = useCartStore()

const ALL = [...SOURCED, ...PRODUCTS]
const p = computed(() => ALL.find(x => x.id === route.params.id))
const source = computed(() => p.value && p.value.retailUSD !== undefined ? 'sourced' : 'product')
const cat = computed(() => CATEGORIES.find(c => c.id === p.value?.cat) || CATEGORIES[0])

/* 现货是明码零售价，定制品是报价区间 */
const priceLabel = computed(() => {
  if (!p.value) return ''
  return p.value.retailUSD !== undefined
    ? '$' + Number(activePrice.value).toFixed(2)
    : p.value.price
})

const styleIdx = ref(p.value?.styles ? 0 : -1)
const activePrice = computed(() => {
  if (p.value?.styles && styleIdx.value >= 0) return p.value.styles[styleIdx.value].priceUSD
  return p.value?.retailUSD ?? 0
})

/* 数量默认 = 起订量，符合 B2B 补货习惯 */
const qty = ref(p.value?.moq || 1)
watch(() => route.params.id, () => {
  styleIdx.value = p.value?.styles ? 0 : -1
  qty.value = p.value?.moq || 1
})

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

function addEnquiry () {
  if (!p.value) return
  const wasIn = enquiry.has(standingKey.value)
  enquiry.toggle({
    id: standingKey.value,
    nameKey: p.value.nameKey,
    meta: meta.value,
    sku: p.value.id
  })
  if (!wasIn) message.success(t('toast.added'))
}

function addCart () {
  if (!p.value || source.value !== 'sourced') return
  cart.add({
    key: standingKey.value,
    id: p.value.id,
    nameKey: p.value.nameKey,
    styleLabelKey: styleIdx.value >= 0 ? p.value.styles[styleIdx.value].labelKey : null,
    priceUSD: activePrice.value,
    costCNY: p.value.costCNY,
    qty: qty.value,
    image: p.value.image || '',
    tint: p.value.tint,
    cat: p.value.cat
  })
  message.success(t('store.added'))
}

/* 相关推荐：同类目优先，补足 4 个 */
const related = computed(() => {
  if (!p.value) return []
  const same = ALL.filter(x => x.id !== p.value.id && x.cat === p.value.cat)
  const rest = ALL.filter(x => x.id !== p.value.id && x.cat !== p.value.cat)
  return [...same, ...rest].slice(0, 4)
})
const relPrice = x => x.retailUSD !== undefined ? '$' + Number(x.retailUSD).toFixed(2) : x.price

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
        <span class="cur">{{ t(p.nameKey) }}</span>
      </nav>

      <div class="pd">
        <!-- 左：主图 + 款式 -->
        <div class="vis">
          <div class="hero-ph" :style="{ '--t0': p.tint[0], '--t1': p.tint[1] }">
            <img v-if="p.image" :src="p.image" :alt="t(p.nameKey)" />
            <div v-else class="art">
              <CategoryArt :id="cat.icon" :variant="0" :tint="p.tint" />
            </div>
            <span v-if="p.ip === 'white'" class="badge-white">{{ t('store.white') }}</span>
            <span class="badge-src">{{ source === 'sourced' ? t('pd.instock') : t('pd.custom') }}</span>
          </div>
          <div v-if="p.styles" class="styles">
            <span class="styles-lb">{{ t('pd.style') }}</span>
            <button
              v-for="(s, i) in p.styles" :key="i"
              class="chip sm" :class="{ on: styleIdx === i }"
              @click="styleIdx = i"
            >{{ t(s.labelKey) }}</button>
          </div>
        </div>

        <!-- 右：信息 + 常备单操作 -->
        <div class="info">
          <p class="eyebrow">{{ t(cat.nameKey) }}</p>
          <h1 class="ttl">{{ t(p.nameKey) }}</h1>
          <p class="desc">{{ t(p.descKey) }}</p>
          <div class="price">{{ priceLabel }}</div>

          <dl class="sp">
            <div><dt>{{ t('pd.size') }}</dt><dd>{{ p.size }}</dd></div>
            <div><dt>{{ t('pd.material') }}</dt><dd>{{ t(p.matKey) }}</dd></div>
            <div><dt>{{ t('pd.moq') }}</dt><dd>{{ p.moq }}+</dd></div>
            <div v-if="source === 'product'"><dt>{{ t('pd.lead') }}</dt><dd>{{ t(p.leadKey) }}</dd></div>
            <template v-else>
              <div><dt>{{ t('pd.supplier') }}</dt><dd>{{ p.supplier }}</dd></div>
              <div><dt>{{ t('pd.ship') }}</dt><dd>{{ t('pd.ship48') }}</dd></div>
            </template>
            <div v-if="p.ip === 'white'"><dt>{{ t('pd.ip') }}</dt><dd>{{ t('pd.ipWhite') }}</dd></div>
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
              <button class="lnk" @click="standing.open = true">{{ t('pd.viewStanding') }} →</button>
            </div>
          </section>

          <div class="minor">
            <button class="pill ghost sm" @click="addEnquiry">{{ t('pd.addEnquiry') }}</button>
            <button v-if="source === 'sourced'" class="pill ghost sm" @click="addCart">
              {{ t('pd.addCart') }}
            </button>
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

.pd { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: start; }

.vis { position: sticky; top: calc(var(--nav-h) + 20px); }
.hero-ph {
  position: relative; aspect-ratio: 1; border-radius: 20px; overflow: hidden;
  display: grid; place-items: center;
  background: radial-gradient(115% 85% at 50% 6%, rgba(255,255,255,.85), rgba(255,255,255,0) 60%),
              linear-gradient(158deg, var(--t0), var(--t1));
  border: 1px solid var(--line-soft);
}
.hero-ph img { width: 100%; height: 100%; object-fit: cover; }
.art { width: 62%; aspect-ratio: 1; filter: drop-shadow(0 14px 24px rgba(0,0,0,.1)); }
.badge-white, .badge-src {
  position: absolute; top: 16px; font-size: 11px; font-weight: 500;
  padding: 5px 11px; border-radius: 999px;
}
.badge-white { right: 16px; color: #0f6e56; background: rgba(255,255,255,.92); border: 1px solid #5dcaa5; }
.badge-src { left: 16px; color: var(--ink-2); background: rgba(255,255,255,.86); }
.styles { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
.styles-lb { font-size: 12.5px; color: var(--ink-4); margin-right: 4px; }
.chip.sm { padding: 5px 12px; font-size: 12.5px; }

.info .eyebrow { margin-bottom: 10px; }
.ttl { font-size: clamp(26px, 3vw, 36px); line-height: 1.12; font-weight: 700; letter-spacing: -.022em; margin: 0 0 12px; }
.desc { font-size: 15px; color: var(--ink-3); line-height: 1.6; margin: 0 0 18px; }
.price { font-size: 30px; font-weight: 600; letter-spacing: -.02em; margin-bottom: 22px; }

.sp { margin: 0 0 24px; display: grid; gap: 0; font-size: 13.5px; }
.sp > div { display: flex; justify-content: space-between; gap: 16px; padding: 11px 0; border-bottom: 1px solid var(--line-soft); }
.sp dt { color: var(--ink-4); }
.sp dd { margin: 0; color: var(--ink-2); text-align: right; }

.standing-box {
  background: var(--bg-soft); border: 1px solid var(--line-soft);
  border-radius: 16px; padding: 20px 22px;
}
.sb-head h2 { font-size: 17px; font-weight: 600; margin: 0 0 6px; }
.sb-head p { font-size: 12.5px; color: var(--ink-3); line-height: 1.5; margin: 0 0 16px; }
.sb-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.qty-lb { font-size: 13px; color: var(--ink-2); flex: none; }
.qty-input { width: 120px !important; }
.go { flex: 1; min-width: 150px; height: 40px; }
.moq-hint { font-size: 12px; color: var(--accent-ink); margin: 10px 0 0; }
.sb-state {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--line);
  font-size: 12.5px; color: var(--ink-2);
}
.lnk { border: none; background: none; padding: 0; font: inherit; color: var(--accent-ink); cursor: pointer; text-decoration: underline; text-underline-offset: 3px; }

.minor { display: flex; gap: 10px; margin-top: 14px; flex-wrap: wrap; }
.pill.sm { height: 34px; padding: 0 16px; font-size: 13px; }
.pill.ghost.sm { background: none; border: 1px solid var(--line); color: var(--ink-2); }
.pill.ghost.sm:hover { background: var(--bg-soft); }

.why { margin-top: 84px; padding: 56px 0; border-top: 1px solid var(--line-soft); }
.pts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; margin-top: 40px; }
.pt h3 { font-size: 16px; font-weight: 600; margin: 0 0 8px; }
.pt p { font-size: 13.5px; color: var(--ink-3); line-height: 1.6; margin: 0; }

.rel { margin-top: 20px; }
.sm-h { font-size: 26px; }
.rel-sub { font-size: 14px; margin-bottom: 24px; }
.rel-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.rel-card { display: grid; gap: 0; }
.rel-ph { aspect-ratio: 4/3; display: grid; place-items: center; background: linear-gradient(150deg, var(--t0), var(--t1)); }
.rel-ph :deep(svg) { width: 46%; }
.rel-bd { padding: 12px 14px 14px; display: grid; gap: 4px; }
.rel-bd strong { font-size: 13.5px; font-weight: 600; }
.rel-meta { font-size: 12px; color: var(--ink-4); }

@media (max-width: 900px) {
  .pd { grid-template-columns: 1fr; gap: 30px; }
  .vis { position: static; }
  .pts { grid-template-columns: 1fr; gap: 18px; }
  .rel-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 560px) {
  .rel-grid { grid-template-columns: 1fr 1fr; }
  .go { min-width: 100%; }
}
</style>
