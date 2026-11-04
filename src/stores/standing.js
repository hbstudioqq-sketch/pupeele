import { defineStore } from 'pinia'

/* ============================================================
   常备单（Standing Order）
   ------------------------------------------------------------
   与「询价篮 enquiry」「购物车 cart」并列的第三份清单：
     enquiry  → 临时挑货，一次性的询价内容
     cart     → 现货直购，走结账付款
     standing → 复购模板：固定产品 + 每次补货数量，一键发起询价

   语义差异（重要）：
     购物车 add() 是「累加」，常备单 put() 是「设置/覆盖」——
     用户填 500 就是每次订 500，不该因为多点一次变成 1000。
   item: { key, id, nameKey, styleLabelKey?, price, qty,
           meta, size, moq, cat, tint, image, source, addedAt }
   ============================================================ */
const KEY = 'pupee.standing'

function load () {
  try { return JSON.parse(localStorage.getItem(KEY)) || [] }
  catch { return [] }
}

export const useStandingStore = defineStore('standing', {
  state: () => ({
    items: load(),
    open: false
  }),
  getters: {
    /* 条目数（几种产品） */
    count: s => s.items.length,
    /* 总件数（各产品数量之和），用于询价单抬头 */
    totalQty: s => s.items.reduce((n, i) => n + (i.qty || 0), 0),
    has: s => key => s.items.some(i => i.key === key),
    qtyOf: s => key => s.items.find(i => i.key === key)?.qty || 0
  },
  actions: {
    persist () { localStorage.setItem(KEY, JSON.stringify(this.items)) },
    /* 设置某产品常备数量：已存在则覆盖，不存在则新增 */
    put (item) {
      const key = item.key || item.id
      const row = {
        ...item,
        key,
        qty: Math.max(1, Number(item.qty) || 1),
        addedAt: item.addedAt || Date.now()
      }
      const idx = this.items.findIndex(i => i.key === key)
      if (idx >= 0) this.items[idx] = { ...this.items[idx], ...row }
      else this.items.push(row)
      this.persist()
    },
    setQty (key, qty) {
      const hit = this.items.find(i => i.key === key)
      if (!hit) return
      hit.qty = Math.max(1, Number(qty) || 1)
      this.persist()
    },
    remove (key) {
      this.items = this.items.filter(i => i.key !== key)
      this.persist()
    },
    clear () { this.items = []; this.persist() }
  }
})
