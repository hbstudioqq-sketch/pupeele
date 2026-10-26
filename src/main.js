import { createApp } from 'vue'
import { createPinia } from 'pinia'
import 'ant-design-vue/dist/reset.css'

import App from './App.vue'
import router from './router'
import { i18n } from './i18n'
import { useAuthStore } from './stores/auth'
import './styles/global.css'

/* antd 组件由 unplugin-vue-components 按需自动引入，
   这里不再全量注册，体积从 1.7MB 降到按实际使用打包。 */

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(i18n)
app.mount('#app')

// 启动时同步 Supabase 会话（含 OAuth 回跳）
useAuthStore().init()
