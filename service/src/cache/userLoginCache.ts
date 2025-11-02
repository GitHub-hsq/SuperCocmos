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
 * @param userId Supabase UUID
 * @param auth0Id Auth0 ID（可选，用于清除 Auth0 ID 相关的缓存）
 */
export async function clearUserLoginCache(userId: string, auth0Id?: string): Promise<void> {
  try {
    const { deleteCached } = await import('./cacheService')
    const { USER_CONFIG_KEYS, USER_ROLE_KEYS, CONVERSATION_KEYS, USER_INFO_KEYS } = await import('./cacheKeys')
    const { redis } = await import('./redisClient.auto')

    if (!redis) {
      console.warn('⚠️ [UserLoginCache] Redis 不可用，跳过清除缓存')
      return
    }

    let clearedCount = 0

    // 1. 清除用户配置缓存（user:config:${userId}*）
    const configPattern = USER_CONFIG_KEYS.pattern(userId)
    const configKeys = await redis.keys(configPattern)
    if (configKeys.length > 0) {
      await redis.del(...configKeys)
      clearedCount += configKeys.length
      console.warn(`✅ [UserLoginCache] 已清除 ${configKeys.length} 个用户配置缓存`)
    }

    // 2. 清除用户角色缓存（user:${userId}:role*）
    const rolePattern = USER_ROLE_KEYS.pattern(userId)
    const roleKeys = await redis.keys(rolePattern)
    if (roleKeys.length > 0) {
      await redis.del(...roleKeys)
      clearedCount += roleKeys.length
      console.warn(`✅ [UserLoginCache] 已清除 ${roleKeys.length} 个用户角色缓存`)
    }

    // 3. 清除用户会话列表缓存（使用 UUID）
    const conversationsKey = CONVERSATION_KEYS.userConversations(userId)
    await deleteCached(conversationsKey)
    clearedCount++
    console.warn(`✅ [UserLoginCache] 已清除用户会话列表缓存`)

    // 3.1. 如果提供了 Auth0 ID，也清除 Auth0 ID 相关的会话列表缓存
    if (auth0Id) {
      const auth0ConversationsKey = CONVERSATION_KEYS.userConversations(auth0Id)
      await deleteCached(auth0ConversationsKey)
      clearedCount++
      console.warn(`✅ [UserLoginCache] 已清除 Auth0 ID 会话列表缓存`)
    }

    // 4. 清除用户当前缓存的会话ID（使用 UUID）
    const currentCachedKey = CONVERSATION_KEYS.userCurrentCached(userId)
    await deleteCached(currentCachedKey)
    clearedCount++

    // 4.1. 如果提供了 Auth0 ID，也清除 Auth0 ID 相关的当前缓存会话
    if (auth0Id) {
      const auth0CurrentCachedKey = CONVERSATION_KEYS.userCurrentCached(auth0Id)
      await deleteCached(auth0CurrentCachedKey)
      clearedCount++
    }

    // 5. 清除会话权限验证缓存（conversation:auth:*:${userId}）
    const authPattern = `conversation:auth:*:${userId}`
    const authKeys = await redis.keys(authPattern)
    if (authKeys.length > 0) {
      await redis.del(...authKeys)
      clearedCount += authKeys.length
      console.warn(`✅ [UserLoginCache] 已清除 ${authKeys.length} 个会话权限验证缓存`)
    }

    // 5.1. 如果提供了 Auth0 ID，也清除 Auth0 ID 相关的权限验证缓存
    if (auth0Id) {
      const auth0AuthPattern = `conversation:auth:*:${auth0Id}`
      const auth0AuthKeys = await redis.keys(auth0AuthPattern)
      if (auth0AuthKeys.length > 0) {
        await redis.del(...auth0AuthKeys)
        clearedCount += auth0AuthKeys.length
        console.warn(`✅ [UserLoginCache] 已清除 ${auth0AuthKeys.length} 个 Auth0 ID 会话权限验证缓存`)
      }
    }

    // 6. 清除用户的所有会话消息缓存
    // 6.1. 清除 UUID 的当前缓存会话
    const uuidCurrentCachedKey = CONVERSATION_KEYS.userCurrentCached(userId)
    const uuidCurrentCachedConvId = await redis.get(uuidCurrentCachedKey)
    if (uuidCurrentCachedConvId) {
      const uuidMessagesKey = CONVERSATION_KEYS.messages(uuidCurrentCachedConvId)
      await deleteCached(uuidMessagesKey)
      await redis.del(uuidCurrentCachedKey)
      clearedCount += 2
      console.warn(`✅ [UserLoginCache] 已清除 UUID 会话消息缓存: ${uuidCurrentCachedConvId.substring(0, 8)}...`)
    }

    // 6.2. 清除 Auth0 ID 的当前缓存会话（如果提供了）
    if (auth0Id) {
      const auth0CurrentCachedKey = CONVERSATION_KEYS.userCurrentCached(auth0Id)
      const auth0CurrentCachedConvId = await redis.get(auth0CurrentCachedKey)
      if (auth0CurrentCachedConvId) {
        const auth0MessagesKey = CONVERSATION_KEYS.messages(auth0CurrentCachedConvId)
        await deleteCached(auth0MessagesKey)
        await redis.del(auth0CurrentCachedKey)
        clearedCount += 2
        console.warn(`✅ [UserLoginCache] 已清除 Auth0 ID 会话消息缓存: ${auth0CurrentCachedConvId.substring(0, 8)}...`)
      }
    }

    // 6.3. 获取用户的所有会话，清除所有会话的消息缓存（防止遗漏）
    try {
      const conversations = await getUserConversations(userId, { limit: 100, offset: 0 })
      if (conversations && conversations.length > 0) {
        let messagesCleared = 0
        for (const conv of conversations) {
          const messagesKey = CONVERSATION_KEYS.messages(conv.id)
          const exists = await redis.exists(messagesKey)
          if (exists) {
            await deleteCached(messagesKey)
            messagesCleared++
          }
        }
        if (messagesCleared > 0) {
          clearedCount += messagesCleared
          console.warn(`✅ [UserLoginCache] 已清除 ${messagesCleared} 个会话的消息缓存`)
        }
      }
    }
    catch (convError: any) {
      // 获取会话列表失败不影响退出登录流程
      console.warn(`⚠️ [UserLoginCache] 获取会话列表失败，跳过清除会话消息缓存: ${convError.message}`)
    }

    // 7. 清除用户信息缓存
    // 7.1. UUID 缓存
    const uuidInfoKey = USER_INFO_KEYS.byUserId(userId)
    await deleteCached(uuidInfoKey)
    clearedCount++

    // 7.2. Auth0 ID 缓存（如果提供了）
    if (auth0Id) {
      const auth0InfoKey = USER_INFO_KEYS.byAuth0Id(auth0Id)
      await deleteCached(auth0InfoKey)
      clearedCount++
    }

    console.warn(`✅ [UserLoginCache] 已清除用户 ${userId}${auth0Id ? ` (Auth0: ${auth0Id})` : ''} 的所有缓存，共清除 ${clearedCount} 个缓存键`)
  }
  catch (error) {
    console.error('❌ [UserLoginCache] 清除用户缓存失败:', error)
    // 不抛出错误，避免影响退出登录流程
  }
}
