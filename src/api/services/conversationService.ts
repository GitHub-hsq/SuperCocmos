/**
 * 对话和消息历史服务
 */

import { get } from '../client'

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

export interface Message {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  tokens: number
  model_info?: Record<string, any>
  created_at: string
}

export interface ConversationWithMessages {
  conversation: Conversation
  messages: Message[]
}

/**
 * 获取用户的对话列表
 */
export function fetchConversations(params: { limit?: number, offset?: number } = {}) {
  return get<Conversation[]>('/conversations', params)
}

/**
 * 获取对话的消息历史
 */
export function fetchConversationMessages(conversationId: string, params: { limit?: number, offset?: number } = {}) {
  return get<ConversationWithMessages>(`/conversations/${conversationId}/messages`, params)
}

