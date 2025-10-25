/* eslint-disable no-console */
/**
 * Supabase 用户管理 Service
 * 提供用户的 CRUD 操作（基于 Supabase）
 */

import { hashPassword, verifyPassword } from '../utils/password'
import { supabase } from './supabaseClient'

export interface SupabaseUser {
  user_id: string // UUID
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
  clerk_id?: string
  provider?: string
  login_method?: string
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
 * 根据 Auth0 ID 查找用户
 */
export async function findUserByAuth0Id(auth0Id: string): Promise<SupabaseUser | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('clerk_id', auth0Id) // 复用 clerk_id 字段存储 auth0_id
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
 * 根据 Clerk ID 查找用户（已废弃，保留兼容性）
 * @deprecated 使用 findUserByAuth0Id 替代
 */
export async function findUserByClerkId(clerkId: string): Promise<SupabaseUser | null> {
  return findUserByAuth0Id(clerkId)
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
export async function findUserById(userId: string): Promise<SupabaseUser | null> {
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

    const isValid = await verifyPassword(user.password, password)
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
export async function updateUser(userId: string, input: UpdateUserInput): Promise<SupabaseUser | null> {
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
 * 删除用户（软删除）
 */
export async function deleteUser(userId: string): Promise<boolean> {
  try {
    // 软删除：将状态设置为0
    const { error } = await supabase
      .from('users')
      .update({ status: 0 })
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
 * 创建或更新用户（用于 Auth0 登录）
 */
export async function upsertUserFromAuth0(input: {
  auth0_id: string // Auth0 用户 ID (user.sub)
  email: string
  username?: string
  avatar_url?: string
  email_verified?: boolean
}): Promise<SupabaseUser> {
  try {
    // 1. 先通过 auth0_id (存储在 clerk_id 字段) 查找用户
    const { data: existingUser, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('clerk_id', input.auth0_id)
      .maybeSingle()

    if (findError && findError.code !== 'PGRST116') {
      throw findError
    }

    if (existingUser) {
      // 用户已存在，更新信息
      console.log(`📝 [Supabase] 更新 Auth0 用户: ${input.email}`)

      const { data, error } = await supabase
        .from('users')
        .update({
          email: input.email,
          username: input.username || existingUser.username,
          avatar_url: input.avatar_url || existingUser.avatar_url,
          status: 1, // 确保用户状态为激活
          last_login_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', existingUser.user_id)
        .select()
        .single()

      if (error)
        throw error

      return data
    }

    // 2. 通过 email 查找（可能是已存在的邮箱用户）
    const emailUser = await findUserByEmail(input.email)

    if (emailUser) {
      // 用户已存在，关联到 Auth0
      console.log(`🔗 [Supabase] 关联现有用户到 Auth0: ${input.email}`)

      const { data, error } = await supabase
        .from('users')
        .update({
          clerk_id: input.auth0_id, // 复用 clerk_id 字段存储 auth0_id
          username: input.username || emailUser.username,
          avatar_url: input.avatar_url || emailUser.avatar_url,
          provider: 'auth0',
          login_method: 'auth0',
          status: 1,
          last_login_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', emailUser.user_id)
        .select()
        .single()

      if (error)
        throw error

      return data
    }

    // 3. 用户不存在，创建新用户
    console.log(`➕ [Supabase] 创建新 Auth0 用户: ${input.email}`)

    // 生成唯一的用户名
    let username = input.username || input.email.split('@')[0]

    // 检查用户名是否已存在
    const existingUsername = await findUserByUsername(username)
    if (existingUsername) {
      const randomSuffix = Math.random().toString(36).substring(2, 8)
      username = `${username}_${randomSuffix}`
      console.log(`⚠️  [Supabase] 用户名已存在，使用新用户名: ${username}`)
    }

    const { data, error } = await supabase
      .from('users')
      .insert({
        clerk_id: input.auth0_id, // 复用 clerk_id 字段存储 auth0_id
        username,
        email: input.email,
        avatar_url: input.avatar_url,
        provider: 'auth0',
        login_method: 'auth0',
        status: 1,
        last_login_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error)
      throw error

    console.log(`✅ [Supabase] Auth0 用户创建成功: ${input.email}`)
    return data
  }
  catch (error: any) {
    console.error('❌ [Supabase] Auth0 用户同步失败:', error.message)
    throw new Error(`Auth0 用户同步失败: ${error.message}`)
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
    // 先通过 clerk_id 查找用户
    let user = await findUserByClerkId(input.clerk_id)

    if (user) {
      // 用户已存在，更新信息
      const wasDeleted = user.status === 0
      if (wasDeleted) {
        console.log(`🔄 [SupabaseUserService] 恢复已删除用户: ${input.email}`)
      }
      else {
        console.log(`📝 [SupabaseUserService] 更新现有用户: ${input.email}`)
      }

      const updated = await updateUser(user.user_id, {
        email: input.email,
        username: input.username,
        avatar_url: input.avatar_url,
        status: 1, // 确保用户状态为激活
        last_login_at: new Date().toISOString(),
      })
      return updated!
    }

    // 通过 email 查找用户（可能是已存在的邮箱注册用户）
    user = await findUserByEmail(input.email)

    if (user) {
      // 用户已存在，更新 clerk_id 和其他信息
      const wasDeleted = user.status === 0
      if (wasDeleted) {
        console.log(`🔄 [SupabaseUserService] 恢复已删除用户并关联到 Clerk: ${input.email}`)
      }
      else {
        console.log(`🔗 [SupabaseUserService] 关联现有用户到 Clerk: ${input.email}`)
      }

      const updated = await updateUser(user.user_id, {
        clerk_id: input.clerk_id,
        username: input.username || user.username,
        avatar_url: input.avatar_url || user.avatar_url,
        provider: input.provider,
        login_method: input.provider,
        status: 1, // 确保用户状态为激活
        last_login_at: new Date().toISOString(),
      })
      return updated!
    }

    // 用户不存在，创建新用户
    console.log(`➕ [SupabaseUserService] 创建新用户: ${input.email}`)

    // 生成唯一的用户名
    let username = input.username || input.email.split('@')[0]

    // 检查用户名是否已存在，如果存在则添加随机后缀
    const existingUser = await findUserByUsername(username)
    if (existingUser) {
      const randomSuffix = Math.random().toString(36).substring(2, 8)
      username = `${username}_${randomSuffix}`
      console.log(`⚠️  [SupabaseUserService] 用户名已存在，使用新用户名: ${username}`)
    }

    user = await createUser({
      clerk_id: input.clerk_id,
      email: input.email,
      username,
      avatar_url: input.avatar_url,
      provider: input.provider,
      login_method: input.provider,
    })

    return user
  }
  catch (error: any) {
    console.error('❌ [SupabaseUserService] upsertUserFromOAuth 失败:', error.message)
    throw new Error(`OAuth 用户同步失败: ${error.message}`)
  }
}
