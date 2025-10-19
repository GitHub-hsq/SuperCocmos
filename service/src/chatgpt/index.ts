import type { ChatGPTAPIOptions, ChatMessage, SendMessageOptions } from 'chatgpt'
import type { ApiModel, ChatContext, ChatGPTUnofficialProxyAPIOptions, ModelConfig } from '../types'
import type { RequestOptions, SetProxyOptions, UsageResponse } from './types'
import { ChatGPTAPI, ChatGPTUnofficialProxyAPI } from 'chatgpt'
import * as dotenv from 'dotenv'
import httpsProxyAgent from 'https-proxy-agent'
import fetch from 'node-fetch'
import { SocksProxyAgent } from 'socks-proxy-agent'
import { getProviderById } from '../db/providerService' // 🔥 导入供应商服务
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
let api: ChatGPTAPI | ChatGPTUnofficialProxyAPI
let isInitialized = false

// 延迟初始化函数
async function initializeAPI() {
  if (isInitialized)
    return

  const model = isNotEmptyString(process.env.OPENAI_API_MODEL) ? process.env.OPENAI_API_MODEL : 'gpt-3.5-turbo'

  // 只有在实际需要时才检查环境变量
  if (!isNotEmptyString(process.env.OPENAI_API_KEY) && !isNotEmptyString(process.env.OPENAI_ACCESS_TOKEN)) {
    console.warn('⚠️ [ChatGPT] 未配置 OPENAI_API_KEY 或 OPENAI_ACCESS_TOKEN，将使用数据库中的供应商配置')
    isInitialized = true
    return
  }

  await (async () => {
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
    // 使用 Kriora API 配置
    const krioraApiKey = process.env.KRIORA_API_KEY || process.env.OPENAI_API_KEY
    const krioraApiUrl = process.env.KRIORA_API_URL || 'https://api.kriora.com'

    const options: ChatGPTAPIOptions = {
      apiKey: krioraApiKey,
      completionParams: { model: modelId },
      debug: !disableDebug,
      messageStore: undefined,
      apiBaseUrl: `${krioraApiUrl}/v1`,
      maxModelTokens: 128000,
      maxResponseTokens: maxTokens || 8192, // 使用配置的 maxTokens，默认 8192
    }

    setupProxy(options as any)
    return new ChatGPTAPI({ ...options })
  }

  // 默认使用全局 API 实例（可能未初始化）
  return api as ChatGPTAPI
}

// 对话历史存储（简单的内存存储，生产环境应该用数据库或 Redis）
const conversationHistory = new Map<string, Array<{ role: string, content: string }>>()

/**
 * 🚀 原生实现的聊天回复处理（更快、更可控）
 * 直接使用 fetch API 调用 OpenAI 兼容的接口
 * 已禁用，使用 chatgpt 库代替
 */
async function _chatReplyProcessNative(options: RequestOptions) {
  const { message, lastContext, process: processCallback, systemMessage, temperature, top_p, model: requestModel, maxTokens, baseURL, apiKey } = options

  if (!baseURL || !apiKey)
    throw new Error('缺少必需的参数: baseURL 或 apiKey')

  try {
    const apiUrl = baseURL.endsWith('/v1')
      ? `${baseURL}/chat/completions`
      : `${baseURL}/v1/chat/completions`

    // 🔥 构建对话历史
    const conversationId = lastContext?.conversationId || `conv_${Date.now()}`
    let messages: Array<{ role: string, content: string }> = []

    // 如果有历史记录，加载它
    if (conversationHistory.has(conversationId)) {
      messages = conversationHistory.get(conversationId)!
      console.warn(`📚 [原生实现] 加载历史对话: ${messages.length} 条消息`)
    }
    else {
      // 添加系统消息
      if (systemMessage)
        messages.push({ role: 'system', content: systemMessage })
    }

    // 添加当前用户消息
    messages.push({ role: 'user', content: message })

    const requestBody = {
      model: requestModel || 'gpt-3.5-turbo',
      messages,
      temperature: temperature || 0.7,
      top_p: top_p || 1,
      max_tokens: maxTokens || 4096,
      stream: true, // 使用流式响应
    }

    console.warn('🚀 [原生实现] 发送请求:', {
      url: apiUrl,
      model: requestBody.model,
      messageLength: message.length,
    })

    const startTime = Date.now()
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(100000), // 100秒超时
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API 请求失败: ${response.status} ${errorText}`)
    }

    // 处理流式响应（兼容 Node.js Readable Stream）
    let fullText = ''
    let reasoningText = ''
    const messageId = `msg_${Date.now()}`
    let chunkCount = 0
    let lastLogTime = Date.now()
    let hasReceivedContent = false

    if (response.body) {
      // Node.js 环境中 response.body 是 Readable stream
      let buffer = ''

      // 监听 data 事件
      for await (const chunk of response.body as any) {
        chunkCount++
        buffer += chunk.toString()

        // 按行处理数据
        const lines = buffer.split('\n')
        // 保留最后一个不完整的行
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmedLine = line.trim()
          if (!trimmedLine)
            continue

          if (trimmedLine.startsWith('data: ')) {
            const data = trimmedLine.slice(6)
            if (data === '[DONE]')
              continue

            try {
              const parsed = JSON.parse(data)
              const choice = parsed.choices?.[0]

              // 🔥 同时处理 content 和 reasoning_content
              const contentDelta = choice?.delta?.content || ''
              const reasoningDelta = choice?.delta?.reasoning_content || ''

              // 🔥 处理思考过程（显示给用户，让他们知道 AI 在思考）
              if (reasoningDelta && !hasReceivedContent) {
                reasoningText += reasoningDelta
                // 发送思考状态给前端（使用特殊格式，前端可以识别）
                processCallback?.({
                  id: messageId,
                  text: `💭 
                  ...\n${reasoningText.substring(0, 100)}...`,
                  role: 'assistant',
                  conversationId,
                  parentMessageId: messageId,
                })
              }

              // 🔥 如果有实际内容，发送给前端
              if (contentDelta) {
                hasReceivedContent = true
                fullText += contentDelta
                processCallback?.({
                  id: messageId,
                  text: fullText,
                  role: 'assistant',
                  conversationId,
                  parentMessageId: messageId,
                })
              }

              // 记录第一个 chunk 的完整内容，用于调试
              if (chunkCount === 1) {
                console.warn('🔍 [原生实现] 第一个 chunk 示例:', JSON.stringify(parsed).substring(0, 200))
              }
            }
            catch {
              // 忽略解析错误
            }
          }
        }

        // 每5秒打印一次进度
        const now = Date.now()
        if (now - lastLogTime > 5000) {
          console.warn(`⏱️ [原生实现] 已接收 ${chunkCount} 个 chunks，思考 ${reasoningText.length} 字符，回复 ${fullText.length} 字符，耗时 ${now - startTime}ms`)
          lastLogTime = now
        }
      }

      console.warn(`📊 [原生实现] 总共接收 ${chunkCount} 个 chunks，思考 ${reasoningText.length} 字符，回复 ${fullText.length} 字符`)
    }

    const endTime = Date.now()
    console.warn(`✅ [原生实现] 完成，耗时: ${endTime - startTime}ms`)

    // 🔥 保存助手回复到对话历史
    messages.push({ role: 'assistant', content: fullText })
    conversationHistory.set(conversationId, messages)

    // 🔥 限制历史记录长度（只保留最近10条消息）
    if (messages.length > 20) {
      // 保留系统消息 + 最近10轮对话（20条消息）
      const systemMsg = messages[0].role === 'system' ? [messages[0]] : []
      conversationHistory.set(conversationId, [...systemMsg, ...messages.slice(-20)])
      console.warn(`🗑️ [原生实现] 历史记录过长，已清理旧消息`)
    }

    console.warn(`💾 [原生实现] 已保存对话历史，总计 ${messages.length} 条消息`)

    return sendResponse({
      type: 'Success',
      data: {
        id: messageId,
        text: fullText,
        role: 'assistant',
        conversationId,
        parentMessageId: messageId,
      },
    })
  }
  catch (error: any) {
    console.error('❌ [原生实现] 失败:', error)
    return sendResponse({ type: 'Fail', message: error.message || '请求失败' })
  }
}

async function chatReplyProcess(options: RequestOptions) {
  // 🔥 默认使用 chatgpt 库
  console.warn('📚 [ChatGPT] 使用 chatgpt 库')

  // 确保API已初始化
  await initializeAPI()

  const { message, lastContext, process: processCallback, systemMessage, temperature, top_p, model: requestModel, maxTokens, providerId, baseURL, apiKey } = options
  try {
    let options: SendMessageOptions = { timeoutMs }
    const defaultModel = isNotEmptyString(process.env.OPENAI_API_MODEL) ? process.env.OPENAI_API_MODEL : 'gpt-3.5-turbo'
    const selectedModel = requestModel || defaultModel

    // 🔥 优先使用直接传递的 baseURL 和 apiKey（新方式）
    let apiInstance: ChatGPTAPI | ChatGPTUnofficialProxyAPI | null = api
    let providerInfo: { baseUrl: string, apiKey: string, name: string } | null = null

    if (baseURL && apiKey) {
      // 🔥 新方式：直接使用传递的配置
      providerInfo = {
        baseUrl: baseURL,
        apiKey,
        name: 'Direct Config',
      }
      console.warn('✅ [ChatGPT] 使用直接传递的配置:', {
        baseUrl: baseURL,
        model: selectedModel,
      })

      // 🔥 创建 API 实例（不依赖 apiModel，直接使用 ChatGPTAPI）
      // ChatGPT API 需要完整的 URL，包括 /v1
      const apiBaseUrl = providerInfo.baseUrl.endsWith('/v1')
        ? providerInfo.baseUrl
        : `${providerInfo.baseUrl}/v1`

      const providerOptions: ChatGPTAPIOptions = {
        apiKey: providerInfo.apiKey,
        completionParams: { model: selectedModel },
        debug: !disableDebug,
        messageStore: undefined,
        apiBaseUrl,
        maxModelTokens: 128000,
        maxResponseTokens: maxTokens || 8192,
      }

      setupProxy(providerOptions as any)
      apiInstance = new ChatGPTAPI({ ...providerOptions })
      console.warn('🔧 [ChatGPT] 已创建 API 实例，URL:', apiBaseUrl)
    }
    else if (lastContext?.providerId || providerId) {
      // 🔥 旧方式：通过 providerId 查询数据库（兼容）
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

          // 🔥 使用供应商配置创建新的 API 实例
          // ChatGPT API 需要完整的 URL，包括 /v1
          const apiBaseUrl = providerInfo.baseUrl.endsWith('/v1')
            ? providerInfo.baseUrl
            : `${providerInfo.baseUrl}/v1`

          const providerOptions: ChatGPTAPIOptions = {
            apiKey: providerInfo.apiKey,
            completionParams: { model: selectedModel },
            debug: !disableDebug,
            messageStore: undefined,
            apiBaseUrl,
            maxModelTokens: 128000,
            maxResponseTokens: maxTokens || 8192,
          }

          setupProxy(providerOptions as any)
          apiInstance = new ChatGPTAPI({ ...providerOptions })
          console.warn('🔧 [ChatGPT] 已创建供应商专用 API 实例，URL:', apiBaseUrl)
        }
        else {
          console.warn('⚠️ [ChatGPT] 未找到供应商，使用默认配置')
        }
      }
      catch (error) {
        console.error('❌ [ChatGPT] 查找供应商失败:', error)
        // 降级到默认实例
      }
    }

    // 如果没有使用供应商配置，则使用原有逻辑
    if (!providerInfo && isNotEmptyString(selectedModel) && apiModel === 'ChatGPTAPI') {
      apiInstance = createApiForProvider(selectedModel, maxTokens)
    }

    // 🔥 确保 apiInstance 已创建
    if (!apiInstance) {
      throw new Error('API 实例未创建，请检查配置或提供 baseURL 和 apiKey')
    }

    // 🔥 判断当前使用的 API 类型
    const currentApiModel = apiInstance instanceof ChatGPTAPI ? 'ChatGPTAPI' : 'ChatGPTUnofficialProxyAPI'

    if (currentApiModel === 'ChatGPTAPI') {
      if (isNotEmptyString(systemMessage))
        options.systemMessage = systemMessage
      // 使用请求中的模型参数，如果没有则使用默认模型
      options.completionParams = {
        model: selectedModel,
        temperature,
        top_p,
        // 🔥 OpenAI 默认值都是 0，我们保持默认即可
        // presence_penalty: 0,
        // frequency_penalty: 0,
      }
      // 如果提供了 maxTokens，设置 maxResponseTokens
      if (maxTokens && apiInstance instanceof ChatGPTAPI) {
        const chatGptApi = apiInstance as any
        if (chatGptApi.maxResponseTokens !== maxTokens)
          chatGptApi.maxResponseTokens = maxTokens
      }
    }

    if (lastContext != null) {
      if (currentApiModel === 'ChatGPTAPI')
        options.parentMessageId = lastContext.parentMessageId
      else
        options = { ...lastContext }
    }

    console.warn('📤 [ChatGPT] 准备发送请求:')
    console.warn('   消息:', message.substring(0, 100))
    console.warn('   模型:', selectedModel)
    console.warn('   选项:', {
      systemMessage: options.systemMessage?.substring(0, 50),
      completionParams: options.completionParams,
      parentMessageId: options.parentMessageId,
      timeoutMs,
    })

    const startTime = Date.now()

    // 🔥 手动累积文本（修复 GLM-4.6 等模型的 text 字段为空问题）
    let accumulatedText = ''
    let accumulatedThinkingText = '' // 🔥 累积思考过程

    let progressCallbackCount = 0
    const progressStartTime = Date.now()
    let lastProgressTime = progressStartTime

    const response = await apiInstance.sendMessage(message, {
      ...options,
      onProgress: (partialResponse) => {
        progressCallbackCount++
        const currentTime = Date.now()
        const timeSinceLastProgress = currentTime - lastProgressTime

        if (progressCallbackCount === 1) {
          console.warn(`⏱️ [ChatGPT-性能] 首次onProgress回调: ${currentTime - progressStartTime}ms`)
        }

        if (timeSinceLastProgress > 100) {
          console.warn(`⏱️ [ChatGPT-性能] 第${progressCallbackCount}次回调，距离上次: ${timeSinceLastProgress}ms`)
        }

        lastProgressTime = currentTime

        // 🔥 从 delta 或 detail.choices[0].delta.content 获取增量内容
        const delta = (partialResponse as any).delta || ''
        const content = (partialResponse.detail?.choices?.[0] as any)?.delta?.content || ''
        const reasoningContent = (partialResponse.detail?.choices?.[0] as any)?.delta?.reasoning_content || ''

        // 🔥 记录跳过的次数
        let shouldSkip = false
        let skipReason = ''

        // 🔥 累积实际内容
        const actualContent = content || delta
        if (actualContent) {
          accumulatedText += actualContent
        }

        // 🔥 处理思考过程：如果有 reasoning_content，也传递给前端
        if (reasoningContent && !actualContent) {
          // 🔥 累积思考过程
          accumulatedThinkingText += reasoningContent

          // 思考过程：显示思考状态，但不累积到最终文本
          const thinkingText = `💭 思考中...\n${accumulatedThinkingText}`

          // 创建包含思考过程的响应对象
          const thinkingResponse = {
            ...partialResponse,
            text: thinkingText,
            isThinking: true, // 标记这是思考过程
          }

          processCallback?.(thinkingResponse)
          return
        }

        // 如果既没有实际内容也没有思考内容，跳过
        if (!actualContent && !reasoningContent) {
          shouldSkip = true
          skipReason = '没有内容'
        }

        // 记录跳过情况
        if (shouldSkip && progressCallbackCount <= 50) {
          console.warn(`⏱️ [ChatGPT-性能] 第${progressCallbackCount}次被跳过，原因: ${skipReason}`)
        }

        if (shouldSkip) {
          return
        }

        // 🔥 确保 text 字段有值（修复前端打字机效果）
        if (!partialResponse.text && accumulatedText) {
          partialResponse.text = accumulatedText
        }

        const callbackStartTime = Date.now()
        processCallback?.(partialResponse)
        const callbackTime = Date.now() - callbackStartTime

        if (callbackTime > 10) {
          console.warn(`⏱️ [ChatGPT-性能] processCallback耗时: ${callbackTime}ms`)
        }

        if (progressCallbackCount <= 20) {
          console.warn(`⏱️ [ChatGPT-性能] 第${progressCallbackCount}次成功调用processCallback，累积文本长度: ${accumulatedText.length}`)
        }
      },
    })
    const endTime = Date.now()

    // eslint-disable-next-line no-console
    console.log('✅ [ChatGPT] API 调用完成')
    // eslint-disable-next-line no-console
    console.log('⏱️ [ChatGPT] 耗时:', endTime - startTime, 'ms')
    console.warn(`⏱️ [ChatGPT-性能] onProgress总共被调用: ${progressCallbackCount}次`)
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
  return apiModel || 'ChatGPTAPI'
}

export type { ChatContext, ChatMessage }

export { chatConfig, chatReplyProcess, currentModel }
