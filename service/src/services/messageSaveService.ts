/**
 * 🔥 优化的消息保存服务
 * 实现：先写 Redis（pending）→ 异步写数据库 → 更新 Redis 状态（saved/failed）
 * 保证 Redis 和数据库最终一致性
 */

import type { Message } from '../db/messageService'
import { nanoid } from 'nanoid'
import { appendMessageToCache, updateMessageStatusInCache } from '../cache/messageCache'
import { incrementConversationStats } from '../db/conversationService'
import { createMessage, estimateTokens } from '../db/messageService'

const MAX_RETRY_ATTEMPTS = 3
const RETRY_DELAY_MS = 1000

/**
 * 🔄 延迟函数（用于重试）
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 💾 保存单条消息到数据库（带重试机制）
 */
async function saveMessageToDatabaseWithRetry(
  params: {
    conversation_id: string
    role: 'user' | 'assistant' | 'system'
    content: string
    tokens?: number
    model_info?: Record<string, any>
  },
  retryCount: number = 0,
): Promise<Message | null> {
  try {
    const message = await createMessage(params)
    return message
  }
  catch (error) {
    if (retryCount < MAX_RETRY_ATTEMPTS) {
      console.warn(`⚠️ [保存] 数据库写入失败，重试 ${retryCount + 1}/${MAX_RETRY_ATTEMPTS}:`, error)
      await delay(RETRY_DELAY_MS * (retryCount + 1)) // 指数退避
      return saveMessageToDatabaseWithRetry(params, retryCount + 1)
    }
    else {
      console.error('❌ [保存] 数据库写入失败，已重试', MAX_RETRY_ATTEMPTS, '次:', error)
      throw error
    }
  }
}

/**
 * 🚀 保存用户消息（优化的两阶段写入）
 * Step 1: 先写 Redis（pending）
 * Step 2: 异步写数据库，成功后更新 Redis 状态为 saved
 * Step 3: 数据库失败时，更新 Redis 状态为 failed
 */
export async function saveUserMessage(
  conversationId: string,
  content: string,
): Promise<{ messageId: string, success: boolean }> {
  const messageId = `msg_${nanoid()}`
  const tokens = estimateTokens(content)

  // 🔥 Step 1: 先写 Redis（pending 状态）
  const tempMessage: Message = {
    id: messageId,
    conversation_id: conversationId,
    role: 'user',
    content,
    tokens,
    created_at: new Date().toISOString(),
  }

  await appendMessageToCache(conversationId, tempMessage, 'pending')

  // 🔥 Step 2: 异步写数据库
  saveMessageToDatabaseWithRetry({
    conversation_id: conversationId,
    role: 'user',
    content,
    tokens,
  })
    .then(async (savedMessage) => {
      if (savedMessage) {
        // ✅ 数据库写入成功，更新 Redis 状态为 saved
        await updateMessageStatusInCache(conversationId, messageId, 'saved')
        console.warn(`✅ [保存] 用户消息已保存: ${messageId}`)
      }
      else {
        // ❌ 数据库写入失败，更新 Redis 状态为 failed
        await updateMessageStatusInCache(conversationId, messageId, 'failed')
        console.error(`❌ [保存] 用户消息保存失败: ${messageId}`)
      }
    })
    .catch(async (error) => {
      // ❌ 数据库写入异常，更新 Redis 状态为 failed
      await updateMessageStatusInCache(conversationId, messageId, 'failed')
      console.error(`❌ [保存] 用户消息保存异常: ${messageId}`, error)
    })

  // 立即返回，不等待数据库写入
  return { messageId, success: true }
}

/**
 * 🚀 保存助手消息（优化的两阶段写入）
 */
export async function saveAssistantMessage(
  conversationId: string,
  content: string,
  tokens: number,
  modelInfo?: Record<string, any>,
): Promise<{ messageId: string, success: boolean }> {
  const messageId = `msg_${nanoid()}`
  const finalTokens = tokens > 0 ? tokens : estimateTokens(content)

  // 🔥 Step 1: 先写 Redis（pending 状态）
  const tempMessage: Message = {
    id: messageId,
    conversation_id: conversationId,
    role: 'assistant',
    content,
    tokens: finalTokens,
    model_info: modelInfo,
    created_at: new Date().toISOString(),
  }

  await appendMessageToCache(conversationId, tempMessage, 'pending')

  // 🔥 Step 2: 异步写数据库
  saveMessageToDatabaseWithRetry({
    conversation_id: conversationId,
    role: 'assistant',
    content,
    tokens: finalTokens,
    model_info: modelInfo,
  })
    .then(async (savedMessage) => {
      if (savedMessage) {
        // ✅ 数据库写入成功，更新 Redis 状态为 saved
        await updateMessageStatusInCache(conversationId, messageId, 'saved')

        // 更新对话统计
        await incrementConversationStats(conversationId, finalTokens).catch(err =>
          console.error('❌ [保存] 更新对话统计失败:', err),
        )

        console.warn(`✅ [保存] 助手消息已保存: ${messageId}`)
      }
      else {
        // ❌ 数据库写入失败，更新 Redis 状态为 failed
        await updateMessageStatusInCache(conversationId, messageId, 'failed')
        console.error(`❌ [保存] 助手消息保存失败: ${messageId}`)
      }
    })
    .catch(async (error) => {
      // ❌ 数据库写入异常，更新 Redis 状态为 failed
      await updateMessageStatusInCache(conversationId, messageId, 'failed')
      console.error(`❌ [保存] 助手消息保存异常: ${messageId}`, error)
    })

  // 立即返回，不等待数据库写入
  return { messageId, success: true }
}

/**
 * 🚀 批量保存用户和助手消息（优化的两阶段写入）
 * 用于一次性保存一对消息（用户问题 + 助手回复）
 */
export async function saveMessagePair(
  conversationId: string,
  userContent: string,
  assistantContent: string,
  assistantTokens: number,
  modelInfo?: Record<string, any>,
): Promise<{ userMessageId: string, assistantMessageId: string, success: boolean }> {
  const userTokens = estimateTokens(userContent)
  const finalAssistantTokens = assistantTokens > 0 ? assistantTokens : estimateTokens(assistantContent)

  // 🔥 Step 1: 先写 Redis（pending 状态）
  const userMessageId = `msg_${nanoid()}`
  const assistantMessageId = `msg_${nanoid()}`

  const userMessage: Message = {
    id: userMessageId,
    conversation_id: conversationId,
    role: 'user',
    content: userContent,
    tokens: userTokens,
    created_at: new Date().toISOString(),
  }

  const assistantMessage: Message = {
    id: assistantMessageId,
    conversation_id: conversationId,
    role: 'assistant',
    content: assistantContent,
    tokens: finalAssistantTokens,
    model_info: modelInfo,
    created_at: new Date().toISOString(),
  }

  await appendMessageToCache(conversationId, userMessage, 'pending')
  await appendMessageToCache(conversationId, assistantMessage, 'pending')

  // 🔥 Step 2: 异步写数据库（顺序保存，确保用户消息先于助手消息）
  // ⚠️ 修复：使用顺序保存而非并行保存，避免时间戳顺序错乱
  const saveMessagesSequentially = async () => {
    let userMsg = null
    let assistantMsg = null

    try {
      // 先保存用户消息
      userMsg = await saveMessageToDatabaseWithRetry({
        conversation_id: conversationId,
        role: 'user',
        content: userContent,
        tokens: userTokens,
      })

      // 更新用户消息状态
      if (userMsg) {
        await updateMessageStatusInCache(conversationId, userMessageId, 'saved')
      }
      else {
        await updateMessageStatusInCache(conversationId, userMessageId, 'failed')
      }

      // 再保存助手消息（确保晚于用户消息）
      assistantMsg = await saveMessageToDatabaseWithRetry({
        conversation_id: conversationId,
        role: 'assistant',
        content: assistantContent,
        tokens: finalAssistantTokens,
        model_info: modelInfo,
      })

      // 更新助手消息状态
      if (assistantMsg) {
        await updateMessageStatusInCache(conversationId, assistantMessageId, 'saved')

        // 更新对话统计
        await incrementConversationStats(conversationId, userTokens + finalAssistantTokens).catch(err =>
          console.error('❌ [保存] 更新对话统计失败:', err),
        )
      }
      else {
        await updateMessageStatusInCache(conversationId, assistantMessageId, 'failed')
      }

      if (userMsg && assistantMsg) {
        console.warn(`✅ [保存] 消息对已保存（顺序正确）: ${userMessageId} → ${assistantMessageId}`)
      }
      else {
        console.warn(`⚠️ [保存] 消息对部分保存失败: user=${!!userMsg}, assistant=${!!assistantMsg}`)
      }
    }
    catch (error) {
      // 更新状态为 failed
      await updateMessageStatusInCache(conversationId, userMessageId, 'failed')
      await updateMessageStatusInCache(conversationId, assistantMessageId, 'failed')
      console.error(`❌ [保存] 消息对保存异常:`, error)
    }
  }

  // 启动异步保存（不等待完成）
  saveMessagesSequentially()

  // 立即返回，不等待数据库写入
  return {
    userMessageId,
    assistantMessageId,
    success: true,
  }
}
