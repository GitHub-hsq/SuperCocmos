<script setup lang="ts">
import { useAuth0 } from '@auth0/auth0-vue'
import { NConfigProvider } from 'naive-ui'
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { setupApiClient } from '@/api/client'
import { Loading, NaiveProvider } from '@/components/common'
import { useLanguage } from '@/hooks/useLanguage'
import { useTheme } from '@/hooks/useTheme'
import { setupAuthGuard } from '@/router'
import { setupSSEReconnect } from '@/services/sseReconnect'

// ✅ 初始化 Auth0 客户端实例（只能在 setup 中调用）
const auth0Client = useAuth0()

// ✅ 设置路由守卫，传入 Auth0 客户端实例
setupAuthGuard(auth0Client)

// ✅ 设置 API 客户端（Axios 拦截器），传入 Auth0 客户端实例
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

// 🔥 页面刷新后自动重连 SSE（使用闭包捕获 auth0Client）
setupSSEReconnect(auth0Client)

// 启动Loading状态
const isAppLoading = ref(true)

// 应用启动时的初始化
onMounted(async () => {
  try {
    // 等待 Auth0 初始化完成
    if (auth0Client.isLoading.value) {
      // 等待 Auth0 加载完成
      const checkAuth = setInterval(() => {
        if (!auth0Client.isLoading.value) {
          clearInterval(checkAuth)
          isAppLoading.value = false
        }
      }, 100)

      // 超时保护（5秒后强制显示）
      setTimeout(() => {
        clearInterval(checkAuth)
        isAppLoading.value = false
      }, 5000)
    }
    else {
      // Auth0 已加载完成
      isAppLoading.value = false
    }
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
