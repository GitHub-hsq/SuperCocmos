<script setup lang="ts">
import { useAuth0 } from '@auth0/auth0-vue'
import { NConfigProvider } from 'naive-ui'
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { setupApiClient } from '@/api/client'
import { Loading, NaiveProvider } from '@/components/common'
import { useLanguage } from '@/hooks/useLanguage'
import { useTheme } from '@/hooks/useTheme'
import { setupAuthGuard, waitForRouterReady } from '@/router'
import { setupSSEReconnect } from '@/services/sseReconnect'

// ✅ 初始化 Auth0 客户端实例（只能在 setup 中调用）
const auth0Client = useAuth0()

// ✅ 设置路由守卫，传入 Auth0 客户端实例(闭包自动捕获auth0)
// ⚠️ 必须在路由匹配之前设置守卫，确保直接访问受保护路由时守卫生效
setupAuthGuard(auth0Client)

// ✅ 等待路由就绪（在守卫设置之后）
// 这样可以确保守卫在初始路由匹配之前已经注册
waitForRouterReady().catch((error) => {
  // 如果导航被守卫阻止（例如用户未认证），这是预期的行为，不需要报错
  const errorMessage = error?.message || String(error)
  if (errorMessage.includes('Navigation aborted') || errorMessage.includes('navigation guard')) {
    console.warn('ℹ️ [App.vue] 路由导航被守卫阻止（预期行为）')
  }
  else {
    console.error('❌ [App.vue] 路由就绪失败:', error)
  }
})

// ✅ 设置 API 客户端（Axios 拦截器），传入 Auth0 客户端实例(闭包自动捕获auth0)
setupApiClient(auth0Client)

const router = useRouter()
const { theme, themeOverrides } = useTheme()
const { language } = useLanguage()

// 🎯 监听 Auth0 认证状态变化，处理登录后跳转
const hasHandledLoginRedirect = ref(false)
const isAuthLoading = ref(false) // 认证后跳转的 Loading 状态

watch(
  () => [auth0Client.isLoading.value, auth0Client.isAuthenticated.value] as const,
  async (newVals, oldVals) => {
    const [isLoading, isAuthenticated] = newVals
    const [wasLoading] = oldVals || [true, false]

    // 当从加载中变为加载完成，且用户已登录
    if (wasLoading && !isLoading && isAuthenticated && !hasHandledLoginRedirect.value) {
      hasHandledLoginRedirect.value = true

      // 检查 URL 是否包含 code 参数（说明是从 Auth0 登录回来的）
      const urlParams = new URLSearchParams(window.location.search)
      const isFromAuth0 = urlParams.has('code') || urlParams.has('state')

      if (isFromAuth0) {
        // 显示全局 Loading
        isAuthLoading.value = true

        // 立即跳转（不等待同步完成）
        router.push('/chat').then(() => {
          // 路由跳转完成后，延迟关闭 Loading（确保页面渲染完成）
          setTimeout(() => {
            isAuthLoading.value = false
          }, 300)
        })
      }

      // ℹ️ 用户同步已移至 AppInit Store 中统一处理（initializeApp）
      // 这样可以确保同步完成后再加载配置，避免首次登录 401 问题
    }
  },
  { immediate: true },
)

// 监听错误（只显示非 Consent 错误）
watch(
  () => auth0Client.error.value,
  (error) => {
    if (error && !error.toString().includes('Consent required')) {
      console.error('❌ [Auth0] 错误:', error)
    }
  },
)

// 🔥 页面刷新后自动重连 SSE(闭包自动捕获auth0)
setupSSEReconnect(auth0Client)

// 启动Loading状态
const isAppLoading = ref(true)

// 应用启动时的初始化
onMounted(async () => {
  // 🔥 性能计时：记录启动时间
  const startTime = performance.now()
  console.log('🚀 [App.vue] 组件挂载，开始初始化...')

  try {
    // 🔥 等待 Auth0 初始化完成（使用 watch 响应式监听 + 超时保护）
    if (auth0Client.isLoading.value) {
      console.log('⏳ [App.vue] 等待 Auth0 初始化...')
    }

    // 使用 Promise.race 实现带超时的等待
    await Promise.race([
      // Auth0 初始化完成的 Promise
      new Promise<void>((resolve) => {
        if (!auth0Client.isLoading.value) {
          console.log('✅ [App.vue] Auth0 已就绪')
          resolve()
        }
        else {
          const unwatch = watch(
            () => auth0Client.isLoading.value,
            (isLoading) => {
              if (!isLoading) {
                console.log('✅ [App.vue] Auth0 初始化完成')
                unwatch()
                resolve()
              }
            },
          )
        }
      }),
      // 超时保护（10秒）
      new Promise<void>((resolve) => {
        setTimeout(() => {
          // 超时触发，但如果 Auth0 已完成则不影响流程
          if (auth0Client.isLoading.value) {
            console.log('⚠️ [App.vue] Auth0 初始化超时，强制继续（10秒）')
          }
          resolve()
        }, 10000)
      }),
    ])

    // 🔥 执行应用初始化（仅在已登录时）
    if (auth0Client.isAuthenticated.value) {
      const auth0Time = performance.now()
      console.log(`⏱️ [App.vue] Auth0 初始化耗时: ${Math.round(auth0Time - startTime)}ms`)
      console.log('🔐 [App.vue] 用户已登录，执行应用初始化...')

      const { useAppInitStore } = await import('@/store/modules/appInit')
      const appInitStore = useAppInitStore()

      // 执行应用初始化（会加载模型列表、配置等）
      const initStartTime = performance.now()
      await appInitStore.initializeApp(auth0Client)
      const initEndTime = performance.now()

      console.log('✅ [App.vue] 应用初始化完成')
      console.log(`⏱️ [App.vue] 应用初始化耗时: ${Math.round(initEndTime - initStartTime)}ms`)
    }
    else {
      console.log('ℹ️ [App.vue] 用户未登录，跳过应用初始化')
    }

    // 🔥 关闭启动 Loading（所有初始化完成后才显示页面）
    isAppLoading.value = false

    // 🔥 性能计时：计算总耗时
    const endTime = performance.now()
    const totalTime = Math.round(endTime - startTime)
    console.log(`⏱️ [App.vue] 📊 页面加载完成，总耗时: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`)
  }
  catch (error) {
    console.error('❌ [App] 初始化失败:', error)
    isAppLoading.value = false
  }
})
</script>

<template>
  <NConfigProvider
    class="h-full"
    :theme="theme"
    :theme-overrides="themeOverrides"
    :locale="language"
  >
    <NaiveProvider>
      <!-- 应用启动Loading 或 认证后跳转Loading -->
      <Loading v-if="isAppLoading || isAuthLoading" />
      <!-- 主应用内容 -->
      <RouterView v-else />
    </NaiveProvider>
  </NConfigProvider>
</template>

<style>
/* 🎨 左侧导航栏全局CSS变量 */
:root {
  /* 导航区域背景色 */
  --nav-bg-light: #f9f9f9;
  --nav-bg-dark: transparent;

  /* 导航项hover颜色 */
  --nav-hover-light: #e9e9e9;
  --nav-hover-dark: rgba(255, 255, 255, 0.05);

  /* 导航项激活颜色 */
  --nav-active-light: #e3e3e3;
  --nav-active-dark: rgba(255, 255, 255, 0.1);

  /* 会话列表hover颜色 */
  --session-hover-light: #e9e9e9;
  --session-hover-dark: rgba(255, 255, 255, 0.05);

  /* 会话列表激活颜色 */
  --session-active-light: #e9e9e9;
  --session-active-dark: rgba(255, 255, 255, 0.1);
}

/* 暗黑模式变量 */
.dark {
  --nav-bg-light: var(--nav-bg-dark);
  --nav-hover-light: var(--nav-hover-dark);
  --nav-active-light: var(--nav-active-dark);
  --session-hover-light: var(--session-hover-dark);
  --session-active-light: var(--session-active-dark);
}
</style>
