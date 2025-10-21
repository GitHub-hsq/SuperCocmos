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
    clerk: {
      session: window.Clerk?.session ? '✅ 已登录' : '❌ 未登录',
      user: window.Clerk?.user ? '✅ 存在' : '❌ 不存在',
    },
    authStore: authStore.userInfo,
  })
}

// 启动Loading状态
const isAppLoading = ref(true)

// 🔥 等待 Clerk 加载完成（优化：快速检测未登录用户）
async function waitForClerk(maxWaitTime = 500): Promise<boolean> {
  const startTime = Date.now()
  const checkInterval = 50 // 每50ms检查一次

  while (Date.now() - startTime < maxWaitTime) {
    // 如果已经有 session，立即返回
    if (window.Clerk?.session) {
      return true
    }

    // 如果 Clerk 已加载但没有 session，说明用户未登录，立即返回
    if (window.Clerk && !window.Clerk.session) {
      return false
    }

    await new Promise(resolve => setTimeout(resolve, checkInterval))
  }

  // 超时，返回当前状态
  return !!window.Clerk?.session
}

// 应用启动时的初始化
onMounted(async () => {
  try {
    // 🔥 对于公开路由（home、signin、signup），优先快速显示
    const isPublicRoute = route.meta?.public === true

    if (isPublicRoute) {
      // 公开路由：先显示页面，异步加载认证信息
      isAppLoading.value = false

      // 异步检查登录状态（不阻塞页面显示）
      waitForClerk(300).then(async (clerkReady) => {
        if (clerkReady && window.Clerk?.session && window.Clerk?.user) {
          try {
            const result = await getCurrentUser()
            const userData = (result as any)?.data?.user
            if (userData) {
              authStore.setUserInfo({
                id: userData.id.toString(),
                email: userData.email,
                createdAt: userData.createdAt,
                role: userData.role || 'user',
                avatarUrl: userData.avatarUrl,
              })

              if (userData.avatarUrl) {
                userStore.updateUserInfo({
                  avatar: userData.avatarUrl,
                })
              }
            }
          }
          catch (error) {
            if (import.meta.env.DEV) {
              console.warn('⚠️ [App] 后台加载用户信息失败:', error)
            }
          }
        }
      })

      return
    }

    // 🔥 非公开路由：需要等待 Clerk 初始化
    const clerkReady = await waitForClerk()

    if (!clerkReady) {
      // 未登录用户，快速显示页面
      if (import.meta.env.DEV) {
        console.warn('⚠️ [App] 用户未登录，快速显示页面')
      }
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
            avatarUrl: userData.avatarUrl, // 🔥 保存头像URL
          })

          // 🔥 同步头像到 userStore（用于聊天消息显示）
          if (userData.avatarUrl) {
            userStore.updateUserInfo({
              avatar: userData.avatarUrl,
            })
          }

          if (import.meta.env.DEV) {
            console.warn('✅ [App] 用户信息已加载:', {
              email: userData.email,
              role: userData.role,
              avatarUrl: userData.avatarUrl,
            })
          }
        }
      }
      catch (error) {
        console.error('❌ [App] 获取用户信息失败:', error)
      }
    }

    // 🔥 加载用户配置（主题、语言等）- 仅在登录后加载
    try {
      if (window.Clerk?.session && !configStore.loaded && !configStore.loading) {
        await (configStore as any).loadAllConfig()

        // 🔥 同步主题和语言设置到 appStore
        if (configStore.userSettings) {
          if (configStore.userSettings.theme) {
            appStore.setTheme(configStore.userSettings.theme)
          }
          if (configStore.userSettings.language) {
            appStore.setLanguage(configStore.userSettings.language)
          }

          if (import.meta.env.DEV) {
            console.warn('✅ [App] 用户配置已加载并同步:', {
              theme: configStore.userSettings.theme,
              language: configStore.userSettings.language,
            })
          }
        }
      }
    }
    catch (error) {
      // 静默处理错误，避免打扰未登录用户
      if (import.meta.env.DEV) {
        console.warn('⚠️ [App] 加载用户配置失败（可能未登录）:', error)
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
