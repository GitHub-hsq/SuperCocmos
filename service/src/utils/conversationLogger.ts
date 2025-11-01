/**
 * 对话历史日志工具
 * 用于将完整的对话上下文和相关信息保存到 JSON 文件
 * 便于调试上下文注入是否成功
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * 对话日志数据结构
 */
export interface ConversationLog {
  timestamp: string
  conversationId: string
  userId: string
  modelId: string
  providerId: string
  systemPrompt?: string
  userPrompt: string
  historyMessages: Array<{
    role: 'user' | 'assistant' | 'system'
    content: string
  }>
  contextMessageCount: number
  responseLength: number
  isContextInjectionSuccess: boolean
  notes?: string
}

/**
 * 保存对话上下文日志到 JSON 文件
 * @param conversationData 对话数据
 */
export function saveConversationLog(conversationData: ConversationLog): void {
  try {
    // 确保日志目录存在
    // 工作目录: /c/Works/SuperCocmos/service (或 C:\Works\SuperCocmos\service)
    // 日志目录: /c/Works/SuperCocmos/service/logs/conversations
    const logsDir = join(process.cwd(), '..', 'logs', 'conversations')
    mkdirSync(logsDir, { recursive: true })

    // 生成文件名（使用对话ID和时间戳）
    const filename = `${conversationData.conversationId}-${Date.now()}.json`
    const filepath = join(logsDir, filename)

    // 格式化JSON（便于阅读）
    const logContent = JSON.stringify(conversationData, null, 2)

    // 写入文件
    writeFileSync(filepath, logContent, 'utf-8')

    // 输出绝对路径方便用户查找
    console.warn(`💾 [对话日志] 已保存到: ${filepath}`)
  }
  catch (error) {
    console.error('❌ [对话日志] 保存失败:', error)
  }
}

/**
 * 记录对话和上下文信息
 * 用于判断上下文注入是否成功
 */
export function logConversationContext(
  conversationId: string,
  userId: string,
  modelId: string,
  providerId: string,
  userPrompt: string,
  historyMessages: Array<{ role: string, content: string }>,
  responseLength: number,
  systemPrompt?: string,
  isSuccess: boolean = true,
  notes?: string,
): void {
  const log: ConversationLog = {
    timestamp: new Date().toISOString(),
    conversationId,
    userId,
    modelId,
    providerId,
    systemPrompt,
    userPrompt,
    historyMessages: historyMessages.map(msg => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    })),
    contextMessageCount: historyMessages.length,
    responseLength,
    isContextInjectionSuccess: isSuccess,
    notes,
  }

  saveConversationLog(log)
}
