import { nanoid } from 'nanoid'
import { t } from '@/locales'
import { createLocalStorage } from '@/utils/storage'

const LOCAL_NAME = 'chatStorage'

// 🔥 修改：使用 7 天过期时间（之前是永不过期）
// 这样可以自动清理过期的本地缓存，避免跨设备数据不一致
const ss = createLocalStorage({ expire: 60 * 60 * 24 * 7 }) // 7天过期

export function defaultState(): Chat.ChatState {
  const uuid = nanoid()
  return {
    active: uuid,
    usingContext: true,
    history: [{ uuid, title: t('chat.newChatTitle'), isEdit: false, mode: 'normal' }],
    chat: [{ uuid, data: [] }],
    chatMode: 'normal',
    workflowStates: [],
  }
}

export function getLocalState(): Chat.ChatState {
  const localState = ss.get(LOCAL_NAME)
  return { ...defaultState(), ...localState }
}

export function setLocalState(state: Chat.ChatState) {
  ss.set(LOCAL_NAME, state)
}
