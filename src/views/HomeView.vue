<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { CATEGORIES, PRODUCTS, STATS } from '@/data/catalog'
import ProductCard from '@/components/ProductCard.vue'
import CategoryArt from '@/components/CategoryArt.vue'
import { useReveal } from '@/composables/useReveal'

const { t, locale } = useI18n()
const router = useRouter()
useReveal()

const featured = computed(() => PRODUCTS.slice(0, 6))

const points = [
  { k: 'p1t', d: 'p1d' },
  { k: 'p2t', d: 'p2d' },
  { k: 'p3t', d: 'p3d' }
]

const statValue = s => s.value + (s.suffixKey ? t(s.suffixKey) : (s.suffix || ''))
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="dark hero">
      <div class="wrap hero-in">
        <p class="eyebrow">{{ t('hero.eyebrow') }}</p>
        <h1 class="h1">{{ t('hero.title') }}</h1>
        <p class="lead">{{ t('hero.sub') }}</p>
        <div class="cta">
          <button class="pill light" @click="router.push('/collections')">{{ t('hero.cta1') }}</button>
          <button class="pill ghost light" @click="router.push('/studio')">{{ t('hero.cta2') }}</button>
        </div>
        <p class="note">{{ t('hero.note') }}</p>
      </div>
      <div class="hero-img">
        <img
          src="/img/hero.jpg"
          alt="PUPEELE doll wearing the signature atelier look"
          width="1200" height="800"
          fetchpriority="high" decoding="async"
        />
      </div>
    </section>

    <!-- Stats -->
    <section class="wrap stats">
      <div v-for="s in STATS" :key="s.key" class="stat reveal">
        <div class="v">{{ statValue(s) }}</div>
        <div class="l">{{ t(s.key) }}</div>
      </div>
    </section>

    <!-- Collections preview -->
    <section class="section wrap">
      <div class="center reveal">
        <p class="eyebrow">{{ t('col.eyebrow') }}</p>
        <h2 class="h2">{{ t('col.title') }}</h2>
        <p class="lead">{{ t('col.sub') }}</p>
      </div>
      <div class="cats reveal">
        <button
          v-for="c in CATEGORIES" :key="c.id"
          class="cat"
          @click="router.push('/collections')"
        >
          <span class="ci" :style="{ '--t0': c.tint[0], '--t1': c.tint[1] }">
          <span class="ci-art"><CategoryArt :id="c.icon" :variant="0" :tint="c.tint" /></span>
          </span>
          <span class="cn">{{ t(c.nameKey) }}</span>
        </button>
      </div>
      <div class="grid">
        <ProductCard v-for="p in featured" :key="p.id" :p="p" class="reveal" />
      </div>
      <div class="more">
        <button class="pill" @click="router.push('/collections')">{{ t('hero.cta1') }} →</button>
      </div>
    </section>

    <!-- Atelier -->
    <section class="dark section">
      <div class="wrap">
        <div class="center reveal">
          <p class="eyebrow">{{ t('atelier.eyebrow') }}</p>
          <h2 class="h2">{{ t('atelier.title') }}</h2>
          <p class="lead">{{ t('atelier.sub') }}</p>
        </div>
        <div class="pts">
          <div v-for="p in points" :key="p.k" class="pt reveal">
            <h3>{{ t('atelier.' + p.k) }}</h3>
            <p>{{ t('atelier.' + p.d) }}</p>
          </div>
        </div>
        <div class="at-img reveal">
          <img
            src="/img/atelier.jpg"
            alt="PUPEELE atelier workspace"
            width="1200" height="800"
            loading="lazy" decoding="async"
          />
        </div>
      </div>
    </section>

    <!-- Look -->
    <section class="look">
      <div class="wrap look-in">
        <div class="look-txt reveal">
          <p class="eyebrow">{{ t('look.eyebrow') }}</p>
          <h2 class="h2">{{ t('look.title') }}</h2>
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
.hero { padding: 72px 0 0; text-align: center; }
.hero-in { max-width: 860px; }
.hero .lead { margin: 0 auto; }
.cta { display: flex; gap: 12px; justify-content: center; margin: 26px 0 14px; flex-wrap: wrap; }
.note { font-size: 12.5px; color: #86868b; margin: 0; }
.hero-img { margin-top: 44px; padding: 0 20px; }
.hero-img img {
  width: min(1000px, 100%); margin: 0 auto;
  border-radius: 24px 24px 0 0;
  box-shadow: 0 -10px 60px rgba(0, 0, 0, .5);
}

.stats {
  display: grid; grid-template-columns: repeat(4, 1fr);
  gap: 20px; padding: 56px 0; text-align: center;
}
.stat .v { font-size: 30px; font-weight: 700; letter-spacing: -0.02em; }
.stat .l { font-size: 12.5px; color: var(--ink-4); margin-top: 4px; }

.cats { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; margin: 34px 0 40px; }
.cat {
  border: none; background: none; cursor: pointer;
  display: grid; gap: 8px; justify-items: center; padding: 0;
}
.ci {
  position: relative;
  width: 100%; aspect-ratio: 1; border-radius: 16px;
  display: grid; place-items: center;
  overflow: hidden;
  transition: transform .35s var(--ease), box-shadow .35s var(--ease);
  background:
    radial-gradient(110% 80% at 50% 4%, rgba(255, 255, 255, .85), rgba(255, 255, 255, 0) 62%),
    linear-gradient(150deg, var(--t0), var(--t1));
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .55), 0 1px 2px rgba(0, 0, 0, .04);
}
.ci::before {
  content: ''; position: absolute; inset: 0; opacity: .45;
  background-image: radial-gradient(rgba(0, 0, 0, .065) 1px, transparent 1px);
  background-size: 12px 12px;
  mask-image: radial-gradient(80% 65% at 50% 100%, #000, transparent 76%);
  -webkit-mask-image: radial-gradient(80% 65% at 50% 100%, #000, transparent 76%);
}
.ci-art {
  position: relative; z-index: 1;
  width: 62%; aspect-ratio: 1;
  filter: drop-shadow(0 5px 9px rgba(0, 0, 0, .08));
  transition: transform .45s var(--ease);
}
.cat:hover .ci {
  transform: translateY(-4px);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .7), 0 12px 24px rgba(0, 0, 0, .09);
}
.cat:hover .ci-art { transform: scale(1.06); }
.cn { font-size: 12.5px; color: var(--ink-2); }

.grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px;
}
.more { text-align: center; margin-top: 34px; }

.pts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin: 40px 0 44px; }
.pt h3 { font-size: 17px; margin: 0 0 8px; font-weight: 600; }
.pt p { margin: 0; font-size: 14px; color: #a1a1a6; line-height: 1.55; }
.at-img { border-radius: 20px; overflow: hidden; }
.at-img img { border-radius: 20px; }

.look { padding: 0 0 40px; }
.look-in { padding: 64px 0 30px; }
.look-txt { max-width: 620px; }
.look-img {
  width: min(1120px, 100% - 40px); margin: 0 auto;
  border-radius: 22px; display: block;
}

@media (max-width: 900px) {
  .stats { grid-template-columns: repeat(2, 1fr); }
  .cats { grid-template-columns: repeat(3, 1fr); }
  .grid { grid-template-columns: repeat(2, 1fr); }
  .pts { grid-template-columns: 1fr; }
}
@media (max-width: 560px) {
  .grid { grid-template-columns: 1fr; }
}
</style>
