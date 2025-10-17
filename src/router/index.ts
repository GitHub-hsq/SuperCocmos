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

export async function setupRouter(app: App) {
  app.use(router)
  await router.isReady()
}
