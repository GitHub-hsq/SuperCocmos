/**
 * 认证服务层
 * 处理用户认证相关的业务逻辑
 */

import { request } from '../client'
import type { ApiResponse } from '../types'

export interface User {
  id: number
  clerkId?: string
  username: string
  email: string
  phone?: string
  avatarUrl?: string
  provider?: string
  status: number
  roles?: string[]
  createdAt: string
  updatedAt: string
  lastLoginAt?: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  user: User
  token: string
}

export interface RegisterRequest {
  email: string
  password: string
  name?: string
}

export interface RegisterResponse {
  user: User
}

/**
 * 邮箱密码登录
 */
export async function login(data: LoginRequest) {
  const response = await request.post<ApiResponse<LoginResponse>>('/auth/login', data)
  return response.data
}

/**
 * 邮箱注册
 */
export async function register(data: RegisterRequest) {
  const response = await request.post<ApiResponse<RegisterResponse>>('/auth/register', data)
  return response.data
}

/**
 * 获取当前用户信息（Clerk）
 */
export async function getCurrentUser() {
  const response = await request.get<ApiResponse<{ user: User }>>('/auth/me')
  return response.data
}

/**
 * 登出
 */
export async function logout() {
  // 清除本地存储的 token
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}

/**
 * 发送验证码
 */
export async function sendVerificationCode(email: string) {
  const response = await request.post<ApiResponse<any>>('/auth/send-code', { email })
  return response.data
}

/**
 * 验证验证码
 */
export async function verifyCode(email: string, code: string) {
  const response = await request.post<ApiResponse<any>>('/auth/verify-code', { email, code })
  return response.data
}

/**
 * 完成注册
 */
export async function completeSignup(data: {
  email: string
  code: string
  nickname: string
  password: string
}) {
  const response = await request.post<ApiResponse<LoginResponse>>('/auth/complete-signup', data)
  return response.data
}

