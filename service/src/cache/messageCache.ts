/* eslint-disable no-console */
/**
 * 📝 消息历史 Redis 缓存
 * - 缓存短期上下文（最近 10-20 条消息）
 * - 按用户或对话ID存储
 * - 自动过期（默认 1 小时）
 */

import type { Message, MessageStatus } from '../db/messageService'
import { CONVERSATION_KEYS } from './cacheKeys'
import { redis } from './redisClient'

const MESSAGE_CACHE_TTL = 3600 // 1小时过期

/**
 * 🔑 生成消息缓存 key（使用统一的缓存键格式）
 */
function getMessageCacheKey(conversationId: string): string {
  return CONVERSATION_KEYS.messages(conversationId)
}

/**
 * 📥 从 Redis 获取对话的消息历史
 */
export async function getMessagesFromCache(
  conversationId: string,
): Promise<Message[] | null> {
  try {
    if (!redis) {
      console.warn('⚠️ [缓存] Redis 不可用，跳过缓存读取')
      return null
    }

    const key = getMessageCacheKey(conversationId)
    const cached = await redis.get(key)

    if (!cached) {
      console.log('❌ [缓存] 未命中:', conversationId)
      return null
    }

    const messages = JSON.parse(cached) as Message[]
    console.log(`✅ [缓存] 命中: ${conversationId}，消息数: ${messages.length}`)
    return messages
  }
  catch (error) {
    console.error('❌ [缓存] 读取消息缓存失败:', error)
    return null
  }
}

/**
 * 📤 将对话的消息历史存入 Redis
 */
export async function setMessagesToCache(
  conversationId: string,
  messages: Message[],
  ttl: number = MESSAGE_CACHE_TTL,
): Promise<boolean> {
  try {
    if (!redis) {
      console.warn('⚠️ [缓存] Redis 不可用，跳过缓存写入')
      return false
    }

    const key = getMessageCacheKey(conversationId)
    const value = JSON.stringify(messages)

    await redis.setex(key, ttl, value)
    console.log(`✅ [缓存] 写入: ${conversationId}，消息数: ${messages.length}`)
    return true
  }
  catch (error) {
    console.error('❌ [缓存] 写入消息缓存失败:', error)
    return false
  }
}

/**
 * ➕ 添加新消息到缓存（追加到列表末尾，状态为 pending）
 * 🔥 优化：先写 Redis，状态为 pending，后续异步确认
 */
export async function appendMessageToCache(
  conversationId: string,
  message: Message,
  status: MessageStatus = 'pending',
): Promise<boolean> {
  try {
    if (!redis) {
      console.warn('⚠️ [缓存] Redis 不可用，跳过缓存更新')
      return false
    }

    const key = getMessageCacheKey(conversationId)

    // 获取现有消息
    const cached = await redis.get(key)
    const messages: Message[] = cached ? JSON.parse(cached) : []

    // 添加新消息，设置状态和时间戳
    const messageWithStatus: Message = {
      ...message,
      status,
      timestamp: Date.now(),
    }
    messages.push(messageWithStatus)

    // 🔥 只保留最近 20 条消息
    const recentMessages = messages.slice(-20)

    // 写回缓存
    await redis.setex(key, MESSAGE_CACHE_TTL, JSON.stringify(recentMessages))
    console.log(`✅ [缓存] 追加消息: ${conversationId}, role: ${message.role}, status: ${status}`)
    return true
  }
  catch (error) {
    console.error('❌ [缓存] 追加消息到缓存失败:', error)
    return false
  }
}

/**
 * 🔄 更新 Redis 中消息的状态（用于数据库写入成功/失败后的确认）
 * @param conversationId 对话ID
 * @param messageId 消息ID
 * @param status 新状态
 */
export async function updateMessageStatusInCache(
  conversationId: string,
  messageId: string,
  status: MessageStatus,
): Promise<boolean> {
  try {
    if (!redis) {
      console.warn('⚠️ [缓存] Redis 不可用，跳过状态更新')
      return false
    }

    const key = getMessageCacheKey(conversationId)
    const cached = await redis.get(key)

    if (!cached) {
      console.warn(`⚠️ [缓存] 未找到缓存: ${conversationId}`)
      return false
    }

    const messages: Message[] = JSON.parse(cached)

    // 查找并更新消息状态
    let found = false
    for (let i = 0; i < messages.length; i++) {
      if (messages[i].id === messageId) {
        messages[i].status = status
        found = true
        break
      }
    }

    if (!found) {
      console.warn(`⚠️ [缓存] 未找到消息: ${messageId}`)
      return false
    }

    // 写回缓存
    await redis.setex(key, MESSAGE_CACHE_TTL, JSON.stringify(messages))
    console.log(`✅ [缓存] 更新消息状态: ${messageId}, status: ${status}`)
    return true
  }
  catch (error) {
    console.error('❌ [缓存] 更新消息状态失败:', error)
    return false
  }
}

/**
 * 🔍 获取 pending 状态的消息（用于重试机制）
 * @param conversationId 对话ID
 * @returns pending 状态的消息列表
 */
export async function getPendingMessagesFromCache(
  conversationId: string,
): Promise<Message[]> {
  try {
    const messages = await getMessagesFromCache(conversationId)
    if (!messages) {
      return []
    }

    return messages.filter(msg => msg.status === 'pending')
  }
  catch (error) {
    console.error('❌ [缓存] 获取 pending 消息失败:', error)
    return []
  }
}

/**
 * 🗑️ 清除对话的消息缓存
 */
export async function clearMessagesCache(conversationId: string): Promise<boolean> {
  try {
    if (!redis) {
      console.warn('⚠️ [缓存] Redis 不可用，跳过缓存清除')
      return false
    }

    const key = getMessageCacheKey(conversationId)
    await redis.del(key)
    console.log(`✅ [缓存] 清除: ${conversationId}`)
    return true
  }
  catch (error) {
    console.error('❌ [缓存] 清除消息缓存失败:', error)
    return false
  }
}

/**
 * 🔄 刷新缓存过期时间
 */
export async function refreshMessagesCacheTTL(
  conversationId: string,
  ttl: number = MESSAGE_CACHE_TTL,
): Promise<boolean> {
  try {
    if (!redis) {
      return false
    }

    const key = getMessageCacheKey(conversationId)
    await redis.expire(key, ttl)
    return true
  }
  catch (error) {
    console.error('❌ [缓存] 刷新缓存TTL失败:', error)
    return false
  }
}

/**
 * 📊 获取缓存中的消息数量
 */
export async function getCachedMessageCount(conversationId: string): Promise<number> {
  try {
    const messages = await getMessagesFromCache(conversationId)
    return messages ? messages.length : 0
  }
  catch (error) {
    console.error('❌ [缓存] 获取消息数量失败:', error)
    return 0
  }
}

/**
 * 🎯 获取对话上下文（优先从缓存，降级到数据库）
 * @param conversationId 对话ID
 * @param limit 最多返回的消息数
 * @param systemPrompt 系统提示词
 * @returns ChatGPT 格式的消息列表
 * 🔥 优化：过滤掉 failed 状态的消息，pending 状态的消息正常显示（已写入 Redis）
 */
export async function getConversationContextWithCache(
  conversationId: string,
  limit: number = 10,
  systemPrompt?: string,
): Promise<Array<{ role: string, content: string }>> {
  try {
    // 1. 尝试从缓存读取
    let messages = await getMessagesFromCache(conversationId)

    // 2. 如果缓存未命中，从数据库加载
    if (!messages) {
      const { getRecentMessages } = await import('../db/messageService')
      messages = await getRecentMessages(conversationId, limit * 2) // 多加载一些用于缓存

      // 写入缓存
      if (messages && messages.length > 0) {
        await setMessagesToCache(conversationId, messages)
      }
    }

    if (!messages || messages.length === 0) {
      return systemPrompt ? [{ role: 'system', content: systemPrompt }] : []
    }

    // 3. 🔥 过滤掉 failed 状态的消息（保留 pending 和 saved）
    const validMessages = messages.filter(msg => msg.status !== 'failed')

    // 4. 只取最近的 limit 条
    const recentMessages = validMessages.slice(-limit)

    // 5. 转换为 ChatGPT 格式
    const chatMessages = recentMessages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }))

    // 6. 添加系统提示词（如果需要）
    if (systemPrompt) {
      const hasSystemMessage = chatMessages.some(msg => msg.role === 'system')
      if (!hasSystemMessage) {
        chatMessages.unshift({ role: 'system', content: systemPrompt })
      }
    }

    // ✅ 统一的日志输出
    const pendingCount = validMessages.filter(m => m.status === 'pending').length
    if (pendingCount > 0) {
      console.log(`📚 [上下文] 从缓存/数据库加载: ${chatMessages.length} 条（包含 ${pendingCount} 条 pending）`)
    }
    else {
      console.log(`📚 [上下文] 从缓存/数据库加载: ${chatMessages.length} 条`)
    }
    return chatMessages
  }
  catch (error) {
    console.error('❌ [上下文] 获取对话上下文失败:', error)
    return systemPrompt ? [{ role: 'system', content: systemPrompt }] : []
  }
}
