import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'

/* 首屏 Home 直接引入，其余页面按需加载：
   拆分后首屏不再下载 collections/studio/request/contact 及其依赖，
   其中 studio 会连带 three.js（564KB）一起延后。 */
const routes = [
  { path: '/', name: 'home', component: HomeView, meta: { nav: 'nav.home' } },
  {
    path: '/collections',
    name: 'collections',
    component: () => import('@/views/CollectionsView.vue'),
    meta: { nav: 'nav.collections' }
  },
  {
    path: '/studio',
    name: 'studio',
    component: () => import('@/views/StudioView.vue'),
    meta: { nav: 'nav.studio' }
  },
  {
    path: '/request',
    name: 'request',
    component: () => import('@/views/RequestView.vue'),
    meta: { nav: 'nav.request' }
  },
  {
    path: '/contact',
    name: 'contact',
    component: () => import('@/views/ContactView.vue'),
    meta: { nav: 'nav.contact' }
  },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

export default createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior (to) {
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0 }
  }
})
