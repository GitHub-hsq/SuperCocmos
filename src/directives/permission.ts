/**
 * 角色相关 Vue 指令（RBAC 简化版）
 * 用于在模板中根据角色控制元素显示
 */

import type { Directive } from 'vue'
// import { useAppInitStore } from '@/store'

const ROLE_LEVELS: Record<string, number> = {
  Admin: 100,
  Beta: 80,
  Ultra: 75,
  Plus: 50,
  Pro: 25,
  Free: 0,
}

/**
 * v-role 指令
 * 检查用户是否有特定角色，没有则移除元素
 *
 * @example
 * <div v-role="'Pro'">专业版用户可见</div>
 * <NButton v-role="['Admin', 'Beta']">管理员或内测用户可见</NButton>
 */
export const roleDirective: Directive = {
  mounted(el, binding) {
    // const appInitStore = useAppInitStore()
    const requiredRoles = Array.isArray(binding.value)
      ? binding.value
      : [binding.value]

    // TODO: 从 AppInitStore 获取用户角色
    const userRoles: string[] = [] // appInitStore.userRoles

    const hasRole = requiredRoles.some(
      (r: string) => userRoles.includes(r),
    )

    if (!hasRole) {
      el.remove()
    }
  },
}

/**
 * v-min-level 指令
 * 检查用户等级是否满足要求，不满足则移除元素
 *
 * @example
 * <div v-min-level="50">Plus 及以上用户可见</div>
 * <NButton v-min-level="25">Pro 及以上可用</NButton>
 */
export const minLevelDirective: Directive = {
  mounted(el, binding) {
    // const appInitStore = useAppInitStore()
    const requiredLevel = Number(binding.value)

    // TODO: 从 AppInitStore 获取用户角色
    const userRoles: string[] = [] // appInitStore.userRoles
    const userLevel = Math.max(...userRoles.map(r => ROLE_LEVELS[r] || 0))

    if (userLevel < requiredLevel) {
      el.remove()
    }
  },
}

/**
 * v-paid 指令
 * 仅付费用户可见（Pro 及以上，等级 >= 25）
 *
 * @example
 * <div v-paid>付费用户专属功能</div>
 */
export const paidDirective: Directive = {
  mounted(el) {
    // const appInitStore = useAppInitStore()

    // TODO: 从 AppInitStore 获取用户角色
    const userRoles: string[] = [] // appInitStore.userRoles
    const userLevel = Math.max(...userRoles.map(r => ROLE_LEVELS[r] || 0))

    if (userLevel < 25) { // Pro 等级
      el.remove()
    }
  },
}

export default {
  role: roleDirective,
  minLevel: minLevelDirective,
  paid: paidDirective,
}
