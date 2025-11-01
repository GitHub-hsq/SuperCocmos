import type { ChatGPTAPIOptions, ChatMessage, SendMessageOptions } from 'chatgpt'
import type { ApiModel, ChatContext, ChatGPTUnofficialProxyAPIOptions, ModelConfig } from '../types'
import type { RequestOptions, UsageResponse } from './types'
import type { SetProxyOptions } from './utils'
import { ChatGPTAPI, ChatGPTUnofficialProxyAPI } from 'chatgpt'
import * as dotenv from 'dotenv'
import { getProviderById } from '../db/providerService'
import { sendResponse } from '../utils'
import { isNotEmptyString } from '../utils/is'
import { chatReplyProcessLibrary } from './chatLibrary'
import { chatReplyProcessNative } from './chatNative'
import { setupProxy } from './utils'
import 'isomorphic-fetch'

dotenv.config()

const ErrorCodeMessage: Record<string, string> = {
  401: '[OpenAI] 提供错误的API密钥 | Incorrect API key provided',
  403: '[OpenAI] 服务器拒绝访问，请稍后再试 | Server refused to access, please try again later',
  502: '[OpenAI] 错误的网关 |  Bad Gateway',
  503: '[OpenAI] 服务器繁忙，请稍后再试 | Server is busy, please try again later',
  504: '[OpenAI] 网关超时 | Gateway Time-out',
  500: '[OpenAI] 服务器繁忙，请稍后再试 | Internal Server Error',
}

const timeoutMs: number = !Number.isNaN(+process.env.TIMEOUT_MS) ? +process.env.TIMEOUT_MS : 100 * 1000
const disableDebug: boolean = process.env.OPENAI_API_DISABLE_DEBUG === 'true'

// 抑制 chatgpt 库的 token 计算错误日志
const originalConsoleWarn = console.warn
const originalConsoleError = console.error

// 记录最近的错误消息，防止重复打印
const recentErrors = new Set<string>()
const ERROR_CACHE_TIME = 5000 // 5秒内的重复错误不显示

console.warn = (...args: any[]) => {
  const msg = String(args[0] || '')
  // 过滤掉 token 计算相关的警告
  if (msg.includes('Failed to calculate number of tokens')
    || msg.includes('falling back to approximate count')) {
    return
  }
  originalConsoleWarn.apply(console, args)
}

console.error = (...args: any[]) => {
  const msg = String(args[0] || '')

  // 过滤掉 token 计算相关的 ECONNRESET 错误
  if (msg.includes('Failed to calculate number of tokens'))
    return

  // 防止短时间内重复打印相同的错误
  const errorKey = msg.substring(0, 100)
  if (recentErrors.has(errorKey))
    return

  recentErrors.add(errorKey)
  setTimeout(() => recentErrors.delete(errorKey), ERROR_CACHE_TIME)

  originalConsoleError.apply(console, args)
}

let apiModel: ApiModel
let api: ChatGPTAPI | ChatGPTUnofficialProxyAPI
let isInitialized = false

// 延迟初始化函数（可选：仅在使用环境变量时需要）
async function initializeAPI() {
  if (isInitialized)
    return

  const model = isNotEmptyString(process.env.OPENAI_API_MODEL) ? process.env.OPENAI_API_MODEL : 'gpt-3.5-turbo'

  // 新架构：优先使用数据库配置，环境变量作为后备
  if (!isNotEmptyString(process.env.OPENAI_API_KEY) && !isNotEmptyString(process.env.OPENAI_ACCESS_TOKEN)) {
    isInitialized = true
    return
  }

  // 如果配置了环境变量，使用环境变量初始化（向后兼容）
  console.warn('✅ [ChatGPT] 检测到环境变量配置，使用环境变量初始化 API')

  await (async () => {
    if (isNotEmptyString(process.env.OPENAI_API_KEY)) {
      const OPENAI_API_BASE_URL = process.env.OPENAI_API_BASE_URL

      const options: ChatGPTAPIOptions = {
        apiKey: process.env.OPENAI_API_KEY,
        completionParams: { model },
        debug: !disableDebug,
      }

      // increase max token limit if use gpt-4
      if (model.toLowerCase().includes('gpt-4')) {
        if (model.toLowerCase().includes('32k')) {
          options.maxModelTokens = 32768
          options.maxResponseTokens = 8192
        }
        else if (/-4o-mini/.test(model.toLowerCase())) {
          options.maxModelTokens = 128000
          options.maxResponseTokens = 16384
        }
        else if (/-preview|-turbo|o/.test(model.toLowerCase())) {
          options.maxModelTokens = 128000
          options.maxResponseTokens = 4096
        }
        else {
          options.maxModelTokens = 8192
          options.maxResponseTokens = 2048
        }
      }
      else if (model.toLowerCase().includes('gpt-3.5')) {
        if (/16k|1106|0125/.test(model.toLowerCase())) {
          options.maxModelTokens = 16384
          options.maxResponseTokens = 4096
        }
      }

      if (isNotEmptyString(OPENAI_API_BASE_URL)) {
        options.apiBaseUrl = `${OPENAI_API_BASE_URL}/v1`
      }

      setupProxy(options as any)

      api = new ChatGPTAPI({ ...options })
      apiModel = 'ChatGPTAPI'
    }
    else {
      const options: ChatGPTUnofficialProxyAPIOptions = {
        accessToken: process.env.OPENAI_ACCESS_TOKEN,
        apiReverseProxyUrl: isNotEmptyString(process.env.API_REVERSE_PROXY) ? process.env.API_REVERSE_PROXY : 'https://ai.fakeopen.com/api/conversation',
        model,
        debug: !disableDebug,
      }

      setupProxy(options as any)

      api = new ChatGPTUnofficialProxyAPI({ ...options })
      apiModel = 'ChatGPTUnofficialProxyAPI'
    }
  })()

  isInitialized = true
}

// 判断模型是否为 Kriora 供应商
function isKrioraModel(modelId: string): boolean {
  return modelId.includes('moonshotai/') || modelId.includes('qwen/')
}

// 为特定供应商创建 API 实例
function createApiForProvider(modelId: string, maxTokens?: number): ChatGPTAPI {
  if (isKrioraModel(modelId)) {
    const krioraApiKey = process.env.KRIORA_API_KEY || process.env.OPENAI_API_KEY
    const krioraApiUrl = process.env.KRIORA_API_URL || 'https://api.kriora.com'

    const options: ChatGPTAPIOptions = {
      apiKey: krioraApiKey,
      completionParams: { model: modelId },
      debug: !disableDebug,
      apiBaseUrl: `${krioraApiUrl}/v1`,
      maxModelTokens: 128000,
      maxResponseTokens: maxTokens || 8192,
    }

    setupProxy(options as any)
    return new ChatGPTAPI({ ...options })
  }

  return api as ChatGPTAPI
}

/**
 * 聊天回复处理（主入口）
 */
async function chatReplyProcess(options: RequestOptions) {
  // 确保API已初始化
  await initializeAPI()

  const { message, lastContext, historyMessages, process: processCallback, systemMessage, temperature, top_p, model: requestModel, maxTokens, providerId, baseURL, apiKey } = options

  try {
    const defaultModel = isNotEmptyString(process.env.OPENAI_API_MODEL) ? process.env.OPENAI_API_MODEL : 'gpt-3.5-turbo'
    const selectedModel = requestModel || defaultModel

    // 🔥 优先使用直接传递的 baseURL 和 apiKey（新方式）
    let apiInstance: ChatGPTAPI | ChatGPTUnofficialProxyAPI | null = api
    let providerInfo: { baseUrl: string, apiKey: string, name: string } | null = null

    if (baseURL && apiKey) {
      // 新方式：直接使用传递的配置
      providerInfo = {
        baseUrl: baseURL,
        apiKey,
        name: 'Direct Config',
      }
    }
    else if (lastContext?.providerId || providerId) {
      // 旧方式：通过 providerId 查询数据库（兼容）
      const currentProviderId = lastContext?.providerId || providerId
      console.warn('🔍 [ChatGPT] 查找供应商:', currentProviderId)

      try {
        const provider = await getProviderById(currentProviderId!)
        if (provider) {
          providerInfo = {
            baseUrl: provider.base_url,
            apiKey: provider.api_key,
            name: provider.name,
          }
          console.warn('✅ [ChatGPT] 找到供应商:', {
            name: providerInfo.name,
            baseUrl: providerInfo.baseUrl,
          })
        }
        else {
          console.warn('⚠️ [ChatGPT] 未找到供应商，使用默认配置')
        }
      }
      catch (error) {
        console.error('❌ [ChatGPT] 查找供应商失败:', error)
      }
    }

    // 🔥 使用新架构的实现（统一参数，内部根据情况选择调用方式）
    if (providerInfo) {
      // 可以通过环境变量选择使用哪个实现
      const useNativeImplementation = process.env.USE_NATIVE_CHAT === 'true'

      if (useNativeImplementation) {
        // 使用原生 fetch 实现
        return await chatReplyProcessNative({
          message,
          historyMessages: historyMessages || [],
          baseURL: providerInfo.baseUrl,
          apiKey: providerInfo.apiKey,
          model: selectedModel,
          temperature,
          top_p,
          maxTokens,
          processCallback,
        })
      }
      else {
        // 使用 ChatGPT 库实现（默认）
        return await chatReplyProcessLibrary({
          message,
          historyMessages,
          lastContext,
          systemMessage,
          temperature,
          top_p,
          model: selectedModel,
          maxTokens,
          baseURL: providerInfo.baseUrl,
          apiKey: providerInfo.apiKey,
          processCallback,
        })
      }
    }

    // 如果没有使用供应商配置，则使用原有逻辑
    if (isNotEmptyString(selectedModel) && apiModel === 'ChatGPTAPI') {
      apiInstance = createApiForProvider(selectedModel, maxTokens)
    }

    if (!apiInstance) {
      throw new Error('API 实例未创建，请检查配置或提供 baseURL 和 apiKey')
    }

    // 使用默认 API 实例（环境变量配置）
    const currentApiModel = apiInstance instanceof ChatGPTAPI ? 'ChatGPTAPI' : 'ChatGPTUnofficialProxyAPI'

    let sendOptions: SendMessageOptions = { timeoutMs }

    if (currentApiModel === 'ChatGPTAPI') {
      if (isNotEmptyString(systemMessage))
        sendOptions.systemMessage = systemMessage

      sendOptions.completionParams = {
        model: selectedModel,
        temperature,
        top_p,
      }

      if (maxTokens && apiInstance instanceof ChatGPTAPI) {
        const chatGptApi = apiInstance as any
        if (chatGptApi.maxResponseTokens !== maxTokens)
          chatGptApi.maxResponseTokens = maxTokens
      }
    }

    if (lastContext != null) {
      if (currentApiModel === 'ChatGPTAPI')
        sendOptions.parentMessageId = lastContext.parentMessageId
      else
        sendOptions = { ...lastContext }
    }

    const startTime = Date.now()
    const response = await apiInstance.sendMessage(message, {
      ...sendOptions,
      onProgress: (partialResponse) => {
        processCallback?.(partialResponse)
      },
    })

    const responseTime = Date.now() - startTime
    console.warn('📊 [ChatGPT] 响应信息:', {
      time: `${responseTime}ms`,
      id: response.id,
      model: response.detail?.model || '未知',
      tokens: response.detail?.usage || '未知',
    })

    return sendResponse({ type: 'Success', data: response })
  }
  catch (error: any) {
    const code = error.statusCode
    globalThis.console.error(error)
    if (Reflect.has(ErrorCodeMessage, code))
      return sendResponse({ type: 'Fail', message: ErrorCodeMessage[code] })
    return sendResponse({ type: 'Fail', message: error.message ?? 'Please check the back-end console' })
  }
}

async function fetchUsage() {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY
  const OPENAI_API_BASE_URL = process.env.OPENAI_API_BASE_URL

  if (!isNotEmptyString(OPENAI_API_KEY))
    return Promise.resolve('-')

  const API_BASE_URL = isNotEmptyString(OPENAI_API_BASE_URL)
    ? OPENAI_API_BASE_URL
    : 'https://api.openai.com'

  const urlUsage = `${API_BASE_URL}/api/usage/token`

  const headers = {
    'Authorization': `Bearer ${OPENAI_API_KEY}`,
    'Content-Type': 'application/json',
  }

  const options = {} as SetProxyOptions

  setupProxy(options)

  try {
    const useResponse = await options.fetch(urlUsage, { headers })
    if (!useResponse.ok)
      throw new Error('获取使用量失败')
    const usageData = await useResponse.json() as UsageResponse
    const usage = Math.round(usageData.total_usage) / 100
    return Promise.resolve(usage ? `$${usage}` : '-')
  }
  catch (error) {
    globalThis.console.error(error)
    return Promise.resolve('-')
  }
}

async function chatConfig() {
  const usage = await fetchUsage()
  const reverseProxy = process.env.API_REVERSE_PROXY ?? '-'
  const httpsProxy = (process.env.HTTPS_PROXY || process.env.ALL_PROXY) ?? '-'
  const socksProxy = (process.env.SOCKS_PROXY_HOST && process.env.SOCKS_PROXY_PORT)
    ? (`${process.env.SOCKS_PROXY_HOST}:${process.env.SOCKS_PROXY_PORT}`)
    : '-'
  return sendResponse<ModelConfig>({
    type: 'Success',
    data: { apiModel, reverseProxy, timeoutMs, socksProxy, httpsProxy, usage },
  })
}

function currentModel(): ApiModel {
  return apiModel || 'ChatGPTAPI'
}

export type { ChatContext, ChatMessage }
export { chatConfig, chatReplyProcess, currentModel }
