<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import message from 'ant-design-vue/es/message'
import { useCartStore } from '@/stores/cart'
import { CATEGORIES } from '@/data/catalog'
import CategoryArt from '@/components/CategoryArt.vue'

const props = defineProps({ p: { type: Object, required: true } })
const { t, locale } = useI18n()
const cart = useCartStore()

const cat = CATEGORIES.find(c => c.id === props.p.cat) || CATEGORIES[0]

/* 款式选择：有 styles 时默认选第一款 */
const styleIdx = ref(props.p.styles ? 0 : -1)
const active = computed(() => {
  if (props.p.styles && styleIdx.value >= 0) return props.p.styles[styleIdx.value]
  return { priceUSD: props.p.retailUSD, costCNY: props.p.costCNY }
})
const price = computed(() => active.value.priceUSD)

/* 白牌安全徽章：ip === 'white' 才显示 */
const isWhite = computed(() => props.p.ip === 'white')

/* 已加入购物车的量（按 id+款式） */
const inCart = computed(() => {
  const key = props.p.id + (styleIdx.value >= 0 ? '-' + styleIdx.value : '')
  return cart.items.find(i => i.key === key)?.qty || 0
})

function addToCart () {
  const key = props.p.id + (styleIdx.value >= 0 ? '-' + styleIdx.value : '')
  cart.add({
    id: props.p.id,
    nameKey: props.p.nameKey,
    styleLabelKey: styleIdx.value >= 0 ? props.p.styles[styleIdx.value].labelKey : null,
    priceUSD: price.value,
    costCNY: active.value.costCNY,
    qty: 1,
    image: props.p.image || '',
    tint: props.p.tint,
    cat: props.p.cat,
    key
  })
  message.success(t('store.added'))
}
</script>

<template>
  <article class="card sc">
    <div class="ph" :style="{ '--t0': p.tint[0], '--t1': p.tint[1] }">
      <img v-if="p.image" :src="p.image" :alt="t(p.nameKey)" class="ph-img" />
      <div v-else class="ph-art">
        <CategoryArt :id="cat.icon" :variant="0" :tint="p.tint" />
      </div>
      <span v-if="isWhite" class="badge-white">{{ t('store.white') }}</span>
      <span class="tag">{{ t(cat.nameKey) }}</span>
    </div>

    <div class="bd">
      <h3 class="nm">{{ t(p.nameKey) }}</h3>
      <p class="ds">{{ t(p.descKey) }}</p>

      <div v-if="p.styles" class="styles">
        <button
          v-for="(s, i) in p.styles" :key="i"
          class="chip" :class="{ on: styleIdx === i }"
          @click="styleIdx = i"
        >{{ t(s.labelKey) }}</button>
      </div>

      <div class="price-row">
        <span class="price">${{ price.toFixed(2) }}</span>
        <span class="moq">{{ t('store.moq') }} {{ p.moq }}+</span>
      </div>

      <button class="pill buy" @click="addToCart">
        {{ inCart ? t('store.inCart', { n: inCart }) : t('store.addCart') }}
      </button>
    </div>
  </article>
</template>

<style scoped>
.sc { display: flex; flex-direction: column; overflow: hidden; background: var(--bg-card, #fff); border-radius: 16px; }
.ph { position: relative; aspect-ratio: 16 / 11; display: grid; place-items: center; overflow: hidden;
  background: radial-gradient(115% 85% at 50% 6%, rgba(255,255,255,.82), rgba(255,255,255,0) 60%),
              linear-gradient(158deg, var(--t0), var(--t1)); }
.ph-img { width: 100%; height: 100%; object-fit: cover; }
.ph-art { width: 63%; max-width: 146px; aspect-ratio: 1; filter: drop-shadow(0 8px 14px rgba(0,0,0,.09)); }
.tag { position: absolute; left: 12px; top: 12px; font-size: 11px; padding: 3px 9px; border-radius: 999px;
  color: rgba(0,0,0,.55); background: rgba(255,255,255,.68); backdrop-filter: blur(6px); }
.badge-white { position: absolute; right: 12px; top: 12px; font-size: 10.5px; font-weight: 600; padding: 3px 8px;
  border-radius: 999px; color: #0f6e56; background: rgba(255,255,255,.9); border: 1px solid #5dcaa5; }
.bd { padding: 16px 18px 18px; display: flex; flex-direction: column; gap: 8px; flex: 1; }
.nm { margin: 0; font-size: 16px; font-weight: 600; }
.ds { margin: 0; font-size: 13px; color: var(--ink-3); line-height: 1.5; min-height: 39px; }
.styles { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { font-size: 12px; padding: 4px 10px; border-radius: 999px; border: 1px solid var(--line-soft);
  background: none; color: var(--ink-2); cursor: pointer; }
.chip.on { background: var(--ink); color: var(--bg-card, #fff); border-color: var(--ink); }
.price-row { display: flex; align-items: baseline; justify-content: space-between; margin-top: auto; padding-top: 4px; }
.price { font-size: 19px; font-weight: 600; }
.moq { font-size: 12px; color: var(--ink-4); }
.buy { margin-top: 6px; width: 100%; height: 36px; font-size: 13px; }
</style>
