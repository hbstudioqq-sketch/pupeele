import { defineStore } from 'pinia'

/* 购物车：现货直购链路，与「询价篮 enquiry」完全独立。
 * 持久化到 localStorage，刷新不丢。
 * item 结构：{ id, nameKey, styleLabelKey?, priceUSD, qty, image, tint, cat } */
const KEY = 'pupee.cart'

function load () {
  try { return JSON.parse(localStorage.getItem(KEY)) || [] }
  catch { return [] }
}

export const useCartStore = defineStore('cart', {
  state: () => ({
    items: load(),
    open: false
  }),
  getters: {
    count: s => s.items.reduce((n, i) => n + i.qty, 0),
    subtotal: s => s.items.reduce((n, i) => n + i.priceUSD * i.qty, 0),
    has: s => key => s.items.some(i => i.key === key)
  },
  actions: {
    persist () { localStorage.setItem(KEY, JSON.stringify(this.items)) },
    /* item 必须带稳定 key（id + 款式）以区分同品不同款 */
    add (item) {
      const key = item.key || item.id
      const hit = this.items.find(i => i.key === key)
      if (hit) hit.qty += item.qty || 1
      else this.items.push({ ...item, key, qty: item.qty || 1 })
      this.persist()
    },
    setQty (key, qty) {
      const hit = this.items.find(i => i.key === key)
      if (!hit) return
      hit.qty = Math.max(1, qty | 0)
      this.persist()
    },
    remove (key) {
      this.items = this.items.filter(i => i.key !== key)
      this.persist()
    },
    clear () { this.items = []; this.persist() }
  }
})
