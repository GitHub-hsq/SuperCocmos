/**
 * 小说工作流的LLM配置
 */

import { ChatOpenAI } from '@langchain/openai'

export interface ModelInfo {
  name: string
  apiKey?: string
  baseURL?: string
  provider?: string
}

export interface ModelConfig {
  temperature?: number
  top_p?: number
  max_tokens?: number
  presence_penalty?: number
  frequency_penalty?: number
}

// 判断模型是否为 Kriora 供应商
function isKrioraModel(modelId: string): boolean {
  return modelId.includes('moonshotai/') || modelId.includes('qwen/')
}

/**
 * 创建LLM实例
 */
export function makeLLM(modelInfo?: ModelInfo, config?: ModelConfig) {
  // 如果没有提供模型信息，使用环境变量
  const model = modelInfo?.name || process.env.OPENAI_API_MODEL || 'gpt-4o-mini'

  // 根据模型类型选择合适的 API 配置
  let apiKey = modelInfo?.apiKey
  let baseURL = modelInfo?.baseURL

  if (!apiKey || !baseURL) {
    if (isKrioraModel(model)) {
      // 使用 Kriora API 配置
      apiKey = apiKey || process.env.KRIORA_API_KEY || process.env.OPENAI_API_KEY
      baseURL = baseURL || process.env.KRIORA_API_URL || 'https://api.kriora.com'
    }
    else {
      // 使用默认 OpenAI API 配置
      apiKey = apiKey || process.env.OPENAI_API_KEY
      baseURL = baseURL || process.env.OPENAI_API_BASE_URL
    }
  }

  console.warn('🔑 [Novel LLM配置]', {
    model,
    baseURL,
    hasApiKey: !!apiKey,
    provider: isKrioraModel(model) ? 'kriora' : (modelInfo?.provider || 'openai'),
    config,
  })

  if (!apiKey)
    throw new Error('API_KEY 未配置！请在 service/.env 文件中配置或通过工作流配置传入')

  return new ChatOpenAI({
    model,
    temperature: config?.temperature ?? 0.7, // 默认0.7，适合创作
    topP: config?.top_p,
    maxTokens: config?.max_tokens || 4000,
    presencePenalty: config?.presence_penalty,
    frequencyPenalty: config?.frequency_penalty,
    openAIApiKey: apiKey,
    configuration: {
      baseURL: baseURL ? `${baseURL}/v1` : 'https://api.openai.com/v1',
    },
    timeout: 120000, // 2分钟超时
  })
}

/**
 * 为不同的AI角色创建专用的LLM配置
 */
export function makeScreenwriterLLM(modelInfo?: ModelInfo) {
  return makeLLM(modelInfo, {
    temperature: 0.8, // 编剧需要更高的创造力
    max_tokens: 4000,
  })
}

export function makeReviewerLLM(modelInfo?: ModelInfo) {
  return makeLLM(modelInfo, {
    temperature: 0.3, // 审查需要更严谨
    max_tokens: 2000,
  })
}
