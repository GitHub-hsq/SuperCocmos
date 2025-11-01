import { createLocalStorage } from '@/utils/storage'

// 🔥 会话列表缓存（保留）
const CONVERSATIONS_CACHE_KEY = 'conversations_cache'
const CONVERSATIONS_CACHE_TIMESTAMP_KEY = 'conversations_cache_timestamp'
const CONVERSATIONS_CACHE_TTL = 30 * 60 * 1000 // 🔥 会话列表缓存30分钟

// 🔥 用户偏好设置存储（active, usingContext, chatMode）
const CHAT_PREFERENCES_KEY = 'chatPreferences'

// 🔥 使用 7 天过期时间（之前是永不过期）
// 这样可以自动清理过期的本地缓存，避免跨设备数据不一致
const ss = createLocalStorage({ expire: 60 * 60 * 24 * 7 }) // 7天过期

export interface ChatPreferences {
  active: string | null
  usingContext: boolean
  chatMode: 'normal' | 'noteToQuestion' | 'noteToStory'
}

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

export function defaultPreferences(): ChatPreferences {
  return {
    active: null,
    usingContext: true,
    chatMode: 'normal',
  }
}

/**
 * 🔥 从 localStorage 加载用户偏好设置
 */
export function getLocalPreferences(): ChatPreferences {
  const preferences = ss.get(CHAT_PREFERENCES_KEY)
  return { ...defaultPreferences(), ...preferences }
}

/**
 * 🔥 保存用户偏好设置到 localStorage
 */
export function setLocalPreferences(preferences: Partial<ChatPreferences>) {
  const current = getLocalPreferences()
  ss.set(CHAT_PREFERENCES_KEY, { ...current, ...preferences })
}

/**
 * 🔥 获取初始状态（仅从偏好设置恢复，history 和 chat 从 conversations_cache 和内存中恢复）
 */
export function getLocalState(): Chat.ChatState {
  const preferences = getLocalPreferences()
  return {
    ...defaultState(),
    active: preferences.active,
    usingContext: preferences.usingContext,
    chatMode: preferences.chatMode,
    // history 和 chat 从 conversations_cache 恢复（在 store 中处理）
    history: [],
    chat: [],
    workflowStates: [], // 工作流状态不持久化，只在内存中
  }
}

/**
 * 🔥 保存状态（仅保存偏好设置，不保存 history 和 chat）
 */
export function setLocalState(state: Chat.ChatState) {
  // 🔥 只保存用户偏好设置，不保存会话列表和消息
  // 会话列表通过 conversations_cache 管理，消息不缓存到前端
  setLocalPreferences({
    active: state.active,
    usingContext: state.usingContext,
    chatMode: state.chatMode,
  })
}

/**
 * 🔥 获取缓存的会话列表
 * @returns 如果缓存有效则返回会话列表，否则返回 null
 */
export function getCachedConversations(): any[] | null {
  try {
    const timestamp = ss.get(CONVERSATIONS_CACHE_TIMESTAMP_KEY)
    if (!timestamp) {
      return null
    }

    const now = Date.now()
    const age = now - timestamp

    if (age > CONVERSATIONS_CACHE_TTL) {
      return null
    }

    const cached = ss.get(CONVERSATIONS_CACHE_KEY)
    if (!cached) {
      return null
    }

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
  }
  catch (error) {
    console.error('❌ [ConversationCache] 写入缓存失败:', error)
  }
}

/**
 * 🔥 更新会话列表缓存（将当前的 history 同步到缓存）
 * @param history 会话历史列表
 */
export function updateCachedConversations(history: Array<{ uuid: string, backendConversationId?: string, title: string, mode: 'normal' | 'noteToQuestion' | 'noteToStory' }>): void {
  try {
    // 转换为缓存格式
    const conversations = history.map(h => ({
      id: h.backendConversationId || h.uuid,
      frontend_uuid: h.uuid,
      title: h.title,
      mode: h.mode,
      // 其他字段根据需要添加
    }))

    ss.set(CONVERSATIONS_CACHE_KEY, conversations)
    ss.set(CONVERSATIONS_CACHE_TIMESTAMP_KEY, Date.now())
  }
  catch (error) {
    console.error('❌ [ConversationCache] 更新缓存失败:', error)
  }
}

/**
 * 🔥 清除会话列表缓存
 * ⚠️ 只在必要时清除：登出、重置状态、登录时强制刷新
 */
export function clearCachedConversations(): void {
  try {
    ss.remove(CONVERSATIONS_CACHE_KEY)
    ss.remove(CONVERSATIONS_CACHE_TIMESTAMP_KEY)
  }
  catch (error) {
    console.error('❌ [ConversationCache] 清除缓存失败:', error)
  }
}
