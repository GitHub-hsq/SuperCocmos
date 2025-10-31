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

    // 🔥 如果有历史消息，使用原生 fetch 调用（与 chatNative 相同的逻辑）
    if (historyMessages && historyMessages.length > 0) {
      const fullMessages = [
        ...historyMessages,
        { role: 'user', content: message },
      ]

      const apiUrl = `${apiBaseUrl}/chat/completions`

      const requestBody = {
        model,
        messages: fullMessages,
        temperature: temperature || 0.7,
        top_p: top_p || 1,
        max_tokens: maxTokens || 4096,
        stream: true,
      }

      console.log('[ChatGPT库-流式] 发送请求:', {
        url: apiUrl,
        model,
        messagesCount: fullMessages.length,
      })

      const fetchResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      })

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
              const delta = data.choices?.[0]?.delta?.content || ''

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
            catch {
              // 忽略解析错误
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

      console.log('📊 [ChatGPT库-流式] 响应信息:', {
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

    console.log('[ChatGPT库] 发送请求:', {
      model,
      hasContext: !!lastContext,
    })

    // 构建发送选项
    let sendOptions: SendMessageOptions = {
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

    console.log('📊 [ChatGPT库] 响应信息:', {
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
