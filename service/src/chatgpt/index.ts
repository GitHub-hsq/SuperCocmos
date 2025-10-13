import type { ChatGPTAPIOptions, ChatMessage, SendMessageOptions } from 'chatgpt'
import type { ApiModel, ChatContext, ChatGPTUnofficialProxyAPIOptions, ModelConfig } from '../types'
import type { RequestOptions, SetProxyOptions, UsageResponse } from './types'
import { ChatGPTAPI, ChatGPTUnofficialProxyAPI } from 'chatgpt'
import * as dotenv from 'dotenv'
import httpsProxyAgent from 'https-proxy-agent'
import fetch from 'node-fetch'
import { SocksProxyAgent } from 'socks-proxy-agent'
import { sendResponse } from '../utils'
import { isNotEmptyString } from '../utils/is'
import 'isomorphic-fetch'

const { HttpsProxyAgent } = httpsProxyAgent

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
// 这些错误通常是由于网络问题导致的 tiktoken 模型下载失败
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
const model = isNotEmptyString(process.env.OPENAI_API_MODEL) ? process.env.OPENAI_API_MODEL : 'gpt-3.5-turbo'

if (!isNotEmptyString(process.env.OPENAI_API_KEY) && !isNotEmptyString(process.env.OPENAI_ACCESS_TOKEN))
  throw new Error('Missing OPENAI_API_KEY or OPENAI_ACCESS_TOKEN environment variable')

let api: ChatGPTAPI | ChatGPTUnofficialProxyAPI

(async () => {
  // More Info: https://github.com/transitive-bullshit/chatgpt-api

  if (isNotEmptyString(process.env.OPENAI_API_KEY)) {
    const OPENAI_API_BASE_URL = process.env.OPENAI_API_BASE_URL

    const options: ChatGPTAPIOptions = {
      apiKey: process.env.OPENAI_API_KEY,
      completionParams: { model },
      debug: !disableDebug,
      // 禁用 token 计数以避免网络错误
      // chatgpt库会尝试从网络下载tiktoken模型，可能导致ECONNRESET错误
      messageStore: undefined,
    }

    // increase max token limit if use gpt-4
    if (model.toLowerCase().includes('gpt-4')) {
      // if use 32k model
      if (model.toLowerCase().includes('32k')) {
        options.maxModelTokens = 32768
        options.maxResponseTokens = 8192
      }
      else if (/-4o-mini/.test(model.toLowerCase())) {
        options.maxModelTokens = 128000
        options.maxResponseTokens = 16384
      }
      // if use GPT-4 Turbo or GPT-4o
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
      // 模型调用需要加 /v1
      options.apiBaseUrl = `${OPENAI_API_BASE_URL}/v1`
    }

    setupProxy(options)

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

    setupProxy(options)

    api = new ChatGPTUnofficialProxyAPI({ ...options })
    apiModel = 'ChatGPTUnofficialProxyAPI'
  }
})()

async function chatReplyProcess(options: RequestOptions) {
  const { message, lastContext, process, systemMessage, temperature, top_p, model: requestModel } = options
  try {
    let options: SendMessageOptions = { timeoutMs }

    if (apiModel === 'ChatGPTAPI') {
      if (isNotEmptyString(systemMessage))
        options.systemMessage = systemMessage
      // 使用请求中的模型参数，如果没有则使用默认模型
      const selectedModel = requestModel || model
      options.completionParams = { model: selectedModel, temperature, top_p }
    }

    if (lastContext != null) {
      if (apiModel === 'ChatGPTAPI')
        options.parentMessageId = lastContext.parentMessageId
      else
        options = { ...lastContext }
    }

    // 添加调试信息
    // eslint-disable-next-line no-console
    console.log('🚀 [ChatGPT] 开始调用 API')
    // eslint-disable-next-line no-console
    console.log('📝 [ChatGPT] 消息内容:', message)
    // eslint-disable-next-line no-console
    console.log('⚙️ [ChatGPT] 请求选项:', {
      model: options.completionParams?.model || '未指定',
      systemMessage: options.systemMessage || '无',
      temperature: options.completionParams?.temperature,
      top_p: options.completionParams?.top_p,
      parentMessageId: options.parentMessageId || '无上下文',
    })

    const startTime = Date.now()
    const response = await api.sendMessage(message, {
      ...options,
      onProgress: (partialResponse) => {
        process?.(partialResponse)
      },
    })
    const endTime = Date.now()

    // eslint-disable-next-line no-console
    console.log('✅ [ChatGPT] API 调用完成')
    // eslint-disable-next-line no-console
    console.log('⏱️ [ChatGPT] 耗时:', endTime - startTime, 'ms')
    // eslint-disable-next-line no-console
    console.log('📊 [ChatGPT] 响应信息:', {
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

  // 调用余额不需要加 /v1，使用 /api/usage/token
  const urlUsage = `${API_BASE_URL}/api/usage/token`

  const headers = {
    'Authorization': `Bearer ${OPENAI_API_KEY}`,
    'Content-Type': 'application/json',
  }

  const options = {} as SetProxyOptions

  setupProxy(options)

  try {
    // 获取已使用量
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

// eslint-disable-next-line unused-imports/no-unused-vars
function formatDate(): string[] {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth() + 1
  const lastDay = new Date(year, month, 0)
  const formattedFirstDay = `${year}-${month.toString().padStart(2, '0')}-01`
  const formattedLastDay = `${year}-${month.toString().padStart(2, '0')}-${lastDay.getDate().toString().padStart(2, '0')}`
  return [formattedFirstDay, formattedLastDay]
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

function setupProxy(options: SetProxyOptions) {
  if (isNotEmptyString(process.env.SOCKS_PROXY_HOST) && isNotEmptyString(process.env.SOCKS_PROXY_PORT)) {
    const agent = new SocksProxyAgent({
      hostname: process.env.SOCKS_PROXY_HOST,
      port: process.env.SOCKS_PROXY_PORT,
      userId: isNotEmptyString(process.env.SOCKS_PROXY_USERNAME) ? process.env.SOCKS_PROXY_USERNAME : undefined,
      password: isNotEmptyString(process.env.SOCKS_PROXY_PASSWORD) ? process.env.SOCKS_PROXY_PASSWORD : undefined,
    })
    options.fetch = (url, options) => {
      return fetch(url, { agent, ...options })
    }
  }
  else if (isNotEmptyString(process.env.HTTPS_PROXY) || isNotEmptyString(process.env.ALL_PROXY)) {
    const httpsProxy = process.env.HTTPS_PROXY || process.env.ALL_PROXY
    if (httpsProxy) {
      const agent = new HttpsProxyAgent(httpsProxy)
      options.fetch = (url, options) => {
        return fetch(url, { agent, ...options })
      }
    }
  }
  else {
    options.fetch = (url, options) => {
      return fetch(url, { ...options })
    }
  }
}

function currentModel(): ApiModel {
  return apiModel
}

export type { ChatContext, ChatMessage }

export { chatConfig, chatReplyProcess, currentModel }
