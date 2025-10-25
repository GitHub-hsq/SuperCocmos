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

    /**
     * 🔥 更新会话的后端 UUID（建立 nanoid -> UUID 映射）
     */
    setBackendConversationId(nanoidUuid: string, backendUuid: string) {
      const index = this.history.findIndex(item => item.uuid === nanoidUuid)
      if (index !== -1) {
        this.history[index].backendConversationId = backendUuid
        debouncedRecordState(this.$state)
        if (import.meta.env.DEV) {
          console.log('🔗 [映射] 建立会话映射:', {
            前端nanoid: nanoidUuid,
            后端UUID: backendUuid,
          })
        }
      }
    },

    /**
     * 🔥 根据 nanoid 获取后端 UUID
     */
    getBackendConversationId(nanoidUuid: string): string | undefined {
      const history = this.history.find(item => item.uuid === nanoidUuid)
      return history?.backendConversationId
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

    // ============================================
    // 数据库同步相关方法
    // ============================================

    /**
     * 从数据库加载用户会话列表
     * 用于登录时同步会话
     */
    async loadConversationsFromBackend() {
      try {
        // 动态导入避免循环依赖
        const { fetchUserConversations } = await import('@/api/services/conversationService')

        console.warn('🔄 [ChatStore] 开始从数据库加载会话列表...')

        const response = await fetchUserConversations<any>()

        if (response.status === 'Success' && response.data) {
          const conversations = response.data as Array<{
            id: string
            title: string
            modelId: string
            providerId: string
            createdAt: string
            updatedAt: string
            messageCount: number
          }>

          if (conversations.length === 0) {
            console.warn('ℹ️ [ChatStore] 数据库无会话，保持本地状态')
            return { success: true, count: 0 }
          }

          // 清空当前会话
          this.history = []
          this.chat = []

          // 转换为前端格式
          for (const conv of conversations) {
            this.history.push({
              uuid: conv.id,
              title: conv.title,
              isEdit: false,
              mode: 'normal', // 默认模式，可以根据需要扩展
            })

            this.chat.push({
              uuid: conv.id,
              data: [], // 消息稍后按需加载
            })
          }

          // 设置第一个会话为激活状态
          if (this.history.length > 0) {
            this.active = this.history[0].uuid
          }

          // 保存到 localStorage
          this.recordStateImmediate()

          console.warn('✅ [ChatStore] 会话列表加载成功:', {
            总数: conversations.length,
            激活会话: this.active,
          })

          return { success: true, count: conversations.length }
        }

        return { success: false, error: '数据格式错误' }
      }
      catch (error: any) {
        // 静默处理 404（用户未登录或没有会话）
        if (error?.response?.status === 404 || error?.message?.includes('404')) {
          console.warn('ℹ️ [ChatStore] 用户暂无会话记录')
          return { success: true, count: 0 }
        }

        console.error('❌ [ChatStore] 加载会话列表失败:', error)
        return { success: false, error: error.message }
      }
    },

    /**
     * 从数据库加载指定会话的消息
     * 用于切换会话时按需加载
     */
    async loadConversationMessages(conversationId: string) {
      try {
        const { fetchConversationMessages } = await import('@/api/services/conversationService')

        console.warn(`🔄 [ChatStore] 加载会话 ${conversationId} 的消息...`)

        const response = await fetchConversationMessages<any>(conversationId)

        if (response.status === 'Success' && response.data) {
          const messages = response.data as Array<{
            id: string
            role: 'user' | 'assistant' | 'system'
            content: string
            tokens?: number
            createdAt: string
          }>

          // 转换为前端格式
          const chatData: Chat.Chat[] = []
          let userMessage: Chat.Chat | null = null

          for (const msg of messages) {
            if (msg.role === 'user') {
              // 用户消息
              userMessage = {
                dateTime: new Date(msg.createdAt).toLocaleString(),
                text: msg.content,
                inversion: true,
                error: false,
                conversationOptions: null,
                requestOptions: { prompt: msg.content, options: null },
              }
              chatData.push(userMessage)
            }
            else if (msg.role === 'assistant') {
              // AI 回复
              chatData.push({
                dateTime: new Date(msg.createdAt).toLocaleString(),
                text: msg.content,
                inversion: false,
                error: false,
                loading: false,
                conversationOptions: null,
                requestOptions: { prompt: '', options: null },
              })
            }
          }

          // 更新 chat 数据
          const chatIndex = this.chat.findIndex(item => item.uuid === conversationId)
          if (chatIndex !== -1) {
            this.chat[chatIndex].data = chatData
          }
          else {
            this.chat.push({ uuid: conversationId, data: chatData })
          }

          // 保存到 localStorage
          this.recordStateImmediate()

          console.warn(`✅ [ChatStore] 会话消息加载成功: ${messages.length} 条`)

          return { success: true, count: messages.length }
        }

        return { success: false, error: '数据格式错误' }
      }
      catch (error: any) {
        if (error?.response?.status === 404 || error?.message?.includes('404')) {
          console.warn(`ℹ️ [ChatStore] 会话 ${conversationId} 暂无消息`)
          return { success: true, count: 0 }
        }

        console.error('❌ [ChatStore] 加载会话消息失败:', error)
        return { success: false, error: error.message }
      }
    },

    /**
     * 保存当前会话到数据库
     * 用于新建会话或同步本地会话到云端
     */
    async syncConversationToBackend(uuid: string) {
      try {
        const { createConversation, saveMessages } = await import('@/api/services/conversationService')
        const { useModelStore } = await import('../model')

        const modelStore = useModelStore()
        const historyItem = this.history.find(item => item.uuid === uuid)
        const chatItem = this.chat.find(item => item.uuid === uuid)

        if (!historyItem || !chatItem) {
          return { success: false, error: '会话不存在' }
        }

        // 获取当前模型信息
        const currentModel = modelStore.currentModel
        if (!currentModel) {
          return { success: false, error: '未选择模型' }
        }

        // 创建会话
        const convResponse = await createConversation<any>({
          title: historyItem.title,
          modelId: currentModel.id,
          providerId: currentModel.providerId || '',
        })

        if (convResponse.status !== 'Success' || !convResponse.data) {
          return { success: false, error: '创建会话失败' }
        }

        const conversationId = convResponse.data.id

        // 保存消息
        if (chatItem.data.length > 0) {
          const messages = chatItem.data.map((msg) => ({
            role: msg.inversion ? 'user' as const : 'assistant' as const,
            content: msg.text,
          }))

          await saveMessages(conversationId, messages)
        }

        console.warn(`✅ [ChatStore] 会话 ${uuid} 已同步到数据库`)

        return { success: true, conversationId }
      }
      catch (error: any) {
        console.error('❌ [ChatStore] 同步会话失败:', error)
        return { success: false, error: error.message }
      }
    },
  },
})
