/**
 * 会话同步服务
 * 用于从数据库加载和保存用户的聊天会话
 */

import { del, get, post } from '@/utils/request'

/**
 * 会话数据结构（与后端对应）
 */
export interface Conversation {
  id: string
  userId: string
  title: string
  modelId: string
  providerId: string
  frontend_uuid?: string // 🔥 前端路由使用的 nanoid
  temperature?: number
  topP?: number
  maxTokens?: number
  systemPrompt?: string
  totalTokens?: number
  messageCount?: number
  createdAt: string
  updatedAt: string
  messages?: Message[]
}

/**
 * 消息数据结构
 */
export interface Message {
  id: string
  conversationId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  tokens?: number
  createdAt: string
}

/**
 * 获取用户的所有会话列表
 * GET /api/conversations
 */
export async function fetchUserConversations<T = Conversation[]>(options?: {
  limit?: number
  offset?: number
}) {
  const startTime = performance.now()
  console.log('🚀 [前端API] 开始请求会话列表...')

  const result = await get<T>({
    url: '/conversations',
    data: options,
  })

  const endTime = performance.now()
  console.log(`✅ [前端API] 会话列表请求完成，耗时: ${Math.round(endTime - startTime)}ms`)

  return result
}

/**
 * 获取指定会话的详细信息（包含消息）
 * GET /api/conversations/:id
 */
export function fetchConversationById<T = Conversation>(conversationId: string) {
  return get<T>({
    url: `/conversations/${conversationId}`,
  })
}

/**
 * 创建新会话
 * POST /api/conversations
 */
export function createConversation<T = Conversation>(params: {
  title: string
  modelId: string
  providerId: string
  temperature?: number
  topP?: number
  maxTokens?: number
  systemPrompt?: string
}) {
  return post<T>({
    url: '/conversations',
    data: params,
  })
}

/**
 * 更新会话标题
 * PATCH /api/conversations/:id
 */
export function updateConversation<T = Conversation>(
  conversationId: string,
  params: {
    title?: string
    temperature?: number
    topP?: number
    maxTokens?: number
    systemPrompt?: string
  },
) {
  return post<T>({
    url: `/conversations/${conversationId}`,
    data: params,
  })
}

/**
 * 删除会话
 * DELETE /api/conversations/:id
 */
export function deleteConversation<T = any>(conversationId: string) {
  return del<T>({
    url: `/conversations/${conversationId}`,
  })
}

/**
 * 批量保存消息到会话
 * POST /api/conversations/:id/messages
 */
export function saveMessages<T = any>(
  conversationId: string,
  messages: Array<{
    role: 'user' | 'assistant' | 'system'
    content: string
    tokens?: number
  }>,
) {
  return post<T>({
    url: `/conversations/${conversationId}/messages`,
    data: { messages },
  })
}

/**
 * 获取会话的所有消息
 * GET /api/conversations/:id/messages
 */
export async function fetchConversationMessages<T = Message[]>(
  conversationId: string,
  options?: {
    limit?: number
    offset?: number
  },
) {
  const startTime = performance.now()
  const result = await get<T>({
    url: `/conversations/${conversationId}/messages`,
    data: options,
  })

  const endTime = performance.now()
  console.log(`✅ [前端========] 请求完成，总耗时: ${Math.round(endTime - startTime)}ms`)

  return result
}
