<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import message from 'ant-design-vue/es/message'
import { useEnquiryStore } from '@/stores/enquiry'
import { CATEGORIES, PRODUCTS } from '@/data/catalog'
import CategoryArt from '@/components/CategoryArt.vue'

const props = defineProps({ p: { type: Object, required: true } })
const { t, locale } = useI18n()
const enquiry = useEnquiryStore()

const cat = CATEGORIES.find(c => c.id === props.p.cat) || CATEGORIES[0]
const added = () => enquiry.has(props.p.id)

/* 同品类内的序号 → 图标变体，让 19 个产品各有各的样子 */
const variant = computed(() =>
  PRODUCTS.filter(x => x.cat === props.p.cat).findIndex(x => x.id === props.p.id)
)

function toggle () {
  enquiry.toggle({
    id: props.p.id,
    nameKey: props.p.nameKey,
    meta: `${props.p.size} · MOQ ${props.p.moq} · ${props.p.price}`,
    sku: props.p.id
  })
  if (!added()) message.success(t('toast.added'))
}
</script>

<template>
  <article class="card pc">
    <div class="ph" :style="{ '--t0': p.tint[0], '--t1': p.tint[1] }">
      <div class="ph-art">
        <CategoryArt :id="cat.icon" :variant="variant" :tint="p.tint" />
      </div>
      <span class="tag">{{ t(cat.nameKey) }}</span>
    </div>
    <div class="bd">
      <h3 class="nm">{{ t(p.nameKey) }}</h3>
      <p class="ds">{{ t(p.descKey) }}</p>
      <dl class="sp">
        <div><dt>{{ t('p.size') }}</dt><dd>{{ p.size }}</dd></div>
        <div><dt>{{ t('p.material') }}</dt><dd>{{ t(p.matKey) }}</dd></div>
        <div><dt>{{ t('p.moq') }}</dt><dd>{{ p.moq }}</dd></div>
        <div><dt>{{ t('p.price') }}</dt><dd>{{ p.price }}</dd></div>
        <div><dt>{{ t('p.lead') }}</dt><dd>{{ t(p.leadKey) }}</dd></div>
      </dl>
      <button class="pill add" :class="{ on: added() }" @click="toggle">
        {{ added() ? t('p.added') : t('p.add') }}
      </button>
    </div>
  </article>
</template>

<style scoped>
.pc { display: flex; flex-direction: column; overflow: hidden; }

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
  filter: drop-shadow(0 8px 14px rgba(0, 0, 0, .09));
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

.bd { padding: 16px 18px 18px; display: grid; gap: 8px; }
.nm { margin: 0; font-size: 16px; font-weight: 600; letter-spacing: -0.01em; }
.ds { margin: 0; font-size: 13px; color: var(--ink-3); line-height: 1.5; min-height: 39px; }
.sp { margin: 4px 0 0; display: grid; gap: 4px; font-size: 12.5px; }
.sp > div { display: flex; justify-content: space-between; gap: 12px; }
.sp dt { color: var(--ink-4); margin: 0; }
.sp dd { margin: 0; color: var(--ink-2); text-align: right; }
.add { margin-top: 6px; width: 100%; height: 34px; font-size: 13px; }
.add.on { background: #fff; color: var(--ink); border: 1px solid var(--ink); }
</style>
