/**
 * ChatGPT 库实现的聊天接口
 * 使用 chatgpt 库进行 API 调用
 */

import type { ChatGPTAPIOptions, SendMessageOptions } from 'chatgpt'
import type { ChatContext } from '../types'
import { ChatGPTAPI } from 'chatgpt'
import * as dotenv from 'dotenv'
import fetch from 'node-fetch'
import { sendResponse } from '../utils'
import { isNotEmptyString } from '../utils/is'
import { setupProxy } from './utils'

dotenv.config()

const disableDebug: boolean = process.env.OPENAI_API_DISABLE_DEBUG === 'true'
const timeoutMs: number = !Number.isNaN(+process.env.TIMEOUT_MS) ? +process.env.TIMEOUT_MS : 100 * 1000

interface LibraryChatOptions {
  message: string
  historyMessages?: Array<{ role: string, content: string }>
  lastContext?: ChatContext | null
  systemMessage?: string
  temperature?: number
  top_p?: number
  model: string
  maxTokens?: number
  baseURL?: string
  apiKey?: string
  processCallback?: (response: any) => void
}

/**
 * 使用 chatgpt 库进行聊天
 */
export async function chatReplyProcessLibrary(options: LibraryChatOptions) {
  const {
    message,
    historyMessages,
    lastContext,
    systemMessage,
    temperature,
    top_p,
    model,
    maxTokens,
    baseURL,
    apiKey,
    processCallback,
  } = options

  try {
    const startTime = Date.now()

    // 创建 API 实例
    if (!baseURL || !apiKey) {
      throw new Error('缺少必需的参数: baseURL 或 apiKey')
    }

    const apiBaseUrl = baseURL.endsWith('/v1')
      ? baseURL
      : `${baseURL}/v1`

    // 🔥 检测是否使用 MiniMax 模型（MiniMax API 格式与标准 OpenAI 不完全兼容）
    const isMiniMaxModel = model.toLowerCase().includes('minimax')

    // 🔥 如果有历史消息或使用 MiniMax 模型，使用原生 fetch 调用（与 chatNative 相同的逻辑）
    if ((historyMessages && historyMessages.length > 0) || isMiniMaxModel) {
      const fullMessages = [
        ...(historyMessages || []),
        { role: 'user', content: message },
      ]

      // 🔥 如果有系统消息，添加到消息列表开头
      if (systemMessage) {
        fullMessages.unshift({ role: 'system', content: systemMessage })
      }

      const apiUrl = `${apiBaseUrl}/chat/completions`

      const requestBody = {
        model,
        messages: fullMessages,
        temperature: temperature || 0.7,
        top_p: top_p || 1,
        max_tokens: maxTokens || 4096,
        stream: true,
      }

      console.warn('[ChatGPT库-流式] 发送请求:', {
        url: apiUrl,
        model,
        messagesCount: fullMessages.length,
      })

      // 🔥 配置代理和 TLS 选项
      const fetchOptions: any = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
        timeout: 120000, // 120 秒超时
      }

      // 🔥 设置代理（如果配置了）
      setupProxy(fetchOptions)

      // 🔥 如果配置了自定义 fetch，使用它
      const fetchFn = fetchOptions.fetch || fetch
      delete fetchOptions.fetch // 移除自定义 fetch，避免传递给 node-fetch

      const fetchResponse = await fetchFn(apiUrl, fetchOptions)

      if (!fetchResponse.ok) {
        throw new Error(`API 调用失败: ${fetchResponse.statusText}`)
      }

      // 使用 Node.js 流处理
      const body = fetchResponse.body as any
      let buffer = ''
      const messageId = `msg_${Date.now()}`
      let accumulatedText = ''

      // 监听流数据
      body.on('data', (chunk: Buffer) => {
        buffer += chunk.toString('utf-8')
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.trim() || line === 'data: [DONE]')
            continue

          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.substring(6)
              const data = JSON.parse(jsonStr)

              // 🔥 兼容 MiniMax 和其他 API 格式
              // MiniMax 可能使用不同的字段结构，需要更灵活的解析
              let delta = ''

              // 标准 OpenAI 格式
              if (data.choices?.[0]?.delta?.content) {
                delta = data.choices[0].delta.content
              }
              // MiniMax 可能的格式
              else if (data.choices?.[0]?.delta) {
                // 如果没有 content，可能是其他字段，尝试读取文本字段
                delta = data.choices[0].delta.text || data.choices[0].delta.content || ''
              }
              // 直接 content 字段（某些 API 变体）
              else if (data.content) {
                delta = data.content
              }
              // 完整的 text 字段（某些 API 返回完整累积文本）
              else if (data.text && !accumulatedText) {
                // 首次接收完整文本
                delta = data.text
              }
              else if (data.text && accumulatedText && data.text.length > accumulatedText.length) {
                // 后续接收，提取增量
                delta = data.text.substring(accumulatedText.length)
              }

              if (delta) {
                accumulatedText += delta

                if (processCallback) {
                  processCallback({
                    id: messageId,
                    text: accumulatedText,
                    role: 'assistant',
                    detail: data,
                  } as any)
                }
              }
            }
            catch (error) {
              // 🔥 记录解析错误以便调试，但不中断流程
              if (process.env.NODE_ENV === 'development') {
                console.warn('⚠️ [SSE解析] 解析失败:', error, '原始数据:', line.substring(0, 200))
              }
            }
          }
        }
      })

      // 等待流结束
      await new Promise((resolve, reject) => {
        body.on('end', resolve)
        body.on('error', reject)
      })

      const responseTime = Date.now() - startTime

      console.warn('📊 [ChatGPT库-流式] 响应信息:', {
        time: `${responseTime}ms`,
        id: messageId,
        model,
        textLength: accumulatedText.length,
      })

      return sendResponse({
        type: 'Success',
        data: {
          id: messageId,
          text: accumulatedText,
          role: 'assistant',
          detail: {
            model,
            usage: {
              total_tokens: 0,
              estimated: true,
            },
          },
        },
      })
    }

    // 🔥 如果是 MiniMax 模型，强制使用原生 fetch 实现（即使没有历史消息）
    if (isMiniMaxModel) {
      const fullMessages = systemMessage
        ? [{ role: 'system', content: systemMessage }, { role: 'user', content: message }]
        : [{ role: 'user', content: message }]

      const apiUrl = `${apiBaseUrl}/chat/completions`

      const requestBody = {
        model,
        messages: fullMessages,
        temperature: temperature || 0.7,
        top_p: top_p || 1,
        max_tokens: maxTokens || 4096,
        stream: true,
      }

      console.warn('[ChatGPT库-MiniMax] 使用原生实现发送请求:', {
        url: apiUrl,
        model,
        messagesCount: fullMessages.length,
      })

      // 🔥 配置代理和 TLS 选项
      const fetchOptions: any = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
        timeout: 120000, // 120 秒超时
      }

      // 🔥 设置代理（如果配置了）
      setupProxy(fetchOptions)

      // 🔥 如果配置了自定义 fetch，使用它
      const fetchFn = fetchOptions.fetch || fetch
      delete fetchOptions.fetch // 移除自定义 fetch，避免传递给 node-fetch

      const fetchResponse = await fetchFn(apiUrl, fetchOptions)

      if (!fetchResponse.ok) {
        throw new Error(`API 调用失败: ${fetchResponse.statusText}`)
      }

      // 使用 Node.js 流处理
      const body = fetchResponse.body as any
      let buffer = ''
      const messageId = `msg_${Date.now()}`
      let accumulatedText = ''

      // 监听流数据
      body.on('data', (chunk: Buffer) => {
        buffer += chunk.toString('utf-8')
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.trim() || line === 'data: [DONE]')
            continue

          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.substring(6)
              const data = JSON.parse(jsonStr)

              // 🔥 兼容 MiniMax 和其他 API 格式
              let delta = ''

              // 标准 OpenAI 格式
              if (data.choices?.[0]?.delta?.content) {
                delta = data.choices[0].delta.content
              }
              // MiniMax 可能的格式
              else if (data.choices?.[0]?.delta) {
                delta = data.choices[0].delta.text || data.choices[0].delta.content || ''
              }
              // 直接 content 字段
              else if (data.content) {
                delta = data.content
              }
              // 完整的 text 字段
              else if (data.text && !accumulatedText) {
                delta = data.text
              }
              else if (data.text && accumulatedText && data.text.length > accumulatedText.length) {
                delta = data.text.substring(accumulatedText.length)
              }

              if (delta) {
                accumulatedText += delta

                if (processCallback) {
                  processCallback({
                    id: messageId,
                    text: accumulatedText,
                    role: 'assistant',
                    detail: data,
                  } as any)
                }
              }
            }
            catch (error) {
              if (process.env.NODE_ENV === 'development') {
                console.warn('⚠️ [SSE解析] 解析失败:', error, '原始数据:', line.substring(0, 200))
              }
            }
          }
        }
      })

      // 等待流结束
      await new Promise((resolve, reject) => {
        body.on('end', resolve)
        body.on('error', reject)
      })

      const responseTime = Date.now() - startTime

      console.warn('📊 [ChatGPT库-MiniMax] 响应信息:', {
        time: `${responseTime}ms`,
        id: messageId,
        model,
        textLength: accumulatedText.length,
      })

      return sendResponse({
        type: 'Success',
        data: {
          id: messageId,
          text: accumulatedText,
          role: 'assistant',
          detail: {
            model,
            usage: {
              total_tokens: 0,
              estimated: true,
            },
          },
        },
      })
    }

    // 🔥 否则使用 chatgpt 库的标准调用
    const apiOptions: ChatGPTAPIOptions = {
      apiKey,
      completionParams: { model },
      debug: !disableDebug,
      apiBaseUrl,
      maxModelTokens: 128000,
      maxResponseTokens: maxTokens || 8192,
    }

    setupProxy(apiOptions as any)
    const apiInstance = new ChatGPTAPI({ ...apiOptions })

    console.warn('[ChatGPT库] 发送请求:', {
      model,
      hasContext: !!lastContext,
    })

    // 构建发送选项
    const sendOptions: SendMessageOptions = {
      timeoutMs,
    }

    if (isNotEmptyString(systemMessage))
      sendOptions.systemMessage = systemMessage

    sendOptions.completionParams = {
      model,
      temperature,
      top_p,
    }

    if (lastContext != null) {
      sendOptions.parentMessageId = lastContext.parentMessageId
    }

    // 🔥 手动累积文本（修复某些模型的 text 字段为空问题）
    let accumulatedText = ''
    let accumulatedThinkingText = ''

    let _progressCallbackCount = 0
    const _progressStartTime = Date.now()
    let _lastProgressTime = _progressStartTime

    const response = await apiInstance.sendMessage(message, {
      ...sendOptions,
      onProgress: (partialResponse) => {
        _progressCallbackCount++
        const currentTime = Date.now()
        const _timeSinceLastProgress = currentTime - _lastProgressTime
        _lastProgressTime = currentTime

        // 🔥 从 delta 或 detail.choices[0].delta.content 获取增量内容
        const delta = (partialResponse as any).delta || ''
        const content = (partialResponse.detail?.choices?.[0] as any)?.delta?.content || ''
        const reasoningContent = (partialResponse.detail?.choices?.[0] as any)?.delta?.reasoning_content || ''

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
          return
        }

        // 🔥 确保 text 字段有值（修复前端打字机效果）
        if (!partialResponse.text && accumulatedText) {
          partialResponse.text = accumulatedText
        }

        processCallback?.(partialResponse)
      },
    })

    const responseTime = Date.now() - startTime

    console.warn('📊 [ChatGPT库] 响应信息:', {
      time: `${responseTime}ms`,
      id: response.id,
      model: response.detail?.model || '未知',
      tokens: response.detail?.usage || '未知',
    })

    return sendResponse({ type: 'Success', data: response })
  }
  catch (error: any) {
    console.error('❌ [ChatGPT库] 失败:', error)
    return sendResponse({ type: 'Fail', message: error.message || '请求失败' })
  }
}
