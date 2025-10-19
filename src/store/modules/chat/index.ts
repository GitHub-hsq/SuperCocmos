import { nanoid } from 'nanoid'
import { defineStore } from 'pinia'
import { t } from '@/locales'
import { router } from '@/router'
import { debounce } from '@/utils/debounce'
import { defaultState, getLocalState, setLocalState } from './helper'

// 创建防抖的recordState函数
const debouncedRecordState = debounce((state: Chat.ChatState) => {
  setLocalState(state)
}, 300)

export const useChatStore = defineStore('chat-store', {
  state: (): Chat.ChatState => getLocalState(),

  getters: {
    getChatHistoryByCurrentActive(state: Chat.ChatState) {
      const index = state.history.findIndex(item => item.uuid === state.active)
      if (index !== -1)
        return state.history[index]
      return null
    },

    getChatByUuid(state: Chat.ChatState) {
      return (uuid?: string) => {
        if (uuid)
          return state.chat.find(item => item.uuid === uuid)?.data ?? []
        return state.chat.find(item => item.uuid === state.active)?.data ?? []
      }
    },

    getWorkflowStateByUuid(state: Chat.ChatState) {
      return (uuid: string) => {
        return state.workflowStates.find(item => item.uuid === uuid)?.state
      }
    },
  },

  actions: {
    setUsingContext(context: boolean) {
      this.usingContext = context
      debouncedRecordState(this.$state)
    },

    setChatMode(mode: 'normal' | 'noteToQuestion' | 'noteToStory') {
      this.chatMode = mode
      debouncedRecordState(this.$state)
    },

    addHistory(history: Chat.History, chatData: Chat.Chat[] = []) {
      this.history.unshift(history)
      this.chat.unshift({ uuid: history.uuid, data: chatData })
      this.active = history.uuid
      this.chatMode = history.mode
      this.reloadRoute(history.uuid)
    },

    updateHistory(uuid: string, edit: Partial<Chat.History>) {
      const index = this.history.findIndex(item => item.uuid === uuid)
      if (index !== -1) {
        this.history[index] = { ...this.history[index], ...edit }
        debouncedRecordState(this.$state)
      }
    },

    async deleteHistory(index: number) {
      this.history.splice(index, 1)
      this.chat.splice(index, 1)

      if (this.history.length === 0) {
        this.active = null
        this.reloadRoute()
        return
      }

      if (index > 0 && index <= this.history.length) {
        const uuid = this.history[index - 1].uuid
        this.active = uuid
        this.reloadRoute(uuid)
        return
      }

      if (index === 0) {
        if (this.history.length > 0) {
          const uuid = this.history[0].uuid
          this.active = uuid
          this.reloadRoute(uuid)
        }
      }

      if (index > this.history.length) {
        const uuid = this.history[this.history.length - 1].uuid
        this.active = uuid
        this.reloadRoute(uuid)
      }
    },

    async setActive(uuid: string) {
      this.active = uuid
      // 根据对话的模式设置聊天模式
      const history = this.history.find(item => item.uuid === uuid)
      if (history)
        this.chatMode = history.mode

      return await this.reloadRoute(uuid)
    },

    getChatByUuidAndIndex(uuid: string, index: number) {
      if (!uuid) {
        if (this.chat.length)
          return this.chat[0].data[index]
        return null
      }
      const chatIndex = this.chat.findIndex(item => item.uuid === uuid)
      if (chatIndex !== -1)
        return this.chat[chatIndex].data[index]
      return null
    },

    addChatByUuid(uuid: string, chat: Chat.Chat) {
      if (!uuid) {
        if (this.history.length === 0) {
          const uuid = nanoid()
          this.history.push({ uuid, title: chat.text, isEdit: false, mode: 'normal' })
          this.chat.push({ uuid, data: [chat] })
          this.active = uuid
          this.chatMode = 'normal'
          debouncedRecordState(this.$state)
        }
        else {
          this.chat[0].data.push(chat)
          if (this.history[0].title === t('chat.newChatTitle'))
            this.history[0].title = chat.text
          debouncedRecordState(this.$state)
        }
      }

      const index = this.chat.findIndex(item => item.uuid === uuid)
      if (index !== -1) {
        this.chat[index].data.push(chat)
        if (this.history[index].title === t('chat.newChatTitle'))
          this.history[index].title = chat.text
        debouncedRecordState(this.$state)
      }
    },

    updateChatByUuid(uuid: string, index: number, chat: Chat.Chat) {
      if (!uuid) {
        if (this.chat.length) {
          this.chat[0].data[index] = chat
          debouncedRecordState(this.$state)
        }
        return
      }

      const chatIndex = this.chat.findIndex(item => item.uuid === uuid)
      if (chatIndex !== -1) {
        this.chat[chatIndex].data[index] = chat
        debouncedRecordState(this.$state)
      }
    },

    updateChatSomeByUuid(uuid: string, index: number, chat: Partial<Chat.Chat>) {
      if (!uuid) {
        if (this.chat.length) {
          this.chat[0].data[index] = { ...this.chat[0].data[index], ...chat }
          debouncedRecordState(this.$state)
        }
        return
      }

      const chatIndex = this.chat.findIndex(item => item.uuid === uuid)
      if (chatIndex !== -1) {
        this.chat[chatIndex].data[index] = { ...this.chat[chatIndex].data[index], ...chat }
        debouncedRecordState(this.$state)
      }
    },

    deleteChatByUuid(uuid: string, index: number) {
      if (!uuid) {
        if (this.chat.length) {
          this.chat[0].data.splice(index, 1)
          debouncedRecordState(this.$state)
        }
        return
      }

      const chatIndex = this.chat.findIndex(item => item.uuid === uuid)
      if (chatIndex !== -1) {
        this.chat[chatIndex].data.splice(index, 1)
        debouncedRecordState(this.$state)
      }
    },

    clearChatByUuid(uuid: string) {
      if (!uuid) {
        if (this.chat.length) {
          this.chat[0].data = []
          debouncedRecordState(this.$state)
        }
        return
      }

      const index = this.chat.findIndex(item => item.uuid === uuid)
      if (index !== -1) {
        this.chat[index].data = []
        debouncedRecordState(this.$state)
      }
    },

    clearHistory() {
      this.$state = { ...defaultState() }
      debouncedRecordState(this.$state)
    },

    async reloadRoute(uuid?: string) {
      debouncedRecordState(this.$state)
      await router.push({ name: 'Chat', params: { uuid } })
    },

    recordState() {
      setLocalState(this.$state)
    },

    // 立即保存状态（用于重要操作）
    recordStateImmediate() {
      setLocalState(this.$state)
    },

    // 工作流状态管理
    setWorkflowState(uuid: string, state: Chat.WorkflowState) {
      const index = this.workflowStates.findIndex(item => item.uuid === uuid)
      if (index !== -1)
        this.workflowStates[index].state = state
      else
        this.workflowStates.push({ uuid, state })

      debouncedRecordState(this.$state)
    },

    updateWorkflowStateSome(uuid: string, state: Partial<Chat.WorkflowState>) {
      const index = this.workflowStates.findIndex(item => item.uuid === uuid)
      if (index !== -1) {
        this.workflowStates[index].state = { ...this.workflowStates[index].state, ...state }
      }
      else {
        this.workflowStates.push({
          uuid,
          state: {
            stage: 'idle',
            uploadedFilePath: '',
            classification: '',
            generatedQuestions: [],
            ...state,
          },
        })
      }
      debouncedRecordState(this.$state)
    },

    clearWorkflowState(uuid: string) {
      const index = this.workflowStates.findIndex(item => item.uuid === uuid)
      if (index !== -1) {
        this.workflowStates.splice(index, 1)
        debouncedRecordState(this.$state)
      }
    },
  },
})
