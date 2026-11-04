<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import message from 'ant-design-vue/es/message'
import { useCartStore } from '@/stores/cart'
import { createCheckoutSession, confirmPayment, PAYMENT_MOCK } from '@/lib/payments'
import { CATEGORIES } from '@/data/catalog'
import CategoryArt from '@/components/CategoryArt.vue'

const { t } = useI18n()
const cart = useCartStore()

const labelOf = i => i.nameKey ? t(i.nameKey) : i.name
const styleOf = i => i.styleLabelKey ? t(i.styleLabelKey) : ''
const catOf = i => CATEGORIES.find(c => c.id === i.cat) || CATEGORIES[0]

const paying = ref(false)

async function checkout () {
  if (!cart.items.length || paying.value) return
  paying.value = true
  try {
    const { sessionId } = await createCheckoutSession(cart.items)
    const { ok, orderId } = await confirmPayment(sessionId)
    if (ok) {
      message.success(t('buy.success', { id: orderId }))
      cart.clear()
    }
  } catch (e) {
    message.error(t('buy.fail'))
  } finally {
    paying.value = false
  }
}
</script>

<template>
  <a-drawer
    v-model:open="cart.open"
    :title="`${t('cart.title')}${cart.count ? ' (' + cart.count + ')' : ''}`"
    placement="right"
    :width="380"
  >
    <template v-if="cart.items.length">
      <div v-for="i in cart.items" :key="i.key" class="ci">
        <div class="ci-thumb">
          <img v-if="i.image" :src="i.image" :alt="labelOf(i)" />
          <CategoryArt v-else :id="catOf(i).icon" :variant="0" :tint="i.tint" />
        </div>
        <div class="ci-main">
          <strong>{{ labelOf(i) }}</strong>
          <span v-if="styleOf(i)" class="ci-style">{{ styleOf(i) }}</span>
          <div class="ci-bottom">
            <span class="ci-price">${{ i.priceUSD.toFixed(2) }}</span>
            <div class="qty">
              <button @click="cart.setQty(i.key, i.qty - 1)">−</button>
              <span>{{ i.qty }}</span>
              <button @click="cart.setQty(i.key, i.qty + 1)">+</button>
            </div>
          </div>
        </div>
        <button class="ci-x" @click="cart.remove(i.key)" aria-label="remove">×</button>
      </div>

      <div class="ci-foot">
        <div class="subtotal">
          <span>{{ t('cart.subtotal') }}</span>
          <strong>${{ cart.subtotal.toFixed(2) }}</strong>
        </div>
        <p v-if="PAYMENT_MOCK" class="mock-note">{{ t('buy.mockNote') }}</p>
        <a-button type="primary" block size="large" :loading="paying" @click="checkout">
          {{ t('cart.checkout') }}
        </a-button>
        <a-button block @click="cart.clear()">{{ t('cart.clear') }}</a-button>
      </div>
    </template>
    <a-empty v-else :description="t('cart.empty')">
      <p style="color: var(--ink-4); font-size: 13px">{{ t('cart.emptyHint') }}</p>
    </a-empty>
  </a-drawer>
</template>

<style scoped>
.ci { display: flex; align-items: flex-start; gap: 10px; padding: 12px 0; border-bottom: 1px solid var(--line-soft); }
.ci-thumb { width: 52px; height: 52px; border-radius: 10px; overflow: hidden; flex-shrink: 0;
  background: linear-gradient(150deg, #f3f1ee, #e3ded8); display: grid; place-items: center; }
.ci-thumb img { width: 100%; height: 100%; object-fit: cover; }
.ci-main { flex: 1; display: grid; gap: 3px; }
.ci-style { font-size: 12px; color: var(--ink-4); }
.ci-bottom { display: flex; align-items: center; justify-content: space-between; margin-top: 4px; }
.ci-price { font-size: 14px; font-weight: 600; }
.qty { display: inline-flex; align-items: center; gap: 10px; }
.qty button { width: 24px; height: 24px; border-radius: 7px; border: 1px solid var(--line-soft);
  background: none; color: var(--ink-2); cursor: pointer; font-size: 15px; line-height: 1; }
.qty span { min-width: 18px; text-align: center; font-size: 13px; }
.ci-x { background: none; border: none; color: var(--ink-4); font-size: 18px; cursor: pointer; padding: 0 4px; }
.ci-foot { margin-top: 20px; display: grid; gap: 10px; }
.subtotal { display: flex; justify-content: space-between; font-size: 15px; }
.subtotal strong { font-size: 17px; }
.mock-note { margin: 0; font-size: 11.5px; color: var(--ink-4); line-height: 1.4; }
</style>
