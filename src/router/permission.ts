import type { Router } from 'vue-router'

export function setupPageGuard(router: Router) {
  router.beforeEach(async (to, from, next) => {
    // 简化路由守卫，允许所有路由访问
    // 如果需要保护特定路由，可以在这里添加逻辑
    next()
  })
}
