<script setup>
import { useI18n } from 'vue-i18n'
import message from 'ant-design-vue/es/message'
import { useStandingStore } from '@/stores/standing'
import { useAuthStore } from '@/stores/auth'
import { useStandingEnquire } from '@/composables/standingEnquiry'
import { CATEGORIES } from '@/data/catalog'
import CategoryArt from '@/components/CategoryArt.vue'

const { t } = useI18n()
const standing = useStandingStore()
const auth = useAuthStore()
const { enquire } = useStandingEnquire()

const labelOf = i => i.nameKey ? t(i.nameKey) : i.name
const styleOf = i => i.styleLabelKey ? t(i.styleLabelKey) : ''
const catOf = i => CATEGORIES.find(c => c.id === i.cat) || CATEGORIES[0]

/* InputNumber 逐字输入会连续触发 change，这里只落库不弹 toast，
   底部「共 N 件」实时变化本身就是反馈，避免提示叠成一串。 */
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
</script>

<template>
  <a-drawer
    v-model:open="standing.open"
    :title="`${t('st.title')}${standing.count ? ' (' + standing.count + ')' : ''}`"
    placement="right"
    :width="420"
  >
    <template v-if="standing.count">
      <p class="sub">{{ t('st.sub') }}</p>

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
        <a-button type="primary" block size="large" @click="enquire">
          {{ t('st.enquire') }}
        </a-button>
        <a-button block @click="clear">{{ t('st.clear') }}</a-button>
      </div>
      <p class="repeat">{{ t('st.repeatHint') }}</p>
    </template>

    <a-empty v-else :description="t('st.empty')">
      <p class="empty-hint">{{ t('st.emptyHint') }}</p>
    </a-empty>
  </a-drawer>
</template>

<style scoped>
.sub { font-size: 12.5px; color: var(--ink-3); margin: 0 0 14px; line-height: 1.5; }
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
  margin: 18px 0 14px; padding: 14px 0; border-top: 1px solid var(--line);
  font-size: 13.5px; color: var(--ink-2);
}
.sum strong { font-size: 17px; color: var(--ink); }
.gate-hint { font-size: 12px; color: var(--accent-ink); margin: 0 0 12px; line-height: 1.5; }
.acts { display: grid; gap: 10px; }
.repeat { font-size: 11.5px; color: var(--ink-4); margin: 14px 0 0; line-height: 1.5; }
.empty-hint { color: var(--ink-4); font-size: 12.5px; }
</style>
