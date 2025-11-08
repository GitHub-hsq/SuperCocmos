/**
 * 用户使用量服务
 * 查询用户 API 使用量配置和统计信息
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'

export interface UserUsageConfig {
  id: string
  user_id: string
  model_limits_enabled: boolean
  total_available: number
  total_granted: number
  created_at: string
  updated_at: string
}

export interface UserUsageStats {
  model_limits_enabled: boolean
  total_available: number
  total_granted: number
  total_used: number
  remaining: number
}

/**
 * 获取用户使用量配置
 */
export async function getUserUsageConfig(
  userId: string,
  client: SupabaseClient = supabase,
): Promise<UserUsageConfig | null> {
  try {
    const { data, error } = await client
      .from('user_usage_configs')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // 记录不存在，返回 null
        return null
      }
      throw error
    }

    return data
  }
  catch (error: any) {
    console.error('❌ [Usage] 获取用户使用量配置失败:', error.message)
    throw error
  }
}

/**
 * 获取用户使用量统计（包含已使用量）
 * 使用视图 user_usage_stats 查询
 */
export async function getUserUsageStats(
  userId: string,
  client: SupabaseClient = supabase,
): Promise<UserUsageStats | null> {
  try {
    // 使用视图查询
    const { data, error } = await client
      .from('user_usage_stats')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // 视图记录不存在，返回默认值
        return {
          model_limits_enabled: false,
          total_available: 0,
          total_granted: 0,
          total_used: 0,
          remaining: 0,
        }
      }
      throw error
    }

    return {
      model_limits_enabled: data.model_limits_enabled ?? false,
      total_available: data.total_available ?? 0,
      total_granted: data.total_granted ?? 0,
      total_used: data.total_used ?? 0,
      remaining: data.remaining ?? 0,
    }
  }
  catch (error: any) {
    console.error('❌ [Usage] 获取用户使用量统计失败:', error.message)
    // 如果视图不存在，降级使用手动查询
    try {
      const config = await getUserUsageConfig(userId, client)
      const { data: conversations } = await client
        .from('conversations')
        .select('total_tokens')
        .eq('user_id', userId)

      const totalUsed = conversations?.reduce((sum, c) => sum + (c.total_tokens || 0), 0) || 0
      const totalAvailable = config?.total_available || 0

      return {
        model_limits_enabled: config?.model_limits_enabled ?? false,
        total_available: totalAvailable,
        total_granted: config?.total_granted || 0,
        total_used: totalUsed,
        remaining: Math.max(0, totalAvailable - totalUsed),
      }
    }
    catch (fallbackError: any) {
      console.error('❌ [Usage] 降级查询也失败:', fallbackError.message)
      // 返回默认值
      return {
        model_limits_enabled: false,
        total_available: 0,
        total_granted: 0,
        total_used: 0,
        remaining: 0,
      }
    }
  }
}

/**
 * 创建或更新用户使用量配置
 */
export async function upsertUserUsageConfig(
  userId: string,
  config: {
    model_limits_enabled?: boolean
    total_available?: number
    total_granted?: number
  },
  client: SupabaseClient = supabase,
): Promise<UserUsageConfig> {
  try {
    const { data, error } = await client
      .from('user_usage_configs')
      .upsert({
        user_id: userId,
        ...config,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })
      .select()
      .single()

    if (error)
      throw error

    return data
  }
  catch (error: any) {
    console.error('❌ [Usage] 更新用户使用量配置失败:', error.message)
    throw error
  }
}
