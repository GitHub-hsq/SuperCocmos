import type { Auth0VueClient } from '@auth0/auth0-vue'
import type { App } from 'vue'
import type { RouteRecordRaw } from 'vue-router'
import { watch } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { useAppInitStore } from '@/store'
import Login from '@/views/auth/Login.vue'
import { ChatLayout } from '@/views/chat/layout'

// 扩展路由元信息类型，添加权限字段
declare module 'vue-router' {
  interface RouteMeta {
    public?: boolean // 公开路由，无需认证
    requiresAuth?: boolean // 需要认证
    permissions?: string[] // 需要的权限列表
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/home/Home.vue'),
    meta: { public: true },
  },

  {
    path: '/chat',
    name: 'Root',
    component: ChatLayout,
    meta: { requiresAuth: true }, // 只需要登录，不需要特殊权限
    children: [
      {
        path: ':uuid?',
        name: 'Chat',
        component: () => import('@/views/chat/index.vue'),
        meta: { requiresAuth: true }, // ⚠️ 子路由必须配置 meta，不会继承父路由
      },
    ],
  },

  {
    path: '/signin',
    name: 'Login',
    component: Login,
    meta: { public: true },
  },
  {
    path: '/signup',
    name: 'Logup',
    component: () => import('@/views/auth/Logup.vue'),
    meta: { public: true },
  },

  {
    path: '/403',
    name: '403',
    component: () => import('@/views/exception/403/index.vue'),
    meta: { public: true },
  },

  {
    path: '/404',
    name: '404',
    component: () => import('@/views/exception/404/index.vue'),
    meta: { public: true },
  },

  {
    path: '/500',
    name: '500',
    component: () => import('@/views/exception/500/index.vue'),
    meta: { public: true },
  },

  {
    path: '/:pathMatch(.*)*',
    name: 'notFound',
    redirect: '/404',
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ left: 0, top: 0 }),
})

/**
 * 设置 Auth0 路由守卫
 * ⚠️ 必须在 Auth0 插件注册后调用
 * 参考官方示例简化实现，让 SDK 自动处理回调
 */

export function setupAuthGuard(auth0: Auth0VueClient) {
  // 🔥 注册路由守卫
  router.beforeEach(async (to, from, next) => {
    console.warn('🔍 [Router] 路由守卫触发:', to.path, 'from:', from.path)
    try {
      const { isLoading, isAuthenticated, loginWithRedirect } = auth0

      // 🔹 步骤 1: 等待 Auth0 初始化完成
      if (isLoading.value) {
        if (to.meta.public) {
          // 公开路由可以直接放行，不需要等待 Auth0
          next()
          return
        }
        // 对于需要认证的路由，等待 Auth0 初始化完成
        // 使用 Promise 等待加载完成
        await new Promise<void>((resolve) => {
          if (!isLoading.value) {
            resolve()
            return
          }
          const unwatch = watch(
            () => isLoading.value,
            (loading) => {
              if (!loading) {
                unwatch()
                resolve()
              }
            },
          )
          // 超时保护（10秒）
          setTimeout(() => {
            unwatch()
            resolve()
          }, 10000)
        })
        // Auth0 初始化完成，继续执行守卫的后续逻辑（不需要重新导航）
        // 守卫会继续执行，检查认证状态
      }

      // 🔹 步骤 2: 公开路由直接放行
      if (to.meta.public) {
        next()
        return
      }

      // 🔹 步骤 3: 检查路由是否需要认证（明确标记 requiresAuth 或未标记 public）
      const requiresAuth = to.meta.requiresAuth !== false // 默认需要认证，除非明确标记为 false

      if (requiresAuth && !isAuthenticated.value) {
        // 未认证用户访问需要认证的路由，重定向到登录
        console.warn(`🔒 [Router] 未认证用户尝试访问受保护路由: ${to.path}，重定向到登录`)
        try {
          await loginWithRedirect({
            appState: { target: to.path },
            authorizationParams: {
              prompt: 'login',
            },
          })
          // loginWithRedirect 会触发页面跳转到 Auth0，所以这里阻止导航
          next(false)
        }
        catch (error) {
          // 如果重定向失败，导航到登录页面
          console.error('❌ [Router] 登录重定向失败，导航到登录页面:', error)
          next('/signin')
        }
        return
      }

      // 🔥 步骤 3.5: 等待应用初始化完成（仅对已认证用户，初始化由 App.vue 的 onMounted 统一处理）
      // 只有已认证的用户才需要等待应用初始化
      if (isAuthenticated.value) {
        const appInitStore = useAppInitStore()

        // 如果正在初始化或未初始化，等待完成（最多等待 5 秒）
        if (!appInitStore.isInitialized) {
          console.warn('⏳ [Router] 等待应用初始化完成（包括用户同步）...')
          let waitCount = 0
          const maxWait = 100 // 🔥 优化: 5秒 = 100 * 50ms（原来是15秒）
          while (!appInitStore.isInitialized && waitCount < maxWait) {
            await new Promise(resolve => setTimeout(resolve, 50))
            waitCount++

            // 🔥 每1秒输出一次日志，方便调试
            if (waitCount % 20 === 0) {
              console.warn(`⏳ [Router] 仍在等待应用初始化... (${waitCount * 50}ms)`)
            }
          }
          if (appInitStore.isInitialized) {
            console.warn('✅ [Router] 应用初始化完成，继续路由导航')
          }
          else {
            console.warn('⚠️ [Router] 应用初始化超时（5秒），强制继续（数据将在后台异步加载）')
          }
        }

        // 🔥 额外检查：如果是注册后首次登录（URL中有code参数），确保用户同步完成
        const urlParams = new URLSearchParams(window.location.search)
        const isFromAuth0 = urlParams.has('code') || urlParams.has('state')
        if (isFromAuth0 && !appInitStore.isInitialized) {
          console.warn('⏳ [Router] 检测到注册/登录回调，等待用户同步完成...')
          // 额外等待2秒，确保用户同步完成
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      }

      // 🔹 步骤 5: 放行
      next()
    }
    catch (error) {
      console.error('❌ [Router] 路由守卫错误:', error)
      if (to.meta.public) {
        next()
      }
      else {
        next('/500')
      }
    }
  })

  // 🔥 注意：路由守卫已注册，会在路由匹配时自动触发
  // router.isReady() 会等待所有守卫完成，确保守卫在初始路由匹配时生效
  console.warn('✅ [Router] 路由守卫已注册')
}

export async function setupRouter(app: App) {
  app.use(router)
  // ⚠️ 不在这里等待 router.isReady()
  // 需要在 App.vue 中设置路由守卫后再等待路由就绪
  // 这样可以确保守卫在初始路由匹配之前注册
}

export async function waitForRouterReady() {
  await router.isReady()
}
