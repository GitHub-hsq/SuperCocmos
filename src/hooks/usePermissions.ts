/**
 * 角色管理 Hook（RBAC 简化版）
 * 只基于角色和等级判断，不使用细粒度权限
 */

import { computed } from 'vue'
import { useAppInitStore } from '@/store'

export interface RoleLevelMap {
  Admin: number
  Beta: number
  Ultra: number
  Plus: number
  Pro: number
  Free: number
  [key: string]: number
}

// 角色等级映射（与后端保持一致）
export const ROLE_LEVELS: RoleLevelMap = {
  'Admin': 100,
  'Beta': 80,
  'Ultra': 75,
  'Plus': 50,
  'Pro': 25,
  'Free': 0,
}

/**
 * useRoles Hook（简化版 - 只基于角色）
 */
export function useRoles() {
  const appInitStore = useAppInitStore()
  
  // 获取用户角色列表（从 appInitStore 获取）
  // TODO: 需要在 AppInitStore 中添加 userRoles 字段
  const userRoles = computed(() => {
    // 临时实现：从现有的 userPermissions 推断
    // 正式实现需要在 AppInitStore 添加 userRoles 字段
    return [] as string[]
  })
  
  /**
   * 检查是否有特定角色
   * @example
   * const isPro = hasRole('Pro')
   */
  const hasRole = (role: string) => {
    return computed(() => {
      return userRoles.value.includes(role)
    })
  }
  
  /**
   * 检查是否有任一角色
   */
  const hasAnyRole = (roles: string[]) => {
    return computed(() => {
      return roles.some(role => userRoles.value.includes(role))
    })
  }
  
  /**
   * 获取最高角色等级
   */
  const highestLevel = computed(() => {
    if (userRoles.value.length === 0) {
      return 0
    }
    return Math.max(...userRoles.value.map(r => ROLE_LEVELS[r] || 0))
  })
  
  /**
   * 获取最高角色名称
   */
  const highestRole = computed(() => {
    const level = highestLevel.value
    return Object.entries(ROLE_LEVELS)
      .find(([_, l]) => l === level)?.[0] || 'Free'
  })
  
  /**
   * 检查是否满足最低等级
   * @example
   * const canAccessPremium = hasMinLevel(50)  // Plus 及以上
   */
  const hasMinLevel = (minLevel: number) => {
    return computed(() => {
      return highestLevel.value >= minLevel
    })
  }
  
  /**
   * 快捷检查方法
   */
  const isFree = computed(() => highestLevel.value === 0)
  const isPro = computed(() => highestLevel.value >= 25)
  const isPlus = computed(() => highestLevel.value >= 50)
  const isUltra = computed(() => highestLevel.value >= 75)
  const isBeta = computed(() => hasRole('Beta').value)
  const isAdmin = computed(() => hasRole('Admin').value)
  const isPaidUser = computed(() => highestLevel.value >= 25)
  
  /**
   * 检查是否可以访问模型（基于角色配置）
   */
  const canUseModel = (modelId: string) => {
    return computed(() => {
      // TODO: 从 AppInitStore 获取角色配置
      // 临时实现：基于等级判断
      if (modelId.includes('gpt-4'))
        return highestLevel.value >= 25  // Pro
      if (modelId.includes('claude'))
        return highestLevel.value >= 50  // Plus
      return true  // Free 可以用 GPT-3.5
    })
  }
  
  /**
   * 获取配额信息
   */
  const quota = computed(() => {
    // TODO: 从 AppInitStore 获取角色配置
    const quotaMap: Record<number, any> = {
      0: { max_conversations: 10, max_messages_per_day: 50 },
      25: { max_conversations: 100, max_messages_per_day: 500 },
      50: { max_conversations: 500, max_messages_per_day: 2000 },
      75: { max_conversations: -1, max_messages_per_day: -1 },
      80: { max_conversations: -1, max_messages_per_day: -1 },
      100: { max_conversations: -1, max_messages_per_day: -1 },
    }
    
    return quotaMap[highestLevel.value] || quotaMap[0]
  })
  
  /**
   * 角色显示信息
   */
  const roleDisplay = computed(() => {
    const displays: Record<string, { label: string, color: string, icon: string }> = {
      'Admin': { label: '管理员', color: '#ff4d4f', icon: '👑' },
      'Beta': { label: '内测', color: '#722ed1', icon: '🧪' },
      'Ultra': { label: '旗舰版', color: '#1890ff', icon: '🚀' },
      'Plus': { label: '增强版', color: '#52c41a', icon: '💎' },
      'Pro': { label: '专业版', color: '#faad14', icon: '⭐' },
      'Free': { label: '免费版', color: '#8c8c8c', icon: '🆓' },
    }
    
    return displays[highestRole.value] || displays.Free
  })
  
  return {
    // 角色检查
    userRoles,
    hasRole,
    hasAnyRole,
    
    // 等级检查
    highestLevel,
    highestRole,
    hasMinLevel,
    
    // 快捷检查
    isFree,
    isPro,
    isPlus,
    isUltra,
    isBeta,
    isAdmin,
    isPaidUser,
    
    // 功能检查
    canUseModel,
    quota,
    
    // 显示信息
    roleDisplay,
    
    // 常量
    ROLE_LEVELS,
  }
}

// 兼容性：导出为 usePermissions（保持向后兼容）
export const usePermissions = useRoles

export default useRoles

