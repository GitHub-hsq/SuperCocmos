import type { SupabaseClient } from '@supabase/supabase-js'
import { CONVERSATION_KEYS } from '../cache/cacheKeys'
import { CACHE_TTL, deleteCached, getCached, setCached } from '../cache/cacheService'
import { redis } from '../cache/redisClient.auto'
import { logger } from '../utils/logger'
import { supabase } from './supabaseClient'

// 🔥 消息状态类型
export type MessageStatus = 'pending' | 'saved' | 'failed'

// 🔥 消息类型定义
export interface Message {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  tokens: number
  model_info?: Record<string, any>
  created_at: string
  status?: MessageStatus // 🔥 消息状态（仅在 Redis 缓存中使用，数据库不存储）
  timestamp?: number // 🔥 时间戳（用于 Redis 缓存）
}

export interface CreateMessageParams {
  conversation_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  tokens?: number
  model_info?: Record<string, any>
}

/**
 * 🚀 创建新消息
 * 🔥 注意：此函数不再清除缓存，因为现在使用两阶段写入方案
 * 缓存会在消息状态更新时自动刷新
 */
export async function createMessage(
  params: CreateMessageParams,
  client: SupabaseClient = supabase,
): Promise<Message | null> {
  try {
    const { data, error } = await client
      .from('messages')
      .insert([
        {
          conversation_id: params.conversation_id,
          role: params.role,
          content: params.content,
          tokens: params.tokens || 0,
          model_info: params.model_info || null,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error('❌ [Message] 创建消息失败:', error)
      return null
    }

    // 🔥 不再清除缓存，因为现在使用两阶段写入方案
    // 缓存会在消息状态更新时自动刷新（updateMessageStatusInCache）
    // 清除缓存会导致状态更新时找不到缓存

    logger.debug(`✅ [Message] 创建消息成功: ${params.role} - ${params.content.substring(0, 50)}...`)
    return data as Message
  }
  catch (error) {
    console.error('❌ [Message] 创建消息异常:', error)
    return null
  }
}

/**
 * 📋 批量创建消息
 * 🔥 注意：此函数不再清除缓存，因为现在使用两阶段写入方案
 */
export async function createMessages(
  messages: CreateMessageParams[],
  client: SupabaseClient = supabase,
): Promise<Message[]> {
  try {
    const { data, error } = await client
      .from('messages')
      .insert(
        messages.map(msg => ({
          conversation_id: msg.conversation_id,
          role: msg.role,
          content: msg.content,
          tokens: msg.tokens || 0,
          model_info: msg.model_info || null,
        })),
      )
      .select()

    if (error) {
      console.error('❌ [Message] 批量创建消息失败:', error)
      return []
    }

    // 🔥 不再清除缓存，因为现在使用两阶段写入方案
    // 缓存会在消息状态更新时自动刷新

    logger.debug(`✅ [Message] 批量创建 ${messages.length} 条消息成功`)
    return (data || []) as Message[]
  }
  catch (error) {
    console.error('❌ [Message] 批量创建消息异常:', error)
    return []
  }
}

/**
 * 🔧 管理用户的会话消息缓存（只保留最新1个）
 * 策略：每个用户只缓存当前使用的1个会话，节省内存
 * @param userId 用户ID（Auth0 ID）
 * @param conversationId 会话ID
 */
async function manageCachedConversations(userId: string, conversationId: string): Promise<void> {
  const currentCachedKey = CONVERSATION_KEYS.userCurrentCached(userId)

  try {
    // 1. 获取用户当前缓存的会话ID
    const currentCachedConvId = await redis.get(currentCachedKey)

    // 2. 如果有旧缓存且不是当前会话，清除旧会话的消息缓存
    if (currentCachedConvId && currentCachedConvId !== conversationId) {
      const oldCacheKey = CONVERSATION_KEYS.messages(currentCachedConvId)
      await deleteCached(oldCacheKey)
      console.warn(`🧹 [MessageCache] 清除旧缓存: ${currentCachedConvId.substring(0, 8)}...`)
    }

    // 3. 更新为新会话ID
    await redis.set(currentCachedKey, conversationId, 'EX', CACHE_TTL.USER_SESSION)
    logger.debug(`💾 [MessageCache] 当前缓存: ${conversationId.substring(0, 8)}...`)
  }
  catch (error) {
    console.error('❌ [MessageCache] 缓存管理失败:', error)
  }
}

/**
 * 🔍 获取对话的所有消息（按时间排序）+ Redis 缓存
 * 缓存策略：每用户只缓存1个最新会话，节省内存，适合免费数据库场景
 * @param conversationId 会话ID
 * @param userId 用户ID（用于缓存管理）
 * @param options 分页选项
 * @param options.limit 分页限制
 * @param options.offset 分页偏移量
 * @param client Supabase 客户端
 */
export async function getConversationMessages(
  conversationId: string,
  userId?: string,
  options: { limit?: number, offset?: number } = {},
  client: SupabaseClient = supabase,
): Promise<Message[]> {
  try {
    const { limit = 100, offset = 0 } = options
    // 🔥 只缓存完整的消息列表（不分页）
    const shouldCache = offset === 0 && limit === 100

    // 1. 尝试从缓存获取
    if (shouldCache) {
      const cacheKey = CONVERSATION_KEYS.messages(conversationId)
      console.warn(`🔍 [MessageCache] 尝试从缓存获取: ${conversationId}`)
      const startCache = Date.now()
      const cached = await getCached<Message[]>(cacheKey)
      const cacheTime = Date.now() - startCache

      if (cached) {
        logger.debug(`✅ [MessageCache] 缓存命中! 返回 ${cached.length} 条消息，耗时: ${cacheTime}ms`)
        logger.debug(`📊 [MessageCache] 缓存的消息ID: ${cached.map(m => m.id.substring(0, 8)).join(', ')}`)
        logger.debug(`📊 [MessageCache] 缓存消息状态分布: ${cached.filter(m => m.status === 'pending').length} pending, ${cached.filter(m => m.status === 'saved').length} saved, ${cached.filter(m => m.status === 'failed').length} failed, ${cached.filter(m => !m.status).length} 无状态`)

        // 🔥 性能优化：移除缓存完整性检查，避免额外的 count 查询
        // 如果需要验证缓存，应该在写入时就确保正确性，而不是在读取时验证
        // 过滤掉 failed 状态的消息（但保留 pending 和 saved）
        const validMessages = cached.filter(msg => msg.status !== 'failed')
        const failedCount = cached.length - validMessages.length
        if (failedCount > 0) {
          logger.debug(`📊 [MessageCache] 过滤掉 ${failedCount} 条 failed 状态的消息`)
        }
        logger.debug(`📊 [MessageCache] 过滤后返回 ${validMessages.length} 条有效消息`)
        logger.debug(`📊 [MessageCache] 有效消息ID: ${validMessages.map(m => m.id.substring(0, 8)).join(', ')}`)
        return validMessages
      }
      console.warn(`❌ [MessageCache] 缓存未命中，查询数据库...`)
    }

    // 2. 从数据库查询
    logger.debug(`📊 [MessageCache] 从数据库查询消息...`)
    const startDb = Date.now()
    const { data, error } = await client
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1)

    const dbTime = Date.now() - startDb

    if (error) {
      console.error('❌ [Message] 获取对话消息失败:', error)
      return []
    }

    const messages = (data || []) as Message[]
    logger.debug(`✅ [MessageCache] 数据库查询完成，返回 ${messages.length} 条消息，耗时: ${dbTime}ms`)
    logger.debug(`📊 [MessageCache] 数据库消息ID: ${messages.map(m => m.id.substring(0, 8)).join(', ')}`)

    // 🔥 合并缓存中的 pending 消息（如果存在）
    // 这样可以确保即使消息还在 pending 状态（未写入数据库），也能被返回
    if (shouldCache) {
      const cacheKey = CONVERSATION_KEYS.messages(conversationId)
      const cached = await getCached<Message[]>(cacheKey)
      if (cached && cached.length > 0) {
        logger.debug(`📊 [MessageCache] 缓存中共有 ${cached.length} 条消息`)
        logger.debug(`📊 [MessageCache] 缓存消息状态分布: ${cached.filter(m => m.status === 'pending').length} pending, ${cached.filter(m => m.status === 'saved').length} saved, ${cached.filter(m => m.status === 'failed').length} failed, ${cached.filter(m => !m.status).length} 无状态`)

        // 获取 pending 状态的消息（这些消息可能还没写入数据库）
        const pendingMessages = cached.filter(msg => msg.status === 'pending')
        if (pendingMessages.length > 0) {
          logger.debug(`📝 [MessageCache] 发现 ${pendingMessages.length} 条 pending 消息，合并到结果中`)
          logger.debug(`📊 [MessageCache] pending 消息ID: ${pendingMessages.map(m => m.id.substring(0, 8)).join(', ')}`)

          // 合并消息，按 created_at 排序，去重（优先保留数据库中的消息）
          const messageMap = new Map<string, Message>()
          // 先添加数据库消息
          messages.forEach(msg => messageMap.set(msg.id, msg))
          logger.debug(`📊 [MessageCache] 数据库消息添加到 Map，当前 Map 大小: ${messageMap.size}`)

          // 再添加 pending 消息（如果不存在）
          let addedPendingCount = 0
          pendingMessages.forEach((msg) => {
            if (!messageMap.has(msg.id)) {
              messageMap.set(msg.id, msg)
              addedPendingCount++
            }
            else {
              console.warn(`⚠️ [MessageCache] pending 消息 ${msg.id.substring(0, 8)} 已存在于数据库中，跳过合并`)
            }
          })
          logger.debug(`📊 [MessageCache] 添加了 ${addedPendingCount} 条 pending 消息到 Map，当前 Map 大小: ${messageMap.size}`)

          // 转换为数组并按时间排序
          const mergedMessages = Array.from(messageMap.values()).sort((a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
          )
          logger.debug(`✅ [MessageCache] 合并后共 ${mergedMessages.length} 条消息（数据库: ${messages.length} 条，新增 pending: ${addedPendingCount} 条）`)
          logger.debug(`📊 [MessageCache] 合并后消息ID: ${mergedMessages.map(m => m.id.substring(0, 8)).join(', ')}`)

          // 更新缓存为合并后的消息
          await setCached(cacheKey, mergedMessages, CACHE_TTL.USER_SESSION)
          return mergedMessages
        }
      }
    }

    // 3. 保存到缓存并更新用户当前缓存的会话
    if (shouldCache && messages.length > 0 && userId) {
      const cacheKey = CONVERSATION_KEYS.messages(conversationId)
      // 🔥 从数据库查询的消息没有 status 字段，直接缓存
      await setCached(cacheKey, messages, CACHE_TTL.USER_SESSION) // 24小时

      // 管理用户的缓存会话（替换旧的）
      await manageCachedConversations(userId, conversationId)
    }

    logger.debug(`📊 [MessageCache] 最终返回 ${messages.length} 条消息`)
    return messages
  }
  catch (error) {
    console.error('❌ [Message] 获取对话消息异常:', error)
    return []
  }
}

/**
 * 📝 获取对话的最近N条消息
 */
export async function getRecentMessages(
  conversationId: string,
  limit: number = 10,
  client: SupabaseClient = supabase,
): Promise<Message[]> {
  try {
    const { data, error } = await client
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('❌ [Message] 获取最近消息失败:', error)
      return []
    }

    // 反转顺序，使其按时间正序排列
    return ((data || []) as Message[]).reverse()
  }
  catch (error) {
    console.error('❌ [Message] 获取最近消息异常:', error)
    return []
  }
}

/**
 * 🗑️ 删除消息
 */
export async function deleteMessage(
  messageId: string,
  client: SupabaseClient = supabase,
): Promise<boolean> {
  try {
    const { error } = await client.from('messages').delete().eq('id', messageId)

    if (error) {
      console.error('❌ [Message] 删除消息失败:', error)
      return false
    }

    logger.debug('✅ [Message] 删除消息成功:', messageId)
    return true
  }
  catch (error) {
    console.error('❌ [Message] 删除消息异常:', error)
    return false
  }
}

/**
 * 🗑️ 删除对话的所有消息
 */
export async function deleteConversationMessages(
  conversationId: string,
  client: SupabaseClient = supabase,
): Promise<boolean> {
  try {
    const { error } = await client
      .from('messages')
      .delete()
      .eq('conversation_id', conversationId)

    if (error) {
      console.error('❌ [Message] 删除对话消息失败:', error)
      return false
    }

    // 🔥 清除该会话的消息缓存
    const cacheKey = CONVERSATION_KEYS.messages(conversationId)
    await deleteCached(cacheKey)
    console.warn(`🧹 [MessageCache] 已清除缓存: ${conversationId}`)

    logger.debug('✅ [Message] 删除对话消息成功:', conversationId)
    return true
  }
  catch (error) {
    console.error('❌ [Message] 删除对话消息异常:', error)
    return false
  }
}

/**
 * 📊 计算消息的 token 数量（简单估算）
 * 实际项目中应该使用 tiktoken 或其他专业库
 */
export function estimateTokens(text: string): number {
  // 简单估算：中文1个字=1.5 tokens，英文1个单词=1.3 tokens
  const chineseChars = (text.match(/[\u4E00-\u9FA5]/g) || []).length
  const englishWords = (text.match(/[a-z]+/gi) || []).length

  return Math.ceil(chineseChars * 1.5 + englishWords * 1.3)
}

/**
 * 🔄 将消息列表转换为 ChatGPT API 格式
 */
export function messagesToChatFormat(
  messages: Message[],
): Array<{ role: string, content: string }> {
  return messages.map(msg => ({
    role: msg.role,
    content: msg.content,
  }))
}

/**
 * 📦 获取对话的上下文（最近N条 + 系统消息）
 */
export async function getConversationContext(
  conversationId: string,
  limit: number = 10,
  systemPrompt?: string,
  client: SupabaseClient = supabase,
): Promise<Array<{ role: string, content: string }>> {
  try {
    const messages = await getRecentMessages(conversationId, limit, client)
    const chatMessages = messagesToChatFormat(messages)

    // 如果有系统提示词，添加到开头
    if (systemPrompt) {
      // 检查是否已经有 system 消息
      const hasSystemMessage = chatMessages.some(msg => msg.role === 'system')
      if (!hasSystemMessage) {
        chatMessages.unshift({ role: 'system', content: systemPrompt })
      }
    }

    return chatMessages
  }
  catch (error) {
    console.error('❌ [Message] 获取对话上下文失败:', error)
    return []
  }
}
