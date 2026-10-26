<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { PRODUCTS, CATEGORIES } from '@/data/catalog'
import ProductCard from '@/components/ProductCard.vue'
import CategoryArt from '@/components/CategoryArt.vue'
import { useReveal } from '@/composables/useReveal'

const { t } = useI18n()

const cat = ref('all')
const kw = ref('')

const catName = id => {
  const c = CATEGORIES.find(x => x.id === id)
  return c ? t(c.nameKey) : ''
}

/* 关键词：命中名称 / 描述 / 材质 / 尺寸 / 品类名 任一即可 */
const hit = p => {
  const q = kw.value.trim().toLowerCase()
  if (!q) return true
  return [t(p.nameKey), t(p.descKey), t(p.matKey), p.size, catName(p.cat)]
    .some(s => String(s).toLowerCase().includes(q))
}

/* 关键词匹配后的全集（不看当前品类），用来算每个 chip 的计数 */
const matched = computed(() => PRODUCTS.filter(hit))

const counts = computed(() => {
  const m = { all: matched.value.length }
  for (const c of CATEGORIES) m[c.id] = matched.value.filter(p => p.cat === c.id).length
  return m
})

const list = computed(() =>
  cat.value === 'all' ? matched.value : matched.value.filter(p => p.cat === cat.value)
)

const filtering = computed(() => cat.value !== 'all' || kw.value.trim() !== '')

function reset () {
  cat.value = 'all'
  kw.value = ''
}

/* 列表变化（筛选 / 搜索）后，新出现的卡片要重新接入渐显观察 */
useReveal(list)
</script>

<template>
  <div class="wrap page">
    <p class="eyebrow">{{ t('col.eyebrow') }}</p>
    <h1 class="h2">{{ t('col.title') }}</h1>
    <p class="lead">{{ t('col.sub') }}</p>

    <div class="bar">
      <div class="chips" role="group" :aria-label="t('col.all')">
        <button
          class="chip"
          :class="{ on: cat === 'all' }"
          :aria-pressed="cat === 'all'"
          @click="cat = 'all'"
        >
          <span>{{ t('col.all') }}</span>
          <span class="cn">{{ counts.all }}</span>
        </button>
        <button
          v-for="c in CATEGORIES" :key="c.id"
          class="chip has-icon" :class="{ on: cat === c.id }"
          :aria-pressed="cat === c.id"
          @click="cat = c.id"
        >
          <span class="ci-art"><CategoryArt :id="c.icon" :variant="0" :tint="c.tint" /></span>
          <span>{{ t(c.nameKey) }}</span>
          <span class="cn">{{ counts[c.id] }}</span>
        </button>
      </div>
      <a-input-search
        v-model:value="kw"
        class="search"
        :placeholder="t('col.search')"
        allow-clear
      />
    </div>

    <p class="count">
      <template v-if="filtering">{{ list.length }} / {{ PRODUCTS.length }}</template>
      <template v-else>{{ list.length }}</template>
      {{ t('col.count') }}
      <button v-if="filtering" class="clr" type="button" @click="reset">{{ t('col.clear') }}</button>
    </p>

    <TransitionGroup name="grid" tag="div" class="grid">
      <ProductCard
        v-for="(p, i) in list" :key="p.id" :p="p"
        class="reveal"
        :style="{ '--d': (i % 9) * 55 + 'ms' }"
      />
    </TransitionGroup>

    <a-empty v-if="!list.length" style="margin: 60px 0">
      <template #description>{{ t('col.noresult') }}</template>
      <button class="pill" type="button" @click="reset">{{ t('col.clear') }}</button>
    </a-empty>
  </div>
</template>

<style scoped>
.page { padding: 48px 0 80px; }

/* ── 吸顶筛选栏 ── */
.bar {
  position: sticky;
  top: var(--nav-h);
  z-index: 40;
  display: flex; align-items: center; justify-content: space-between;
  gap: 14px; flex-wrap: wrap;
  margin: 26px 0 0;
  padding: 12px 0;
  background: rgba(255, 255, 255, .82);
  backdrop-filter: saturate(180%) blur(18px);
  -webkit-backdrop-filter: saturate(180%) blur(18px);
  border-bottom: 1px solid var(--line-soft);
}
.chips { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.chip.has-icon { display: inline-flex; align-items: center; gap: 7px; padding-left: 10px; }
.chip { padding-top: 6px; padding-bottom: 6px; }

.ci-art {
  width: 19px; height: 19px; flex: none;
  display: block;
  filter: drop-shadow(0 1px 1px rgba(0, 0, 0, .07));
}
.ci-art :deep(svg) { overflow: visible; }

.cn {
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
  color: currentColor;
  opacity: .55;
}

.search { max-width: 260px; }

.count {
  display: flex; align-items: baseline; gap: 10px;
  font-size: 13px; color: var(--ink-4);
  font-variant-numeric: tabular-nums;
  margin: 14px 0 18px;
}
.clr {
  border: none; background: none; padding: 0;
  font: inherit; color: var(--accent-ink);
  cursor: pointer;
  text-decoration: underline; text-underline-offset: 3px;
}
.clr:hover { color: var(--ink); }

.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }

/* 首屏 / 变更后的卡片错峰渐显 */
.grid .reveal { transition-delay: var(--d, 0ms); }
/* 筛选时卡片位移更顺滑 */
.grid-move { transition: transform .45s var(--ease); }
.grid-leave-active { transition: opacity .22s ease; }
.grid-leave-to { opacity: 0; }

@media (max-width: 900px) { .grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 560px) {
  .grid { grid-template-columns: 1fr; }
  .bar {
    position: static;
    align-items: stretch;
    padding: 0;
    border-bottom-color: transparent;
  }
  .chips {
    flex-wrap: nowrap;
    overflow-x: auto;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 2px;
  }
  .chips::-webkit-scrollbar { display: none; }
  .chip { flex: none; }
  .search { max-width: none; width: 100%; }
}
</style>
