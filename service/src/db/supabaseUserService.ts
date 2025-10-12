/* eslint-disable no-console */
/**
 * Supabase 用户管理 Service
 * 提供用户的 CRUD 操作（基于 Supabase）
 */

import { supabase } from './supabaseClient'
import { hashPassword, comparePassword } from '../utils/password'

export interface SupabaseUser {
  user_id: number
  username: string
  password?: string
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
  department_id?: number
}

export interface CreateUserInput {
  username?: string
  email: string
  password?: string
  phone?: string
  login_method?: string
  clerk_id?: string
  avatar_url?: string
  provider?: string
}

export interface UpdateUserInput {
  username?: string
  email?: string
  password?: string
  phone?: string
  status?: number
  avatar_url?: string
  last_login_at?: string
  department_id?: number
}

/**
 * 创建用户
 */
export async function createUser(input: CreateUserInput): Promise<SupabaseUser> {
  try {
    // 如果提供了密码，进行加密
    const hashedPassword = input.password ? await hashPassword(input.password) : null

    const { data, error } = await supabase
      .from('users')
      .insert({
        username: input.username || input.email.split('@')[0],
        email: input.email,
        password: hashedPassword,
        phone: input.phone,
        login_method: input.login_method || 'email',
        clerk_id: input.clerk_id,
        avatar_url: input.avatar_url,
        provider: input.provider,
        status: 1, // 默认激活
      })
      .select()
      .single()

    if (error)
      throw error

    console.log(`✅ [SupabaseUserService] 用户创建成功: ${input.email}`)
    return data
  }
  catch (error: any) {
    console.error('❌ [SupabaseUserService] 创建用户失败:', error.message)
    throw new Error(`创建用户失败: ${error.message}`)
  }
}

/**
 * 根据 Email 查找用户
 */
export async function findUserByEmail(email: string): Promise<SupabaseUser | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    if (error) {
      if (error.code === 'PGRST116')
        return null // 未找到
      throw error
    }

    return data
  }
  catch (error: any) {
    console.error('❌ [SupabaseUserService] 查找用户失败:', error.message)
    return null
  }
}

/**
 * 根据 Clerk ID 查找用户
 */
export async function findUserByClerkId(clerkId: string): Promise<SupabaseUser | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('clerk_id', clerkId)
      .single()

    if (error) {
      if (error.code === 'PGRST116')
        return null
      throw error
    }

    return data
  }
  catch (error: any) {
    console.error('❌ [SupabaseUserService] 查找用户失败:', error.message)
    return null
  }
}

/**
 * 根据用户名查找用户
 */
export async function findUserByUsername(username: string): Promise<SupabaseUser | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single()

    if (error) {
      if (error.code === 'PGRST116')
        return null
      throw error
    }

    return data
  }
  catch (error: any) {
    console.error('❌ [SupabaseUserService] 查找用户失败:', error.message)
    return null
  }
}

/**
 * 根据 ID 查找用户
 */
export async function findUserById(userId: number): Promise<SupabaseUser | null> {
  try {
    const { data, error } = await supabase
      .from('users')
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
    console.error('❌ [SupabaseUserService] 查找用户失败:', error.message)
    return null
  }
}

/**
 * 验证用户密码
 */
export async function validateUserPassword(email: string, password: string): Promise<SupabaseUser | null> {
  try {
    const user = await findUserByEmail(email)
    if (!user || !user.password)
      return null

    const isValid = await comparePassword(password, user.password)
    if (!isValid)
      return null

    // 更新最后登录时间
    await updateUser(user.user_id, {
      last_login_at: new Date().toISOString(),
    })

    return user
  }
  catch (error: any) {
    console.error('❌ [SupabaseUserService] 验证密码失败:', error.message)
    return null
  }
}

/**
 * 更新用户信息
 */
export async function updateUser(userId: number, input: UpdateUserInput): Promise<SupabaseUser | null> {
  try {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (input.username !== undefined)
      updateData.username = input.username
    if (input.email !== undefined)
      updateData.email = input.email
    if (input.phone !== undefined)
      updateData.phone = input.phone
    if (input.status !== undefined)
      updateData.status = input.status
    if (input.avatar_url !== undefined)
      updateData.avatar_url = input.avatar_url
    if (input.last_login_at !== undefined)
      updateData.last_login_at = input.last_login_at
    if (input.department_id !== undefined)
      updateData.department_id = input.department_id

    // 如果更新密码，先加密
    if (input.password)
      updateData.password = await hashPassword(input.password)

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116')
        return null
      throw error
    }

    console.log(`✅ [SupabaseUserService] 用户更新成功: ${userId}`)
    return data
  }
  catch (error: any) {
    console.error('❌ [SupabaseUserService] 更新用户失败:', error.message)
    throw new Error(`更新用户失败: ${error.message}`)
  }
}

/**
 * 删除用户
 */
export async function deleteUser(userId: number): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('user_id', userId)

    if (error)
      throw error

    console.log(`✅ [SupabaseUserService] 用户删除成功: ${userId}`)
    return true
  }
  catch (error: any) {
    console.error('❌ [SupabaseUserService] 删除用户失败:', error.message)
    throw new Error(`删除用户失败: ${error.message}`)
  }
}

/**
 * 获取所有用户
 */
export async function getAllUsers(): Promise<SupabaseUser[]> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    if (error)
      throw error

    return data || []
  }
  catch (error: any) {
    console.error('❌ [SupabaseUserService] 获取用户列表失败:', error.message)
    throw new Error(`获取用户列表失败: ${error.message}`)
  }
}

/**
 * 创建或更新用户（用于 OAuth/Clerk 登录）
 */
export async function upsertUserFromOAuth(input: {
  clerk_id: string
  email: string
  username?: string
  avatar_url?: string
  provider: string
}): Promise<SupabaseUser> {
  try {
    // 先尝试查找用户
    let user = await findUserByClerkId(input.clerk_id)

    if (user) {
      // 更新现有用户
      const updated = await updateUser(user.user_id, {
        email: input.email,
        username: input.username,
        avatar_url: input.avatar_url,
        last_login_at: new Date().toISOString(),
      })
      return updated!
    }
    else {
      // 创建新用户
      user = await createUser({
        clerk_id: input.clerk_id,
        email: input.email,
        username: input.username || input.email.split('@')[0],
        avatar_url: input.avatar_url,
        provider: input.provider,
        login_method: input.provider,
      })
      return user
    }
  }
  catch (error: any) {
    console.error('❌ [SupabaseUserService] upsertUserFromOAuth 失败:', error.message)
    throw new Error(`OAuth 用户同步失败: ${error.message}`)
  }
}

