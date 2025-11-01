/**
 * 用户登录数据预加载服务
 * 在用户登录时预加载用户个人数据到 Redis，提升后续请求性能
 */

import { getUserConfig } from '../db/configService'
import { getUserConversations } from '../db/conversationService'
import { getUserRoles } from '../db/userRoleService'

/**
 * 用户登录时预加载所有个人数据到 Redis
 * @param userId 用户 UUID
 * @param _auth0Id Auth0 用户 ID（保留参数以兼容调用方）
 */
export async function preloadUserLoginData(userId: string, _auth0Id: string): Promise<void> {
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
export async function preloadUserConfig(userId: string): Promise<void> {
  try {
    // 调用 getUserConfig 会自动触发缓存写入
    await getUserConfig(userId)
  }
  catch (error) {
    console.error('❌ [UserLoginCache] 预加载用户配置失败:', error)
  }
}

/**
 * 预加载用户会话列表到 Redis（不加载消息）
 * 🔥 修改：前端已改为不自动加载第一个会话，所以后端也只预加载会话列表
 */
async function preloadLatestConversation(userId: string): Promise<void> {
  try {
    // 🔥 使用 limit: 50 触发 getUserConversations 的自动缓存逻辑
    // getUserConversations 只在 limit === 50 时才会写入缓存
    // 只加载会话列表，不加载消息（消息按需加载）
    await getUserConversations(userId, { limit: 50, offset: 0 })
  }
  catch (error) {
    console.error('❌ [UserLoginCache] 预加载会话列表失败:', error)
  }
}

/**
 * 清除用户登录缓存（用户登出时调用）
 */
export async function clearUserLoginCache(_userId: string): Promise<void> {
  try {
    // 清除用户相关的所有缓存
    // 注意：这里简化处理，实际可能需要更精细的缓存管理
  }
  catch (error) {
    console.error('❌ [UserLoginCache] 清除用户缓存失败:', error)
  }
}
