/* eslint-disable no-console */
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'

// 🔥 对话会话类型定义
export interface Conversation {
  id: string
  user_id: string
  title: string
  model_id: string
  provider_id: string
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

    console.log('✅ [Conversation] 创建对话成功:', data.id)
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
 * 📋 获取用户的所有对话（分页）
 */
export async function getUserConversations(
  userId: string,
  options: { limit?: number, offset?: number } = {},
  client: SupabaseClient = supabase,
): Promise<Conversation[]> {
  try {
    const { limit = 50, offset = 0 } = options

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

    return (data || []) as Conversation[]
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

    console.log('✅ [Conversation] 更新对话成功:', conversationId)
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
    const { error } = await client
      .from('conversations')
      .delete()
      .eq('id', conversationId)

    if (error) {
      console.error('❌ [Conversation] 删除对话失败:', error)
      return false
    }

    console.log('✅ [Conversation] 删除对话成功:', conversationId)
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
    // 尝试获取最近的对话（同一模型和供应商）
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
      console.log('✅ [Conversation] 找到现有对话:', data.id)
      return data as Conversation
    }

    // 如果没有找到，创建新对话
    console.log('📝 [Conversation] 创建新对话')
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

