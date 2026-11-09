<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import message from 'ant-design-vue/es/message'
import { CATEGORIES, PRODUCTS, SOURCED } from '@/data/catalog'
import { useStandingStore } from '@/stores/standing'
import CategoryArt from '@/components/CategoryArt.vue'
import { useReveal } from '@/composables/useReveal'

/* 首页 = 找货型 hero + 信任条 + 品类矩阵 + 常备快补表 + Studio 入口。
   现货直供区与深色叙事区按设计稿退役；白牌商品并入统一目录。 */
const { t } = useI18n()
const router = useRouter()
const standing = useStandingStore()
useReveal()

const kw = ref('')
function goCatalog (params = {}) {
  router.push({ path: '/collections', query: params })
}
function search () {
  goCatalog(kw.value.trim() ? { kw: kw.value.trim() } : {})
}

/* 品类矩阵：全目录按品类计数 */
const ALL = [...SOURCED, ...PRODUCTS]
const catCount = id => ALL.filter(p => p.cat === id).length

/* 常备快补：白牌现货高频复购品（可直接以 MOQ 数量加回常备单） */
const quick = SOURCED.slice(0, 3)

function quickAdd (p) {
  const existed = standing.has(p.id)
  /* 与详情页默认款式同 key，避免同一商品两行 */
  const hasStyles = !!p.styles?.length
  standing.put({
    key: hasStyles ? p.id + '-0' : p.id,
    id: p.id,
    nameKey: p.nameKey,
    styleLabelKey: hasStyles ? p.styles[0].labelKey : null,
    qty: p.moq || 100,
    price: '¥' + p.costCNY,
    meta: `${p.size} · MOQ ${p.moq}`,
    size: p.size,
    moq: p.moq,
    cat: p.cat,
    tint: p.tint,
    image: p.image || '',
    source: 'sourced'
  })
  message.success(existed ? t('pd.updatedStanding') : t('pd.addedStanding'))
}

const trust = [
  { k: 'trust.t1', d: 'trust.d1' },
  { k: 'trust.t2', d: 'trust.d2' },
  { k: 'trust.t3', d: 'trust.d3' },
  { k: 'trust.t4', d: 'trust.d4' }
]

const whyPoints = [
  { k: 'pd.b1t', d: 'pd.b1d' },
  { k: 'pd.b2t', d: 'pd.b2d' },
  { k: 'pd.b3t', d: 'pd.b3d' }
]
</script>

<template>
  <div>
    <!-- 找货型 hero -->
    <section class="hero">
      <div class="wrap hero-in">
        <p class="eyebrow">{{ t('hero.findEyebrow') }}</p>
        <h1 class="h1">{{ t('hero.findTitle') }}</h1>
        <p class="lead">{{ t('hero.findSub') }}</p>
        <form class="search" role="search" @submit.prevent="search">
          <input
            v-model="kw"
            type="search"
            :placeholder="t('hero.searchPh')"
            :aria-label="t('hero.searchPh')"
          />
          <button class="pill" type="submit">{{ t('hero.searchBtn') }}</button>
        </form>
        <div class="quick">
          <button @click="goCatalog({ moq: 300 })">{{ t('hero.qMoq') }}</button>
          <button @click="goCatalog({ stock: 1 })">{{ t('hero.qInstock') }}</button>
          <button @click="goCatalog({ cat: 'charms' })">{{ t('cat.charms') }}</button>
          <button @click="goCatalog({ cat: 'outfits' })">{{ t('cat.outfits') }}</button>
          <button @click="goCatalog({ cat: 'bodies' })">{{ t('cat.bodies') }}</button>
        </div>
      </div>
    </section>

    <!-- 信任条 -->
    <section class="trust">
      <div class="wrap trust-grid">
        <div v-for="x in trust" :key="x.k" class="t-cell reveal">
          <b>{{ t(x.k) }}</b>
          <span>{{ t(x.d) }}</span>
        </div>
      </div>
    </section>

    <!-- 品类矩阵 -->
    <section class="section wrap">
      <div class="sec-hd reveal">
        <h2 class="h2 sm">{{ t('home.cats') }}</h2>
        <button class="lnk" @click="goCatalog()">{{ t('home.viewAll') }} →</button>
      </div>
      <div class="cats reveal">
        <button
          v-for="c in CATEGORIES" :key="c.id"
          class="cat"
          @click="goCatalog({ cat: c.id })"
        >
          <span class="ci" :style="{ '--t0': c.tint[0], '--t1': c.tint[1] }">
            <span class="ci-art"><CategoryArt :id="c.icon" :variant="0" :tint="c.tint" /></span>
          </span>
          <span class="cn">{{ t(c.nameKey) }}</span>
          <span class="cc">{{ catCount(c.id) }} SKU</span>
        </button>
      </div>
    </section>

    <!-- 常备快补 -->
    <section class="section wrap qsec">
      <div class="sec-hd reveal">
        <h2 class="h2 sm">{{ t('home.quickTitle') }}</h2>
        <router-link class="lnk" to="/standing">{{ t('home.openStanding') }} →</router-link>
      </div>
      <p class="lead qsub reveal">{{ t('home.quickSub') }}</p>
      <div class="qtable card reveal">
        <table>
          <thead>
            <tr>
              <th>{{ t('quick.item') }}</th>
              <th>{{ t('p.size') }}</th>
              <th>{{ t('p.moq') }}</th>
              <th>{{ t('p.price') }}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in quick" :key="p.id">
              <td>
                <b>{{ t(p.nameKey) }}</b>
                <span class="sku">{{ p.sku }}</span>
              </td>
              <td>{{ p.size }}</td>
              <td>{{ p.moq }}</td>
              <td class="pr">¥{{ p.costCNY }}</td>
              <td class="act">
                <button class="pill sm" @click="quickAdd(p)">{{ t('p.add') }}</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- 为什么用常备单 -->
    <section class="section wrap whysec">
      <div class="center reveal">
        <p class="eyebrow">{{ t('nav.standing') }}</p>
        <h2 class="h2 sm">{{ t('pd.whyTitle') }}</h2>
        <p class="lead">{{ t('pd.standingSub') }}</p>
      </div>
      <div class="pts reveal">
        <div v-for="b in whyPoints" :key="b.k" class="pt">
          <h3>{{ t(b.k) }}</h3>
          <p>{{ t(b.d) }}</p>
        </div>
      </div>
    </section>

    <!-- 搭配间入口（Studio 降级为首页模块） -->
    <section class="look">
      <div class="wrap look-in">
        <div class="look-txt reveal">
          <p class="eyebrow">{{ t('look.eyebrow') }}</p>
          <h2 class="h2 sm">{{ t('look.title') }}</h2>
          <p class="lead">{{ t('look.sub') }}</p>
          <button class="pill" style="margin-top: 18px" @click="router.push('/studio')">
            {{ t('nav.studio') }} →
          </button>
        </div>
      </div>
      <img
        src="/img/lifestyle.jpg"
        alt="PUPEELE bag charm on a tote"
        width="1200" height="800"
        loading="lazy" decoding="async"
        class="look-img reveal"
      />
    </section>
  </div>
</template>

<style scoped>
/* ── 找货型 hero ── */
.hero { padding: 64px 0 52px; background: linear-gradient(165deg, #ffffff 0%, #f8f4ee 100%); border-bottom: 1px solid var(--line-soft); }
.hero-in { max-width: 860px; }
.h1 { font-size: clamp(28px, 4vw, 44px); line-height: 1.12; }
.search { display: flex; gap: 10px; max-width: 580px; margin: 28px 0 14px; }
.search input {
  flex: 1; height: 44px; padding: 0 16px;
  border: 1px solid var(--line); border-radius: 12px;
  background: #fff; color: var(--ink); font-size: 14px; outline: none;
  transition: border-color .2s;
}
.search input:focus { border-color: var(--accent); }
.search .pill { height: 44px; padding: 0 26px; }
.quick { display: flex; gap: 8px; flex-wrap: wrap; }
.quick button {
  font: inherit; font-size: 13px; padding: 7px 14px;
  border-radius: 999px; border: 1px solid var(--line);
  background: #fff; color: var(--ink-2); cursor: pointer;
  transition: border-color .2s, color .2s;
}
.quick button:hover { border-color: var(--accent); color: var(--accent-ink); }

/* ── 信任条 ── */
.trust { background: #fff; border-bottom: 1px solid var(--line-soft); }
.trust-grid { display: grid; grid-template-columns: repeat(4, 1fr); }
.t-cell { padding: 22px 18px; border-left: 1px solid var(--line-soft); }
.t-cell:first-child { border-left: none; padding-left: 0; }
.t-cell b { display: block; font-size: 14px; font-weight: 650; margin-bottom: 3px; }
.t-cell span { font-size: 12.5px; color: var(--ink-3); line-height: 1.5; }

/* ── 区块头 ── */
.h2.sm { font-size: clamp(22px, 2.6vw, 30px); }
.sec-hd { display: flex; align-items: baseline; justify-content: space-between; gap: 14px; margin-bottom: 8px; }
.lnk {
  border: none; background: none; padding: 0; font: inherit;
  font-size: 13.5px; color: var(--accent-ink); cursor: pointer;
}
.lnk:hover { color: var(--ink); }

/* ── 品类矩阵 ── */
.cats { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; margin: 26px 0 6px; }
.cat {
  border: none; background: none; cursor: pointer;
  display: grid; gap: 6px; justify-items: center; padding: 0;
}
.ci {
  position: relative;
  width: 100%; aspect-ratio: 1; border-radius: 14px;
  display: grid; place-items: center;
  overflow: hidden;
  transition: transform .35s var(--ease), box-shadow .35s var(--ease);
  background:
    radial-gradient(110% 80% at 50% 4%, rgba(255, 255, 255, .85), rgba(255, 255, 255, 0) 62%),
    linear-gradient(150deg, var(--t0), var(--t1));
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .55), 0 1px 2px rgba(28, 27, 25, .05);
}
.ci-art {
  position: relative; z-index: 1;
  width: 62%; aspect-ratio: 1;
  filter: drop-shadow(0 5px 9px rgba(28, 27, 25, .08));
  transition: transform .45s var(--ease);
}
.cat:hover .ci { transform: translateY(-4px); box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .7), 0 12px 24px rgba(28, 27, 25, .1); }
.cat:hover .ci-art { transform: scale(1.06); }
.cn { font-size: 12.5px; color: var(--ink-2); font-weight: 500; }
.cc { font-size: 11px; color: var(--ink-4); font-variant-numeric: tabular-nums; }

/* ── 常备快补表 ── */
.qsec .qsub { font-size: 14px; margin-bottom: 22px; }
.qtable { overflow: hidden; }
.qtable table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
.qtable th {
  text-align: left; font-size: 11.5px; letter-spacing: .06em; text-transform: uppercase;
  color: var(--ink-4); font-weight: 600; padding: 11px 14px;
  border-bottom: 1px solid var(--line-soft); background: var(--bg-soft);
}
.qtable td { padding: 13px 14px; border-bottom: 1px solid var(--line-soft); color: var(--ink-2); vertical-align: middle; }
.qtable tbody tr:last-child td { border-bottom: none; }
.qtable tbody tr:hover td { background: #fdfbf8; }
.qtable b { display: block; font-size: 13.5px; font-weight: 600; color: var(--ink); }
.sku { font-size: 11px; color: var(--ink-4); font-family: ui-monospace, monospace; }
.pr { font-weight: 650; color: var(--accent-ink); font-variant-numeric: tabular-nums; }
.act { text-align: right; }
.pill.sm { height: 32px; padding: 0 16px; font-size: 12.5px; }

/* ── 为什么用常备单 ── */
.whysec { padding-top: 20px; }
.pts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin: 34px 0 10px; }
.pt { border-top: 2px solid var(--ink); padding-top: 14px; }
.pt h3 { font-size: 15.5px; margin: 0 0 7px; font-weight: 650; }
.pt p { margin: 0; font-size: 13.5px; color: var(--ink-3); line-height: 1.6; }

/* ── 搭配间入口 ── */
.look { padding: 20px 0 40px; }
.look-in { padding: 40px 0 26px; }
.look-txt { max-width: 620px; }
.look-img {
  width: min(1120px, 100% - 40px); margin: 0 auto;
  border-radius: 18px; display: block;
}

@media (max-width: 900px) {
  .hero { padding: 44px 0 38px; }
  .trust-grid { grid-template-columns: repeat(2, 1fr); }
  .t-cell:nth-child(3) { border-left: none; padding-left: 0; }
  .t-cell:nth-child(-n+2) { border-bottom: 1px solid var(--line-soft); }
  .cats { grid-template-columns: repeat(3, 1fr); }
  .pts { grid-template-columns: 1fr; }
  .qtable { overflow-x: auto; }
  .qtable table { min-width: 560px; }
}
@media (max-width: 560px) {
  .cats { grid-template-columns: repeat(2, 1fr); }
  .search { flex-direction: column; }
  .search .pill { width: 100%; }
}
</style>
