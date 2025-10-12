/* eslint-disable no-console */
/**
 * 用户-角色关联 Service
 * 提供用户角色关联的 CRUD 操作
 */

import { supabase } from './supabaseClient'

export interface UserRole {
  user_role_id: number
  user_id: number
  role_id: number
  created_at: string
}

export interface UserWithRoles {
  user_id: number
  username: string
  email: string
  phone?: string
  status: number
  login_method: string
  clerk_id?: string
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
export async function assignRoleToUser(userId: number, roleId: number): Promise<UserRole> {
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
export async function removeRoleFromUser(userId: number, roleId: number): Promise<boolean> {
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
 * 获取用户的所有角色
 */
export async function getUserRoles(userId: number): Promise<UserRole[]> {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', userId)

    if (error)
      throw error

    return data || []
  }
  catch (error: any) {
    console.error('❌ [UserRoleService] 获取用户角色失败:', error.message)
    throw new Error(`获取用户角色失败: ${error.message}`)
  }
}

/**
 * 获取拥有特定角色的所有用户
 */
export async function getUsersByRole(roleId: number): Promise<number[]> {
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
export async function getUserWithRoles(userId: number): Promise<UserWithRoles | null> {
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
export async function userHasRole(userId: number, roleName: string): Promise<boolean> {
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
 * @param userId 用户 ID
 * @param roleIds 新的角色 ID 列表
 */
export async function updateUserRoles(userId: number, roleIds: number[]): Promise<boolean> {
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

    console.log(`✅ [UserRoleService] 用户 ${userId} 角色更新成功`)
    return true
  }
  catch (error: any) {
    console.error('❌ [UserRoleService] 更新用户角色失败:', error.message)
    throw new Error(`更新用户角色失败: ${error.message}`)
  }
}

