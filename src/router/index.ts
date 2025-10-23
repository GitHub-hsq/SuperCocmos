import type { App } from 'vue'
import type { RouteRecordRaw } from 'vue-router'
import { createRouter, createWebHistory } from 'vue-router'
import Login from '@/views/auth/Login.vue'
import { ChatLayout } from '@/views/chat/layout'

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
    children: [
      {
        path: '/chat/:uuid?',
        name: 'Chat',
        component: () => import('@/views/chat/index.vue'),
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
    path: '/404',
    name: '404',
    component: () => import('@/views/exception/404/index.vue'),
  },

  {
    path: '/500',
    name: '500',
    component: () => import('@/views/exception/500/index.vue'),
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

// TODO: 添加 Auth0 路由守卫
// 路由守卫：保护需要认证的路由
router.beforeEach(async (to, from, next) => {
  // 公开路由直接放行
  if (to.meta.public) {
    next()
    return
  }

  // TODO: 集成 Auth0 后，在这里检查认证状态
  // 临时：允许所有路由访问（开发阶段）
  console.warn('⚠️ [Router] Auth0 认证尚未集成，暂时允许访问所有路由')
  next()

  /* Auth0 集成后的示例代码：
  const isAuthenticated = await checkAuth0Session()
  
  if (!isAuthenticated) {
    if (to.path !== '/signin') {
      next({
        path: '/signin',
        query: { redirect: to.fullPath },
      })
    }
    else {
      next()
    }
  }
  else {
    next()
  }
  */
})

export async function setupRouter(app: App) {
  app.use(router)
  await router.isReady()
}
