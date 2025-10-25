import type { Auth0VueClient } from '@auth0/auth0-vue'
import type { App } from 'vue'
import type { RouteRecordRaw } from 'vue-router'
import { createRouter, createWebHistory } from 'vue-router'
import { hasPermission } from '@/utils/permissions'
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
    redirect: '/chat/index',
    meta: { requiresAuth: true }, // 只需要登录，不需要特殊权限
    children: [
      {
        path: '/chat/:uuid?',
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
    path: '/admin',
    name: 'Admin',
    component: () => import('@/views/admin/AdminPanel.vue'),
    meta: {
      requiresAuth: true,
      permissions: ['read:statics'], // 需要 read:admin 权限
    },
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

// 📊 路由跳转日志记录（静默模式）
const routeHistory: Array<{ from: string, to: string, timestamp: string }> = []

// 暴露路由历史到 window（开发环境调试）
if (import.meta.env.DEV) {
  const w = window as any
  w.__routeHistory = routeHistory
  w.__printRouteHistory = () => {
    console.warn('📊 路由历史记录:')
    routeHistory.forEach((entry, index) => {
      console.warn(`  ${index + 1}. ${entry.timestamp} | ${entry.from} → ${entry.to}`)
    })
  }
}

/**
 * 设置 Auth0 路由守卫
 * ⚠️ 必须在 Auth0 插件注册后调用
 * 参考官方示例简化实现，让 SDK 自动处理回调
 */

export function setupAuthGuard(auth0: Auth0VueClient) {
  console.warn('=======================路由守卫触发=======================')
  console.warn('11111 isLoading', auth0.isLoading.value)
  console.warn('22222 isAuthenticated', auth0.isAuthenticated.value)

  router.beforeEach(async (to, from, next) => {
    // 📊 记录路由跳转（可选）
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0]
    routeHistory.push({
      from: from.fullPath || '(初始)',
      to: to.fullPath,
      timestamp,
    })
    if (routeHistory.length > 20)
      routeHistory.shift()

    try {
      const { isLoading, isAuthenticated, loginWithRedirect, getAccessTokenSilently } = auth0

      // 🔹 步骤 1: 等待 Auth0 初始化完成
      if (isLoading.value) {
        if (to.meta.public) {
          next()
        }
        else {
          next(false) // 阻止导航，等初始化完成后再试（可配合全局 loading）
        }
        return
      }

      // 🔹 步骤 2: 公开路由直接放行
      if (to.meta.public) {
        next()
        return
      }

      // 🔹 步骤 3: 未认证用户重定向到登录
      if (!isAuthenticated.value) {
        await loginWithRedirect({
          appState: { target: to.path },
          authorizationParams: {
            prompt: 'login',
          },
        })
        next(false)
        return
      }

      // 🔹 步骤 4: 权限检查（基于 permissions）
      const requiredPermissions = to.meta.permissions as string[] | undefined
      if (requiredPermissions?.length) {
        try {
          const hasPerm = await hasPermission(getAccessTokenSilently, requiredPermissions)

          if (!hasPerm) {
            next('/403')
            return
          }
        }
        catch (err) {
          console.error('❌ 权限检查失败:', err)
          next('/500')
          return
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
}

export async function setupRouter(app: App) {
  app.use(router)
  await router.isReady()
}
