import { defineStore } from 'pinia'

/* 全局 UI 弹层状态：登录弹窗可被导航、询价门禁等多处唤起。
   accountTab 用来告诉「我的页面」登录后要打开哪个面板（如询价门禁 → subs）。 */
export const useUiStore = defineStore('ui', {
  state: () => ({
    accountOpen: false,
    accountTab: '' // '' | 'profile' | 'orders' | 'subs'
  }),
  actions: {
    openAccount (tab = '') {
      this.accountTab = tab
      this.accountOpen = true
    },
    askToSubscribe () {
      this.accountTab = 'subs'
    }
  }
})
