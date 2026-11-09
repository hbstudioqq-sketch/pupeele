<script setup>
import { useI18n } from 'vue-i18n'
import message from 'ant-design-vue/es/message'
import { useStandingStore } from '@/stores/standing'
import { useAuthStore } from '@/stores/auth'
import { useStandingEnquire } from '@/composables/standingEnquiry'
import { CATEGORIES } from '@/data/catalog'
import CategoryArt from '@/components/CategoryArt.vue'

/* 常备单独立页：与 StandingDrawer（全局快捷抽屉）共用 standing store
   与 standingEnquiry composable，两边看到的是同一份清单。 */
const { t } = useI18n()
const standing = useStandingStore()
const auth = useAuthStore()
const { enquire } = useStandingEnquire()

const labelOf = i => i.nameKey ? t(i.nameKey) : i.name
const styleOf = i => i.styleLabelKey ? t(i.styleLabelKey) : ''
const catOf = i => CATEGORIES.find(c => c.id === i.cat) || CATEGORIES[0]

/* InputNumber 逐字输入会连续触发 change，这里只落库不弹 toast，
   底部「共 N 件」实时变化本身就是反馈。 */
function onQty (key, v) {
  const n = Number(v)
  if (!Number.isFinite(n) || n < 1) return
  standing.setQty(key, Math.round(n))
}
function remove (key) {
  standing.remove(key)
  message.success(t('st.removed'))
}
function clear () {
  standing.clear()
  message.success(t('st.cleared'))
}

const points = [
  { k: 'pd.b1t', d: 'pd.b1d' },
  { k: 'pd.b2t', d: 'pd.b2d' },
  { k: 'pd.b3t', d: 'pd.b3d' }
]
</script>

<template>
  <div class="wrap page">
    <div class="stv">
      <!-- 左：说明栏（桌面显示） -->
      <aside class="side">
        <p class="eyebrow">{{ t('nav.standing') }}</p>
        <h1 class="h2">{{ t('stv.title') }}</h1>
        <p class="lead">{{ t('st.sub') }}</p>
        <ul class="pts">
          <li v-for="b in points" :key="b.k">
            <strong>{{ t(b.k) }}</strong>
            <span>{{ t(b.d) }}</span>
          </li>
        </ul>
        <p class="side-note">{{ t('stv.sideNote') }}</p>
      </aside>

      <!-- 右：清单卡片 -->
      <section class="panel">
        <header class="hd">
          <h2>{{ t('st.title') }} <span v-if="standing.count" class="cnt">({{ standing.count }})</span></h2>
          <p>{{ t('stv.hint') }}</p>
        </header>

        <template v-if="standing.count">
          <div v-for="i in standing.items" :key="i.key" class="si">
            <div class="si-thumb">
              <img v-if="i.image" :src="i.image" :alt="labelOf(i)" />
              <CategoryArt v-else :id="catOf(i).icon" :variant="0" :tint="i.tint" />
            </div>
            <div class="si-main">
              <strong>{{ labelOf(i) }}</strong>
              <span v-if="styleOf(i)" class="si-style">{{ styleOf(i) }}</span>
              <span v-if="i.meta" class="si-meta">{{ i.meta }}</span>
              <div class="si-row">
                <label class="si-lb">{{ t('st.qty') }}</label>
                <a-input-number
                  :value="i.qty" :min="1" :max="999999" size="small"
                  class="si-qty" @change="v => onQty(i.key, v)"
                />
                <button class="si-x" :aria-label="t('st.remove')" @click="remove(i.key)">×</button>
              </div>
            </div>
          </div>

          <div class="sum">
            <span>{{ t('st.items', { n: standing.count }) }}</span>
            <strong>{{ t('st.pcs', { n: standing.totalQty }) }}</strong>
          </div>

          <p v-if="!auth.canEnquire" class="gate-hint">{{ t('st.gateHint') }}</p>
          <div class="acts">
            <button class="pill go" @click="enquire">{{ t('st.enquire') }}</button>
            <button class="pill ghost" @click="clear">{{ t('st.clear') }}</button>
          </div>
          <p class="repeat">{{ t('st.repeatHint') }}</p>
        </template>

        <a-empty v-else :description="t('st.empty')">
          <p class="empty-hint">{{ t('st.emptyHint') }}</p>
          <router-link class="pill" to="/collections">{{ t('hero.cta1') }}</router-link>
        </a-empty>
      </section>
    </div>
  </div>
</template>

<style scoped>
.page { padding: 44px 0 80px; }
.stv { display: grid; grid-template-columns: 1fr 420px; gap: 56px; align-items: start; }

.side .h2 { font-size: clamp(24px, 2.6vw, 32px); }
.pts { list-style: none; margin: 30px 0 0; padding: 0; display: grid; gap: 18px; }
.pts li { display: grid; gap: 3px; padding-left: 14px; border-left: 2px solid var(--accent); }
.pts strong { font-size: 14.5px; font-weight: 600; }
.pts span { font-size: 13px; color: var(--ink-3); line-height: 1.55; }
.side-note { margin-top: 30px; font-size: 12.5px; color: var(--ink-4); line-height: 1.6; }

.panel {
  background: var(--bg-card);
  border: 1px solid var(--line-soft);
  border-radius: var(--radius);
  padding: 22px 24px 24px;
}
.hd h2 { margin: 0; font-size: 18px; font-weight: 700; }
.hd .cnt { color: var(--ink-4); font-weight: 500; font-size: 14px; }
.hd p { margin: 4px 0 6px; font-size: 12.5px; color: var(--ink-3); }

.si { display: flex; gap: 12px; padding: 14px 0; border-bottom: 1px solid var(--line-soft); }
.si-thumb {
  width: 58px; height: 58px; flex: none; border-radius: 10px; overflow: hidden;
  display: grid; place-items: center;
  background: linear-gradient(150deg, #f3f1ee, #e3ded8);
}
.si-thumb img { width: 100%; height: 100%; object-fit: cover; }
.si-thumb :deep(svg) { width: 66%; }
.si-main { flex: 1; min-width: 0; display: grid; gap: 3px; }
.si-main strong { font-size: 13.5px; font-weight: 600; }
.si-style { font-size: 12px; color: var(--ink-3); }
.si-meta { font-size: 11.5px; color: var(--ink-4); }
.si-row { display: flex; align-items: center; gap: 8px; margin-top: 7px; }
.si-lb { font-size: 12px; color: var(--ink-4); flex: none; }
.si-qty { width: 96px !important; }
.si-x {
  margin-left: auto; width: 24px; height: 24px; flex: none;
  border: none; background: none; color: var(--ink-4);
  font-size: 18px; cursor: pointer; border-radius: 6px;
}
.si-x:hover { background: var(--bg-soft); color: var(--ink); }

.sum {
  display: flex; justify-content: space-between; align-items: baseline;
  margin: 16px 0 14px; padding: 14px 0; border-top: 1px solid var(--line);
  font-size: 13.5px; color: var(--ink-2);
}
.sum strong { font-size: 17px; color: var(--ink); }
.gate-hint { font-size: 12px; color: var(--accent-ink); background: var(--accent-soft); border-radius: 8px; padding: 9px 12px; margin: 0 0 12px; line-height: 1.5; }
.acts { display: grid; gap: 10px; }
.go { height: 44px; font-size: 14.5px; }
.repeat { font-size: 11.5px; color: var(--ink-4); margin: 14px 0 0; line-height: 1.5; }
.empty-hint { color: var(--ink-4); font-size: 12.5px; margin-bottom: 14px; }

@media (max-width: 900px) {
  .stv { grid-template-columns: 1fr; gap: 26px; }
  .side { display: none; }
}
</style>
