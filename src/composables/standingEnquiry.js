import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import message from 'ant-design-vue/es/message'
import { useStandingStore } from '@/stores/standing'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { header } from '@/composables/useSend'
import { supabase } from '@/supabase'

/* ============================================================
   常备单一键询价（全站共用单例）
   ------------------------------------------------------------
   StandingDrawer（快捷抽屉）与 StandingView（/standing 独立页）
   都调用同一份 enquire()：订阅门禁 → 生成带 ×数量的询价文本
   → 打开 SendSheet → 落库 enquiries（qty 放 JSONB items，
   不新增数据库列）。SendSheet 挂在 App.vue，绑定下面的单例状态。
   ============================================================ */

const sendOpen = ref(false)
const sendText = ref('')
const sendFilename = ref('pupeele-standing-enquiry.txt')

export function useStandingEnquire () {
  const { t, locale } = useI18n()
  const router = useRouter()
  const standing = useStandingStore()
  const auth = useAuthStore()
  const ui = useUiStore()

  const labelOf = i =>
    i.nameKey ? t(i.nameKey) : (typeof i.name === 'string' ? i.name : (i.name?.[locale.value] || i.name?.en || ''))

  /* 询价门禁：与改版前一致——必须有效订阅；
     未登录先弹登录框，已登录未订阅引导到订阅面板。 */
  function requireSubscribe () {
    if (auth.canEnquire) return true
    ui.askToSubscribe()
    if (auth.isLoggedIn) router.push('/account')
    else ui.openAccount('subs')
    return false
  }

  /* 文本抬头 = 常备单询价 + 品种数 + 总件数；每条带 × 数量 */
  function buildText () {
    let s = header(locale.value) + '\n'
    s += `${t('st.enquireTitle')} · ${t('st.items', { n: standing.count })} · ${t('st.pcs', { n: standing.totalQty })}\n\n`
    standing.items.forEach((i, idx) => {
      const style = i.styleLabelKey ? ` (${t(i.styleLabelKey)})` : ''
      s += `${idx + 1}. ${labelOf(i)}${style} × ${i.qty}\n`
      if (i.meta) s += `   ${i.meta}\n`
    })
    s += `\n${t('contact.sub')}\n`
    return s
  }

  /* 落库沿用 enquiries 表既有列；缺 user_id 列时退回匿名写入 */
  async function save () {
    const base = {
      lang: locale.value,
      item_count: standing.count,
      items: standing.items.map(i => ({
        id: i.id,
        name: labelOf(i),
        meta: i.meta || null,
        qty: i.qty,
        style: i.styleLabelKey ? t(i.styleLabelKey) : null
      })),
      text: sendText.value
    }
    try {
      let payload = base
      if (auth.user) payload = { ...base, user_id: auth.user.id }
      let { error } = await supabase.from('enquiries').insert(payload)
      if (error && payload !== base) {
        ({ error } = await supabase.from('enquiries').insert(base))
      }
      if (error) throw error
      message.success(t('db.saved'))
    } catch (e) {
      console.error('[supabase] standing enquiry insert failed', e)
      message.warning(t('db.failed'))
    }
  }

  function enquire () {
    if (!standing.count) { message.warning(t('st.enquireEmpty')); return }
    if (!requireSubscribe()) return
    sendText.value = buildText()
    sendFilename.value = 'pupeele-standing-enquiry.txt'
    sendOpen.value = true
    standing.open = false
    save()
  }

  return { sendOpen, sendText, sendFilename, enquire }
}
