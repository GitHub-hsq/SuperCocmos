import { clerkPlugin } from '@clerk/vue'
import { createApp } from 'vue'
import App from './App.vue'
import { setupI18n } from './locales'
import { setupAssets, setupScrollbarStyle } from './plugins'
import { setupRouter } from './router'
import { setupStore } from './store'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
const SIGN_IN_FALLBACK_REDIRECT_URL = import.meta.env.VITE_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL

if (!PUBLISHABLE_KEY) {
  console.error('❌ Clerk Publishable Key 未设置！')
  throw new Error('请在 .env 文件中添加 VITE_CLERK_PUBLISHABLE_KEY')
}

async function bootstrap() {
  const app = createApp(App)

  setupAssets()
  setupScrollbarStyle()

  setupStore(app)

  setupI18n(app)

  app.use(clerkPlugin, {
    publishableKey: PUBLISHABLE_KEY,
    signInUrl: '/signin',
    signUpUrl: '/signup',
    signUpFallbackRedirectUrl: SIGN_IN_FALLBACK_REDIRECT_URL,
    appearance: {
      cssLayerName: 'clerk',
    },
  })

  await setupRouter(app)

  app.mount('#app')
}

bootstrap().catch((error) => {
  console.error('❌ 应用启动失败:', error)
})
