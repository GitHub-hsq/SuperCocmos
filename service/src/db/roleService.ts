/* eslint-disable no-console */
/**
 * 角色管理 Service
 * 提供角色的 CRUD 操作
 */

import { supabase } from './supabaseClient'

export interface Role {
  role_id: number
  role_name: string
  role_description?: string
  created_at: string
  updated_at: string
  auth0_role_id?: string
  level?: number
  is_system?: boolean
  metadata?: Record<string, any>
  enabled?: boolean
}

export interface CreateRoleInput {
  role_name: string
  role_description?: string
}

export interface UpdateRoleInput {
  role_name?: string
  role_description?: string
}

/**
 * 获取所有角色
 */
export async function getAllRoles(): Promise<Role[]> {
  try {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .order('created_at', { ascending: true })

    if (error)
      throw error

    return data || []
  }
  catch (error: any) {
    console.error('❌ [RoleService] 获取角色列表失败:', error.message)
    throw new Error(`获取角色列表失败: ${error.message}`)
  }
}

/**
 * 根据 ID 获取角色
 */
export async function getRoleById(roleId: number): Promise<Role | null> {
  try {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .eq('role_id', roleId)
      .single()

    if (error) {
      if (error.code === 'PGRST116')
        return null // 未找到
      throw error
    }

    return data
  }
  catch (error: any) {
    console.error('❌ [RoleService] 获取角色失败:', error.message)
    throw new Error(`获取角色失败: ${error.message}`)
  }
}

/**
 * 根据名称获取角色
 */
export async function getRoleByName(roleName: string): Promise<Role | null> {
  try {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .eq('role_name', roleName)
      .single()

    if (error) {
      if (error.code === 'PGRST116')
        return null // 未找到
      throw error
    }

    return data
  }
  catch (error: any) {
    console.error('❌ [RoleService] 获取角色失败:', error.message)
    throw new Error(`获取角色失败: ${error.message}`)
  }
}

/**
 * 创建角色
 */
export async function createRole(input: CreateRoleInput): Promise<Role> {
  try {
    const { data, error } = await supabase
      .from('roles')
      .insert({
        role_name: input.role_name,
        role_description: input.role_description,
      })
      .select()
      .single()

    if (error)
      throw error

    console.log(`✅ [RoleService] 角色创建成功: ${input.role_name}`)
    return data
  }
  catch (error: any) {
    console.error('❌ [RoleService] 创建角色失败:', error.message)
    throw new Error(`创建角色失败: ${error.message}`)
  }
}

/**
 * 更新角色
 */
export async function updateRole(roleId: number, input: UpdateRoleInput): Promise<Role | null> {
  try {
    const { data, error } = await supabase
      .from('roles')
      .update({
        ...(input.role_name && { role_name: input.role_name }),
        ...(input.role_description !== undefined && { role_description: input.role_description }),
        updated_at: new Date().toISOString(),
      })
      .eq('role_id', roleId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116')
        return null
      throw error
    }

    console.log(`✅ [RoleService] 角色更新成功: ${roleId}`)
    return data
  }
  catch (error: any) {
    console.error('❌ [RoleService] 更新角色失败:', error.message)
    throw new Error(`更新角色失败: ${error.message}`)
  }
}

/**
 * 删除角色
 */
export async function deleteRole(roleId: number): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('roles')
      .delete()
      .eq('role_id', roleId)

    if (error)
      throw error

    console.log(`✅ [RoleService] 角色删除成功: ${roleId}`)
    return true
  }
  catch (error: any) {
    console.error('❌ [RoleService] 删除角色失败:', error.message)
    throw new Error(`删除角色失败: ${error.message}`)
  }
}
