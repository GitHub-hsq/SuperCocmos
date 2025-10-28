/* eslint-disable no-console */
/**
 * 用户-角色关联 Service
 * 提供用户角色关联的 CRUD 操作（集成 Redis 缓存）
 */

import { USER_ROLE_KEYS } from '../cache/cacheKeys'
import { CACHE_TTL, deleteCached, getCached, setCached } from '../cache/cacheService'
import { supabase } from './supabaseClient'

export interface UserRole {
  user_role_id: number
  user_id: string // UUID
  role_id: number
  created_at: string
}

export interface UserWithRoles {
  user_id: string // UUID
  username: string
  email: string
  phone?: string
  status: number
  login_method: string
  avatar_url?: string
  provider?: string
  created_at: string
  updated_at: string
  last_login_at?: string
  roles: string[]
  role_ids: number[]
}

/**
 * 为用户分配角色
 */
export async function assignRoleToUser(userId: string, roleId: number): Promise<UserRole> {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role_id: roleId,
      })
      .select()
      .single()

    if (error)
      throw error

    console.log(`✅ [UserRoleService] 用户 ${userId} 分配角色 ${roleId} 成功`)
    return data
  }
  catch (error: any) {
    console.error('❌ [UserRoleService] 分配角色失败:', error.message)
    throw new Error(`分配角色失败: ${error.message}`)
  }
}

/**
 * 移除用户的角色
 */
export async function removeRoleFromUser(userId: string, roleId: number): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role_id', roleId)

    if (error)
      throw error

    console.log(`✅ [UserRoleService] 用户 ${userId} 移除角色 ${roleId} 成功`)
    return true
  }
  catch (error: any) {
    console.error('❌ [UserRoleService] 移除角色失败:', error.message)
    throw new Error(`移除角色失败: ${error.message}`)
  }
}

/**
 * 获取用户的所有角色（带 Redis 缓存）
 */
export async function getUserRoles(userId: string): Promise<UserRole[]> {
  const startTime = Date.now()

  try {
    // 🔥 1. 尝试从 Redis 缓存获取
    const cacheKey = USER_ROLE_KEYS.userRoles(userId)
    const cached = await getCached<UserRole[]>(cacheKey)

    if (cached) {
      console.warn(`✅ [UserRoleCache] 缓存命中: ${userId.substring(0, 8)}..., 耗时: ${Date.now() - startTime}ms`)
      return cached
    }

    console.warn(`ℹ️ [UserRoleCache] 缓存未命中，查询数据库`)

    // 🔥 2. 从数据库查询
    const dbStart = Date.now()
    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId)

    if (error)
      throw error

    const roles = data || []
    console.warn(`⏱️ [UserRoleCache] 数据库查询耗时: ${Date.now() - dbStart}ms`)

    // 🔥 3. 写入 Redis 缓存
    if (roles.length > 0) {
      await setCached(cacheKey, roles, CACHE_TTL.USER_ROLES)
      console.warn(`💾 [UserRoleCache] 已缓存用户角色: ${roles.length} 个角色`)
    }

    console.warn(`⏱️ [UserRoleCache] 总耗时: ${Date.now() - startTime}ms`)
    return roles
  }
  catch (error: any) {
    console.error('❌ [UserRoleService] 获取用户角色失败:', error.message)
    throw new Error(`获取用户角色失败: ${error.message}`)
  }
}

/**
 * 获取拥有特定角色的所有用户
 */
export async function getUsersByRole(roleId: number): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role_id', roleId)

    if (error)
      throw error

    return data?.map(item => item.user_id) || []
  }
  catch (error: any) {
    console.error('❌ [UserRoleService] 获取角色用户失败:', error.message)
    throw new Error(`获取角色用户失败: ${error.message}`)
  }
}

/**
 * 获取用户及其角色详情（使用视图）
 */
export async function getUserWithRoles(userId: string): Promise<UserWithRoles | null> {
  try {
    const { data, error } = await supabase
      .from('v_users_with_roles')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116')
        return null
      throw error
    }

    return data
  }
  catch (error: any) {
    console.error('❌ [UserRoleService] 获取用户详情失败:', error.message)
    throw new Error(`获取用户详情失败: ${error.message}`)
  }
}

/**
 * 获取所有用户及其角色（使用视图）
 */
export async function getAllUsersWithRoles(): Promise<UserWithRoles[]> {
  try {
    const { data, error } = await supabase
      .from('v_users_with_roles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error)
      throw error

    return data || []
  }
  catch (error: any) {
    console.error('❌ [UserRoleService] 获取用户列表失败:', error.message)
    throw new Error(`获取用户列表失败: ${error.message}`)
  }
}

/**
 * 检查用户是否拥有某个角色
 */
export async function userHasRole(userId: string, roleName: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('user_role_id, roles!inner(role_name)')
      .eq('user_id', userId)
      .eq('roles.role_name', roleName)
      .limit(1)

    if (error)
      throw error

    return (data && data.length > 0) || false
  }
  catch (error: any) {
    console.error('❌ [UserRoleService] 检查用户角色失败:', error.message)
    return false
  }
}

/**
 * 批量更新用户角色
 * @param userId 用户 ID (UUID)
 * @param roleIds 新的角色 ID 列表
 */
export async function updateUserRoles(userId: string, roleIds: number[]): Promise<boolean> {
  try {
    // 1. 删除现有角色
    const { error: deleteError } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)

    if (deleteError)
      throw deleteError

    // 2. 添加新角色
    if (roleIds.length > 0) {
      const newRoles = roleIds.map(roleId => ({
        user_id: userId,
        role_id: roleId,
      }))

      const { error: insertError } = await supabase
        .from('user_roles')
        .insert(newRoles)

      if (insertError)
        throw insertError
    }

    // 🔥 3. 清除用户角色缓存
    await clearUserRolesCache(userId)

    console.log(`✅ [UserRoleService] 用户 ${userId} 角色更新成功`)
    return true
  }
  catch (error: any) {
    console.error('❌ [UserRoleService] 更新用户角色失败:', error.message)
    throw new Error(`更新用户角色失败: ${error.message}`)
  }
}

/**
 * 清除用户角色缓存
 */
export async function clearUserRolesCache(userId: string): Promise<void> {
  try {
    const cacheKey = USER_ROLE_KEYS.userRoles(userId)
    await deleteCached(cacheKey)
    console.warn(`🗑️ [UserRoleCache] 已清除用户角色缓存: ${userId.substring(0, 8)}...`)
  }
  catch (error: any) {
    console.error('❌ [UserRoleCache] 清除缓存失败:', error.message)
  }
}
