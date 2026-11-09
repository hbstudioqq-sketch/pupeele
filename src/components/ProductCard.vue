<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import message from 'ant-design-vue/es/message'
import { useStandingStore } from '@/stores/standing'
import { CATEGORIES, PRODUCTS } from '@/data/catalog'
import CategoryArt from '@/components/CategoryArt.vue'

/* 目录卡 = 规格前置：尺寸 / 材质 / MOQ / 参考价 / 交期一次看全。
   主按钮「加入常备单」（墨黑）：以 MOQ 数量落入，进常备单页可再改。 */
const props = defineProps({ p: { type: Object, required: true } })
const { t } = useI18n()
const router = useRouter()
const standing = useStandingStore()

function goDetail () { router.push('/product/' + props.p.id) }

const cat = CATEGORIES.find(c => c.id === props.p.cat) || CATEGORIES[0]
const standingKey = computed(() => props.p.styles?.length ? props.p.id + '-0' : props.p.id)
const inStanding = computed(() => standing.qtyOf(standingKey.value))
const isWhite = computed(() => props.p.ip === 'white')

/* 同品类内的序号 → 图标变体，让产品各有各的样子 */
const variant = computed(() =>
  PRODUCTS.filter(x => x.cat === props.p.cat).findIndex(x => x.id === props.p.id)
)

function addStanding () {
  const existed = standing.has(props.p.id)
  /* 有款式的商品默认按第一款入常备单，key 与详情页默认款式一致，避免重复行 */
  const hasStyles = !!props.p.styles?.length
  standing.put({
    key: hasStyles ? props.p.id + '-0' : props.p.id,
    id: props.p.id,
    nameKey: props.p.nameKey,
    styleLabelKey: hasStyles ? props.p.styles[0].labelKey : null,
    qty: props.p.moq || 100,
    price: props.p.retailUSD !== undefined ? '$' + props.p.retailUSD : props.p.price,
    meta: `${props.p.size} · MOQ ${props.p.moq} · ${props.p.retailUSD !== undefined ? '$' + props.p.retailUSD : props.p.price}`,
    size: props.p.size,
    moq: props.p.moq,
    cat: props.p.cat,
    tint: props.p.tint,
    image: props.p.image || '',
    source: props.p.retailUSD !== undefined ? 'sourced' : 'product'
  })
  message.success(existed ? t('pd.updatedStanding') : t('pd.addedStanding'))
}
</script>

<template>
  <article
    class="card pc"
    role="link"
    tabindex="0"
    :aria-label="t(p.nameKey)"
    @click="goDetail"
    @keydown.enter="goDetail"
    @keydown.space.prevent="goDetail"
  >
    <div class="ph" :style="{ '--t0': p.tint[0], '--t1': p.tint[1] }">
      <div class="ph-art">
        <CategoryArt :id="cat.icon" :variant="variant" :tint="p.tint" />
      </div>
      <span v-if="p.sku" class="sku-tag">{{ p.sku }}</span>
      <span class="tag">{{ t(cat.nameKey) }}</span>
      <span v-if="isWhite" class="badge-white">{{ t('store.white') }}</span>
    </div>
    <div class="bd">
      <h3 class="nm">{{ t(p.nameKey) }}</h3>
      <dl class="sp">
        <div><dt>{{ t('p.size') }}</dt><dd>{{ p.size }}</dd></div>
        <div><dt>{{ t('p.material') }}</dt><dd>{{ t(p.matKey) }}</dd></div>
        <div><dt>{{ t('p.moq') }}</dt><dd>{{ p.moq }}</dd></div>
        <div><dt>{{ t('p.price') }}</dt><dd>{{ p.retailUSD !== undefined ? '$' + p.retailUSD : p.price }}</dd></div>
        <div v-if="p.leadKey"><dt>{{ t('p.lead') }}</dt><dd>{{ t(p.leadKey) }}</dd></div>
      </dl>
      <button class="pill add" @click.stop="addStanding">
        {{ inStanding ? t('p.inStanding', { n: inStanding }) : t('p.add') }}
      </button>
    </div>
  </article>
</template>

<style scoped>
.pc { display: flex; flex-direction: column; overflow: hidden; cursor: pointer; }

/* ── 顶部插画区 ── */
.ph {
  position: relative;
  aspect-ratio: 16 / 11;
  display: grid;
  place-items: center;
  overflow: hidden;
  background:
    radial-gradient(115% 85% at 50% 6%, rgba(255, 255, 255, .82), rgba(255, 255, 255, 0) 60%),
    linear-gradient(158deg, var(--t0), var(--t1));
}
/* 细点纹理 */
.ph::before {
  content: '';
  position: absolute;
  inset: 0;
  opacity: .5;
  background-image: radial-gradient(rgba(0, 0, 0, .06) 1px, transparent 1px);
  background-size: 13px 13px;
  mask-image: radial-gradient(80% 70% at 50% 100%, #000, transparent 78%);
  -webkit-mask-image: radial-gradient(80% 70% at 50% 100%, #000, transparent 78%);
}
/* 底部柔光 */
.ph::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(60% 42% at 50% 108%, rgba(255, 255, 255, .55), rgba(255, 255, 255, 0) 70%);
  pointer-events: none;
}

.ph-art {
  position: relative;
  z-index: 1;
  width: 63%;
  max-width: 146px;
  aspect-ratio: 1;
  filter: drop-shadow(0 8px 14px rgba(28, 27, 25, .09));
  transition: transform .45s var(--ease);
}
.pc:hover .ph-art { transform: translateY(-4px) scale(1.035); }

.tag {
  position: absolute;
  z-index: 2;
  left: 12px;
  top: 12px;
  font-size: 11px;
  letter-spacing: .02em;
  padding: 3px 9px;
  border-radius: 999px;
  color: rgba(0, 0, 0, .55);
  background: rgba(255, 255, 255, .68);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  border: 1px solid rgba(255, 255, 255, .8);
}
.sku-tag {
  position: absolute; z-index: 2; left: 12px; bottom: 10px;
  font-size: 10px; font-family: ui-monospace, monospace;
  color: #6d6962; background: rgba(255, 255, 255, .8);
  padding: 2px 7px; border-radius: 5px;
}
.badge-white {
  position: absolute; z-index: 2; right: 12px; top: 12px;
  font-size: 10.5px; font-weight: 600; padding: 3px 8px; border-radius: 999px;
  color: var(--green); background: rgba(255, 255, 255, .92);
  border: 1px solid #c6e3d2;
}

.bd { padding: 16px 18px 18px; display: grid; gap: 8px; }
.nm { margin: 0; font-size: 15.5px; font-weight: 600; letter-spacing: -0.01em; }
.sp { margin: 4px 0 0; display: grid; gap: 4px; font-size: 12.5px; }
.sp > div { display: flex; justify-content: space-between; gap: 12px; }
.sp dt { color: var(--ink-4); margin: 0; }
.sp dd { margin: 0; color: var(--ink-2); text-align: right; font-variant-numeric: tabular-nums; }
.add { margin-top: 6px; width: 100%; height: 36px; font-size: 13px; }
</style>
