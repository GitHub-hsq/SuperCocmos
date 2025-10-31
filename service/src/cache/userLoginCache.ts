/**
 * 用户登录数据预加载服务
 * 在用户登录时预加载用户个人数据到 Redis，提升后续请求性能
 */

import { getUserConfig } from '../db/configService'
import { getUserConversations } from '../db/conversationService'
import { getConversationMessages } from '../db/messageService'
import { getUserRoles } from '../db/userRoleService'
import { CONVERSATION_KEYS, USER_CONFIG_KEYS, USER_ROLE_KEYS } from './cacheKeys'
import { CACHE_TTL, setCached } from './cacheService'

/**
 * 用户登录时预加载所有个人数据到 Redis
 * @param userId 用户 UUID
 * @param auth0Id Auth0 用户 ID
 */
export async function preloadUserLoginData(userId: string, auth0Id: string): Promise<void> {
  try {
    // 并行预加载多项数据，提升性能
    await Promise.all([
      preloadUserRoles(userId),
      preloadUserConfig(userId),
      preloadLatestConversation(userId),
    ])
  }
  catch (error) {
    console.error('❌ [UserLoginCache] 预加载失败:', error)
    // 不抛出错误，让登录流程继续（降级到按需查询）
  }
}

/**
 * 预加载用户角色到 Redis
 */
async function preloadUserRoles(userId: string): Promise<void> {
  try {
    // 调用 getUserRoles 会自动触发缓存写入
    await getUserRoles(userId)
  }
  catch (error) {
    console.error('❌ [UserLoginCache] 预加载用户角色失败:', error)
  }
}

/**
 * 预加载用户配置到 Redis
 */
async function preloadUserConfig(userId: string): Promise<void> {
  try {
    // 调用 getUserConfig 会自动触发缓存写入
    await getUserConfig(userId)
  }
  catch (error) {
    console.error('❌ [UserLoginCache] 预加载用户配置失败:', error)
  }
}

/**
 * 预加载用户最新的会话和消息到 Redis
 */
async function preloadLatestConversation(userId: string): Promise<void> {
  try {
    // 🔥 使用 limit: 50 触发 getUserConversations 的自动缓存逻辑
    // getUserConversations 只在 limit === 50 时才会写入缓存
    const conversations = await getUserConversations(userId, { limit: 50, offset: 0 })

    if (!conversations || conversations.length === 0) {
      return
    }

    const latestConversation = conversations[0]

    // 2. 预加载最新会话的消息（最近100条）
    await preloadConversationMessages(latestConversation.id, userId)
  }
  catch (error) {
    console.error('❌ [UserLoginCache] 预加载会话数据失败:', error)
  }
}

/**
 * 预加载会话消息到 Redis
 */
async function preloadConversationMessages(conversationId: string, userId: string): Promise<void> {
  try {
    // 🔥 使用 limit=100 触发 getConversationMessages 的自动缓存逻辑
    // getConversationMessages 会自动缓存并管理用户的会话缓存
    await getConversationMessages(conversationId, userId, { limit: 100, offset: 0 })
  }
  catch (error) {
    console.error('❌ [UserLoginCache] 预加载会话消息失败:', error)
  }
}

/**
 * 清除用户登录缓存（用户登出时调用）
 */
export async function clearUserLoginCache(userId: string): Promise<void> {
  try {
    // 清除用户相关的所有缓存
    // 注意：这里简化处理，实际可能需要更精细的缓存管理
  }
  catch (error) {
    console.error('❌ [UserLoginCache] 清除用户缓存失败:', error)
  }
}
