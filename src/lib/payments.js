/* ─────────────────────────────────────────────────────────────
 * 支付层（mock 版，可直接替换为真实 Stripe）
 *
 * 现在：纯前端模拟，不碰任何密钥，刷新即重置。
 * 上线：把下面两段伪代码换成真实 Stripe 调用即可，
 *       组件层（CartDrawer）的调用签名保持不变。
 *
 * 真实接入步骤（未来）：
 *  1. 后端建 /api/checkout，用 stripe.checkout.sessions.create({
 *       mode:'payment', line_items, success_url, cancel_url })
 *  2. 前端 const { url } = await fetch('/api/checkout',{...})
 *      然后 window.location = url 跳 Stripe 托管页
 *  3. 用 Stripe Webhook 在付款成功后写 orders 表 + 触发代发
 * ───────────────────────────────────────────────────────────── */

const FAKE_LATENCY = 900

function rid (prefix) {
  return prefix + '-' + Math.random().toString(36).slice(2, 10).toUpperCase()
}

/* 创建结账会话：返回 { sessionId, amountUSD } */
export async function createCheckoutSession (items, { currency = 'usd' } = {}) {
  const amount = items.reduce((n, i) => n + i.priceUSD * i.qty, 0)
  await new Promise(r => setTimeout(r, FAKE_LATENCY))
  // 真实版：const { url } = await fetch('/api/checkout', {...}); return { url }
  return { sessionId: rid('cs'), amountUSD: Math.round(amount * 100) / 100, currency }
}

/* 确认付款：模拟成功，返回订单号 */
export async function confirmPayment (sessionId) {
  await new Promise(r => setTimeout(r, FAKE_LATENCY))
  // 真实版：paymentIntent 已在前端/Webhook 完成，这里只落库
  const orderId = rid('ord')
  return { ok: true, orderId, paidAt: new Date().toISOString() }
}

export const PAYMENT_MOCK = true
