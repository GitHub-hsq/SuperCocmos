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

// 应用启动时的初始化
onMounted(async () => {
  try {
    // 🔥 延迟一下，确保 Clerk 完全初始化
    await new Promise(resolve => setTimeout(resolve, 500))

    console.warn('🔍 [App] Clerk 状态检查:', {
      hasClerk: !!window.Clerk,
      hasSession: !!window.Clerk?.session,
      hasUser: !!window.Clerk?.user,
    })

    // 🔥 获取当前用户信息（包含角色）
    if (window.Clerk?.session && window.Clerk?.user) {
      try {
        console.warn('🔄 [App] 开始调用 /api/auth/me...')
        const result = await getCurrentUser()

        console.warn('📦 [App] API 返回结果:', result)

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
          console.warn('✅ [App] 用户信息已加载:', {
            email: userData.email,
            role: userData.role,
            roles: userData.roles,
          })

          // 🔥 验证保存成功
          console.warn('💾 [App] authStore.userInfo =', authStore.userInfo)
        }
        else {
          console.warn('⚠️ [App] API 返回数据格式异常:', result)
        }
      }
      catch (error) {
        console.error('❌ [App] 获取用户信息失败:', error)
      }
    }
    else {
      console.warn('⚠️ [App] Clerk 未登录或未初始化完成')
    }
  }
  catch (error) {
    console.error('❌ [App] 初始化失败:', error)
  }
  finally {
    // 确保至少显示Loading一段时间，提供更好的用户体验
    setTimeout(() => {
      isAppLoading.value = false
    }, 200)
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
