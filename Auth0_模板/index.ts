import type { App } from 'vue'
// src/router/index.ts
import type {
  NavigationGuardNext,
  RouteLocationNormalized,
  Router,
} from 'vue-router'
import { useAuth0 } from '@auth0/auth0-vue'
import {
  createRouter as createVueRouter,
  createWebHashHistory,
} from 'vue-router'
import { getUserPermissions } from '../utils/permissions'
import Home from '../views/Home.vue'
import Profile from '../views/Profile.vue'
import Statics from '../views/statics.vue'
import Welcome from '../views/welcome.vue'

// 扩展路由元信息类型
declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    permissions?: string[]
  }
}

export function createRouter(app: App): Router {
  const router = createVueRouter({
    history: createWebHashHistory(),
    routes: [
      {
        path: '/',
        name: 'home',
        component: Home,
      },
      {
        path: '/profile',
        name: 'profile',
        component: Profile,
        meta: { requiresAuth: true }, // 登录后访问
      },
      {
        path: '/welcome',
        name: 'welcome',
        component: Welcome,
        meta: { requiresAuth: true }, // 登录后访问
      },
      {
        path: '/statics',
        name: 'statics',
        component: Statics,
        meta: { requiresAuth: true, permissions: ['read:statics'] }, // 需要特定权限
      },
      {
        path: '/403',
        name: '403',
        component: () => import('../views/403.vue'),
      },
    ],
  })

  // 🔒 企业级路由守卫
  router.beforeEach(async (
    to: RouteLocationNormalized,
    from: RouteLocationNormalized,
    next: NavigationGuardNext,
  ) => {
    // ✅ 在路由守卫中调用 useAuth0()
    const { isAuthenticated, isLoading, loginWithRedirect, getAccessTokenSilently } = useAuth0()

    // 等待 Auth0 初始化完成
    if (isLoading.value) {
      // 如果访问的是需要认证的页面，阻止导航，等待 Auth0 加载完成
      if (to.meta.requiresAuth) {
        next(false) // 阻止导航，等待加载
        return
      }
      // 公开页面允许访问
      next()
      return
    }

    // 检查是否需要认证
    if (to.meta.requiresAuth && !isAuthenticated.value) {
      loginWithRedirect({ appState: { target: to.path } })
      next(false)
      return
    }

    // 检查权限
    const requiredPermissions = to.meta.permissions

    if (requiredPermissions && requiredPermissions.length > 0) {
      try {
        // 传递 getAccessTokenSilently 方法给工具函数
        const userPermissions = await getUserPermissions(getAccessTokenSilently)
        console.log('🔑 用户权限:', userPermissions)

        const hasPermission = requiredPermissions.some(p => userPermissions.includes(p))

        if (!hasPermission) {
          console.warn(`🚫 用户缺少权限: ${requiredPermissions.join(', ')}`)
          next('/403')
          return
        }
      }
      catch (err) {
        console.error('❌ 权限检查失败:', err)
        next('/403')
        return
      }
    }

    next()
  })

  return router
}
