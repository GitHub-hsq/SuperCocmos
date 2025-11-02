/**
 * 应用初始化服务
 * 提供统一的初始化接口，优化首次登录加载速度
 */

import type { User } from '@auth0/auth0-vue'
import { post } from '@/utils/request'

/**
 * 初始化响应数据接口
 */
export interface InitData {
  user: {
    id: string
    auth0Id: string
    username: string
    email: string
    phone?: string
    avatarUrl?: string
    provider?: string
    status: number
    role: string
    roles: string[]
    createdAt: string
    updatedAt: string
    lastLoginAt?: string
  }
  config: Config.UserConfig | null
  conversations: Array<{
    id: string
    frontend_uuid?: string
    title: string
    mode: string
    created_at: string
    updated_at: string
    message_count?: number
    last_message_at?: string
  }>
  performance: {
    userSync: string
    parallel: string
    total: string
  }
}

/**
 * 🔥 应用初始化接口（优化版）
 * POST /api/init
 *
 * 并行执行用户同步、配置加载、会话列表获取
 * 用于优化首次登录的加载速度
 *
 * @param user - Auth0 用户对象
 * @returns 包含用户信息、配置和会话列表的响应
 *
 * 🎯 性能优化：
 * - 3 个接口合并为 1 个接口
 * - 后端并行执行，减少总耗时
 * - 预期加载时间从 10-15 秒降至 2-5 秒
 */
export async function initializeApp(user: User) {
  return await post<InitData>({
    url: '/init',
    data: {
      auth0_id: user.sub,
      email: user.email,
      username: user.name || user.nickname || user.email?.split('@')[0],
      avatar_url: user.picture,
      email_verified: user.email_verified,
    },
  })
}
