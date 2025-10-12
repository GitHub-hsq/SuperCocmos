import supabase from './db'
import { hashPassword, verifyPassword } from './password'
import { nanoid } from 'nanoid'

export interface User {
  user_id: number
  username?: string
  email?: string
  phone?: string
  password?: string
  status: number
  login_method: string
  created_at?: Date
  updated_at?: Date
  last_login_at?: Date
  department_id?: number
}

/**
 * 根据邮箱查找用户
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single()
    
    if (error && error.code !== 'PGRST116') {
      throw error
    }
    
    return data || null
  }
  catch (error: any) {
    console.error('❌ [用户服务] 查询用户失败:', error.message)
    throw error
  }
}

/**
 * 根据用户名查找用户
 */
export async function findUserByUsername(username: string): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single()
    
    if (error && error.code !== 'PGRST116') {
      throw error
    }
    
    return data || null
  }
  catch (error: any) {
    console.error('❌ [用户服务] 查询用户失败:', error.message)
    throw error
  }
}

/**
 * 根据ID查找用户
 */
export async function findUserById(id: number): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', id)
      .single()
    
    if (error && error.code !== 'PGRST116') {
      throw error
    }
    
    return data || null
  }
  catch (error: any) {
    console.error('❌ [用户服务] 查询用户失败:', error.message)
    throw error
  }
}

/**
 * 创建新用户
 */
export async function createUser(
  email: string, 
  password: string, 
  username?: string, 
  loginMethod: string = 'email',
  phone?: string
): Promise<User> {
  try {
    const hashedPassword = await hashPassword(password)

    const { data, error } = await supabase
      .from('users')
      .insert({
        email,
        password: hashedPassword,
        username: username || null,
        phone: phone || null,
        login_method: loginMethod,
        status: 1
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return data
  }
  catch (error: any) {
    console.error('❌ [用户服务] 创建用户失败:', error.message)
    throw error
  }
}

/**
 * 验证用户密码
 */
export async function validateUserPassword(email: string, password: string): Promise<User | null> {
  try {
    const user = await findUserByEmail(email)
    if (!user || !user.password)
      return null

    const isValid = await verifyPassword(user.password, password)
    if (!isValid)
      return null

    return user
  }
  catch (error: any) {
    console.error('❌ [用户服务] 验证密码失败:', error.message)
    throw error
  }
}

/**
 * 更新用户信息
 */
export async function updateUser(id: number, updates: Partial<User>): Promise<User | null> {
  try {
    const updateData: any = {}

    if (updates.username !== undefined) {
      updateData.username = updates.username
    }

    if (updates.email !== undefined) {
      updateData.email = updates.email
    }

    if (updates.phone !== undefined) {
      updateData.phone = updates.phone
    }

    if (updates.password !== undefined) {
      updateData.password = await hashPassword(updates.password)
    }

    if (updates.status !== undefined) {
      updateData.status = updates.status
    }

    if (updates.login_method !== undefined) {
      updateData.login_method = updates.login_method
    }

    if (updates.last_login_at !== undefined) {
      updateData.last_login_at = updates.last_login_at
    }

    if (updates.department_id !== undefined) {
      updateData.department_id = updates.department_id
    }

    if (Object.keys(updateData).length === 0)
      return await findUserById(id)

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('user_id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return data
  }
  catch (error: any) {
    console.error('❌ [用户服务] 更新用户失败:', error.message)
    throw error
  }
}

/**
 * 删除用户
 */
export async function deleteUser(id: number): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('user_id', id)

    if (error) {
      throw error
    }

    return true
  }
  catch (error: any) {
    console.error('❌ [用户服务] 删除用户失败:', error.message)
    throw error
  }
}

/**
 * 获取所有用户列表
 */
export async function getAllUsers(): Promise<User[]> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('user_id, username, email, phone, status, login_method, created_at, updated_at, last_login_at, department_id')
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return data || []
  }
  catch (error: any) {
    console.error('❌ [用户服务] 获取用户列表失败:', error.message)
    throw error
  }
}

/**
 * 根据手机号查找用户
 */
export async function findUserByPhone(phone: string): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('phone', phone)
      .single()
    
    if (error && error.code !== 'PGRST116') {
      throw error
    }
    
    return data || null
  }
  catch (error: any) {
    console.error('❌ [用户服务] 查询用户失败:', error.message)
    throw error
  }
}

/**
 * 根据登录方式查找用户
 */
export async function findUserByLoginMethod(identifier: string, loginMethod: string): Promise<User | null> {
  try {
    let query = supabase.from('users').select('*')
    
    switch (loginMethod) {
      case 'email':
        query = query.eq('email', identifier)
        break
      case 'phone':
        query = query.eq('phone', identifier)
        break
      case 'username':
        query = query.eq('username', identifier)
        break
      default:
        throw new Error(`不支持的登录方式: ${loginMethod}`)
    }
    
    const { data, error } = await query.single()
    
    if (error && error.code !== 'PGRST116') {
      throw error
    }
    
    return data || null
  }
  catch (error: any) {
    console.error('❌ [用户服务] 查询用户失败:', error.message)
    throw error
  }
}

/**
 * 更新用户最后登录时间
 */
export async function updateLastLoginTime(userId: number): Promise<void> {
  try {
    const { error } = await supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('user_id', userId)

    if (error) {
      throw error
    }
  }
  catch (error: any) {
    console.error('❌ [用户服务] 更新登录时间失败:', error.message)
    throw error
  }
}

