<script setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import message from 'ant-design-vue/es/message'
import { copyText, downloadText, openWhatsApp, openFacebook } from '@/composables/useSend'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '' },
  sub: { type: String, default: '' },
  text: { type: String, default: '' },
  filename: { type: String, default: 'pupeele-enquiry.txt' }
})
const emit = defineEmits(['update:open'])

const { t } = useI18n()
const draft = ref(props.text)
watch(() => props.text, v => { draft.value = v })
watch(() => props.open, v => { if (v) draft.value = props.text })

function close () { emit('update:open', false) }
function copy () {
  copyText(draft.value)
  message.success(t('send.copyOk'))
}
function download () { downloadText(props.filename, draft.value) }
function wa () { openWhatsApp(draft.value) }
function fb () { openFacebook(draft.value) }
</script>

<template>
  <a-modal
    :open="props.open"
    :title="props.title"
    :width="560"
    :footer="null"
    centered
    @cancel="close"
  >
    <p class="sub">{{ props.sub }}</p>
    <a-textarea :value="draft" :rows="12" class="box" />
    <div class="acts">
      <a-button type="primary" size="large" block @click="wa">
        {{ t('send.wa') }}
      </a-button>
      <a-button size="large" block @click="fb">{{ t('send.fb') }}</a-button>
      <div class="row">
        <a-button size="large" @click="copy">{{ t('send.copy') }}</a-button>
        <a-button size="large" @click="download">{{ t('send.download') }}</a-button>
      </div>
    </div>
  </a-modal>
</template>

<style scoped>
.sub { color: var(--ink-3); font-size: 14px; margin: 0 0 14px; }
.box { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12.5px; border-radius: 12px; }
.acts { margin-top: 16px; display: grid; gap: 10px; }
.row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
</style>
