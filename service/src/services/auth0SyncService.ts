/**
 * Auth0 用户和角色同步服务（RBAC 简化版）
 * 只同步角色，不处理细粒度权限
 */

import { supabase } from '../db/supabaseClient'
import { createUser, findUserByAuth0Id, updateUser } from '../db/supabaseUserService'
import { assignRoleToUser, removeRoleFromUser } from '../db/userRoleService'

export interface Auth0User {
  'sub': string // Auth0 user ID
  'email': string
  'name'?: string
  'nickname'?: string
  'picture'?: string
  'email_verified'?: boolean
  'https://supercocmos.com/roles'?: string[] // ✅ 只需要角色
}

/**
 * 同步 Auth0 用户到数据库
 * 在用户登录时调用
 */
export async function syncAuth0UserToDatabase(auth0User: Auth0User) {
  try {
    const auth0Id = auth0User.sub
    const email = auth0User.email || 'unknown@auth0.user'
    const auth0Roles = auth0User['https://supercocmos.com/roles'] || []

    console.warn('🔄 [Auth0] 同步用户:', email)
    console.warn('📋 [Auth0] 角色:', auth0Roles)
    console.warn('🔑 [Auth0] 完整 Token 内容:', JSON.stringify(auth0User, null, 2))

    // 1. 查找或创建用户
    let user = await findUserByAuth0Id(auth0Id)

    if (!user) {
      // 创建新用户
      user = await createUser({
        email,
        username: auth0User.name || auth0User.nickname || email.split('@')[0],
        avatar_url: auth0User.picture,
        provider: 'auth0',
        login_method: 'oauth',
        auth0_id: auth0Id,
      })
      console.warn(`✅ [Auth0] 创建新用户:`, email)
    }
    else {
      // 更新用户信息
      await updateUser(user.user_id, {
        username: auth0User.name || auth0User.nickname || user.username,
        avatar_url: auth0User.picture || user.avatar_url,
        last_login_at: new Date().toISOString(),
      })
      console.warn(`✅ [Auth0] 更新用户:`, email)
    }

    // 2. 同步角色
    await syncUserRoles(user.user_id, auth0Roles)

    // 3. 更新订阅状态
    await updateSubscriptionStatus(user.user_id, auth0Roles)

    return { success: true, user }
  }
  catch (error: any) {
    console.error('❌ [Auth0Sync] 同步失败:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 同步用户角色
 * 将 Auth0 的角色同步到数据库
 */
async function syncUserRoles(userId: string, auth0Roles: string[]) {
  try {
    // 🔥 如果没有角色，不做任何操作（Auth0 会在 Login Action 中自动分配）
    if (auth0Roles.length === 0) {
      console.warn('⚠️ [Auth0Sync] Token 中无角色，跳过角色同步（等待 Auth0 Action 分配）')
      return
    }

    // 获取数据库中的角色映射
    const { data: dbRoles, error } = await supabase
      .from('roles')
      .select('role_id, role_name, is_system')
      .in('role_name', auth0Roles)

    if (error) {
      console.error('❌ [Auth0Sync] 查询角色失败:', error)
      return
    }

    if (!dbRoles || dbRoles.length === 0) {
      console.warn(`⚠️ [Auth0Sync] 未找到匹配的角色: ${auth0Roles.join(', ')}`)
      return
    }

    // 获取用户当前的角色
    const { data: currentUserRoles } = await supabase
      .from('user_roles')
      .select('role_id, roles!inner(role_name, is_system)')
      .eq('user_id', userId)

    const currentRoleIds = currentUserRoles?.map((ur: any) => ur.role_id) || []

    // 添加 Auth0 中有但数据库中没有的角色
    for (const role of dbRoles) {
      if (!currentRoleIds.includes(role.role_id)) {
        await assignRoleToUser(userId, role.role_id)
        console.warn(`➕ [Auth0Sync] 添加角色: ${role.role_name}`)
      }
    }

    // 删除数据库中有但 Auth0 中没有的非系统角色
    const auth0RoleIds = dbRoles.map(r => r.role_id)
    const rolesToRemove = currentUserRoles?.filter((ur: any) => {
      const roleInfo = ur.roles
      return !auth0RoleIds.includes(ur.role_id) && !roleInfo.is_system
    }) || []

    for (const userRole of rolesToRemove) {
      await removeRoleFromUser(userId, userRole.role_id)
      const roleInfo = userRole.roles as any
      console.warn(`🗑️ [Auth0Sync] 移除角色: ${roleInfo.role_name}`)
    }

    console.warn(`✅ [Auth0Sync] 角色同步完成: ${dbRoles.map((r: any) => r.role_name).join(', ')}`)
  }
  catch (error: any) {
    console.error('❌ [Auth0Sync] 角色同步失败:', error)
    throw error
  }
}

/**
 * 更新用户订阅状态（简化版）
 */
async function updateSubscriptionStatus(userId: string, roles: string[]) {
  try {
    // 角色优先级（从高到低）
    const rolePriority = ['Admin', 'Beta', 'Ultra', 'Plus', 'Pro', 'Free']

    // 找到最高优先级的角色
    let subscriptionStatus = 'Free' // 默认为 Free（保持和角色名称一致）
    for (const role of rolePriority) {
      if (roles.includes(role)) {
        subscriptionStatus = role // 保持原始大小写
        break
      }
    }

    // 更新数据库
    const { error } = await supabase
      .from('users')
      .update({
        subscription_status: subscriptionStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)

    if (error) {
      console.error('❌ [Auth0] 更新订阅状态失败:', error)
      return
    }

    console.warn(`✅ [Auth0] 订阅状态:`, subscriptionStatus)
  }
  catch (error: any) {
    console.error('❌ [Auth0] 更新订阅状态失败:', error)
  }
}

/**
 * 获取用户角色信息（简化版）
 */
export async function getUserRoleInfo(userId: string) {
  try {
    const { data, error } = await supabase
      .from('v_user_roles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      console.error('❌ [Auth0] 获取用户角色失败:', error)
      return null
    }

    return data
  }
  catch (error: any) {
    console.error('❌ [Auth0] 获取用户角色异常:', error)
    return null
  }
}

/**
 * 检查用户是否可以访问模型（简化版）
 */
export async function canUserAccessModel(userId: string, modelId: string): Promise<boolean> {
  try {
    const roleInfo = await getUserRoleInfo(userId)

    if (!roleInfo || !roleInfo.role_config)
      return false

    const allowedModels = roleInfo.role_config.allowed_models || []

    // "all" 表示所有模型
    if (allowedModels.includes('all'))
      return true

    // 检查特定模型
    return allowedModels.includes(modelId)
  }
  catch (error: any) {
    console.error('❌ [Auth0] 检查模型访问失败:', error)
    return false
  }
}

/**
 * 获取用户配额（简化版）
 */
export async function getUserQuota(userId: string) {
  try {
    const roleInfo = await getUserRoleInfo(userId)

    if (!roleInfo || !roleInfo.role_config) {
      return {
        max_conversations: 10,
        max_messages_per_day: 50,
      }
    }

    return roleInfo.role_config
  }
  catch (error: any) {
    console.error('❌ [Auth0] 获取配额失败:', error)
    return {
      max_conversations: 10,
      max_messages_per_day: 50,
    }
  }
}

export default {
  syncAuth0UserToDatabase,
  getUserRoleInfo,
  canUserAccessModel,
  getUserQuota,
}
