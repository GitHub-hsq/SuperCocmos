/**
 * Auth0 Service
 * 处理 Auth0 用户同步到 Supabase
 */

import type { User } from '@auth0/auth0-vue'
import { request } from '../client'

export interface SyncAuth0UserResponse {
  success: boolean
  message: string
  data?: {
    user_id: string
    username: string
    email: string
    avatar_url?: string
    status: number
    created_at: string
    last_login_at: string
  }
  error?: string
}

/**
 * 同步 Auth0 用户到 Supabase
 * @param user Auth0 用户对象
 */
export async function syncAuth0UserToSupabase(user: User): Promise<SyncAuth0UserResponse> {
  try {
    const response = await request.post<SyncAuth0UserResponse>('/auth/sync-auth0-user', {
      auth0_id: user.sub, // Auth0 用户 ID
      email: user.email,
      username: user.name || user.nickname || user.email?.split('@')[0],
      avatar_url: user.picture,
      email_verified: user.email_verified,
    })

    return response.data
  }
  catch (error: any) {
    console.error('❌ [Auth0Service] 同步用户失败:', error)
    throw error
  }
}

/**
 * 根据 Auth0 ID 获取 Supabase 用户信息
 * @param auth0Id Auth0 用户 ID (user.sub)
 */
export async function getSupabaseUserByAuth0Id(auth0Id: string) {
  try {
    const response = await request.get(`/auth/user/${auth0Id}`)
    return response.data
  }
  catch (error: any) {
    console.error('❌ [Auth0Service] 获取用户失败:', error)
    throw error
  }
}

