import { defineStore } from 'pinia'

/* 询价篮：name 存三语对象，切换语言时不会串味 */
export const useEnquiryStore = defineStore('enquiry', {
  state: () => ({
    items: [],
    open: false
  }),
  getters: {
    count: s => s.items.length,
    has: s => id => s.items.some(i => i.id === id)
  },
  actions: {
    add (item) {
      if (!this.items.some(i => i.id === item.id)) this.items.push(item)
    },
    remove (id) {
      this.items = this.items.filter(i => i.id !== id)
    },
    toggle (item) {
      this.has(item.id) ? this.remove(item.id) : this.add(item)
    },
    addMany (items) {
      items.forEach(i => this.add(i))
    },
    clear () {
      this.items = []
    }
  }
})
