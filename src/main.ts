import { createApp } from 'vue'
import App from './App.vue'
import { auth0 } from './auth'
import { setupI18n } from './locales'
import { setupAssets, setupScrollbarStyle } from './plugins'
import { setupRouter } from './router'
import { setupStore } from './store'

async function bootstrap() {
  // 🔥 清理旧的消息缓存（msg_cache_*）
  try {
    const { clearAllMessageCaches } = await import('@/utils/messageCache')
    clearAllMessageCaches()
  }
  catch (error) {
    // 静默处理，不影响应用启动
    console.warn('⚠️ [Bootstrap] 清理旧缓存失败:', error)
  }

  const app = createApp(App)

  // 🔇 忽略 Naive UI 内部的 TransitionGroup mode 警告
  app.config.warnHandler = (msg, instance, trace) => {
    // 忽略 TransitionGroup 的 mode 属性警告（Naive UI 内部问题）
    if (msg.includes('Extraneous non-props attributes') && msg.includes('mode')) {
      return
    }
    // 其他警告正常显示
    console.warn(msg, instance, trace)
  }

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
