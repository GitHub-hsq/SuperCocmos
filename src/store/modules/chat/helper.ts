import { nanoid } from 'nanoid'
import { t } from '@/locales'
import { createLocalStorage } from '@/utils/storage'

const LOCAL_NAME = 'chatStorage'
const CONVERSATIONS_CACHE_KEY = 'conversations_cache'
const CONVERSATIONS_CACHE_TIMESTAMP_KEY = 'conversations_cache_timestamp'
const CONVERSATIONS_CACHE_TTL = 30 * 60 * 1000 // 🔥 会话列表缓存30分钟

// 🔥 修改：使用 7 天过期时间（之前是永不过期）
// 这样可以自动清理过期的本地缓存，避免跨设备数据不一致
const ss = createLocalStorage({ expire: 60 * 60 * 24 * 7 }) // 7天过期

export function defaultState(): Chat.ChatState {
  // 🔥 修改：不自动创建会话，让用户发送第一条消息时再创建
  return {
    active: null,
    usingContext: true,
    history: [],
    chat: [],
    chatMode: 'normal',
    workflowStates: [],
  }
}

export function getLocalState(): Chat.ChatState {
  const localState = ss.get(LOCAL_NAME)
  // 🔥 合并 defaultState 和 localStorage 中的状态
  // 注意：localStorage 中的 chat 数组已被清空（只保留 uuid），消息需要从后端加载
  return { ...defaultState(), ...localState }
}

export function setLocalState(state: Chat.ChatState) {
  // 🔥 只保存会话列表元数据，不保存消息内容（消息通过 Redis + API 管理）
  // 这样可以避免大量消息写入 localStorage 造成的性能问题（1-2秒延迟）
  const stateToSave = {
    ...state,
    chat: state.chat.map(item => ({ uuid: item.uuid, data: [] })), // 清空消息，只保留 uuid
  }
  ss.set(LOCAL_NAME, stateToSave)
}

/**
 * 🔥 获取缓存的会话列表
 * @returns 如果缓存有效则返回会话列表，否则返回 null
 */
export function getCachedConversations(): any[] | null {
  try {
    const timestamp = ss.get(CONVERSATIONS_CACHE_TIMESTAMP_KEY)
    if (!timestamp) {
      console.log('ℹ️ [ConversationCache] 缓存时间戳不存在')
      return null
    }

    const now = Date.now()
    const age = now - timestamp

    if (age > CONVERSATIONS_CACHE_TTL) {
      console.log(`ℹ️ [ConversationCache] 缓存已过期: ${Math.round(age / 1000)}秒前，TTL: ${CONVERSATIONS_CACHE_TTL / 1000}秒`)
      return null
    }

    const cached = ss.get(CONVERSATIONS_CACHE_KEY)
    if (!cached) {
      console.log('ℹ️ [ConversationCache] 缓存数据不存在')
      return null
    }

    console.log(`✅ [ConversationCache] 缓存命中: ${cached.length} 个会话，缓存年龄: ${Math.round(age / 1000)}秒`)
    return cached
  }
  catch (error) {
    console.error('❌ [ConversationCache] 读取缓存失败:', error)
    return null
  }
}

/**
 * 🔥 缓存会话列表
 * @param conversations 会话列表
 */
export function setCachedConversations(conversations: any[]): void {
  try {
    ss.set(CONVERSATIONS_CACHE_KEY, conversations)
    ss.set(CONVERSATIONS_CACHE_TIMESTAMP_KEY, Date.now())
    console.log(`💾 [ConversationCache] 已缓存 ${conversations.length} 个会话，TTL: ${CONVERSATIONS_CACHE_TTL / 60000}分钟`)
  }
  catch (error) {
    console.error('❌ [ConversationCache] 写入缓存失败:', error)
  }
}

/**
 * 🔥 清除会话列表缓存
 */
export function clearCachedConversations(): void {
  try {
    ss.remove(CONVERSATIONS_CACHE_KEY)
    ss.remove(CONVERSATIONS_CACHE_TIMESTAMP_KEY)
    console.log('🗑️ [ConversationCache] 缓存已清除')
  }
  catch (error) {
    console.error('❌ [ConversationCache] 清除缓存失败:', error)
  }
}
