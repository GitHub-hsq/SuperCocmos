<script setup lang="ts">
import { NConfigProvider } from 'naive-ui'
import { onMounted, ref } from 'vue'
import { getCurrentUser } from '@/api/services/authService'
import { Loading, NaiveProvider } from '@/components/common'
import { useLanguage } from '@/hooks/useLanguage'
import { useTheme } from '@/hooks/useTheme'
import { useAuthStore } from '@/store'

const { theme, themeOverrides } = useTheme()
const { language } = useLanguage()
const authStore = useAuthStore()

// 🔥 开发环境：暴露 store 到 window 对象，方便调试
if (import.meta.env.DEV) {
  (window as any).__authStore = authStore;
  (window as any).__getUserInfo = () => ({
    clerk: {
      session: window.Clerk?.session ? '✅ 已登录' : '❌ 未登录',
      user: window.Clerk?.user ? '✅ 存在' : '❌ 不存在',
    },
    authStore: authStore.userInfo,
  })
}

// 启动Loading状态
const isAppLoading = ref(true)

// 🔥 等待 Clerk 加载完成（使用轮询，最多等待2秒）
async function waitForClerk(maxWaitTime = 2000): Promise<boolean> {
  const startTime = Date.now()
  const checkInterval = 50 // 每50ms检查一次

  while (Date.now() - startTime < maxWaitTime) {
    if (window.Clerk?.session) {
      return true
    }
    await new Promise(resolve => setTimeout(resolve, checkInterval))
  }

  // 超时，返回当前状态
  return !!window.Clerk
}

// 应用启动时的初始化
onMounted(async () => {
  try {
    // 🔥 智能等待 Clerk 初始化（最多2秒）
    const clerkReady = await waitForClerk()

    if (!clerkReady) {
      console.warn('⚠️ [App] Clerk 加载超时，跳过用户信息获取')
      isAppLoading.value = false
      return
    }

    // 🔥 获取当前用户信息（包含角色）
    if (window.Clerk?.session && window.Clerk?.user) {
      try {
        const result = await getCurrentUser()

        // 🔥 getCurrentUser 返回 ApiResponse，需要访问 data.user
        const userData = (result as any)?.data?.user
        if (userData) {
          // 保存用户信息到 authStore
          authStore.setUserInfo({
            id: userData.id.toString(),
            email: userData.email,
            createdAt: userData.createdAt,
            role: userData.role || 'user', // 🔥 保存用户角色
          })

          if (import.meta.env.DEV) {
            console.warn('✅ [App] 用户信息已加载:', {
              email: userData.email,
              role: userData.role,
            })
          }
        }
      }
      catch (error) {
        console.error('❌ [App] 获取用户信息失败:', error)
      }
    }
  }
  catch (error) {
    console.error('❌ [App] 初始化失败:', error)
  }
  finally {
    // 🔥 立即关闭 Loading（不再延迟）
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
