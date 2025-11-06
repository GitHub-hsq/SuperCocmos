/**
 * useChatActions.ts
 * 聊天操作 Composable
 *
 * 负责管理：
 * - 发送消息（onConversation）
 * - 重新生成（onRegenerate）
 * - 删除消息（handleDelete）
 * - 导出对话（handleExport）
 * - 停止生成（handleStop）
 * - Enter 键处理（handleEnter）
 */

import type { ComputedRef, Ref } from 'vue'
import { toPng } from 'html-to-image'
import { nanoid } from 'nanoid'
import { nextTick } from 'vue'
import { fetchChatAPIProcess } from '@/api'
import { t } from '@/locales'

const openLongReply = import.meta.env.VITE_GLOB_OPEN_LONG_REPLY === 'true'

/**
 * 解析思考标签 <think> ... </think>
 * 将思考内容移除或转换为可折叠的格式
 */
function parseThinkingTags(text: string): { displayText: string, hasThinking: boolean, thinkingContent: string } {
  const thinkRegex = /<think>([\s\S]*?)<\/think>/gi
  const matches = text.match(thinkRegex)

  if (!matches || matches.length === 0) {
    return {
      displayText: text,
      hasThinking: false,
      thinkingContent: '',
    }
  }

  // 提取所有思考内容
  const thinkingContents: string[] = []
  let cleanText = text

  matches.forEach((match) => {
    const thinkContent = match.replace(/<\/?think>/gi, '').trim()
    if (thinkContent) {
      thinkingContents.push(thinkContent)
    }
    // 移除思考标签
    cleanText = cleanText.replace(match, '')
  })

  // 清理多余的空行
  cleanText = cleanText.replace(/\n{3,}/g, '\n\n').trim()

  return {
    displayText: cleanText,
    hasThinking: true,
    thinkingContent: thinkingContents.join('\n\n'),
  }
}

export interface UseChatActionsDeps {
  // 基础依赖
  router: any
  dialog: any
  ms: any
  auth0: any

  // Stores
  chatStore: any
  configStore: any
  modelStore: any

  // 状态
  uuid: ComputedRef<string>
  dataSources: ComputedRef<any[]>
  prompt: Ref<string>
  loading: Ref<boolean>
  isMobile: Ref<boolean>
  currentConversationId: Ref<string>
  currentSelectedModel: Ref<any>

  // 方法
  addChat: (uuid: string, data: any) => void
  updateChat: (uuid: string, index: number, data: any) => void
  updateChatSome: (uuid: string, index: number, data: any) => void
  getChatByUuidAndIndex: (uuid: string, index: number) => any
  aboutRef: Ref<any> // About 组件引用，用于更新使用量
  scrollToBottom: () => void
  scrollToBottomIfAtBottom: () => void
}

export function useChatActions(deps: UseChatActionsDeps) {
  const {
    router,
    dialog,
    ms,
    chatStore,
    configStore,
    modelStore,
    uuid,
    dataSources,
    prompt,
    loading,
    isMobile,
    currentConversationId,
    currentSelectedModel,
    addChat,
    updateChat,
    updateChatSome,
    getChatByUuidAndIndex,
    aboutRef,
    scrollToBottom,
    scrollToBottomIfAtBottom,
  } = deps

  // ===== AbortController 控制流式请求 =====
  let controller = new AbortController()

  // ===== 1. handleSubmit - 提交消息 =====
  function handleSubmit() {
    onConversation()
  }

  // ===== 2. onConversation - 发送消息（最复杂） =====
  async function onConversation() {
    let message = prompt.value

    if (loading.value)
      return

    if (!message || message.trim() === '')
      return

    // 检查是否选择了模型
    if (!currentSelectedModel.value && !modelStore.currentModel) {
      ms.warning('请先选择一个模型')
      return
    }

    controller = new AbortController()

    // 🔥 如果是新会话，立即创建并跳转路由
    let actualUuid = uuid.value
    const isNewConversation = !uuid.value || uuid.value === 'undefined'

    if (isNewConversation) {
      // 生成新的 nanoid（用于前端路由和后端映射）
      const newUuid = nanoid()
      actualUuid = newUuid

      // 创建新会话历史记录（左侧列表立即显示）
      chatStore.addHistory({
        uuid: newUuid,
        title: message.slice(0, 20), // 使用消息前20字作为标题
        isEdit: false,
        mode: 'normal',
      }, [])

      // 🔥 立即跳转路由：/chat → /chat/{nanoid}
      await router.replace({ name: 'Chat', params: { uuid: newUuid } })

      if (import.meta.env.DEV) {
        console.warn('🆕 [对话] 新会话已创建并跳转:', newUuid)
      }
    }

    // 使用实际的 UUID（新会话用新生成的，已有会话用原来的）
    addChat(
      actualUuid,
      {
        dateTime: new Date().toLocaleString(),
        text: message,
        inversion: true,
        error: false,
        conversationOptions: null,
        requestOptions: { prompt: message, options: null },
      },
    )
    scrollToBottom()

    loading.value = true
    prompt.value = ''

    // 🔥 构建请求参数
    const backendUuid = chatStore.getBackendConversationId(actualUuid) || ''

    const options: Chat.ConversationRequest = {
      conversationId: backendUuid,
      frontendUuid: actualUuid,
    }

    if (import.meta.env.DEV) {
      console.warn('📤 [请求] 发送参数:', {
        前端nanoid: actualUuid,
        后端UUID: backendUuid || '（空，将创建新会话）',
      })
    }

    // 添加当前选中的模型
    const selectedModel = currentSelectedModel.value || modelStore.currentModel
    if (selectedModel) {
      options.model = selectedModel.modelId || selectedModel.name
      options.providerId = selectedModel.providerId || selectedModel.provider

      if (import.meta.env.DEV) {
        console.warn('📤 [请求] 发送模型信息:', {
          modelId: options.model,
          providerId: options.providerId,
          displayName: selectedModel.displayName,
          modelObject: selectedModel,
        })
      }
    }
    else {
      console.error('❌ [请求] 未选择模型！')
      ms.error('请先选择一个模型')
      return
    }

    // 🔥 添加用户配置的参数（从 ConfigStore 获取）
    const chatConfig = configStore.chatConfig
    if (chatConfig) {
      if (chatConfig.systemPrompt)
        options.systemMessage = chatConfig.systemPrompt

      if (chatConfig.parameters) {
        if (chatConfig.parameters.temperature !== undefined)
          options.temperature = chatConfig.parameters.temperature

        if (chatConfig.parameters.topP !== undefined)
          options.top_p = chatConfig.parameters.topP

        if (chatConfig.parameters.maxTokens !== undefined)
          (options as any).maxTokens = chatConfig.parameters.maxTokens
      }
    }

    addChat(
      actualUuid,
      {
        dateTime: new Date().toLocaleString(),
        text: t('chat.thinking'),
        loading: true,
        inversion: false,
        error: false,
        conversationOptions: null,
        requestOptions: { prompt: message, options: { ...options } },
      },
    )
    scrollToBottom()

    // 🔥 性能监控
    const requestStartTime = Date.now()
    let firstChunkTime: number | null = null

    try {
      let lastProcessedIndex = 0

      const fetchChatAPIOnce = async () => {
        await fetchChatAPIProcess<Chat.ConversationResponse>({
          prompt: message,
          options,
          signal: controller.signal,
          onDownloadProgress: ({ event }) => {
            const xhr = event.target
            const { responseText } = xhr

            // 🔥 性能监控：记录首次收到数据的时间
            if (firstChunkTime === null) {
              firstChunkTime = Date.now()
              const ttfb = firstChunkTime - requestStartTime
              if (import.meta.env.DEV) {
                console.warn(`⏱️ [性能] 首字节时间 (TTFB): ${ttfb}ms`)
              }
            }

            // 🔥 从上次处理的位置开始，处理所有完整的 JSON 对象
            const newData = responseText.substring(lastProcessedIndex)
            const lines = newData.split('\n')

            const isComplete = responseText.endsWith('\n') || responseText.length === lastProcessedIndex + newData.length
            const completeLines = isComplete ? lines : lines.slice(0, -1)

            if (completeLines.length === 0)
              return

            // 处理所有完整的行
            for (let i = 0; i < completeLines.length; i++) {
              let chunk = completeLines[i].trim()
              if (!chunk)
                continue

              // 🔥 处理可能的 JSON 对象拼接
              while (chunk.length > 0) {
                try {
                  // 尝试找到第一个完整的 JSON 对象
                  let jsonEndIndex = -1
                  let braceCount = 0
                  let inString = false
                  let escapeNext = false

                  for (let j = 0; j < chunk.length; j++) {
                    const char = chunk[j]

                    if (escapeNext) {
                      escapeNext = false
                      continue
                    }

                    if (char === '\\') {
                      escapeNext = true
                      continue
                    }

                    if (char === '"' && !escapeNext) {
                      inString = !inString
                      continue
                    }

                    if (!inString) {
                      if (char === '{') {
                        braceCount++
                      }
                      else if (char === '}') {
                        braceCount--
                        if (braceCount === 0) {
                          jsonEndIndex = j + 1
                          break
                        }
                      }
                    }
                  }

                  if (jsonEndIndex === -1) {
                    break
                  }

                  const jsonStr = chunk.substring(0, jsonEndIndex)
                  const data = JSON.parse(jsonStr)

                  // 更新已处理的位置和剩余 chunk
                  const chunkStartIndex = responseText.indexOf(completeLines[i], lastProcessedIndex)
                  const processedLength = chunkStartIndex !== -1 ? chunkStartIndex + completeLines[i].indexOf(jsonStr) + jsonStr.length : lastProcessedIndex + jsonStr.length
                  lastProcessedIndex = processedLength
                  chunk = chunk.substring(jsonEndIndex).trim()

                  // 🔥 保存后端返回的 UUID，建立映射关系
                  if (data.conversationId) {
                    if (!chatStore.getBackendConversationId(actualUuid)) {
                      chatStore.setBackendConversationId(actualUuid, data.conversationId)
                    }

                    if (data.conversationId !== currentConversationId.value) {
                      currentConversationId.value = data.conversationId
                    }
                  }

                  // 🔥 检查是否是使用量更新
                  if (data.type === 'usage_update' && data.data) {
                    // 更新 About 组件的使用量
                    if (aboutRef.value && typeof aboutRef.value.updateUsage === 'function') {
                      aboutRef.value.updateUsage(data.data.total_used)
                    }
                    // 跳过处理，继续下一个 chunk
                    continue
                  }

                  // 🔥 检查是否有错误
                  if (data.error) {
                    console.error('❌ [聊天错误] 后端返回错误:', data.error)
                    updateChat(
                      actualUuid,
                      dataSources.value.length - 1,
                      {
                        dateTime: new Date().toLocaleString(),
                        text: data.error.message || '发生错误',
                        inversion: false,
                        error: true,
                        loading: false,
                        conversationOptions: null,
                        requestOptions: { prompt: message, options: { ...options } },
                      },
                    )
                    return
                  }

                  // 🔥 检查是否是思考过程
                  const isThinking = data.isThinking || false
                  const rawText = data.text ?? ''

                  // 🔥 解析 <think> 标签（Gemini 模型可能返回此格式）
                  const parsed = parseThinkingTags(rawText)
                  const displayText = isThinking ? rawText : parsed.displayText

                  // 🔥 如果检测到思考内容，可以在控制台输出（可选）
                  if (parsed.hasThinking && import.meta.env.DEV) {
                    console.warn('💭 [思考过程]:', parsed.thinkingContent)
                  }

                  updateChat(
                    actualUuid,
                    dataSources.value.length - 1,
                    {
                      dateTime: new Date().toLocaleString(),
                      text: displayText,
                      inversion: false,
                      error: false,
                      loading: true,
                      conversationOptions: { conversationId: data.conversationId, parentMessageId: data.id },
                      requestOptions: { prompt: message, options: { ...options } },
                    },
                  )

                  // 🔥 检查是否需要继续回复（长回复）
                  if (openLongReply && data.detail?.choices?.[0]?.finish_reason === 'length') {
                    options.parentMessageId = data.id
                    message = ''
                    return fetchChatAPIOnce()
                  }

                  // 🔥 移动端：流式更新时强制滚动到底部
                  if (isMobile.value) {
                    scrollToBottom()
                  }
                  else {
                    scrollToBottomIfAtBottom()
                  }
                }
                catch (parseError: any) {
                  console.error('❌ [解析错误] chunk 解析失败:', parseError)
                  console.error('❌ [解析错误] chunk 内容:', chunk.substring(0, 200))
                  break
                }
              }
            }
          },
        })
        updateChatSome(actualUuid, dataSources.value.length - 1, { loading: false })
      }

      await fetchChatAPIOnce()

      // 🔥 消息发送完成后，确保滚动到底部
      await nextTick()
      if (isMobile.value) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            scrollToBottom()
          })
        })
      }
      else {
        scrollToBottomIfAtBottom()
      }
    }
    catch (error: any) {
      const errorMessage = error?.message ?? t('common.wrong')

      if (error.message === 'canceled') {
        updateChatSome(
          actualUuid,
          dataSources.value.length - 1,
          {
            loading: false,
          },
        )
        scrollToBottomIfAtBottom()
        return
      }

      const currentChat = getChatByUuidAndIndex(actualUuid, dataSources.value.length - 1)

      if (currentChat?.text && currentChat.text !== '') {
        updateChatSome(
          actualUuid,
          dataSources.value.length - 1,
          {
            text: `${currentChat.text}\n[${errorMessage}]`,
            error: false,
            loading: false,
          },
        )
        return
      }

      updateChat(
        actualUuid,
        dataSources.value.length - 1,
        {
          dateTime: new Date().toLocaleString(),
          text: errorMessage,
          inversion: false,
          error: true,
          loading: false,
          conversationOptions: null,
          requestOptions: { prompt: message, options: { ...options } },
        },
      )
      scrollToBottomIfAtBottom()
    }
    finally {
      loading.value = false
    }
  }

  // ===== 3. onRegenerate - 重新生成 =====
  async function onRegenerate(index: number) {
    if (loading.value)
      return

    controller = new AbortController()

    const { requestOptions } = dataSources.value[index]

    let message = requestOptions?.prompt ?? ''

    const currentUuid = uuid.value
    const backendUuid = chatStore.getBackendConversationId(currentUuid) || ''

    let options: Chat.ConversationRequest = {
      conversationId: backendUuid,
    }

    if (requestOptions.options)
      options = { ...options, ...requestOptions.options }

    // 添加当前选中的模型
    const selectedModel = currentSelectedModel.value || modelStore.currentModel
    if (selectedModel) {
      options.model = selectedModel.modelId || selectedModel.name
      options.providerId = selectedModel.providerId || selectedModel.provider

      if (import.meta.env.DEV) {
        console.warn('🔄 [重新生成] 使用模型:', selectedModel.displayName, {
          modelId: options.model,
          providerId: options.providerId,
        })
      }
    }

    // 🔥 添加用户配置的参数
    const chatConfig = configStore.chatConfig
    if (chatConfig) {
      if (chatConfig.systemPrompt)
        options.systemMessage = chatConfig.systemPrompt

      if (chatConfig.parameters) {
        if (chatConfig.parameters.temperature !== undefined)
          options.temperature = chatConfig.parameters.temperature
        if (chatConfig.parameters.topP !== undefined)
          options.top_p = chatConfig.parameters.topP
        if (chatConfig.parameters.maxTokens !== undefined)
          (options as any).maxTokens = chatConfig.parameters.maxTokens
      }
    }

    if (import.meta.env.DEV) {
      console.warn('📦 [重新生成] 最终发送的 options:', options)
    }

    loading.value = true

    updateChat(
      currentUuid,
      index,
      {
        dateTime: new Date().toLocaleString(),
        text: '',
        inversion: false,
        error: false,
        loading: true,
        conversationOptions: null,
        requestOptions: { prompt: message, options: { ...options } },
      },
    )

    try {
      let lastText = ''
      let lastProcessedIndex = 0

      const fetchChatAPIOnce = async () => {
        await fetchChatAPIProcess<Chat.ConversationResponse>({
          prompt: message,
          options,
          signal: controller.signal,
          onDownloadProgress: ({ event }) => {
            const xhr = event.target
            const { responseText } = xhr

            const newData = responseText.substring(lastProcessedIndex)
            const lines = newData.split('\n')

            const completeLines = lines.slice(0, -1)
            if (completeLines.length === 0)
              return

            const chunk = completeLines[completeLines.length - 1].trim()
            if (!chunk)
              return

            lastProcessedIndex = responseText.lastIndexOf(chunk) + chunk.length

            try {
              const data = JSON.parse(chunk)

              // 🔥 保存后端 UUID 映射
              if (data.conversationId) {
                if (!chatStore.getBackendConversationId(currentUuid)) {
                  chatStore.setBackendConversationId(currentUuid, data.conversationId)
                }

                if (data.conversationId !== currentConversationId.value) {
                  currentConversationId.value = data.conversationId
                }
              }

              const isThinking = data.isThinking || false
              const rawText = data.text ?? ''

              // 🔥 解析 <think> 标签（Gemini 模型可能返回此格式）
              const parsed = parseThinkingTags(rawText)
              const cleanText = isThinking ? rawText : parsed.displayText
              const displayText = isThinking ? rawText : (lastText + cleanText)

              // 🔥 如果检测到思考内容，可以在控制台输出（可选）
              if (parsed.hasThinking && import.meta.env.DEV) {
                console.warn('💭 [思考过程 - 重新生成]:', parsed.thinkingContent)
              }

              updateChat(
                currentUuid,
                index,
                {
                  dateTime: new Date().toLocaleString(),
                  text: displayText,
                  inversion: false,
                  error: false,
                  loading: true,
                  conversationOptions: { conversationId: data.conversationId, parentMessageId: data.id },
                  requestOptions: { prompt: message, options: { ...options } },
                },
              )

              if (openLongReply && data.detail?.choices?.[0]?.finish_reason === 'length') {
                options.parentMessageId = data.id
                lastText = displayText
                message = ''
                return fetchChatAPIOnce()
              }

              if (!isThinking && rawText) {
                lastText = displayText
              }
            }
            catch {
              // 解析失败，跳过
            }
          },
        })
        updateChatSome(currentUuid, index, { loading: false })
      }

      await fetchChatAPIOnce()
    }
    catch (error: any) {
      if (error.message === 'canceled') {
        updateChatSome(
          currentUuid,
          index,
          {
            loading: false,
          },
        )
        return
      }

      const errorMessage = error?.message ?? t('common.wrong')

      updateChat(
        currentUuid,
        index,
        {
          dateTime: new Date().toLocaleString(),
          text: errorMessage,
          inversion: false,
          error: true,
          loading: false,
          conversationOptions: null,
          requestOptions: { prompt: message, options: { ...options } },
        },
      )
    }
    finally {
      loading.value = false
    }
  }

  // ===== 4. handleDelete - 删除消息 =====
  function handleDelete(index: number) {
    if (loading.value)
      return

    dialog.warning({
      title: t('chat.deleteMessage'),
      content: t('chat.deleteMessageConfirm'),
      positiveText: t('common.yes'),
      negativeText: t('common.no'),
      onPositiveClick: () => {
        chatStore.deleteChatByUuid(uuid.value, index)
      },
    })
  }

  // ===== 5. handleExport - 导出对话 =====
  function handleExport() {
    if (loading.value)
      return

    const d = dialog.warning({
      title: t('chat.exportImage'),
      content: t('chat.exportImageConfirm'),
      positiveText: t('common.yes'),
      negativeText: t('common.no'),
      onPositiveClick: async () => {
        try {
          d.loading = true
          const ele = document.getElementById('image-wrapper')
          const imgUrl = await toPng(ele as HTMLDivElement)
          const tempLink = document.createElement('a')
          tempLink.style.display = 'none'
          tempLink.href = imgUrl
          tempLink.setAttribute('download', 'chat-shot.png')
          if (typeof tempLink.download === 'undefined')
            tempLink.setAttribute('target', '_blank')
          document.body.appendChild(tempLink)
          tempLink.click()
          document.body.removeChild(tempLink)
          window.URL.revokeObjectURL(imgUrl)
          d.loading = false
          ms.success(t('chat.exportSuccess'))
          Promise.resolve()
        }
        catch {
          ms.error(t('chat.exportFailed'))
        }
        finally {
          d.loading = false
        }
      },
    })
  }

  // ===== 6. handleStop - 停止生成 =====
  function handleStop() {
    if (loading.value) {
      controller.abort()
      loading.value = false
    }
  }

  // ===== 7. handleEnter - Enter 键处理 =====
  function handleEnter(event: KeyboardEvent) {
    if (!isMobile.value) {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault()
        handleSubmit()
      }
    }
    else {
      if (event.key === 'Enter' && event.ctrlKey) {
        event.preventDefault()
        handleSubmit()
      }
    }
  }

  // ===== 返回所有操作方法 =====
  return {
    handleSubmit,
    onConversation,
    onRegenerate,
    handleDelete,
    handleExport,
    handleStop,
    handleEnter,
  }
}
