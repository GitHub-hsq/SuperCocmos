/**
 * 角色管理服务层
 */

import type { ApiResponse } from '../types'
import { request } from '../client'

export interface Role {
  role_id: number
  role_name: string
  role_description?: string
  created_at: string
  updated_at: string
}

export interface UserRole {
  userId: number
  username: string
  email: string
  roles: string[]
  roleIds: number[]
}

/**
 * 获取所有角色
 */
export async function getAllRoles() {
  const response = await request.get<ApiResponse<{ roles: Role[], total: number }>>('/roles')
  return response.data
}

/**
 * 创建角色
 */
export async function createRole(data: { role_name: string, role_description?: string }) {
  const response = await request.post<ApiResponse<{ role: Role }>>('/roles', data)
  return response.data
}

/**
 * 更新角色
 */
export async function updateRole(id: number, data: { role_name?: string, role_description?: string }) {
  const response = await request.put<ApiResponse<{ role: Role }>>(`/roles/${id}`, data)
  return response.data
}

/**
 * 删除角色
 */
export async function deleteRole(id: number) {
  const response = await request.delete<ApiResponse<null>>(`/roles/${id}`)
  return response.data
}

/**
 * 为用户分配角色
 */
export async function assignRoleToUser(userId: number, roleId: number) {
  const response = await request.post<ApiResponse<null>>('/user-roles/assign', { userId, roleId })
  return response.data
}

/**
 * 移除用户的角色
 */
export async function removeRoleFromUser(userId: number, roleId: number) {
  const response = await request.post<ApiResponse<null>>('/user-roles/remove', { userId, roleId })
  return response.data
}

/**
 * 获取用户的角色
 */
export async function getUserRoles(userId: number) {
  const response = await request.get<ApiResponse<UserRole>>(`/user-roles/${userId}`)
  return response.data
}
