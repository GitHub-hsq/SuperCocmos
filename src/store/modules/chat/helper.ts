import { nanoid } from 'nanoid'
import { t } from '@/locales'
import { ss } from '@/utils/storage'

const LOCAL_NAME = 'chatStorage'

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
