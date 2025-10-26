/**
 * Auth0 角色分配工具
 * 用于后端处理订阅升级/降级时分配角色
 *
 * 使用场景：
 * - 用户购买 Pro/Plus/Ultra 套餐
 * - 订阅过期降级到 Free
 * - 管理员手动调整用户角色
 */

/**
 * Auth0 Management API 配置
 * 从环境变量读取
 */
const AUTH0_CONFIG = {
  domain: process.env.AUTH0_DOMAIN || 'dev-1cn6r8b7szo6fs0y.us.auth0.com',
  clientId: process.env.AUTH0_MANAGEMENT_CLIENT_ID || 'mekzeXfbMWlK4HoHi18MyUaR0G2wSOlL',
  clientSecret: process.env.AUTH0_MANAGEMENT_CLIENT_SECRET || 'u4srke-Eq-zGLTgavHcslyl_ae2GWj06kGxg9N6slaDDQKfmY2-g5fZkRW-N3XlE',
  audience: 'http://supercocmos.com',
}

/**
 * 角色 ID 映射
 * 从 Auth0 Dashboard → User Management → Roles 获取
 */
export const ROLE_IDS = {
  Free: 'rol_fXxHF5lSobIVDoXI',
  Pro: 'rol_xxxxx', // TODO: 创建 Pro 角色后填写
  Plus: 'rol_xxxxx', // TODO: 创建 Plus 角色后填写
  Ultra: 'rol_xxxxx', // TODO: 创建 Ultra 角色后填写
  Beta: 'rol_xxxxx', // TODO: 创建 Beta 角色后填写
  Admin: 'rol_xxxxx', // TODO: 创建 Admin 角色后填写
} as const

export type RoleName = keyof typeof ROLE_IDS

/**
 * 获取 Auth0 Management API Access Token
 */
async function getManagementApiToken(): Promise<string> {
  try {
    const response = await fetch(`https://${AUTH0_CONFIG.domain}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: AUTH0_CONFIG.clientId,
        client_secret: AUTH0_CONFIG.clientSecret,
        audience: `https://${AUTH0_CONFIG.domain}/api/v2/`,
        grant_type: 'client_credentials',
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to get Management API token: ${response.status} - ${error}`)
    }

    const data = await response.json() as { access_token: string }
    return data.access_token
  }
  catch (error: any) {
    console.error('❌ [Auth0] Failed to get Management API token:', error.message)
    throw error
  }
}

/**
 * 获取用户当前的角色列表
 */
export async function getUserRoles(auth0UserId: string): Promise<string[]> {
  try {
    const accessToken = await getManagementApiToken()

    const response = await fetch(
      `https://${AUTH0_CONFIG.domain}/api/v2/users/${auth0UserId}/roles`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to get user roles: ${response.status} - ${error}`)
    }

    const roles = await response.json() as Array<{ name: string }>
    return roles.map(role => role.name)
  }
  catch (error: any) {
    console.error(`❌ [Auth0] Failed to get roles for user ${auth0UserId}:`, error.message)
    throw error
  }
}

/**
 * 给用户分配角色
 *
 * @param auth0UserId - Auth0 用户 ID (如: auth0|68fdac28f61d39b83ef6b30e)
 * @param roleName - 角色名称 (Free, Pro, Plus, Ultra, Beta, Admin)
 *
 * @example
 * // 用户购买 Pro 套餐
 * await assignRoleToUser('auth0|123456', 'Pro')
 */
export async function assignRoleToUser(
  auth0UserId: string,
  roleName: RoleName,
): Promise<boolean> {
  try {
    if (process.env.NODE_ENV === 'development') {
      console.error(`📡 [Auth0] Assigning role "${roleName}" to user ${auth0UserId}`)
    }

    const roleId = ROLE_IDS[roleName]
    if (!roleId || roleId.startsWith('rol_xxx')) {
      throw new Error(`Role ID for "${roleName}" not configured`)
    }

    const accessToken = await getManagementApiToken()

    const response = await fetch(
      `https://${AUTH0_CONFIG.domain}/api/v2/users/${auth0UserId}/roles`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roles: [roleId],
        }),
      },
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to assign role: ${response.status} - ${error}`)
    }

    if (process.env.NODE_ENV === 'development') {
      console.error(`✅ [Auth0] Successfully assigned "${roleName}" role to user ${auth0UserId}`)
    }
    return true
  }
  catch (error: any) {
    console.error(`❌ [Auth0] Failed to assign role "${roleName}":`, error.message)
    return false
  }
}

/**
 * 移除用户的角色
 *
 * @param auth0UserId - Auth0 用户 ID
 * @param roleName - 角色名称
 *
 * @example
 * // 订阅过期，移除 Pro 角色
 * await removeRoleFromUser('auth0|123456', 'Pro')
 */
export async function removeRoleFromUser(
  auth0UserId: string,
  roleName: RoleName,
): Promise<boolean> {
  try {
    if (process.env.NODE_ENV === 'development') {
      console.error(`📡 [Auth0] Removing role "${roleName}" from user ${auth0UserId}`)
    }

    const roleId = ROLE_IDS[roleName]
    if (!roleId || roleId.startsWith('rol_xxx')) {
      throw new Error(`Role ID for "${roleName}" not configured`)
    }

    const accessToken = await getManagementApiToken()

    const response = await fetch(
      `https://${AUTH0_CONFIG.domain}/api/v2/users/${auth0UserId}/roles`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roles: [roleId],
        }),
      },
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to remove role: ${response.status} - ${error}`)
    }

    if (process.env.NODE_ENV === 'development') {
      console.error(`✅ [Auth0] Successfully removed "${roleName}" role from user ${auth0UserId}`)
    }
    return true
  }
  catch (error: any) {
    console.error(`❌ [Auth0] Failed to remove role "${roleName}":`, error.message)
    return false
  }
}

/**
 * 升级用户套餐
 * 自动处理角色移除和添加
 *
 * @param auth0UserId - Auth0 用户 ID
 * @param fromRole - 当前角色
 * @param toRole - 目标角色
 *
 * @example
 * // 用户从 Free 升级到 Pro
 * await upgradeUserPlan('auth0|123456', 'Free', 'Pro')
 */
export async function upgradeUserPlan(
  auth0UserId: string,
  fromRole: RoleName,
  toRole: RoleName,
): Promise<boolean> {
  try {
    if (process.env.NODE_ENV === 'development') {
      console.error(`🔄 [Auth0] Upgrading user ${auth0UserId} from ${fromRole} to ${toRole}`)
    }

    // 1. 移除旧角色
    if (fromRole !== toRole) {
      await removeRoleFromUser(auth0UserId, fromRole)
    }

    // 2. 添加新角色
    await assignRoleToUser(auth0UserId, toRole)

    if (process.env.NODE_ENV === 'development') {
      console.error(`✅ [Auth0] Successfully upgraded user to ${toRole}`)
    }
    return true
  }
  catch (error: any) {
    console.error(`❌ [Auth0] Failed to upgrade user plan:`, error.message)
    return false
  }
}

/**
 * 降级用户套餐（订阅过期）
 *
 * @param auth0UserId - Auth0 用户 ID
 * @param currentRole - 当前角色
 *
 * @example
 * // 订阅过期，降级到 Free
 * await downgradeUserPlan('auth0|123456', 'Pro')
 */
export async function downgradeUserPlan(
  auth0UserId: string,
  currentRole: RoleName,
): Promise<boolean> {
  return upgradeUserPlan(auth0UserId, currentRole, 'Free')
}

// ============================================
// 使用示例（注释掉的代码）
// ============================================

/**
 * 示例 1: 处理支付成功后的订阅激活
 * 示例 2: 处理订阅过期
 * 详见 AUTH0_ROLE_ASSIGNMENT_USAGE.md
 */

export default {
  getUserRoles,
  assignRoleToUser,
  removeRoleFromUser,
  upgradeUserPlan,
  downgradeUserPlan,
  ROLE_IDS,
}
