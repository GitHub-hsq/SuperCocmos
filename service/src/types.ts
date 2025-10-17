import type { FetchFn } from 'chatgpt'

export interface RequestProps {
  prompt: string
  providerId?: string
  options?: ChatContext
  systemMessage: string
  temperature?: number
  top_p?: number
  model?: string
  maxTokens?: number
}

export interface ChatContext {
  conversationId?: string
  parentMessageId?: string
  providerId?: string // 🔥 供应商 ID，用于查找 baseUrl 和 apiKey
  model?: string // 🔥 模型 ID
}

export interface ChatGPTUnofficialProxyAPIOptions {
  accessToken: string
  apiReverseProxyUrl?: string
  model?: string
  debug?: boolean
  headers?: Record<string, string>
  fetch?: FetchFn
}

export interface ModelConfig {
  apiModel?: ApiModel
  reverseProxy?: string
  timeoutMs?: number
  socksProxy?: string
  httpsProxy?: string
  usage?: string
}

export type ApiModel = 'ChatGPTAPI' | 'ChatGPTUnofficialProxyAPI' | undefined
