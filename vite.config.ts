import type { PluginOption } from 'vite'
import path from 'node:path'
import vue from '@vitejs/plugin-vue'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

function setupPlugins(env: ImportMetaEnv): PluginOption[] {
  return [
    vue(),
    env.VITE_GLOB_APP_PWA === 'true' && VitePWA({
      injectRegister: 'auto',
      manifest: {
        name: 'chatGPT',
        short_name: 'chatGPT',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ]
}

export default defineConfig((env) => {
  const viteEnv = loadEnv(env.mode, process.cwd()) as unknown as ImportMetaEnv

  return {
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), 'src'),
      },
    },
    plugins: setupPlugins(viteEnv),
    server: {
      host: '0.0.0.0',
      port: 5173,
      open: false,
      proxy: {
        '/api': {
          target: viteEnv.VITE_APP_API_BASE_URL || 'http://127.0.0.1:3002',
          changeOrigin: true, // 允许跨域
          // 不需要 rewrite，因为后端路由就是 /api/xxx
        },
      },
    },
    build: {
      reportCompressedSize: false,
      sourcemap: false,
      chunkSizeWarningLimit: 1000, // 提高警告阈值到 1MB
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // 将 node_modules 中的大型依赖拆分到单独的 chunk
            if (id.includes('node_modules')) {
              // Naive UI（UI 组件库）- 最大的依赖之一
              if (id.includes('naive-ui') || id.includes('vueuc') || id.includes('seemly')) {
                return 'naive-ui'
              }

              // Vue 核心及相关库
              if (id.includes('vue-router')) {
                return 'vue-router'
              }
              if (id.includes('pinia')) {
                return 'pinia'
              }
              if (id.includes('vue-i18n')) {
                return 'vue-i18n'
              }
              if (id.includes('vue') && !id.includes('vue-router') && !id.includes('vue-i18n')) {
                return 'vue'
              }

              // Markdown 相关
              if (id.includes('markdown-it') || id.includes('mermaid')) {
                return 'markdown'
              }

              // 代码高亮
              if (id.includes('highlight.js')) {
                return 'highlight'
              }

              // 数学公式渲染
              if (id.includes('katex')) {
                return 'katex'
              }

              // HTML 转图片
              if (id.includes('html-to-image')) {
                return 'html-to-image'
              }

              // Auth0 相关
              if (id.includes('@auth0')) {
                return 'auth0'
              }

              // 工具库
              if (id.includes('axios')) {
                return 'axios'
              }
              if (id.includes('@vueuse')) {
                return 'vueuse'
              }

              // 其他小型依赖合并到 vendor
              return 'vendor'
            }
          },
        },
      },
      commonjsOptions: {
        ignoreTryCatch: false,
      },
    },
  }
})
