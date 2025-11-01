/**
 * 基于角色的访问控制中间件（RBAC - 简化版）
 * 只检查角色和等级，不使用细粒度权限
 */

import type { NextFunction, Request, Response } from 'express'
import { supabase } from '../db/supabaseClient'

// 从环境变量获取 Auth0 配置
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE || 'http://supercocmos.com'
const AUTH0_ROLES_NAMESPACE = `${AUTH0_AUDIENCE}/roles`

// 角色等级映射
export const ROLE_LEVELS: Record<string, number> = {
  Admin: 100,
  Beta: 80,
  Ultra: 75,
  Plus: 50,
  Pro: 25,
  Free: 0,
}

/**
 * 从请求中获取 Auth0 用户信息
 */
function getAuth0User(req: Request) {
  return (req as any).auth0User
}

/**
 * 从请求中获取用户角色列表
 */
function getUserRoles(req: Request): string[] {
  const auth0User = getAuth0User(req)
  if (!auth0User)
    return []

  // 优先使用配置的命名空间，然后尝试 https 和 http 版本
  const httpsNamespace = `https://${AUTH0_AUDIENCE.replace('http://', '').replace('https://', '')}/roles`
  const httpNamespace = `http://${AUTH0_AUDIENCE.replace('http://', '').replace('https://', '')}/roles`

  return auth0User[AUTH0_ROLES_NAMESPACE]
    || auth0User[httpsNamespace]
    || auth0User[httpNamespace]
    || []
}

/**
 * 计算用户最高等级
 */
export function getUserLevel(roles: string[]): number {
  if (roles.length === 0)
    return 0
  return Math.max(...roles.map(r => ROLE_LEVELS[r] || 0))
}

/**
 * 中间件：要求特定角色
 *
 * @example
 * router.get('/admin', requireRole('Admin'), handler)
 */
export function requireRole(requiredRole: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth0User = getAuth0User(req)

      if (!auth0User) {
        return res.status(401).json({
          status: 'Fail',
          message: '未授权：用户未登录',
          data: null,
        })
      }

      const roles = getUserRoles(req)

      if (roles.includes(requiredRole)) {
        console.warn(`✅ [Role] 角色验证通过: ${requiredRole}`)
        return next()
      }

      return res.status(403).json({
        status: 'Fail',
        message: `需要 ${requiredRole} 角色`,
        data: { requiredRole, userRoles: roles },
      })
    }
    catch (error: any) {
      console.error('❌ [Role] 角色检查失败:', error)
      return res.status(500).json({
        status: 'Fail',
        message: '角色检查失败',
        data: null,
      })
    }
  }
}

/**
 * 中间件：要求最低角色等级
 *
 * @example
 * router.post('/premium', requireMinLevel(50), handler)  // Plus 及以上
 */
export function requireMinLevel(minLevel: number) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth0User = getAuth0User(req)

      if (!auth0User) {
        return res.status(401).json({
          status: 'Fail',
          message: '未授权：用户未登录',
          data: null,
        })
      }

      const roles = getUserRoles(req)
      const userLevel = getUserLevel(roles)

      if (userLevel >= minLevel) {
        console.warn(`✅ [Level] 等级验证通过: ${userLevel} >= ${minLevel}`)
        return next()
      }

      // 找到需要的角色名称
      const requiredRole = Object.entries(ROLE_LEVELS)
        .find(([_, level]) => level >= minLevel)?.[0] || 'Pro'

      return res.status(403).json({
        status: 'Fail',
        message: `需要 ${requiredRole} 或更高角色`,
        data: {
          requiredLevel: minLevel,
          currentLevel: userLevel,
          requiredRole,
        },
      })
    }
    catch (error: any) {
      console.error('❌ [Level] 等级检查失败:', error)
      return res.status(500).json({
        status: 'Fail',
        message: '等级检查失败',
        data: null,
      })
    }
  }
}

/**
 * 中间件：要求任一角色
 *
 * @example
 * router.get('/dashboard', requireAnyRole(['Pro', 'Plus', 'Admin']), handler)
 */
export function requireAnyRole(requiredRoles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth0User = getAuth0User(req)

      if (!auth0User) {
        return res.status(401).json({
          status: 'Fail',
          message: '未授权：用户未登录',
          data: null,
        })
      }

      const roles = getUserRoles(req)
      const hasAnyRole = requiredRoles.some(r => roles.includes(r))

      if (hasAnyRole) {
        console.warn(`✅ [Role] 角色验证通过（任一）`)
        return next()
      }

      return res.status(403).json({
        status: 'Fail',
        message: `需要以下任一角色: ${requiredRoles.join(', ')}`,
        data: { requiredRoles, userRoles: roles },
      })
    }
    catch (error: any) {
      console.error('❌ [Role] 角色检查失败:', error)
      return res.status(500).json({
        status: 'Fail',
        message: '角色检查失败',
        data: null,
      })
    }
  }
}

/**
 * 工具函数：检查用户是否可以访问模型
 */
export async function canAccessModel(userId: string, modelId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('v_user_roles')
      .select('role_config')
      .eq('user_id', userId)
      .single()

    if (error || !data || !data.role_config) {
      return false
    }

    const config = data.role_config as any
    const allowedModels = config.allowed_models || []

    // "all" 表示所有模型
    if (allowedModels.includes('all')) {
      return true
    }

    // 检查特定模型
    return allowedModels.includes(modelId)
  }
  catch (error) {
    console.error('❌ 检查模型访问失败:', error)
    return false
  }
}

/**
 * 工具函数：获取用户配额
 */
export async function getUserQuota(userId: string) {
  try {
    const { data, error } = await supabase
      .from('v_user_roles')
      .select('role_config')
      .eq('user_id', userId)
      .single()

    if (error || !data || !data.role_config) {
      return {
        max_conversations: 10,
        max_messages_per_day: 50,
      }
    }

    const config = data.role_config as any
    return {
      max_conversations: config.max_conversations || 10,
      max_messages_per_day: config.max_messages_per_day || 50,
      allowed_models: config.allowed_models || ['gpt-3.5-turbo'],
      features: config.features || {},
    }
  }
  catch (error) {
    console.error('❌ 获取配额失败:', error)
    return {
      max_conversations: 10,
      max_messages_per_day: 50,
    }
  }
}

export default {
  requireRole,
  requireMinLevel,
  requireAnyRole,
  canAccessModel,
  getUserQuota,
  ROLE_LEVELS,
}
