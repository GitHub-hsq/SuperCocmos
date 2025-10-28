/* eslint-disable no-console */
import type { SupabaseClient } from '@supabase/supabase-js'
import { CONVERSATION_KEYS } from '../cache/cacheKeys'
import { CACHE_TTL, deleteCached, getCached, setCached } from '../cache/cacheService'
import { redis } from '../cache/redisClient'
import { supabase } from './supabaseClient'

// 🔥 消息类型定义
export interface Message {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  tokens: number
  model_info?: Record<string, any>
  created_at: string
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

    // 🔥 清除该会话的消息缓存（因为有新消息）
    const cacheKey = CONVERSATION_KEYS.messages(params.conversation_id)
    await deleteCached(cacheKey)
    console.log(`🧹 [MessageCache] 已清除缓存: ${params.conversation_id}`)

    console.log(`✅ [Message] 创建消息成功: ${params.role} - ${params.content.substring(0, 50)}...`)
    return data as Message
  }
  catch (error) {
    console.error('❌ [Message] 创建消息异常:', error)
    return null
  }
}

/**
 * 📋 批量创建消息
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

    // 🔥 清除所有涉及会话的消息缓存
    const conversationIds = new Set(messages.map(msg => msg.conversation_id))
    for (const convId of conversationIds) {
      const cacheKey = CONVERSATION_KEYS.messages(convId)
      await deleteCached(cacheKey)
      console.log(`🧹 [MessageCache] 已清除缓存: ${convId}`)
    }

    console.log(`✅ [Message] 批量创建 ${messages.length} 条消息成功`)
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
      console.log(`🧹 [MessageCache] 清除旧缓存: ${currentCachedConvId.substring(0, 8)}...`)
    }

    // 3. 更新为新会话ID
    await redis.set(currentCachedKey, conversationId, 'EX', CACHE_TTL.USER_SESSION)
    console.log(`💾 [MessageCache] 当前缓存: ${conversationId.substring(0, 8)}...`)
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
      console.log(`🔍 [MessageCache] 尝试从缓存获取: ${conversationId}`)
      const startCache = Date.now()
      const cached = await getCached<Message[]>(cacheKey)
      const cacheTime = Date.now() - startCache

      if (cached) {
        console.log(`✅ [MessageCache] 缓存命中! 返回 ${cached.length} 条消息，耗时: ${cacheTime}ms`)
        return cached
      }
      console.log(`❌ [MessageCache] 缓存未命中，查询数据库...`)
    }

    // 2. 从数据库查询
    console.log(`📊 [MessageCache] 从数据库查询消息...`)
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
    console.log(`✅ [MessageCache] 数据库查询完成，返回 ${messages.length} 条消息，耗时: ${dbTime}ms`)

    // 3. 保存到缓存并更新用户当前缓存的会话
    if (shouldCache && messages.length > 0 && userId) {
      const cacheKey = CONVERSATION_KEYS.messages(conversationId)
      await setCached(cacheKey, messages, CACHE_TTL.USER_SESSION) // 24小时

      // 管理用户的缓存会话（替换旧的）
      await manageCachedConversations(userId, conversationId)
    }

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

    console.log('✅ [Message] 删除消息成功:', messageId)
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
    console.log(`🧹 [MessageCache] 已清除缓存: ${conversationId}`)

    console.log('✅ [Message] 删除对话消息成功:', conversationId)
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
