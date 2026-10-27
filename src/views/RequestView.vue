<script setup>
import { reactive, ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import message from 'ant-design-vue/es/message'
import { DOLL_TYPES, SIZES, STYLES, LEADS } from '@/data/taxonomy'
import { CATEGORIES } from '@/data/catalog'
import SendSheet from '@/components/SendSheet.vue'
import CategoryArt from '@/components/CategoryArt.vue'
import { header } from '@/composables/useSend'
import { useReveal } from '@/composables/useReveal'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/supabase'

const { t, locale } = useI18n()
const auth = useAuthStore()
useReveal()

const form = reactive({
  type: '',
  size: '',
  style: '',
  colorway: '',
  cats: [],
  qty: '',
  target: '',
  lead: '',
  name: '',
  contact: '',
  notes: ''
})
const sendOpen = ref(false)
const sendText = ref('')

const catOpts = computed(() => CATEGORIES.map(c => ({ label: t(c.nameKey), value: c.id })))

function submit () {
  if (!form.type || !form.contact) {
    message.warning(t('f.required'))
    return
  }
  const line = (k, v) => `${t(k)}: ${v}`
  const dt = DOLL_TYPES.find(d => d.id === form.type)
  const sz = SIZES.find(s => s.id === form.size)
  const st = STYLES.find(s => s.id === form.style)
  const ld = LEADS.find(l => l.id === form.lead)
  const catNames = form.cats.map(id => CATEGORIES.find(c => c.id === id))
    .filter(Boolean).map(c => t(c.nameKey)).join(', ')

  const rows = [
    header(locale.value),
    '',
    `【${t('req.title')}】`,
    line('f.dollType', dt ? t(dt.nameKey) : '—'),
    line('f.size', sz ? t(sz.nameKey) : '—'),
    line('f.style', st ? t(st.nameKey) : '—'),
    line('f.colorway', form.colorway || '—'),
    line('f.cats', catNames || '—'),
    line('f.qty', form.qty || '—'),
    line('f.target', form.target || '—'),
    line('f.lead', ld ? t(ld.nameKey) : '—'),
    line('f.name', form.name || '—'),
    line('f.contact', form.contact),
    line('f.notes', form.notes || '—')
  ]
  sendText.value = rows.join('\n')
  sendOpen.value = true
  save()
}

/* 落库：不阻塞发送弹窗，失败时提示用户仍可复制 / WhatsApp 发送。
   登录用户写入 user_id，便于在「我的询价单」中查看；
   若数据库尚未执行 account.sql（缺 user_id 列），退回匿名写入。 */
async function save () {
  const base = {
    lang: locale.value,
    doll_type: form.type,
    size: form.size,
    style: form.style,
    colorway: form.colorway || null,
    categories: form.cats,
    qty: form.qty || null,
    target: form.target || null,
    lead: form.lead,
    name: form.name || null,
    contact: form.contact,
    notes: form.notes || null
  }
  try {
    let payload = base
    if (auth.user) payload = { ...base, user_id: auth.user.id }
    let { error } = await supabase.from('requests').insert(payload)
    if (error && payload !== base) {
      ({ error } = await supabase.from('requests').insert(base))
    }
    if (error) throw error
    message.success(t('db.saved'))
  } catch (e) {
    console.error('[supabase] requests insert failed', e)
    message.warning(t('db.failed'))
  }
}
</script>

<template>
  <div class="wrap page">
    <p class="eyebrow">{{ t('req.eyebrow') }}</p>
    <h1 class="h2">{{ t('req.title') }}</h1>
    <p class="lead">{{ t('req.sub') }}</p>

    <div class="cols">
      <!-- 左：形象卡 -->
      <section>
        <h3 class="st"><span class="no">1</span>{{ t('req.step1') }}</h3>
        <div class="dolls">
          <button
            v-for="d in DOLL_TYPES" :key="d.id"
            class="doll" :class="{ on: form.type === d.id }"
            @click="form.type = d.id"
          >
            <span class="di" :style="{ '--t0': d.tint[0], '--t1': d.tint[1] }">
            <span class="di-art"><CategoryArt :id="d.icon" :variant="0" :tint="d.tint" /></span>
            </span>
            <span class="dn">{{ t(d.nameKey) }}</span>
            <span class="dtag">{{ form.type === d.id ? t('d.selected') : t('d.select') }}</span>
          </button>
        </div>

        <h3 class="st"><span class="no">3</span>{{ t('req.step3') }}</h3>
        <p class="hint">{{ t('send.sub') }}</p>
      </section>

      <!-- 右：表单 -->
      <section>
        <h3 class="st"><span class="no">2</span>{{ t('req.step2') }}</h3>
        <a-form layout="vertical" class="frm" @submit.prevent="submit">
          <div class="two">
            <a-form-item :label="t('f.dollType')">
              <a-select
                v-model:value="form.type" :placeholder="t('f.dollType')"
                :options="DOLL_TYPES.map(d => ({ value: d.id, label: t(d.nameKey) }))"
              />
            </a-form-item>
            <a-form-item :label="t('f.size')">
              <a-select
                v-model:value="form.size" :placeholder="t('f.optional')"
                :options="SIZES.map(s => ({ value: s.id, label: t(s.nameKey) }))"
              />
            </a-form-item>
          </div>

          <a-form-item :label="t('f.style')">
            <div class="chips">
              <button
                v-for="s in STYLES" :key="s.id"
                class="chip" :class="{ on: form.style === s.id }"
                @click="form.style = s.id"
              >{{ t(s.nameKey) }}</button>
            </div>
          </a-form-item>

          <a-form-item :label="t('f.colorway')">
          <a-input v-model:value="form.colorway" :placeholder="t('f.colorwayPh')" />
          </a-form-item>

          <a-form-item :label="t('f.cats')">
            <a-checkbox-group
              v-model:value="form.cats"
              :options="catOpts"
            />
          </a-form-item>

          <div class="two">
            <a-form-item :label="t('f.qty')">
            <a-input v-model:value="form.qty" :placeholder="t('f.qtyPh')" />
            </a-form-item>
            <a-form-item :label="t('f.target')">
            <a-input v-model:value="form.target" :placeholder="t('f.targetPh')" />
            </a-form-item>
          </div>

          <a-form-item :label="t('f.lead')">
            <a-radio-group
              v-model:value="form.lead"
              :options="LEADS.map(l => ({ value: l.id, label: t(l.nameKey) }))"
            />
          </a-form-item>

          <div class="two">
            <a-form-item :label="t('f.name')">
            <a-input v-model:value="form.name" :placeholder="t('f.namePh')" />
            </a-form-item>
            <a-form-item :label="t('f.contact')">
            <a-input v-model:value="form.contact" :placeholder="t('f.contactPh')" />
            </a-form-item>
          </div>

          <a-form-item :label="t('f.notes')">
          <a-textarea v-model:value="form.notes" :rows="3" :placeholder="t('f.notesPh')" />
          </a-form-item>

          <a-button type="primary" size="large" block html-type="submit">{{ t('f.submit') }}</a-button>
        </a-form>
      </section>
    </div>

    <SendSheet v-model:open="sendOpen" :title="t('send.title')" :sub="t('send.sub')" :text="sendText" />
  </div>
</template>

<style scoped>
.page { padding: 48px 0 80px; }
.cols { display: grid; grid-template-columns: 340px 1fr; gap: 44px; margin-top: 34px; align-items: start; }
.st { display: flex; align-items: center; gap: 10px; font-size: 15px; font-weight: 600; margin: 0 0 16px; }
.no {
  display: grid; place-items: center;
  width: 22px; height: 22px; border-radius: 50%;
  background: var(--ink); color: #fff; font-size: 12px;
}
.dolls { display: grid; gap: 10px; margin-bottom: 30px; }
.doll {
  display: grid; grid-template-columns: 54px 1fr auto; align-items: center; gap: 12px;
  padding: 10px; border: 1px solid var(--line-soft); border-radius: 14px;
  background: #fff; cursor: pointer; text-align: left;
  transition: all .28s var(--ease);
}
.doll:hover { border-color: var(--line); }
.doll.on { border-color: var(--ink); box-shadow: 0 0 0 1px var(--ink) inset; }
.di {
  position: relative;
  width: 54px; height: 54px; border-radius: 11px;
  display: grid; place-items: center; overflow: hidden;
  background:
    radial-gradient(110% 80% at 50% 4%, rgba(255, 255, 255, .85), rgba(255, 255, 255, 0) 62%),
    linear-gradient(150deg, var(--t0), var(--t1));
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .55);
}
.di-art {
  position: relative; z-index: 1;
  width: 74%; aspect-ratio: 1;
  filter: drop-shadow(0 3px 5px rgba(0, 0, 0, .08));
  transition: transform .4s var(--ease);
}
.doll:hover .di-art { transform: scale(1.07); }
.doll.on .di-art { transform: scale(1.1); }
.dn { font-size: 14px; font-weight: 500; }
.dtag { font-size: 11.5px; color: var(--ink-4); }
.doll.on .dtag { color: var(--accent-ink); font-weight: 600; }
.hint { font-size: 13px; color: var(--ink-4); }
.two { display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
@media (max-width: 900px) {
  .cols { grid-template-columns: 1fr; gap: 32px; }
  .two { grid-template-columns: 1fr; }
}
</style>
