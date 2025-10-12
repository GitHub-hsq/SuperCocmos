/**
 * 用户管理服务层
 */

import { request } from '../client'
import type { ApiResponse } from '../types'
import type { User } from './authService'

export interface UpdateUserRequest {
  username?: string
  nickname?: string
  email?: string
  password?: string
}

/**
 * 获取用户信息
 */
export async function getUser(id: string) {
  const response = await request.get<ApiResponse<{ user: User }>>(`/user/${id}`)
  return response.data
}

/**
 * 更新用户信息
 */
export async function updateUser(id: string, data: UpdateUserRequest) {
  const response = await request.put<ApiResponse<{ user: User }>>(`/user/${id}`, data)
  return response.data
}

/**
 * 删除用户
 */
export async function deleteUser(id: string) {
  const response = await request.delete<ApiResponse<null>>(`/user/${id}`)
  return response.data
}

/**
 * 获取用户列表
 */
export async function getUsers() {
  const response = await request.get<ApiResponse<{ users: User[]; total: number }>>('/users')
  return response.data
}

