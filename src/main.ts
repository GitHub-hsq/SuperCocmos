import { createApp } from 'vue'
import App from './App.vue'
import { auth0 } from './auth'
import { setupI18n } from './locales'
import { setupAssets, setupScrollbarStyle } from './plugins'
import { setupAuthGuard, setupRouter } from './router'
import { setupStore } from './store'

async function bootstrap() {
  const app = createApp(App)

  setupAssets()
  setupScrollbarStyle()

  setupStore(app)

  setupI18n(app)

  // 1️⃣ 注册 Auth0 插件
  // @ts-expect-error - Auth0 plugin type compatibility with Vue version
  app.use(auth0)

  // 2️⃣ 注册路由
  await setupRouter(app)

  // 3️⃣ 在App.vue中设置路由守卫（必须在 Auth0 插件注册后）

  app.mount('#app')
}

bootstrap().catch((error) => {
  console.error('❌ 应用启动失败:', error)
})
