/* eslint-disable no-console */
/**
 * 📝 消息历史 Redis 缓存
 * - 缓存短期上下文（最近 10-20 条消息）
 * - 按用户或对话ID存储
 * - 自动过期（默认 1 小时）
 */

import type { Message } from '../db/messageService'
import { redis } from './redisClient'

const MESSAGE_CACHE_PREFIX = 'msg:'
const MESSAGE_CACHE_TTL = 3600 // 1小时过期

/**
 * 🔑 生成消息缓存 key
 */
function getMessageCacheKey(conversationId: string): string {
  return `${MESSAGE_CACHE_PREFIX}${conversationId}`
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
 * ➕ 添加新消息到缓存（追加到列表末尾）
 */
export async function appendMessageToCache(
  conversationId: string,
  message: Message,
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

    // 添加新消息
    messages.push(message)

    // 🔥 只保留最近 20 条消息
    const recentMessages = messages.slice(-20)

    // 写回缓存
    await redis.setex(key, MESSAGE_CACHE_TTL, JSON.stringify(recentMessages))
    console.log(`✅ [缓存] 追加消息: ${conversationId}, role: ${message.role}`)
    return true
  }
  catch (error) {
    console.error('❌ [缓存] 追加消息到缓存失败:', error)
    return false
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
      console.log('📚 [上下文] 缓存未命中，从数据库加载')
      const { getRecentMessages } = await import('../db/messageService')
      messages = await getRecentMessages(conversationId, limit * 2) // 多加载一些用于缓存

      // 写入缓存
      if (messages && messages.length > 0) {
        await setMessagesToCache(conversationId, messages)
      }
    }

    if (!messages || messages.length === 0) {
      console.log('⚠️ [上下文] 没有历史消息')
      return systemPrompt ? [{ role: 'system', content: systemPrompt }] : []
    }

    // 3. 只取最近的 limit 条
    const recentMessages = messages.slice(-limit)

    // 4. 转换为 ChatGPT 格式
    const chatMessages = recentMessages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }))

    // 5. 添加系统提示词（如果需要）
    if (systemPrompt) {
      const hasSystemMessage = chatMessages.some(msg => msg.role === 'system')
      if (!hasSystemMessage) {
        chatMessages.unshift({ role: 'system', content: systemPrompt })
      }
    }

    console.log(`📝 [上下文] 加载成功: ${chatMessages.length} 条消息`)
    return chatMessages
  }
  catch (error) {
    console.error('❌ [上下文] 获取对话上下文失败:', error)
    return systemPrompt ? [{ role: 'system', content: systemPrompt }] : []
  }
}

