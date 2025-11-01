/**
 * 原生 Fetch 实现的聊天接口
 * 使用流式 API 调用，支持历史消息
 */

import fetch from 'node-fetch'
import { sendResponse } from '../utils'
import { setupProxy } from './utils'

interface NativeChatOptions {
  message: string
  historyMessages: Array<{ role: string, content: string }>
  baseURL: string
  apiKey: string
  model: string
  temperature?: number
  top_p?: number
  maxTokens?: number
  processCallback?: (response: any) => void
}

/**
 * 使用原生 fetch 进行流式聊天
 */
export async function chatReplyProcessNative(options: NativeChatOptions) {
  const {
    message,
    historyMessages,
    baseURL,
    apiKey,
    model,
    temperature,
    top_p,
    maxTokens,
    processCallback,
  } = options

  try {
    const startTime = Date.now()

    // 构建完整的消息列表
    const fullMessages = [
      ...historyMessages,
      { role: 'user', content: message },
    ]

    // 直接调用 OpenAI API
    const apiUrl = baseURL.endsWith('/v1')
      ? `${baseURL}/chat/completions`
      : `${baseURL}/v1/chat/completions`

    const requestBody = {
      model,
      messages: fullMessages,
      temperature: temperature || 0.7,
      top_p: top_p || 1,
      max_tokens: maxTokens || 4096,
      stream: true,
    }

    console.warn('[原生实现] 发送请求:', {
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

    // 🔥 使用 Node.js 流处理（node-fetch）
    const body = fetchResponse.body as any
    let buffer = ''
    const messageId = `msg_${Date.now()}`
    let accumulatedText = ''

    // 🔥 监听流数据
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

              // 调用进度回调
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

    // 🔥 等待流结束
    await new Promise((resolve, reject) => {
      body.on('end', resolve)
      body.on('error', reject)
    })

    // 返回最终响应
    const response = {
      id: messageId,
      text: accumulatedText,
      role: 'assistant',
      detail: {
        model,
        usage: {
          total_tokens: 0, // 需要从实际响应中获取
          estimated: true,
        },
      },
    }

    const responseTime = Date.now() - startTime
    console.warn('📊 [原生实现] 响应信息:', {
      time: `${responseTime}ms`,
      id: response.id,
      model,
      textLength: accumulatedText.length,
    })

    return sendResponse({
      type: 'Success',
      data: response,
    })
  }
  catch (error: any) {
    console.error('❌ [原生实现] 失败:', error)
    return sendResponse({ type: 'Fail', message: error.message || '请求失败' })
  }
}
