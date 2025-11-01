import type { SupabaseClient } from '@supabase/supabase-js'
import { CONVERSATION_KEYS } from '../cache/cacheKeys'
import { CACHE_TTL, deleteCached, getCached, setCached } from '../cache/cacheService'
import { redis as redisClient } from '../cache/redisClient.auto'
import { logger } from '../utils/logger'
import { supabase } from './supabaseClient'

// 🔥 对话会话类型定义
export interface Conversation {
  id: string
  user_id: string
  title: string
  model_id: string
  provider_id: string
  frontend_uuid?: string // 🔥 前端路由使用的 nanoid
  temperature: number
  top_p: number
  max_tokens: number
  system_prompt?: string
  total_tokens: number
  message_count: number
  created_at: string
  updated_at: string
}

export interface CreateConversationParams {
  user_id: string
  title?: string
  model_id: string
  frontend_uuid?: string // 🔥 前端传递的 nanoid
  provider_id: string
  temperature?: number
  top_p?: number
  max_tokens?: number
  system_prompt?: string
}

export interface UpdateConversationParams {
  title?: string
  total_tokens?: number
  message_count?: number
}

/**
 * 🚀 创建新对话
 */
export async function createConversation(
  params: CreateConversationParams,
  client: SupabaseClient = supabase,
): Promise<Conversation | null> {
  try {
    const { data, error } = await client
      .from('conversations')
      .insert([
        {
          user_id: params.user_id,
          title: params.title || '新对话',
          model_id: params.model_id,
          provider_id: params.provider_id,
          frontend_uuid: params.frontend_uuid, // 🔥 保存前端 nanoid
          temperature: params.temperature ?? 0.7,
          top_p: params.top_p ?? 1.0,
          max_tokens: params.max_tokens ?? 2048,
          system_prompt: params.system_prompt,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error('❌ [Conversation] 创建对话失败:', error)
      return null
    }

    // 🔥 清除用户会话列表缓存
    const cacheKey = CONVERSATION_KEYS.userConversations(params.user_id)
    await deleteCached(cacheKey)

    logger.debug('✅ [Conversation] 创建对话成功:', data.id)
    return data as Conversation
  }
  catch (error) {
    console.error('❌ [Conversation] 创建对话异常:', error)
    return null
  }
}

/**
 * 🔍 根据ID获取对话
 */
export async function getConversationById(
  conversationId: string,
  client: SupabaseClient = supabase,
): Promise<Conversation | null> {
  try {
    const { data, error } = await client
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single()

    if (error) {
      console.error('❌ [Conversation] 获取对话失败:', error)
      return null
    }

    return data as Conversation
  }
  catch (error) {
    console.error('❌ [Conversation] 获取对话异常:', error)
    return null
  }
}

/**
 * 🔍 根据ID获取对话（带用户ID权限验证）
 * 直接使用 user_id 验证所有权，避免额外的 JOIN
 * 🚀 支持 Redis 缓存，大幅提升性能
 */
export async function getConversationByIdWithAuth(
  conversationId: string,
  userId: string,
  client: SupabaseClient = supabase,
): Promise<Conversation | null> {
  try {
    const cacheKey = `conversation:auth:${conversationId}:${userId}`
    const startTime = Date.now()

    // 🚀 1. 尝试从 Redis 缓存获取
    console.warn(`🔍 [ConversationCache] 尝试从缓存获取: ${conversationId}`)
    const cachedData = await redisClient.get(cacheKey)
    if (cachedData) {
      const cacheTime = Date.now() - startTime
      const conversation = JSON.parse(cachedData) as Conversation
      logger.debug(`✅ [ConversationCache] 缓存命中! 耗时: ${cacheTime}ms`)
      return conversation
    }

    // ❌ 2. 缓存未命中，查询数据库
    console.warn(`❌ [ConversationCache] 缓存未命中，查询数据库...`)
    const dbStartTime = Date.now()

    // 🔥 直接使用 user_id 验证，不需要 JOIN
    const { data, error } = await client
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .single()

    const queryTime = Date.now() - dbStartTime

    if (error) {
      console.error(`❌ [Conversation] 获取对话失败（耗时: ${queryTime}ms）:`, error)
      return null
    }

    logger.debug(`✅ [Conversation] 数据库查询成功，耗时: ${queryTime}ms`)

    // 🚀 3. 存入 Redis 缓存（10 分钟过期）
    await redisClient.setex(cacheKey, 600, JSON.stringify(data))
    const totalTime = Date.now() - startTime
    logger.debug(`✅ [Conversation] 总耗时: ${totalTime}ms`)

    return data as Conversation
  }
  catch (error) {
    console.error('❌ [Conversation] 获取对话异常:', error)
    return null
  }
}

/**
 * 🔍 根据前端 UUID 获取对话
 * 用于防止重复创建会话（当后端出错时）
 */
export async function getConversationByFrontendUuid(
  frontendUuid: string,
  userId: string,
  client: SupabaseClient = supabase,
): Promise<Conversation | null> {
  try {
    console.warn(`🔍 [getConversationByFrontendUuid] 查询参数:`, {
      frontendUuid,
      userId: userId.substring(0, 8) + '...',
    })

    const { data, error } = await client
      .from('conversations')
      .select('*')
      .eq('frontend_uuid', frontendUuid)
      .eq('user_id', userId)
      .single()

    if (error) {
      // 404 是正常的（会话不存在）
      if (error.code === 'PGRST116') {
        console.warn(`❌ [getConversationByFrontendUuid] 会话不存在 (PGRST116)`)
        return null
      }
      console.error('❌ [Conversation] 根据 frontendUuid 获取对话失败:', error)
      return null
    }

    console.warn(`✅ [getConversationByFrontendUuid] 找到会话:`, {
      id: data.id,
      frontend_uuid: data.frontend_uuid,
      user_id: data.user_id?.substring(0, 8) + '...',
    })

    return data as Conversation
  }
  catch (error) {
    console.error('❌ [Conversation] 根据 frontendUuid 获取对话异常:', error)
    return null
  }
}

/**
 * 📋 获取用户的所有对话（分页）+ Redis 缓存
 */
export async function getUserConversations(
  userId: string,
  options: { limit?: number, offset?: number } = {},
  client: SupabaseClient = supabase,
): Promise<Conversation[]> {
  try {
    const { limit = 50, offset = 0 } = options

    // 🔥 只缓存完整的列表（不分页）
    const shouldCache = offset === 0 && limit === 50

    // 1. 尝试从缓存获取
    if (shouldCache) {
      const cacheKey = CONVERSATION_KEYS.userConversations(userId)
      const cached = await getCached<Conversation[]>(cacheKey)

      if (cached) {
        return cached
      }
    }

    // 2. 从数据库查询
    const { data, error } = await client
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('❌ [Conversation] 获取用户对话列表失败:', error)
      return []
    }

    const conversations = (data || []) as Conversation[]

    // 3. 保存到缓存
    if (shouldCache && conversations.length > 0) {
      const cacheKey = CONVERSATION_KEYS.userConversations(userId)
      await setCached(cacheKey, conversations, CACHE_TTL.USER_CONVERSATIONS)
    }

    return conversations
  }
  catch (error) {
    console.error('❌ [Conversation] 获取用户对话列表异常:', error)
    return []
  }
}

/**
 * ✏️ 更新对话信息
 */
export async function updateConversation(
  conversationId: string,
  params: UpdateConversationParams,
  client: SupabaseClient = supabase,
): Promise<boolean> {
  try {
    // 先查询会话以获取 user_id（用于清除缓存）
    const conversation = await getConversationById(conversationId, client)

    const { error } = await client
      .from('conversations')
      .update({
        ...params,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId)

    if (error) {
      console.error('❌ [Conversation] 更新对话失败:', error)
      return false
    }

    // 🔥 清除用户会话列表缓存
    if (conversation) {
      const cacheKey = CONVERSATION_KEYS.userConversations(conversation.user_id)
      await deleteCached(cacheKey)
    }

    // 🔥 清除会话权限验证缓存（所有用户）
    const pattern = `conversation:auth:${conversationId}:*`
    const keys = await redisClient.keys(pattern)
    if (keys.length > 0) {
      await redisClient.del(...keys)
      logger.debug(`✅ [ConversationCache] 已清除 ${keys.length} 个权限验证缓存`)
    }

    logger.debug('✅ [Conversation] 更新对话成功:', conversationId)
    return true
  }
  catch (error) {
    console.error('❌ [Conversation] 更新对话异常:', error)
    return false
  }
}

/**
 * 🗑️ 删除对话（级联删除所有消息）
 */
export async function deleteConversation(
  conversationId: string,
  client: SupabaseClient = supabase,
): Promise<boolean> {
  try {
    // 先查询会话以获取 user_id（用于清除缓存）
    const conversation = await getConversationById(conversationId, client)

    const { error } = await client
      .from('conversations')
      .delete()
      .eq('id', conversationId)

    if (error) {
      console.error('❌ [Conversation] 删除对话失败:', error)
      return false
    }

    // 🔥 清除用户会话列表缓存
    if (conversation) {
      const cacheKey = CONVERSATION_KEYS.userConversations(conversation.user_id)
      await deleteCached(cacheKey)
    }

    // 🔥 清除会话权限验证缓存（所有用户）
    const pattern = `conversation:auth:${conversationId}:*`
    const keys = await redisClient.keys(pattern)
    if (keys.length > 0) {
      await redisClient.del(...keys)
      logger.debug(`✅ [ConversationCache] 已清除 ${keys.length} 个权限验证缓存`)
    }

    logger.debug('✅ [Conversation] 删除对话成功:', conversationId)
    return true
  }
  catch (error) {
    console.error('❌ [Conversation] 删除对话异常:', error)
    return false
  }
}

/**
 * 📊 增加对话的消息计数和token计数
 */
export async function incrementConversationStats(
  conversationId: string,
  messageTokens: number,
  client: SupabaseClient = supabase,
): Promise<boolean> {
  try {
    // 使用 RPC 或直接 SQL 更新（原子操作）
    const { error } = await client.rpc('increment_conversation_stats', {
      p_conversation_id: conversationId,
      p_tokens: messageTokens,
    })

    if (error) {
      // 如果 RPC 不存在，使用普通更新
      console.warn('⚠️ [Conversation] RPC 不存在，使用普通更新')

      // 先获取当前值
      const conversation = await getConversationById(conversationId, client)
      if (!conversation)
        return false

      return await updateConversation(
        conversationId,
        {
          total_tokens: conversation.total_tokens + messageTokens,
          message_count: conversation.message_count + 1,
        },
        client,
      )
    }

    return true
  }
  catch (error) {
    console.error('❌ [Conversation] 更新统计失败:', error)
    return false
  }
}

/**
 * 🔄 根据用户ID和模型信息获取或创建对话
 */
/**
 * ⚠️ 已废弃：此函数会自动复用最近的相同模型会话，不推荐使用
 * 推荐直接使用 createConversation 创建新会话
 *
 * @deprecated 请使用 createConversation 代替
 */
export async function getOrCreateConversation(
  userId: string,
  modelId: string,
  providerId: string,
  options: {
    title?: string
    temperature?: number
    top_p?: number
    max_tokens?: number
    system_prompt?: string
  } = {},
  client: SupabaseClient = supabase,
): Promise<Conversation | null> {
  try {
    // ⚠️ 注意：此函数会查找并复用最近的相同模型会话
    // 如果需要总是创建新会话，请使用 createConversation
    const { data, error } = await client
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .eq('model_id', modelId)
      .eq('provider_id', providerId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    if (!error && data) {
      logger.debug('✅ [Conversation] 找到并复用现有对话:', data.id)
      return data as Conversation
    }

    // 如果没有找到，创建新对话
    logger.debug('📝 [Conversation] 创建新对话')
    return await createConversation(
      {
        user_id: userId,
        model_id: modelId,
        provider_id: providerId,
        ...options,
      },
      client,
    )
  }
  catch (error) {
    console.error('❌ [Conversation] 获取或创建对话失败:', error)
    return null
  }
}
