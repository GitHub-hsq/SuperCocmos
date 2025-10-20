/**
 * 💾 前端消息缓存工具
 * - 使用 localStorage 缓存最近 8-10 条消息
 * - 减少后端查询，加快响应速度
 * - 与后端 Redis 缓存协同工作
 */

import { ss } from './storage'

const MESSAGE_CACHE_PREFIX = 'msg_cache_'
const MAX_CACHED_MESSAGES = 10 // 最多缓存 10 条消息

export interface CachedMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: number
}

/**
 * 🔑 获取缓存 key
 */
function getCacheKey(conversationId: string): string {
  return `${MESSAGE_CACHE_PREFIX}${conversationId}`
}

/**
 * 📥 从 localStorage 获取对话的消息缓存
 */
export function getMessagesFromLocalCache(conversationId: string): CachedMessage[] | null {
  try {
    if (!conversationId)
      return null

    const key = getCacheKey(conversationId)
    const cached = ss.get(key)

    if (!cached || !Array.isArray(cached))
      return null

    console.log(`✅ [前端缓存] 命中: ${conversationId}，消息数: ${cached.length}`)
    return cached as CachedMessage[]
  }
  catch (error) {
    console.error('❌ [前端缓存] 读取消息缓存失败:', error)
    return null
  }
}

/**
 * 📤 将消息缓存到 localStorage
 */
export function setMessagesToLocalCache(
  conversationId: string,
  messages: CachedMessage[],
): boolean {
  try {
    if (!conversationId)
      return false

    // 只保留最近的 N 条消息
    const recentMessages = messages.slice(-MAX_CACHED_MESSAGES)

    const key = getCacheKey(conversationId)
    ss.set(key, recentMessages)

    console.log(`✅ [前端缓存] 写入: ${conversationId}，消息数: ${recentMessages.length}`)
    return true
  }
  catch (error) {
    console.error('❌ [前端缓存] 写入消息缓存失败:', error)
    return false
  }
}

/**
 * ➕ 添加新消息到缓存
 */
export function appendMessageToLocalCache(
  conversationId: string,
  message: CachedMessage,
): boolean {
  try {
    if (!conversationId)
      return false

    // 获取现有消息
    const messages = getMessagesFromLocalCache(conversationId) || []

    // 添加新消息
    messages.push({
      ...message,
      timestamp: Date.now(),
    })

    // 保存回缓存
    return setMessagesToLocalCache(conversationId, messages)
  }
  catch (error) {
    console.error('❌ [前端缓存] 追加消息失败:', error)
    return false
  }
}

/**
 * 🗑️ 清除对话的消息缓存
 */
export function clearLocalMessageCache(conversationId: string): boolean {
  try {
    if (!conversationId)
      return false

    const key = getCacheKey(conversationId)
    ss.remove(key)
    console.log(`✅ [前端缓存] 清除: ${conversationId}`)
    return true
  }
  catch (error) {
    console.error('❌ [前端缓存] 清除消息缓存失败:', error)
    return false
  }
}

/**
 * 🗑️ 清除所有消息缓存
 */
export function clearAllMessageCaches(): void {
  try {
    const storage = localStorage
    const keysToRemove: string[] = []

    // 找出所有消息缓存 key
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i)
      if (key && key.startsWith(MESSAGE_CACHE_PREFIX)) {
        keysToRemove.push(key)
      }
    }

    // 删除所有消息缓存
    keysToRemove.forEach(key => storage.removeItem(key))
    console.log(`✅ [前端缓存] 清除所有缓存，共 ${keysToRemove.length} 个`)
  }
  catch (error) {
    console.error('❌ [前端缓存] 清除所有缓存失败:', error)
  }
}

/**
 * 📊 获取缓存的消息数量
 */
export function getCachedMessageCount(conversationId: string): number {
  const messages = getMessagesFromLocalCache(conversationId)
  return messages ? messages.length : 0
}

/**
 * 🔄 将消息转换为 API 请求格式
 */
export function messagesToApiFormat(
  messages: CachedMessage[],
): Array<{ role: string, content: string }> {
  return messages.map(msg => ({
    role: msg.role,
    content: msg.content,
  }))
}

/**
 * 📦 从聊天数据源转换为缓存格式
 * @param dataSources 聊天数据源（来自 store）
 * @returns 缓存消息列表
 */
export function convertDataSourceToCache(
  dataSources: any[],
): CachedMessage[] {
  const messages: CachedMessage[] = []

  for (const item of dataSources) {
    if (item.inversion) {
      // 用户消息
      messages.push({
        role: 'user',
        content: item.text,
        timestamp: Date.now(),
      })
    }
    else if (item.text && !item.loading && !item.error) {
      // 助手消息（排除加载中和错误的消息）
      messages.push({
        role: 'assistant',
        content: item.text,
        timestamp: Date.now(),
      })
    }
  }

  return messages
}

/**
 * 🔄 从后端加载对话消息并缓存到本地
 * @param conversationId 对话ID
 * @returns 消息列表（API 格式）
 */
export async function loadMessagesFromBackend(
  conversationId: string,
): Promise<Array<{ role: string, content: string }> | null> {
  try {
    if (!conversationId)
      return null

    // 动态导入 API 服务（避免循环依赖）
    const { fetchConversationMessages } = await import('@/api/services/conversationService')

    console.log(`📡 [前端缓存] 从后端加载对话历史: ${conversationId}`)

    const response = await fetchConversationMessages(conversationId, { limit: 20 })

    if (!response || !response.data || !response.data.messages)
      return null

    const messages = response.data.messages

    // 转换为缓存格式
    const cachedMessages: CachedMessage[] = messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      timestamp: new Date(msg.created_at).getTime(),
    }))

    // 保存到 localStorage
    setMessagesToLocalCache(conversationId, cachedMessages)

    // 转换为 API 格式返回
    const apiMessages = messagesToApiFormat(cachedMessages)

    console.log(`✅ [前端缓存] 从后端加载 ${apiMessages.length} 条消息`)

    return apiMessages
  }
  catch (error) {
    console.error('❌ [前端缓存] 从后端加载消息失败:', error)
    return null
  }
}

/**
 * 🎯 获取对话上下文（自动降级：localStorage → Backend）
 * @param conversationId 对话ID
 * @param limit 最多返回的消息数
 * @returns ChatGPT 格式的消息列表
 */
export async function getConversationContext(
  conversationId: string,
  limit: number = 10,
): Promise<Array<{ role: string, content: string }>> {
  try {
    if (!conversationId) {
      console.log('⚠️ [前端缓存] 没有对话ID')
      return []
    }

    // 1. 尝试从 localStorage 读取
    let messages = getMessagesFromLocalCache(conversationId)

    // 2. 如果本地没有，从后端加载
    if (!messages || messages.length === 0) {
      console.log('📚 [前端缓存] 本地缓存未命中，从后端加载')
      const backendMessages = await loadMessagesFromBackend(conversationId)
      return backendMessages || []
    }

    // 3. 只取最近的 limit 条
    const recentMessages = messages.slice(-limit)

    // 4. 转换为 API 格式
    const apiMessages = messagesToApiFormat(recentMessages)

    console.log(`📝 [前端缓存] 加载成功: ${apiMessages.length} 条消息`)
    return apiMessages
  }
  catch (error) {
    console.error('❌ [前端缓存] 获取对话上下文失败:', error)
    return []
  }
}

