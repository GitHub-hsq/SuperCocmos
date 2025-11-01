import { nanoid } from 'nanoid'
import { defineStore } from 'pinia'
import { t } from '@/locales'
import { router } from '@/router'
import { debounce } from '@/utils/debounce'
import { clearCachedConversations, defaultPreferences, defaultState, getCachedConversations, getLocalPreferences, getLocalState, setCachedConversations, setLocalPreferences, updateCachedConversations } from './helper'

// 创建防抖的recordPreferences函数（只保存偏好设置）
const debouncedRecordPreferences = debounce((preferences: { active: string | null, usingContext: boolean, chatMode: 'normal' | 'noteToQuestion' | 'noteToStory' }) => {
  setLocalPreferences(preferences)
}, 300)

/**
 * 🔥 从 conversations_cache 恢复会话列表到 state
 */
function restoreConversationsFromCache(state: Chat.ChatState): Chat.ChatState {
  const cachedConversations = getCachedConversations()
  if (cachedConversations && cachedConversations.length > 0) {
    // 转换为前端格式
    const history: Chat.History[] = []
    const chat: Array<{ uuid: string, data: Chat.Chat[] }> = []

    for (const conv of cachedConversations) {
      const frontendUuid = conv.frontend_uuid || conv.id

      history.push({
        uuid: frontendUuid,
        backendConversationId: conv.id,
        title: conv.title,
        isEdit: false,
        mode: 'normal',
      })

      chat.push({
        uuid: frontendUuid,
        data: [], // 消息不缓存，按需加载
      })
    }

    state.history = history
    state.chat = chat

    // 🔥 优先使用路由中的 uuid 来设置 active（刷新页面时保持当前会话）
    let routeUuid: string | null = null
    try {
      const currentRoute = router.currentRoute.value
      if (currentRoute.name === 'Chat' && currentRoute.params.uuid) {
        const uuidParam = currentRoute.params.uuid
        routeUuid = Array.isArray(uuidParam) ? uuidParam[0] : uuidParam
      }
    }
    catch {
      // 路由可能还未初始化，忽略错误
    }

    // 如果路由中有 uuid 且在列表中，优先使用它
    if (routeUuid && history.find(h => h.uuid === routeUuid)) {
      state.active = routeUuid
    }
    // 如果 active 存在且在列表中，保持
    else if (state.active && history.find(h => h.uuid === state.active)) {
      // active 有效，保持不变
    }
    // 否则设置为第一个会话
    else if (history.length > 0) {
      state.active = history[0].uuid
    }
  }

  return state
}

export const useChatStore = defineStore('chat-store', {
  state: (): Chat.ChatState => {
    const state = getLocalState()
    // 🔥 从 conversations_cache 恢复会话列表
    return restoreConversationsFromCache(state)
  },

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
      debouncedRecordPreferences({
        active: this.active,
        usingContext: context,
        chatMode: this.chatMode,
      })
    },

    setChatMode(mode: 'normal' | 'noteToQuestion' | 'noteToStory') {
      this.chatMode = mode
      debouncedRecordPreferences({
        active: this.active,
        usingContext: this.usingContext,
        chatMode: mode,
      })
    },

    addHistory(history: Chat.History, chatData: Chat.Chat[] = []) {
      this.history.unshift(history)
      this.chat.unshift({ uuid: history.uuid, data: chatData })
      this.active = history.uuid
      this.chatMode = history.mode
      this.reloadRoute(history.uuid)

      // 🔥 更新会话列表缓存（新增了会话）
      updateCachedConversations(this.history)
    },

    updateHistory(uuid: string, edit: Partial<Chat.History>) {
      const index = this.history.findIndex(item => item.uuid === uuid)
      if (index !== -1) {
        this.history[index] = { ...this.history[index], ...edit }
        // 🔥 更新会话列表缓存（会话信息已更新）
        updateCachedConversations(this.history)
      }
    },

    /**
     * 🔥 更新会话的后端 UUID（建立 nanoid -> UUID 映射）
     */
    setBackendConversationId(nanoidUuid: string, backendUuid: string) {
      const index = this.history.findIndex(item => item.uuid === nanoidUuid)
      if (index !== -1) {
        this.history[index].backendConversationId = backendUuid
        // 🔥 不需要保存到 localStorage，因为 history 现在只从 conversations_cache 恢复
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
      // 🔥 获取要删除的会话信息
      const historyToDelete = this.history[index]
      if (!historyToDelete) {
        return
      }

      // 🔥 如果有后端 UUID，先调用后端 API 删除数据库记录
      const backendUuid = historyToDelete.backendConversationId
      if (backendUuid) {
        try {
          const { deleteConversation } = await import('@/api/services/conversationService')
          await deleteConversation(backendUuid)
        }
        catch (error: any) {
          // 静默处理 404（会话可能已被删除）
          if (error?.response?.status !== 404) {
            console.error('❌ [ChatStore] 删除数据库会话失败:', error)
          }
        }
      }

      // 🔥 删除本地数据
      this.history.splice(index, 1)
      this.chat.splice(index, 1)

      // 🔥 同时清理对应的工作流状态
      const workflowIndex = this.workflowStates.findIndex(item => item.uuid === historyToDelete.uuid)
      if (workflowIndex !== -1) {
        this.workflowStates.splice(workflowIndex, 1)
      }

      // 🔥 更新偏好设置（active 可能已改变）
      debouncedRecordPreferences({
        active: this.active,
        usingContext: this.usingContext,
        chatMode: this.chatMode,
      })

      // 🔥 更新会话列表缓存（删除了会话）
      updateCachedConversations(this.history)

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

    async setActive(uuid: string, skipRouteReload = false) {
      this.active = uuid
      // 根据对话的模式设置聊天模式
      const history = this.history.find(item => item.uuid === uuid)
      if (history)
        this.chatMode = history.mode

      // 🔥 保存偏好设置
      debouncedRecordPreferences({
        active: uuid,
        usingContext: this.usingContext,
        chatMode: this.chatMode,
      })

      // 🔥 检查是否需要从数据库加载消息
      const chatData = this.chat.find(item => item.uuid === uuid)
      const backendUuid = history?.backendConversationId

      // 🔥 如果会话有后端 UUID，且消息为空或不存在，则从数据库加载
      // 刷新页面时，chatData 可能不存在（会话列表从缓存恢复，但消息不缓存）
      if (backendUuid && (!chatData || chatData.data.length === 0)) {
        if (import.meta.env.DEV) {
          console.warn('🔄 [对话] 切换到会话:', {
            前端nanoid: uuid,
            后端UUID: backendUuid,
            消息状态: chatData ? `存在但为空(${chatData.data.length}条)` : '不存在',
          })
        }

        // 🔥 如果 chatData 不存在，先创建它
        if (!chatData) {
          const chatIndex = this.chat.findIndex(item => item.uuid === uuid)
          if (chatIndex === -1) {
            this.chat.push({ uuid, data: [] })
          }
        }

        // 🔥 等待消息加载完成，确保消息显示
        const result = await this.loadConversationMessages(backendUuid)
        if (result.success && import.meta.env.DEV) {
          console.warn(`✅ [对话] 消息加载成功: ${result.count} 条`)
        }
      }

      // 🔥 如果路由已经匹配（例如刷新页面时），跳过路由重新加载，避免页面闪烁
      if (!skipRouteReload) {
        return await this.reloadRoute(uuid)
      }
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
          // 🔥 保存偏好设置（active 和 chatMode 改变了）
          debouncedRecordPreferences({
            active: uuid,
            usingContext: this.usingContext,
            chatMode: 'normal',
          })
        }
        else {
          this.chat[0].data.push(chat)
          if (this.history[0].title === t('chat.newChatTitle'))
            this.history[0].title = chat.text
          // 🔥 消息不缓存，不需要保存
        }
      }

      const index = this.chat.findIndex(item => item.uuid === uuid)
      if (index !== -1) {
        this.chat[index].data.push(chat)
        if (this.history[index].title === t('chat.newChatTitle'))
          this.history[index].title = chat.text
        // 🔥 消息不缓存，不需要保存
      }
    },

    updateChatByUuid(uuid: string, index: number, chat: Chat.Chat) {
      if (!uuid) {
        if (this.chat.length) {
          this.chat[0].data[index] = chat
          // 🔥 消息不缓存，不需要保存
        }
        return
      }

      const chatIndex = this.chat.findIndex(item => item.uuid === uuid)
      if (chatIndex !== -1) {
        this.chat[chatIndex].data[index] = chat
        // 🔥 消息不缓存，不需要保存
      }
    },

    updateChatSomeByUuid(uuid: string, index: number, chat: Partial<Chat.Chat>) {
      if (!uuid) {
        if (this.chat.length) {
          this.chat[0].data[index] = { ...this.chat[0].data[index], ...chat }
          // 🔥 消息不缓存，不需要保存
        }
        return
      }

      const chatIndex = this.chat.findIndex(item => item.uuid === uuid)
      if (chatIndex !== -1) {
        this.chat[chatIndex].data[index] = { ...this.chat[chatIndex].data[index], ...chat }
        // 🔥 消息不缓存，不需要保存
      }
    },

    deleteChatByUuid(uuid: string, index: number) {
      if (!uuid) {
        if (this.chat.length) {
          this.chat[0].data.splice(index, 1)
          // 🔥 消息不缓存，不需要保存
        }
        return
      }

      const chatIndex = this.chat.findIndex(item => item.uuid === uuid)
      if (chatIndex !== -1) {
        this.chat[chatIndex].data.splice(index, 1)
        // 🔥 消息不缓存，不需要保存
      }
    },

    clearChatByUuid(uuid: string) {
      if (!uuid) {
        if (this.chat.length) {
          this.chat[0].data = []
          // 🔥 消息不缓存，不需要保存
        }
        return
      }

      const index = this.chat.findIndex(item => item.uuid === uuid)
      if (index !== -1) {
        this.chat[index].data = []
        // 🔥 消息不缓存，不需要保存
      }
    },

    async clearHistory() {
      // 🔥 批量删除数据库会话（后台执行，不阻塞 UI）
      const backendUuidsToDelete = this.history
        .filter(h => h.backendConversationId)
        .map(h => h.backendConversationId!)

      if (backendUuidsToDelete.length > 0) {
        // 异步删除，不等待完成
        const { deleteConversation } = await import('@/api/services/conversationService')
        Promise.all(
          backendUuidsToDelete.map(uuid =>
            deleteConversation(uuid).catch((err) => {
              console.error(`❌ [ChatStore] 删除会话 ${uuid} 失败:`, err)
            }),
          ),
        )
      }

      // 🔥 立即清空本地数据
      this.$state = { ...defaultState() }
      // 🔥 清除偏好设置和会话缓存
      setLocalPreferences(defaultPreferences())
      clearCachedConversations()
    },

    async reloadRoute(uuid?: string) {
      // 🔥 路由切换不需要保存状态
      await router.push({ name: 'Chat', params: { uuid } })
    },

    // 🔥 已废弃：不再需要保存整个 state
    recordState() {
      // 保持兼容性，但不执行任何操作
    },

    // 🔥 已废弃：不再需要保存整个 state
    recordStateImmediate() {
      // 保持兼容性，但不执行任何操作
    },

    // 工作流状态管理（不持久化，只在内存中）
    setWorkflowState(uuid: string, state: Chat.WorkflowState) {
      const index = this.workflowStates.findIndex(item => item.uuid === uuid)
      if (index !== -1)
        this.workflowStates[index].state = state
      else
        this.workflowStates.push({ uuid, state })
      // 🔥 工作流状态不持久化
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
      // 🔥 工作流状态不持久化
    },

    clearWorkflowState(uuid: string) {
      const index = this.workflowStates.findIndex(item => item.uuid === uuid)
      if (index !== -1) {
        this.workflowStates.splice(index, 1)
      }
      // 🔥 工作流状态不持久化
    },

    // ============================================
    // 数据库同步相关方法
    // ============================================

    /**
     * 从数据库加载用户会话列表
     * 用于登录时同步会话
     */
    async loadConversationsFromBackend() {
      const startTime = performance.now()
      try {
        // 🔥 1. 先检查缓存
        const cachedConversations = getCachedConversations()
        if (cachedConversations && cachedConversations.length > 0) {
          // 使用缓存数据
          const conversations = cachedConversations

          // 清空当前会话
          this.history = []
          this.chat = []

          // 转换为前端格式
          for (const conv of conversations) {
            const frontendUuid = conv.frontend_uuid || conv.id

            this.history.push({
              uuid: frontendUuid,
              backendConversationId: conv.id,
              title: conv.title,
              isEdit: false,
              mode: 'normal',
            })

            this.chat.push({
              uuid: frontendUuid,
              data: [],
            })
          }

          // 🔥 首次登录时不自动设置 active，保持为 null 显示新建会话页面
          // 只有当用户偏好设置中有 active 且该会话存在时才设置（说明用户之前有会话）
          if (this.history.length > 0) {
            const preferences = getLocalPreferences()
            const preferredActive = preferences.active && this.history.find(h => h.uuid === preferences.active)
              ? preferences.active
              : null // 🔥 首次登录时保持 null，不自动选择第一个会话
            this.active = preferredActive
          }
          else {
            // 没有会话时，确保 active 为 null
            this.active = null
          }

          // 🔥 保存偏好设置
          debouncedRecordPreferences({
            active: this.active,
            usingContext: this.usingContext,
            chatMode: this.chatMode,
          })

          const totalTime = performance.now() - startTime
          // 只在慢速时输出警告
          if (totalTime > 100) {
            console.warn(`⚠️ [ChatStore] 缓存加载耗时过长: ${Math.round(totalTime)}ms`)
          }

          return { success: true, count: conversations.length }
        }

        // 🔥 2. 缓存未命中或过期，请求后端
        const { fetchUserConversations } = await import('@/api/services/conversationService')

        const apiStart = performance.now()
        const response = await fetchUserConversations<any>()
        const apiEnd = performance.now()
        const apiTime = Math.round(apiEnd - apiStart)
        if (apiTime > 100) {
          console.warn(`⚠️ [ChatStore] API 请求耗时过长: ${apiTime}ms`)
        }

        if (response.status === 'Success' && response.data) {
          const conversations = response.data as Array<{
            id: string
            title: string
            modelId: string
            providerId: string
            frontend_uuid?: string // 🔥 后端保存的前端 nanoid
            createdAt: string
            updatedAt: string
            messageCount: number
          }>

          if (conversations.length === 0) {
            return { success: true, count: 0 }
          }

          // 清空当前会话
          this.history = []
          this.chat = []

          // 转换为前端格式
          for (const conv of conversations) {
            // 🔥 优先使用数据库中保存的 frontend_uuid，如果没有则使用后端 UUID
            const frontendUuid = conv.frontend_uuid || conv.id

            this.history.push({
              uuid: frontendUuid, // 🔥 使用前端 nanoid（如果有）
              backendConversationId: conv.id, // 🔥 保存后端 UUID 映射
              title: conv.title,
              isEdit: false,
              mode: 'normal', // 默认模式，可以根据需要扩展
            })

            this.chat.push({
              uuid: frontendUuid,
              data: [], // 消息稍后按需加载
            })
          }

          // 🔥 首次登录时不自动设置 active，保持为 null 显示新建会话页面
          // 只有当用户偏好设置中有 active 且该会话存在时才设置（说明用户之前有会话）
          if (this.history.length > 0) {
            const preferences = getLocalPreferences()
            const preferredActive = preferences.active && this.history.find(h => h.uuid === preferences.active)
              ? preferences.active
              : null // 🔥 首次登录时保持 null，不自动选择第一个会话
            this.active = preferredActive
          }
          else {
            // 没有会话时，确保 active 为 null
            this.active = null
          }

          // 🔥 保存偏好设置
          debouncedRecordPreferences({
            active: this.active,
            usingContext: this.usingContext,
            chatMode: this.chatMode,
          })

          // 🔥 缓存会话列表（原始数据）
          setCachedConversations(conversations)

          const totalTime = performance.now() - startTime
          if (totalTime > 100) {
            console.warn(`⚠️ [ChatStore] 会话列表加载耗时过长: ${Math.round(totalTime)}ms`)
          }

          return { success: true, count: conversations.length }
        }

        return { success: false, error: '数据格式错误' }
      }
      catch (error: any) {
        // 静默处理 404（用户未登录或没有会话）
        if (error?.response?.status === 404 || error?.message?.includes('404')) {
          return { success: true, count: 0 }
        }

        console.error('❌ [ChatStore] 加载会话列表失败:', error)
        return { success: false, error: error.message }
      }
    },

    /**
     * 🔥 检查会话在数据库中是否真的为空
     * 用于自动删除前的验证
     * @param uuid 前端会话 UUID
     * @returns true 表示可以安全删除（本地为空 且 数据库也为空）
     */
    async isConversationReallyEmpty(uuid: string): Promise<boolean> {
      try {
        // 1. 检查前端缓存
        const localMessages = this.getChatByUuid(uuid)
        if (localMessages && localMessages.length > 0) {
          return false // 前端有消息，不为空
        }

        // 2. 检查是否有后端映射
        const history = this.history.find(item => item.uuid === uuid)
        const backendUuid = history?.backendConversationId

        if (!backendUuid) {
          // 纯本地会话，没有同步到数据库，可以删除
          return true
        }

        // 3. 查询数据库消息数量
        const { fetchConversationMessages } = await import('@/api/services/conversationService')
        const response = await fetchConversationMessages<any>(backendUuid)

        if (response.status === 'Success' && response.data) {
          const messages = response.data.messages || response.data || []
          return messages.length === 0
        }

        // 查询失败，保守处理：不删除
        return false
      }
      catch (error: any) {
        // 404 表示会话不存在，可以删除
        if (error?.response?.status === 404) {
          return true
        }

        // 其他错误，保守处理：不删除
        console.error('❌ [ChatStore] 检查会话是否为空失败:', error)
        return false
      }
    },

    /**
     * 从数据库加载指定会话的消息
     * 用于切换会话时按需加载
     * @param backendConversationId 后端会话 UUID
     */
    async loadConversationMessages(backendConversationId: string) {
      const startTime = performance.now()
      try {
        const { fetchConversationMessages } = await import('@/api/services/conversationService')

        const apiStart = performance.now()
        const response = await fetchConversationMessages<any>(backendConversationId)
        const apiEnd = performance.now()
        const apiTime = Math.round(apiEnd - apiStart)
        if (apiTime > 100) {
          console.warn(`⚠️ [ChatStore] 消息API 请求耗时过长: ${apiTime}ms`)
        }

        if (response.status === 'Success' && response.data) {
          // 🔥 后端返回的是 { conversation, messages }，需要访问 data.messages
          const messages = (response.data.messages || response.data) as Array<{
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

          // 🔥 通过 backendConversationId 查找对应的前端 uuid
          const history = this.history.find(item => item.backendConversationId === backendConversationId)
          if (!history) {
            console.error(`❌ [ChatStore] 找不到后端会话 ${backendConversationId} 对应的前端记录`)
            return { success: false, error: '会话映射不存在' }
          }

          const frontendUuid = history.uuid

          // 更新 chat 数据（使用前端 uuid）
          const chatIndex = this.chat.findIndex(item => item.uuid === frontendUuid)
          if (chatIndex !== -1) {
            this.chat[chatIndex].data = chatData
          }
          else {
            this.chat.push({ uuid: frontendUuid, data: chatData })
          }

          // 🔥 注意：消息不再保存到 localStorage，只保留在内存中
          // 这样可以避免大量消息写入 localStorage 造成的性能问题

          const totalTime = performance.now() - startTime
          if (totalTime > 100) {
            console.warn(`⚠️ [ChatStore] 消息加载耗时过长: ${Math.round(totalTime)}ms (消息数: ${messages.length})`)
          }

          return { success: true, count: messages.length }
        }

        return { success: false, error: '数据格式错误' }
      }
      catch (error: any) {
        if (error?.response?.status === 404 || error?.message?.includes('404')) {
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
          const messages = chatItem.data.map(msg => ({
            role: msg.inversion ? 'user' as const : 'assistant' as const,
            content: msg.text,
          }))

          await saveMessages(conversationId, messages)
        }

        return { success: true, conversationId }
      }
      catch (error: any) {
        console.error('❌ [ChatStore] 同步会话失败:', error)
        return { success: false, error: error.message }
      }
    },

    // ==================== 🔥 SSE 事件处理方法 ====================

    /**
     * SSE: 添加新会话（来自其他设备）
     */
    addConversationFromSSE(conversation: any) {
      const frontendUuid = conversation.frontend_uuid || conversation.id

      // 检查是否已存在
      const exists = this.history.find(item =>
        item.uuid === frontendUuid || item.backendConversationId === conversation.id,
      )

      if (exists) {
        return
      }

      // 添加到列表
      this.history.unshift({
        uuid: frontendUuid,
        backendConversationId: conversation.id,
        title: conversation.title || t('chat.newChatTitle'),
        isEdit: false,
        mode: 'normal',
      })

      this.chat.unshift({
        uuid: frontendUuid,
        data: [],
      })

      // 🔥 更新会话列表缓存（新增了会话）
      updateCachedConversations(this.history)
    },

    /**
     * SSE: 更新会话信息
     */
    updateConversationFromSSE(conversationId: string, updates: any) {
      // 查找会话（通过 backendConversationId）
      const index = this.history.findIndex(
        item => item.backendConversationId === conversationId,
      )

      if (index !== -1) {
        // 更新标题等信息
        if (updates.title) {
          this.history[index].title = updates.title
        }

        // 🔥 更新会话列表缓存（会话信息已更新）
        updateCachedConversations(this.history)
      }
    },

    /**
     * SSE: 删除会话
     */
    removeConversationFromSSE(conversationId: string) {
      // 查找会话
      const index = this.history.findIndex(
        item => item.backendConversationId === conversationId,
      )

      if (index !== -1) {
        const uuid = this.history[index].uuid

        // 删除会话
        this.history.splice(index, 1)

        // 删除消息
        const chatIndex = this.chat.findIndex(item => item.uuid === uuid)
        if (chatIndex !== -1) {
          this.chat.splice(chatIndex, 1)
        }

        // 删除工作流状态
        const workflowIndex = this.workflowStates.findIndex(item => item.uuid === uuid)
        if (workflowIndex !== -1) {
          this.workflowStates.splice(workflowIndex, 1)
        }

        // 如果删除的是当前会话，切换到第一个
        if (this.active === uuid) {
          if (this.history.length > 0) {
            this.active = this.history[0].uuid
            this.reloadRoute(this.history[0].uuid)
          }
          else {
            this.active = null
            this.reloadRoute()
          }
        }

        // 🔥 更新偏好设置和会话列表缓存
        debouncedRecordPreferences({
          active: this.active,
          usingContext: this.usingContext,
          chatMode: this.chatMode,
        })
        updateCachedConversations(this.history)
      }
    },

    /**
     * SSE: 添加新消息
     */
    addMessageFromSSE(conversationId: string, message: any) {
      // 查找会话
      const history = this.history.find(
        item => item.backendConversationId === conversationId,
      )

      if (!history) {
        return
      }

      const uuid = history.uuid

      // 转换消息格式
      const chatMessage: Chat.Chat = {
        dateTime: new Date(message.created_at || Date.now()).toLocaleString(),
        text: message.content,
        inversion: message.role === 'user',
        error: false,
        loading: false,
        conversationOptions: null,
        requestOptions: { prompt: message.content, options: null },
      }

      // 添加到消息列表
      this.addChatByUuid(uuid, chatMessage)
    },

    /**
     * SSE: 更新消息
     */
    updateMessageFromSSE(_conversationId: string, _messageId: string, _updates: any) {
      // 查找会话
      // TODO: 实现消息更新逻辑
      // 需要在消息中添加 ID 字段才能准确定位
      // const history = this.history.find(
      //   item => item.backendConversationId === conversationId,
      // )
    },

    /**
     * SSE: 标记会话为未读
     */
    markConversationUnread(conversationId: string) {
      const history = this.history.find(
        item => item.backendConversationId === conversationId,
      )

      if (history) {
        // TODO: 添加未读标记逻辑
      }
    },

    /**
     * SSE: 触发完整同步
     */
    async syncFromBackend() {
      // 重新加载会话列表
      await this.loadConversationsFromBackend()
    },
  },
})
