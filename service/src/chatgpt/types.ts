import type { ChatMessage } from 'chatgpt'
import type fetch from 'node-fetch'

export interface RequestOptions {
  message: string
  lastContext?: { conversationId?: string, parentMessageId?: string, providerId?: string }
  historyMessages?: Array<{ role: string, content: string }> // 🔥 历史消息列表
  process?: (chat: ChatMessage) => void
  systemMessage?: string
  temperature?: number
  top_p?: number
  model?: string
  maxTokens?: number
  providerId?: string // 🔥 供应商 ID（旧方式，兼容）
  baseURL?: string // 🔥 直接传递 API Base URL（新方式）
  apiKey?: string // 🔥 直接传递 API Key（新方式）
}

export interface SetProxyOptions {
  fetch?: typeof fetch
}

export interface UsageResponse {
  total_usage: number
}
