import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [
    vue(),
    Components({
      resolvers: [AntDesignVueResolver({ importStyle: false })],
      dts: false
    })
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) }
  },
  // host: true → 监听 0.0.0.0，局域网内其他设备可用 http://<本机IP>:5173 访问
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    open: false
  },
  preview: {
    host: true,
    port: 4173,
    strictPort: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks (id) {
          // 3D 引擎单独成块：只在打开「搭配间」时按需加载
          if (id.includes('node_modules/three')) return 'three'
          /* antd 不单独成块：Table/Form/Steps 等重组件只在 lazy 路由里用到，
             交给 Rollup 按需拆分，避免首屏把整个组件库一起下载。 */
          if (id.includes('node_modules/@supabase')) return 'supabase'
          if (id.includes('node_modules/vue') || id.includes('node_modules/@vue') ||
              id.includes('node_modules/pinia') || id.includes('node_modules/vue-i18n') ||
              id.includes('node_modules/vue-router')) return 'vue'
        }
      }
    }
  }
})
