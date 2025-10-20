/* eslint-disable no-console */
import type { SupabaseClient } from '@supabase/supabase-js'
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

    console.log(`✅ [Message] 批量创建 ${messages.length} 条消息成功`)
    return (data || []) as Message[]
  }
  catch (error) {
    console.error('❌ [Message] 批量创建消息异常:', error)
    return []
  }
}

/**
 * 🔍 获取对话的所有消息（按时间排序）
 */
export async function getConversationMessages(
  conversationId: string,
  options: { limit?: number, offset?: number } = {},
  client: SupabaseClient = supabase,
): Promise<Message[]> {
  try {
    const { limit = 100, offset = 0 } = options

    const { data, error } = await client
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('❌ [Message] 获取对话消息失败:', error)
      return []
    }

    return (data || []) as Message[]
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
  const englishWords = (text.match(/[a-zA-Z]+/g) || []).length

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

