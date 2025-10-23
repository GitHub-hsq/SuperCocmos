<script setup lang="ts">
import { NConfigProvider } from 'naive-ui'
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getCurrentUser } from '@/api/services/authService'
import { Loading, NaiveProvider } from '@/components/common'
import { useLanguage } from '@/hooks/useLanguage'
import { useTheme } from '@/hooks/useTheme'
import { useAppStore, useAuthStore, useConfigStore, useUserStore } from '@/store'

const route = useRoute()
const { theme, themeOverrides } = useTheme()
const { language } = useLanguage()
const appStore = useAppStore()
const authStore = useAuthStore()
const userStore = useUserStore()
const configStore = useConfigStore()

// 🔥 开发环境：暴露 store 到 window 对象，方便调试
if (import.meta.env.DEV) {
  (window as any).__authStore = authStore;
  (window as any).__getUserInfo = () => ({
    authStore: authStore.userInfo,
  })
}

// 启动Loading状态
const isAppLoading = ref(true)

// 应用启动时的初始化
onMounted(async () => {
  try {
    // TODO: 集成 Auth0 后，在这里检查登录状态并加载用户信息
    
    // 临时：快速显示页面
    if (import.meta.env.DEV) {
      console.warn('⚠️ [App] Auth0 尚未集成，跳过用户信息加载')
    }

    // 对于公开路由，立即显示页面
    const isPublicRoute = route.meta?.public === true
    if (isPublicRoute) {
      isAppLoading.value = false
      return
    }

    // TODO: 非公开路由应该检查 Auth0 登录状态
    // 临时：允许访问
    console.warn('⚠️ [App] Auth0 尚未集成，暂时允许访问所有路由')
  }
  catch (error) {
    console.error('❌ [App] 初始化失败:', error)
  }
  finally {
    // 立即关闭 Loading
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
      <!-- 应用启动Loading -->
      <Loading v-if="isAppLoading" />
      <!-- 主应用内容 -->
      <RouterView v-else />
    </NaiveProvider>
  </NConfigProvider>
</template>
