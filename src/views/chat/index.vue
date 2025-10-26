<script setup lang='ts'>
/* eslint-disable no-console */
import type { UploadFileInfo } from 'naive-ui'
import type { Ref } from 'vue'
import { useAuth0 } from '@auth0/auth0-vue'
import { CheckmarkOutline } from '@vicons/ionicons5'
import { toPng } from 'html-to-image'
import { NAutoComplete, NButton, NIcon, NInput, NLayout, NLayoutContent, NLayoutHeader, NLayoutSider, NList, NListItem, NPopover, NScrollbar, NText, NUpload, NUploadDragger, useDialog, useMessage, useNotification } from 'naive-ui'
import { nanoid } from 'nanoid'
import { storeToRefs } from 'pinia'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { fetchChatAPIProcess, fetchDeleteFile, fetchQuizFeedback, fetchQuizGenerate } from '@/api'
import { HoverButton, SvgIcon } from '@/components/common'
import About from '@/components/common/Setting/About.vue'
import Advanced from '@/components/common/Setting/Advanced.vue'
// 🔥 使用新的配置面板组件
import ChatConfigPanel from '@/components/common/Setting/panels/ChatConfigPanel.vue'
import ProviderConfigPanel from '@/components/common/Setting/panels/ProviderConfigPanel.vue'
import UserSettingsPanel from '@/components/common/Setting/panels/UserSettingsPanel.vue'
import WorkflowConfigPanel from '@/components/common/Setting/panels/WorkflowConfigPanel.vue'
import { useBasicLayout } from '@/hooks/useBasicLayout'
import { t } from '@/locales'
import { useAppInitStore, useAppStore, useAuthStore, useChatStore, useConfigStore, useModelStore, usePromptStore } from '@/store'
// 🔥 导入消息缓存工具
import { appendMessageToLocalCache } from '@/utils/messageCache'
import { Message, QuizAnswer, QuizConfig, QuizPreview } from './components'
import HeaderComponent from './components/Header/index.vue'
import { useChat } from './hooks/useChat'
import { useScroll } from './hooks/useScroll'
import { useUsingContext } from './hooks/useUsingContext'

/**
 * 极少数会用到let X = ref(123) 这种写法，可能后续会重新初始化，比如：X = ref(null),const是不允许这样操作的，所以会使用到这种写法
 */
let controller = new AbortController()

const openLongReply = import.meta.env.VITE_GLOB_OPEN_LONG_REPLY === 'true'

const route = useRoute()
const router = useRouter()
const dialog = useDialog()
const ms = useMessage()
const notification = useNotification()
const auth0 = useAuth0()

const appStore = useAppStore()
const appInitStore = useAppInitStore()
const authStore = useAuthStore()
const chatStore = useChatStore()
const configStore = useConfigStore()
const modelStore = useModelStore()

const { isMobile } = useBasicLayout()
const { addChat, updateChat, updateChatSome, getChatByUuidAndIndex } = useChat()
const { scrollRef, scrollToBottom, scrollToBottomIfAtBottom } = useScroll()
const { usingContext, toggleUsingContext } = useUsingContext()

const currentSelectedModel = ref<ModelItem | null>(null)
// 🔥 当前对话ID（用于跨浏览器同步）
const currentConversationId = ref<string>('')

// 设置页面相关
const showSettingsPage = computed(() => appStore.showSettingsPage)
const activeSettingTab = computed(() => appStore.activeSettingTab)
const isChatGPTAPI = computed<boolean>(() => !!authStore.isChatGPTAPI)
const aboutRef = ref<InstanceType<typeof About> | null>(null)
const hasLoadedUsage = ref(false)

// 🔥 使用 computed 让 uuid 响应式（路由变化时自动更新）
// 这样当路由从 /chat → /chat/abc 或 /chat/abc → /chat/def 时，组件会自动更新
const uuid = computed(() => (route.params.uuid as string) || '')

const dataSources = computed(() => chatStore.getChatByUuid(uuid.value))

const prompt = ref<string>('')
const loading = ref<boolean>(false)
const inputRef = ref<Ref | null>(null)

// 添加PromptStore
const promptStore = usePromptStore()

// 使用storeToRefs，保证store修改后，联想部分能够重新渲染
const { promptList: promptTemplate } = storeToRefs<any>(promptStore)

// 未知原因刷新页面，loading 状态不会重置，手动重置
dataSources.value.forEach((item, index) => {
  if (item.loading)
    updateChatSome(uuid.value, index, { loading: false })
})

// 🔥 【方案 A 核心】监听路由变化，实现组件复用时的数据更新
// 当路由从 /chat → /chat/abc123 或 /chat/abc → /chat/def 时：
// - 组件实例不重建（复用）→ 页面不闪烁 ✅
// - 只有 route.params.uuid 变化 → 触发此 watch
// - 根据新的 uuid 加载对应会话数据
watch(
  () => route.params.uuid,
  (newUuid) => {
    // 处理 uuid 可能是数组的情况（TypeScript 类型）
    const uuidStr = Array.isArray(newUuid) ? newUuid[0] : newUuid

    if (uuidStr) {
      // 🔥 切换到已有会话，查找后端 UUID 映射
      const backendUuid = chatStore.getBackendConversationId(uuidStr)
      currentConversationId.value = backendUuid || ''

      if (import.meta.env.DEV) {
        console.log('🔄 [对话] 切换到会话:', {
          前端nanoid: uuidStr,
          后端UUID: backendUuid || '（无映射，新会话）',
        })
      }
    }
    else {
      // 用户在 /chat（无 uuid），准备接收第一条消息
      currentConversationId.value = ''
      if (import.meta.env.DEV) {
        console.log('🔄 [对话] 准备新建会话')
      }
    }
  },
  { immediate: true }, // 🔥 立即执行，确保初始加载时也设置 conversationId
)

function handleSubmit() {
  onConversation()
}

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

  // 🔥 【方案 A 核心】如果是新会话，立即创建并跳转路由
  // 工作流程：
  // 1. 用户在 /chat 输入消息
  // 2. 生成 nanoid → 添加到会话列表（左侧显示）
  // 3. 跳转到 /chat/{nanoid} → 组件复用，watch 触发
  // 4. 发送消息到后端（携带 nanoid）
  // 5. 后端返回 uuid → 建立映射
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
    // - 使用 replace 而不是 push，避免 /chat 留在历史记录中
    // - 组件会复用，不重建 → 页面不闪烁 ✅
    // - watch 会触发，更新 currentConversationId
    await router.replace({ name: 'Chat', params: { uuid: newUuid } })

    if (import.meta.env.DEV) {
      console.log('🆕 [对话] 新会话已创建并跳转:', newUuid)
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

  // 🔥 步骤2：构建请求参数
  // 使用后端 UUID（通过映射获取），如果没有则为空（后端会创建新会话）
  const backendUuid = chatStore.getBackendConversationId(actualUuid) || ''

  const options: Chat.ConversationRequest = {
    conversationId: backendUuid, // 🔥 后端 UUID（可能为空）
    frontendUuid: actualUuid, // 🔥 前端 nanoid（保存到数据库用于跨浏览器映射）
  }

  if (import.meta.env.DEV) {
    console.log('📤 [请求] 发送参数:', {
      前端nanoid: actualUuid,
      后端UUID: backendUuid || '（空，将创建新会话）',
    })
  }

  // 添加当前选中的模型
  const selectedModel = currentSelectedModel.value || modelStore.currentModel
  if (selectedModel) {
    // 🔥 发送 modelId 而不是 UUID
    options.model = selectedModel.modelId || selectedModel.name

    // 🔥 同时发送供应商 ID，让后端可以查找对应的 baseUrl 和 apiKey
    options.providerId = selectedModel.providerId
  }

  // 🔥 添加用户配置的参数（从 ConfigStore 获取）
  const chatConfig = configStore.chatConfig
  if (chatConfig) {
    // 系统提示词
    if (chatConfig.systemPrompt)
      options.systemMessage = chatConfig.systemPrompt

    // 模型参数
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

  // 🔥 性能监控：记录请求开始时间
  const requestStartTime = Date.now()
  let firstChunkTime: number | null = null

  try {
    let lastText = ''
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
            console.warn(`⏱️ [性能] 首字节时间 (TTFB): ${ttfb}ms`)
          }

          // Always process the final line
          const lastIndex = responseText.lastIndexOf('\n', responseText.length - 2)
          let chunk = responseText
          if (lastIndex !== -1)
            chunk = responseText.substring(lastIndex)

          try {
            const data = JSON.parse(chunk)

            // 🔥 步骤3：保存后端返回的 UUID，建立映射关系
            if (data.conversationId) {
              // 如果是首次收到后端 UUID，建立映射
              if (!chatStore.getBackendConversationId(actualUuid)) {
                chatStore.setBackendConversationId(actualUuid, data.conversationId)
              }

              // 更新当前对话ID（用于 localStorage 缓存等）
              if (data.conversationId !== currentConversationId.value) {
                currentConversationId.value = data.conversationId
              }
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
            const displayText = isThinking ? data.text : (lastText + (data.text ?? ''))

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

            if (openLongReply && data.detail.choices[0].finish_reason === 'length') {
              options.parentMessageId = data.id
              lastText = data.text
              message = ''
              return fetchChatAPIOnce()
            }

            scrollToBottomIfAtBottom()
          }
          catch (parseError: any) {
            console.error('❌ [解析错误] chunk 解析失败:', parseError)
            console.error('❌ [解析错误] chunk 内容:', chunk)
            // 不要静默失败，记录错误
          }
        },
      })
      updateChatSome(actualUuid, dataSources.value.length - 1, { loading: false })
    }

    await fetchChatAPIOnce()

    // 🔥 步骤4：保存消息到 localStorage（响应完成后）
    if (currentConversationId.value && lastText) {
      appendMessageToLocalCache(currentConversationId.value, {
        role: 'user',
        content: message,
      })

      appendMessageToLocalCache(currentConversationId.value, {
        role: 'assistant',
        content: lastText,
      })

      if (import.meta.env.DEV) {
        console.log('✅ [缓存] 消息已保存到 localStorage')
      }
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

async function onRegenerate(index: number) {
  if (loading.value)
    return

  controller = new AbortController()

  const { requestOptions } = dataSources.value[index]

  let message = requestOptions?.prompt ?? ''

  // 使用当前路由的 UUID
  const currentUuid = uuid.value

  // 🔥 获取后端 UUID
  const backendUuid = chatStore.getBackendConversationId(currentUuid) || ''

  let options: Chat.ConversationRequest = {
    conversationId: backendUuid, // 🔥 使用后端 UUID
  }

  if (requestOptions.options)
    options = { ...options, ...requestOptions.options }

  // 添加当前选中的模型
  const selectedModel = currentSelectedModel.value || modelStore.currentModel
  if (selectedModel) {
    // 🔥 发送 modelId 而不是 UUID
    options.model = selectedModel.modelId || selectedModel.name
    console.log('🔄 [重新生成] 使用模型:', selectedModel.displayName, '(modelId:', options.model, ')')

    // 🔥 同时发送供应商 ID，让后端可以查找对应的 baseUrl 和 apiKey
    options.providerId = selectedModel.providerId
  }

  // 🔥 添加用户配置的参数（从 ConfigStore 获取）
  const chatConfig = configStore.chatConfig
  if (chatConfig) {
    // 系统提示词
    if (chatConfig.systemPrompt)
      options.systemMessage = chatConfig.systemPrompt

    // 模型参数
    if (chatConfig.parameters) {
      if (chatConfig.parameters.temperature !== undefined)
        options.temperature = chatConfig.parameters.temperature
      if (chatConfig.parameters.topP !== undefined)
        options.top_p = chatConfig.parameters.topP
      if (chatConfig.parameters.maxTokens !== undefined)
        (options as any).maxTokens = chatConfig.parameters.maxTokens
    }
  }

  console.log('📦 [重新生成] 最终发送的 options:', options)

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
    const fetchChatAPIOnce = async () => {
      await fetchChatAPIProcess<Chat.ConversationResponse>({
        prompt: message,
        options,
        signal: controller.signal,
        onDownloadProgress: ({ event }) => {
          const xhr = event.target
          const { responseText } = xhr
          // Always process the final line
          const lastIndex = responseText.lastIndexOf('\n', responseText.length - 2)
          let chunk = responseText
          if (lastIndex !== -1)
            chunk = responseText.substring(lastIndex)
          try {
            const data = JSON.parse(chunk)

            // 🔥 保存后端 UUID 映射（如果需要）
            if (data.conversationId) {
              if (!chatStore.getBackendConversationId(currentUuid)) {
                chatStore.setBackendConversationId(currentUuid, data.conversationId)
              }

              if (data.conversationId !== currentConversationId.value) {
                currentConversationId.value = data.conversationId
              }
            }

            // 🔥 检查是否是思考过程
            const isThinking = data.isThinking || false
            const displayText = isThinking ? data.text : (lastText + (data.text ?? ''))

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

            if (openLongReply && data.detail.choices[0].finish_reason === 'length') {
              options.parentMessageId = data.id
              lastText = data.text
              message = ''
              return fetchChatAPIOnce()
            }

            // 🔥 累积最后的文本
            if (!isThinking && data.text) {
              lastText = displayText
            }
          }
          catch {
            //
          }
        },
      })
      updateChatSome(currentUuid, index, { loading: false })
    }
    await fetchChatAPIOnce()

    // 🔥 保存重新生成的消息到 localStorage
    if (currentConversationId.value && lastText) {
      appendMessageToLocalCache(currentConversationId.value, {
        role: 'assistant',
        content: lastText,
      })
      console.log('✅ [缓存] 重新生成的消息已保存')
    }
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

function handleClear() {
  if (loading.value)
    return

  dialog.warning({
    title: t('chat.clearChat'),
    content: t('chat.clearChatConfirm'),
    positiveText: t('common.yes'),
    negativeText: t('common.no'),
    onPositiveClick: () => {
      chatStore.clearChatByUuid(uuid.value)
    },
  })
}

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

function handleStop() {
  if (loading.value) {
    controller.abort()
    loading.value = false
  }
}

// 可优化部分
// 搜索选项计算，这里使用value作为索引项，所以当出现重复value时渲染异常(多项同时出现选中效果)
// 理想状态下其实应该是key作为索引项,但官方的renderOption会出现问题，所以就需要value反renderLabel实现
const searchOptions = computed(() => {
  if (prompt.value.startsWith('/')) {
    return promptTemplate.value.filter((item: { key: string }) => item.key.toLowerCase().includes(prompt.value.substring(1).toLowerCase())).map((obj: { value: any }) => {
      return {
        label: obj.value,
        value: obj.value,
      }
    })
  }
  else {
    return []
  }
})

// value反渲染key
function renderOption(option: { label: string }) {
  for (const i of promptTemplate.value) {
    if (i.value === option.label)
      return [i.key]
  }
  return []
}

const placeholder = computed(() => {
  if (isMobile.value)
    return t('chat.placeholderMobile')
  return t('chat.placeholder')
})

const buttonDisabled = computed(() => {
  return loading.value || !prompt.value || prompt.value.trim() === ''
})

const footerClass = computed(() => {
  let classes = ['px-4', 'pb-6', 'pt-0', '!bg-transparent', 'backdrop-blur-md']
  if (isMobile.value)
    classes = ['sticky', 'left-0', 'bottom-0', 'right-0', 'p-2', 'pr-3', 'overflow-hidden', '!bg-transparent', 'backdrop-blur-md']
  return classes
})

// 文件上传（拖拽）
const uploadFileList = ref<UploadFileInfo[]>([])

// 工作流状态 - 从 store 获取和更新
const workflowState = computed(() => chatStore.getWorkflowStateByUuid(uuid.value))
const uploadedFilePath = computed({
  get: () => workflowState.value?.uploadedFilePath || '',
  set: val => chatStore.updateWorkflowStateSome(uuid.value, { uploadedFilePath: val }),
})
const workflowStage = computed({
  get: () => workflowState.value?.stage || 'idle',
  set: val => chatStore.updateWorkflowStateSome(uuid.value, { stage: val }),
})
const classification = computed({
  get: () => workflowState.value?.classification || '',
  set: val => chatStore.updateWorkflowStateSome(uuid.value, { classification: val }),
})
const generatedQuestions = computed({
  get: () => workflowState.value?.generatedQuestions || [],
  set: val => chatStore.updateWorkflowStateSome(uuid.value, { generatedQuestions: val }),
})
const scoreDistribution = computed({
  get: () => workflowState.value?.scoreDistribution,
  set: val => chatStore.updateWorkflowStateSome(uuid.value, { scoreDistribution: val }),
})
const quizLoading = ref(false)

function handleUploadChange(options: { fileList: UploadFileInfo[] }) {
  uploadFileList.value = options.fileList
}
// 文件上传时的回调，判断是否上传
async function handleBeforeUpload(data: { file: UploadFileInfo, fileList: UploadFileInfo[] }) {
  const { file: fileInfo } = data

  const rawFile = fileInfo.file as File | null

  if (!rawFile) {
    ms.warning(t('common.wrong'))
    return false
  }

  const fileName = rawFile.name
  const fileSize = rawFile.size // 字节

  // 1. 获取文件扩展名（转小写，兼容大小写）
  const extension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase()

  // 2. 定义允许的扩展名
  const allowedExtensions = ['.doc', '.docx', '.pdf', '.md', '.txt']
  if (!allowedExtensions.includes(extension)) {
    ms.warning(t('不支持的文件类型'))
    return false
  }

  // 3. 定义 Word/PDF 的扩展名（需要限制 10MB）
  const wordOrPdfExtensions = ['.doc', '.docx', '.pdf']
  const isWordOrPdf = wordOrPdfExtensions.includes(extension)
  const maxSize = 10 * 1024 * 1024 // 10MB

  if (isWordOrPdf && fileSize > maxSize) {
    ms.warning(t('文件不能超过 10MB', { size: '10MB' }))
    return false
  }

  // 对 .md / .txt 也限制（5MB）
  const otherMaxSize = 5 * 1024 * 1024
  if (!isWordOrPdf && fileSize > otherMaxSize) {
    ms.warning('文本文件不能超过 5MB')
    return false
  }
  return true
}

function handleUploadSuccess(options: {
  file: UploadFileInfo
  event?: ProgressEvent
}) {
  try {
    const { file } = options

    // 获取响应数据
    const xhr = options.event?.target as XMLHttpRequest
    if (xhr && xhr.responseText) {
      const response = JSON.parse(xhr.responseText)

      // 检查响应状态
      if (response.status === 'Success' && response.data?.filePath) {
        // 保存文件路径
        uploadedFilePath.value = response.data.filePath
        classification.value = response.data.classification || ''

        // 使用原始文件名显示（如果有的话）
        const displayName = response.data.originalName || file.name
        ms.success(`文件 ${displayName} 上传成功！`)

        // 根据分类结果决定下一步
        if (response.data.classification === 'note') {
          // 笔记类型：显示题目配置界面
          workflowStage.value = 'config'
          ms.info('检测到笔记内容，请配置题目类型和数量')
        }
        else if (response.data.classification === 'question') {
          // 题目类型：提示用户
          workflowStage.value = 'idle'
          ms.info('检测到题目内容，您可以继续其他操作')
        }
        else if (response.data.error) {
          ms.error(response.data.error)
          workflowStage.value = 'idle'
        }
        else {
          workflowStage.value = 'idle'
        }
      }
      else {
        ms.error('文件上传失败，响应格式错误')
      }
    }
  }
  catch (error: any) {
    ms.error(`处理上传文件失败：${error?.message || '未知错误'}`)
  }
}

// 处理上传错误
function handleUploadError(options: {
  file: UploadFileInfo
  event?: ProgressEvent
}) {
  const { file } = options
  ms.error(`文件 ${file.name} 上传失败`)
}

// 处理文件删除
async function handleUploadRemove(options: {
  file: UploadFileInfo
  fileList: UploadFileInfo[]
}): Promise<boolean> {
  try {
    const { file, fileList } = options

    // 如果已经上传到服务器，需要删除服务器上的文件
    if (uploadedFilePath.value) {
      await fetchDeleteFile(uploadedFilePath.value)
      uploadedFilePath.value = ''
      ms.success(`文件 ${file.name} 已删除`)
    }
    else {
      ms.info(`文件 ${file.name} 已从列表中移除`)
    }

    // 重置工作流状态
    workflowStage.value = 'idle'
    classification.value = ''
    generatedQuestions.value = []

    // 更新文件列表（fileList 已经是过滤后的列表）
    uploadFileList.value = fileList

    return true // 返回 true 表示允许删除
  }
  catch (error: any) {
    ms.error(`删除文件失败：${error?.message || '未知错误'}`)
    return false // 返回 false 表示删除失败
  }
}

// 处理题目配置提交
async function handleQuizConfigSubmit(config: {
  single_choice: number
  multiple_choice: number
  true_false: number
}) {
  try {
    quizLoading.value = true
    workflowStage.value = 'generating'

    const result = await fetchQuizGenerate(uploadedFilePath.value, config)

    if (result.data && result.data.questions) {
      generatedQuestions.value = result.data.questions
      // 保存分数分配信息
      if (result.data.scoreDistribution)
        scoreDistribution.value = result.data.scoreDistribution

      workflowStage.value = 'preview'
      ms.success('题目生成成功！')
    }
    else {
      ms.error('题目生成失败')
      workflowStage.value = 'config'
    }
  }
  catch (error: any) {
    ms.error(`题目生成失败：${error?.message || '未知错误'}`)
    workflowStage.value = 'config'
  }
  finally {
    quizLoading.value = false
  }
}

// 处理题目预览 - 接受
function handleQuizAccept() {
  workflowStage.value = 'answering'
  ms.success('已接受题目，开始答题吧！')
}

// 处理题目预览 - 拒绝
async function handleQuizReject() {
  try {
    await fetchQuizFeedback(uploadedFilePath.value, 'Reject')
    workflowStage.value = 'config'
    generatedQuestions.value = []
    ms.info('已拒绝题目，请重新配置')
  }
  catch (error: any) {
    ms.error(`操作失败：${error?.message || '未知错误'}`)
  }
}

// 处理题目预览 - 修改
async function handleQuizRevise(note: string) {
  try {
    quizLoading.value = true
    await fetchQuizFeedback(uploadedFilePath.value, 'Revise', note)

    // 重新生成题目
    ms.info('正在根据您的意见重新生成题目...')
    workflowStage.value = 'generating'

    // 这里可以调用重新生成的 API
    // 暂时回到配置页面
    setTimeout(() => {
      workflowStage.value = 'config'
      ms.warning('修改功能开发中，请重新配置生成')
      quizLoading.value = false
    }, 1000)
  }
  catch (error: any) {
    ms.error(`操作失败：${error?.message || '未知错误'}`)
    quizLoading.value = false
  }
}

// 处理答题提交
function handleQuizSubmit(answers: Record<number, string[]>, timeSpent: number) {
  console.log('答题完成', { answers, timeSpent })
  ms.success('答题完成！')
}

// 右侧侧边栏控制
const rightSiderCollapsed = computed(() => appStore.rightSiderCollapsed)
const rightSiderWidth = computed(() => appStore.rightSiderWidth)

function toggleRightSider() {
  appStore.setRightSiderCollapsed(!rightSiderCollapsed.value)
}

// 拖拽调整宽度
const isDragging = ref(false)
const dragStartX = ref(0)
const dragStartWidth = ref(0)

function handleResizeStart(e: MouseEvent) {
  isDragging.value = true
  dragStartX.value = e.clientX
  dragStartWidth.value = rightSiderWidth.value
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

function handleResizeMove(e: MouseEvent) {
  if (!isDragging.value)
    return

  const windowWidth = window.innerWidth
  const deltaX = dragStartX.value - e.clientX // 向左拖动为正
  const deltaPercent = (deltaX / windowWidth) * 100
  const newWidth = dragStartWidth.value + deltaPercent

  appStore.setRightSiderWidth(newWidth)
}

function handleResizeEnd() {
  isDragging.value = false
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

// 模型选择器状态（需要在 onMounted 之前定义）
const showModelSelector = ref(false)
const activeVendor = ref('') // 🔥 初始化为空，将在加载模型后自动设置
const modelSearch = ref('')
const selectedModelFromPopover = ref<string | null>(null)

// 监听鼠标事件
onMounted(async () => {
  // ✅ 等待应用初始化完成（正常情况下路由守卫已完成）
  if (!appInitStore.isFullyInitialized && appInitStore.isInitializing) {
    if (import.meta.env.DEV) {
      console.warn('⏳ [Chat] 等待应用初始化完成...')
    }
    // 可以添加 loading 状态或等待逻辑
  }

  // 📋 组件特定的初始化
  scrollToBottom()
  if (inputRef.value && !isMobile.value)
    inputRef.value?.focus()

  // 🔐 显示权限通知（只显示一次，由 AppInitStore 管理）
  if (auth0.isAuthenticated.value && !appInitStore.permissionNotificationShown) {
    appInitStore.showPermissionNotification(
      notification,
      auth0.user.value?.name || auth0.user.value?.email,
    )
  }

  // 加载当前选中的模型（已从缓存恢复）
  loadCurrentModel()

  // 🔥 设置默认的 activeVendor（仅在没有保存的模型时）
  if (modelStore.providers.length > 0 && !activeVendor.value) {
    const firstEnabledProvider = modelStore.providers.find((p: any) => p.enabled && p.models.length > 0)
    if (firstEnabledProvider) {
      activeVendor.value = firstEnabledProvider.id
      if (import.meta.env.DEV) {
        console.warn('✅ [Chat] 设置默认供应商:', firstEnabledProvider.displayName)
      }
    }
  }

  // 监听鼠标拖拽事件
  document.addEventListener('mousemove', handleResizeMove)
  document.addEventListener('mouseup', handleResizeEnd)
})

onUnmounted(() => {
  if (loading.value)
    controller.abort()

  document.removeEventListener('mousemove', handleResizeMove)
  document.removeEventListener('mouseup', handleResizeEnd)
})

// 监听设置选项卡切换，首次点击API使用量时自动加载
watch(activeSettingTab, (newValue) => {
  if (newValue === 'Config' && !hasLoadedUsage.value && isChatGPTAPI.value) {
    hasLoadedUsage.value = true
    setTimeout(() => {
      if (aboutRef.value && typeof aboutRef.value.fetchUsage === 'function')
        aboutRef.value.fetchUsage()
    }, 100)
  }
})

// 从 localStorage 获取模型数据
interface ModelItem {
  id: string
  name: string
  modelId?: string
  provider: string
  providerId?: string
  displayName: string
  enabled: boolean
  deleted: boolean
  created?: string
}

// 获取供应商列表（只显示已启用的供应商）
const availableVendors = computed(() => {
  try {
    // 从ModelStore获取启用的供应商和模型
    return modelStore.providers
      .filter((provider: any) => provider.enabled && provider.models.length > 0)
      .map((provider: any) => ({
        label: provider.displayName || provider.name, // 🔥 使用 provider 的 displayName
        key: provider.id, // 🔥 使用 UUID 作为 key
        count: provider.models.filter((m: any) => m.enabled).length,
      }))
  }
  catch (error) {
    console.error('❌ [模型] 获取供应商列表失败:', error)
    return []
  }
})

// 获取当前供应商的模型列表
const currentVendorModels = computed(() => {
  try {
    // 从ModelStore获取当前供应商的模型
    const provider = modelStore.providers.find((p: any) => p.id === activeVendor.value)

    if (!provider || !provider.enabled)
      return []

    let filteredModels = provider.models.map((model: any) => ({
      id: model.id,
      name: model.name || model.modelId || model.displayName,
      modelId: model.modelId,
      provider: model.provider,
      providerId: model.providerId, // 🔥 添加 providerId 字段
      displayName: model.displayName || model.name || model.modelId,
      enabled: model.enabled !== false,
      deleted: false,
    }))

    // 搜索过滤
    if (modelSearch.value) {
      const keyword = modelSearch.value.toLowerCase()
      filteredModels = filteredModels.filter((model: any) =>
        model.name.toLowerCase().includes(keyword)
        || model.displayName.toLowerCase().includes(keyword),
      )
    }

    return filteredModels
  }
  catch (error) {
    console.error('❌ [模型] 获取模型列表失败:', error)
    return []
  }
})

// 选择供应商（hover 时触发）
function handleVendorHover(vendor: string) {
  activeVendor.value = vendor
  modelSearch.value = '' // 清空搜索
}

// 加载当前选中的模型
function loadCurrentModel() {
  try {
    // 从ModelStore获取当前选中的模型
    const currentModelFromStore = modelStore.currentModel

    if (currentModelFromStore) {
      // 检查模型是否仍然存在于可用模型列表中
      const isModelAvailable = modelStore.enabledModels.some((m: any) => m.id === currentModelFromStore.id)

      if (isModelAvailable) {
        // 模型存在，直接使用
        currentSelectedModel.value = {
          id: currentModelFromStore.id,
          name: currentModelFromStore.name || '',
          provider: currentModelFromStore.provider,
          providerId: currentModelFromStore.providerId, // 🔥 添加 providerId 字段
          displayName: currentModelFromStore.displayName || currentModelFromStore.name || currentModelFromStore.modelId || '',
          enabled: true,
          deleted: false,
        }
        selectedModelFromPopover.value = currentModelFromStore.id

        // 🔥 自动绑定供应商信息（同时设置 activeVendor 和 currentProviderId）
        if (currentModelFromStore.providerId) {
          // 设置 ModelStore 的当前供应商
          if (!modelStore.currentProviderId) {
            modelStore.setCurrentProvider(currentModelFromStore.providerId as any)
          }
          // 🔥 同时设置模型选择器 UI 的激活供应商
          activeVendor.value = currentModelFromStore.providerId

          if (import.meta.env.DEV) {
            console.warn('🔗 [模型] 已绑定供应商:', currentModelFromStore.providerId)
          }
        }

        if (import.meta.env.DEV) {
          console.warn('✅ [模型] 加载已保存的模型:', currentSelectedModel.value?.displayName)
          console.warn('🔍 [模型] currentSelectedModel.value:', currentSelectedModel.value)
          console.warn('🔍 [模型] modelStore.currentModel:', modelStore.currentModel)
        }
      }
      else {
        // 模型不存在，重置为默认状态
        if (import.meta.env.DEV) {
          console.warn('⚠️ [模型] 已保存的模型不存在，重置为默认状态')
        }
        resetToDefaultModel()
      }
    }
    else {
      // 没有保存的模型，重置为默认状态
      resetToDefaultModel()
    }
  }
  catch (error) {
    console.error('❌ [模型] 加载当前模型失败:', error)
    resetToDefaultModel()
  }
}

// 重置为默认模型状态
function resetToDefaultModel() {
  currentSelectedModel.value = null
  selectedModelFromPopover.value = null
  // 清除ModelStore中的当前模型选择
  modelStore.currentModelId = ''
  modelStore.recordState()
}

// 选择模型
function handleSelectModel(model: ModelItem) {
  selectedModelFromPopover.value = model.id
  currentSelectedModel.value = model

  // 🔥 自动绑定供应商信息，减少后续查询
  if (model.providerId && model.providerId !== modelStore.currentProviderId) {
    modelStore.setCurrentProvider(model.providerId as any)
    if (import.meta.env.DEV) {
      console.warn('🔗 [模型] 已绑定供应商:', model.providerId)
    }
  }

  // 保存到ModelStore
  try {
    modelStore.setCurrentModel(model.id)
  }
  catch (error) {
    console.error('❌ [模型] 保存模型选择失败:', error)
  }

  // 关闭弹窗
  showModelSelector.value = false
  ms.success(`已切换到模型: ${model.displayName}`)
}
</script>

<template>
  <!-- TODO: 添加 Auth0 登录检查 -->
  <div class="flex flex-col w-full h-full bg-white dark:bg-[#161618]">
    <transition name="fade" mode="out-in">
      <!-- 设置页面 - 整体替换 -->
      <div v-if="showSettingsPage" key="settings" class="flex-1 overflow-hidden flex flex-col">
        <div class="flex-1 overflow-y-auto bg-white dark:bg-[#161618]" style="padding: 10px 30px;">
          <div class="w-full max-w-full">
            <transition name="fade-fast" mode="out-in">
              <!-- 🔥 个人设置 - 使用新的 UserSettingsPanel -->
              <UserSettingsPanel v-if="activeSettingTab === 'General'" key="general" />

              <!-- 🔥 聊天配置 - 使用新的 ChatConfigPanel -->
              <ChatConfigPanel v-else-if="activeSettingTab === 'ChatConfig'" key="chat-config" />

              <!-- Advanced 设置 - 保持不变 -->
              <Advanced v-else-if="activeSettingTab === 'Advanced' && isChatGPTAPI" key="advanced" />

              <!-- API 配置 - 保持 About 组件（API使用量） -->
              <About v-else-if="activeSettingTab === 'Config'" key="config" ref="aboutRef" />

              <!-- 🔥 工作流配置 - 使用新的 WorkflowConfigPanel -->
              <WorkflowConfigPanel v-else-if="activeSettingTab === 'WorkflowModel'" key="workflow" />

              <!-- 🔥 供应商管理 - 使用新的 ProviderConfigPanel 包装器 -->
              <ProviderConfigPanel v-else-if="activeSettingTab === 'ProviderConfig'" key="provider" />
            </transition>
          </div>
        </div>
      </div>

      <!-- 聊天页面 - 包含Header -->
      <div v-else key="chat" class="flex-1 overflow-hidden flex flex-col relative bg-white dark:bg-[#161618]">
        <HeaderComponent
          v-if="isMobile"
          :using-context="usingContext"
          @export="handleExport"
          @handle-clear="handleClear"
        />

        <!-- Web端Header - 悬浮透明 -->
        <header v-if="!isMobile" class="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 bg-transparent">
          <div class="flex items-center space-x-4">
            <NPopover
              v-model:show="showModelSelector"
              trigger="click"
              placement="bottom-start"
              :show-arrow="false"
              :width="700"
              @update:show="(show) => show && loadCurrentModel()"
            >
              <template #trigger>
                <NButton quaternary>
                  <template #icon>
                    <SvgIcon icon="ri:openai-fill" />
                  </template>
                  {{ currentSelectedModel ? currentSelectedModel.displayName : (modelStore.currentModel ? modelStore.currentModel.displayName : '请选择模型') }}
                </NButton>
              </template>

              <!-- 弹出内容 -->
              <div v-if="availableVendors.length > 0" class="model-selector-popup">
                <NLayout has-sider style="height: 400px">
                  <!-- 左侧供应商列表 -->
                  <NLayoutSider :width="180" bordered class="vendor-sidebar">
                    <NScrollbar style="height: 100%">
                      <div class="vendor-list">
                        <div
                          v-for="vendor in availableVendors"
                          :key="vendor.key"
                          class="vendor-item"
                          :class="{ active: activeVendor === vendor.key }"
                          @mouseenter="handleVendorHover(vendor.key)"
                        >
                          <span class="vendor-name">{{ vendor.label }}</span>
                        </div>
                      </div>
                    </NScrollbar>
                  </NLayoutSider>

                  <!-- 右侧模型列表 -->
                  <NLayout class="model-content">
                    <NLayoutHeader bordered class="search-header">
                      <NInput
                        v-model:value="modelSearch"
                        placeholder="🔍 搜索模型名称..."
                        clearable
                        size="small"
                      />
                    </NLayoutHeader>
                    <NLayoutContent>
                      <NScrollbar style="height: 100%">
                        <div v-if="currentVendorModels.length === 0" class="empty-state">
                          {{ modelSearch ? '没有找到匹配的模型' : '该供应商暂无可用模型' }}
                        </div>
                        <NList v-else bordered>
                          <NListItem
                            v-for="model in currentVendorModels"
                            :key="model.id"
                            class="model-item"
                            :class="{ selected: selectedModelFromPopover === model.id }"
                            @click="handleSelectModel(model)"
                          >
                            <div class="model-item-content">
                              <div class="model-info">
                                <span class="model-name">{{ model.displayName }}</span>
                              </div>
                              <NIcon v-if="selectedModelFromPopover === model.id" color="#333333" class="dark:text-white" size="20">
                                <CheckmarkOutline />
                              </NIcon>
                            </div>
                          </NListItem>
                        </NList>
                      </NScrollbar>
                    </NLayoutContent>
                  </NLayout>
                </NLayout>
              </div>
              <div v-else class="empty-vendor">
                <p>暂无可用模型</p>
                <p class="text-sm text-gray-500 mt-2">
                  请先在设置中配置模型
                </p>
              </div>
            </NPopover>
          </div>
          <div class="flex items-center space-x-2">
            <HoverButton v-if="!isMobile" @click="handleExport">
              <span class="text-xl text-[#4f555e] dark:text-white">
                <SvgIcon icon="ri:download-2-line" />
              </span>
            </HoverButton>
          </div>
        </header>

        <!-- 聊天区域主体 -->
        <main class="flex-1 overflow-hidden flex flex-col relative bg-white dark:bg-[#161618]">
          <div
            class="flex-1 overflow-hidden transition-all duration-300"
            :style="{
              marginRight: (chatStore.chatMode === 'noteToQuestion' || chatStore.chatMode === 'noteToStory') && !isMobile && !rightSiderCollapsed ? `${rightSiderWidth}%` : '0',
            }"
          >
            <article class="h-full overflow-hidden flex flex-col bg-white dark:bg-[#161618]">
              <div class="flex-1 overflow-hidden">
                <div id="scrollRef" ref="scrollRef" class="h-full overflow-hidden overflow-y-auto">
                  <div
                    class="w-full max-w-screen-xl m-auto bg-white dark:bg-[#161618]"
                    :class="[isMobile ? 'p-2' : 'p-4']"
                  >
                    <div id="image-wrapper" class="relative">
                      <template v-if="!dataSources.length">
                        <div class="flex items-center justify-center mt-4 text-center text-neutral-400 dark:text-neutral-500">
                          <SvgIcon icon="ri:bubble-chart-fill" class="mr-2 text-3xl" />
                          <span>{{ t('chat.newChatTitle') }}</span>
                        </div>
                      </template>
                      <template v-else>
                        <div>
                          <!-- 占位空间，防止第一条消息被悬浮的 header 遮挡 -->
                          <div v-if="!isMobile" class="h-24" />
                          <Message
                            v-for="(item, index) of dataSources"
                            :key="index"
                            :date-time="item.dateTime"
                            :text="item.text"
                            :inversion="item.inversion"
                            :error="item.error"
                            :loading="item.loading"
                            @regenerate="onRegenerate(index)"
                            @delete="handleDelete(index)"
                          />
                          <div class="sticky bottom-0 left-0 flex justify-center">
                            <NButton v-if="loading" type="warning" @click="handleStop">
                              <template #icon>
                                <SvgIcon icon="ri:stop-circle-line" />
                              </template>
                              {{ t('common.stopResponding') }}
                            </NButton>
                          </div>
                        </div>
                      </template>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Footer 固定在底部 -->
              <footer :class="footerClass">
                <div class="w-full max-w-screen-xl m-auto">
                  <div class="flex items-center justify-between space-x-2">
                    <HoverButton v-if="!isMobile" @click="handleClear">
                      <span class="text-xl text-[#4f555e] dark:text-white">
                        <SvgIcon icon="ri:delete-bin-line" />
                      </span>
                    </HoverButton>
                    <HoverButton v-if="!isMobile" @click="handleExport">
                      <span class="text-xl text-[#4f555e] dark:text-white">
                        <SvgIcon icon="ri:download-2-line" />
                      </span>
                    </HoverButton>
                    <HoverButton @click="toggleUsingContext">
                      <span class="text-xl" :class="{ 'text-neutral-800 dark:text-white': usingContext, 'text-[#a8071a]': !usingContext }">
                        <SvgIcon icon="ri:chat-history-line" />
                      </span>
                    </HoverButton>
                    <NAutoComplete v-model:value="prompt" :options="searchOptions" :render-label="renderOption">
                      <template #default="{ handleInput, handleBlur, handleFocus }">
                        <NInput
                          ref="inputRef"
                          v-model:value="prompt"
                          type="textarea"
                          :placeholder="placeholder"
                          :autosize="{ minRows: 2, maxRows: isMobile ? 6 : 12 }"
                          style="font-size: 16px; line-height: 1.5;"
                          @input="handleInput"
                          @focus="handleFocus"
                          @blur="handleBlur"
                          @keypress="handleEnter"
                        />
                      </template>
                    </NAutoComplete>
                    <NButton type="primary" :disabled="buttonDisabled" size="large" @click="handleSubmit">
                      <template #icon>
                        <span class="dark:text-black">
                          <SvgIcon icon="ri:send-plane-fill" />
                        </span>
                      </template>
                    </NButton>
                  </div>
                </div>
              </footer>
            </article>
          </div>

          <!-- 右侧侧边栏展开/收起按钮（仅在收起时显示） -->
          <div
            v-if="(chatStore.chatMode === 'noteToStory' || chatStore.chatMode === 'noteToQuestion') && !isMobile && rightSiderCollapsed"
            class="absolute right-0 top-[15px] w-8 h-8 bg-white dark:bg-[#161618] border border-neutral-200 dark:border-neutral-700 rounded-l-lg flex items-center justify-center cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all duration-300 shadow-md z-10"
            @click="toggleRightSider"
          >
            <SvgIcon
              icon="ri:arrow-left-s-line"
              class="text-lg text-neutral-600 dark:text-neutral-400"
            />
          </div>

          <!-- 右侧侧边栏 -->
          <aside
            v-if="(chatStore.chatMode === 'noteToStory' || chatStore.chatMode === 'noteToQuestion') && !isMobile && !rightSiderCollapsed"
            class="absolute right-0 top-0 bottom-0 bg-white dark:bg-[#161618] border-l border-neutral-200 dark:border-neutral-700 transition-all duration-300 flex flex-col shadow-lg"
            :style="{
              width: `${rightSiderWidth}%`,
            }"
          >
            <!-- 拖拽调整宽度的分隔条 -->
            <div
              class="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500 transition-colors group"
              @mousedown="handleResizeStart"
            >
              <div class="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-neutral-300 dark:bg-neutral-600 group-hover:bg-blue-500 rounded-full transition-colors" />
            </div>

            <!-- 收起按钮 -->
            <div
              class="absolute -left-8 top-[15px] w-8 h-8 bg-white dark:bg-[#161618] border border-neutral-200 dark:border-neutral-700 rounded-l-lg flex items-center justify-center cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors shadow-md"
              @click="toggleRightSider"
            >
              <SvgIcon
                icon="ri:arrow-right-s-line"
                class="text-lg text-neutral-600 dark:text-neutral-400"
              />
            </div>

            <!-- 右侧内容区域 -->
            <div class="flex-1 overflow-hidden flex flex-col">
              <!-- 笔记转题目 -->
              <div
                v-if="chatStore.chatMode === 'noteToQuestion'"
                class="flex-1 overflow-y-auto p-4"
              >
                <NUpload
                  directory-dnd
                  :show-file-list="true"
                  :default-upload="true"
                  action="/api/upload"
                  :max="1"
                  :on-before-upload="handleBeforeUpload"
                  :on-change="handleUploadChange"
                  :on-finish="handleUploadSuccess"
                  :on-error="handleUploadError"
                  :on-remove="handleUploadRemove"
                >
                  <NUploadDragger>
                    <div style="margin-bottom: 12px;">
                      <SvgIcon icon="ri:folder-upload-fill" class="mx-auto text-3xl" />
                    </div>
                    <NText depth="3">
                      将文件拖拽到此处，或点击选择文件
                    </NText>
                    <div style="margin-top: 8px;" class="text-xs text-neutral-500">
                      支持TXT、PDF、Markdown、Word等纯文本文件
                    </div>
                  </NUploadDragger>
                </NUpload>

                <!-- 工作流阶段展示 -->
                <div class="mt-4">
                  <!-- 题目配置阶段 -->
                  <QuizConfig
                    v-if="workflowStage === 'config' || workflowStage === 'generating'"
                    :loading="quizLoading || workflowStage === 'generating'"
                    @submit="handleQuizConfigSubmit"
                  />

                  <!-- 题目预览阶段 -->
                  <QuizPreview
                    v-else-if="workflowStage === 'preview'"
                    :questions="generatedQuestions"
                    :score-distribution="scoreDistribution"
                    @accept="handleQuizAccept"
                    @reject="handleQuizReject"
                    @revise="handleQuizRevise"
                  />

                  <!-- 答题阶段 -->
                  <QuizAnswer
                    v-else-if="workflowStage === 'answering' || workflowStage === 'finished'"
                    :questions="generatedQuestions"
                    :score-distribution="scoreDistribution"
                    @submit="handleQuizSubmit"
                  />

                  <!-- 空闲状态提示 -->
                  <div
                    v-else-if="workflowStage === 'idle' && !uploadedFilePath"
                    class="text-center text-neutral-500 dark:text-neutral-400"
                  >
                    <SvgIcon icon="ri:file-text-line" class="mx-auto mb-2 text-4xl" />
                    <p>笔记转题目功能</p>
                    <p class="text-sm mt-1">
                      请上传笔记文件
                    </p>
                  </div>
                </div>
              </div>

              <!-- 笔记转故事 -->
              <div
                v-if="chatStore.chatMode === 'noteToStory'"
                class="flex-1 overflow-y-auto p-4"
              >
                <div class="text-center text-neutral-500 dark:text-neutral-400">
                  <SvgIcon icon="ri:book-open-line" class="mx-auto mb-2 text-4xl" />
                  <p>
                    笔记转故事功能
                  </p>
                  <p class="text-sm mt-1">
                    此功能正在开发中...
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </main>
      </div>
    </transition>
  </div>
</template>

<style scoped>
/* 页面切换淡入淡出效果 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 设置内容快速切换效果 */
.fade-fast-enter-active,
.fade-fast-leave-active {
  transition: opacity 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-fast-enter-from,
.fade-fast-leave-to {
  opacity: 0;
}

/* 模型选择器弹出框样式 */
.model-selector-popup {
  background: white;
}

:deep(.dark) .model-selector-popup {
  background: #161618;
}

/* 供应商列表样式 */
.vendor-sidebar {
  background: #fafafa;
}

:deep(.dark) .vendor-sidebar {
  background: #161618;
}

.vendor-list {
  padding: 4px;
}

.vendor-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  margin-bottom: 4px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.vendor-item:hover {
  background: rgba(0, 0, 0, 0.05);
}

:deep(.dark) .vendor-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.vendor-item.active {
  background: rgba(0, 0, 0, 0.05);
  border-left: 3px solid #333333;
}

:deep(.dark) .vendor-item.active {
  background: rgba(255, 255, 255, 0.1);
  border-left: 3px solid #ffffff;
}

.vendor-name {
  font-weight: 500;
  color: #333;
}

:deep(.dark) .vendor-name {
  color: #e5e5e5;
}

.vendor-count {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 12px;
  background: #333333;
  color: white;
}

:deep(.dark) .vendor-count {
  background: #ffffff;
  color: #000000;
}

/* 搜索框样式 */
.search-header {
  padding: 12px;
}

/* 模型列表样式 */
.model-content {
  background: white;
}

:deep(.dark) .model-content {
  background: #161618;
}

.model-item {
  cursor: pointer;
  transition: all 0.2s;
}

.model-item:hover {
  background: rgba(0, 0, 0, 0.05);
}

:deep(.dark) .model-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.model-item.selected {
  background: rgba(0, 0, 0, 0.1);
}

:deep(.dark) .model-item.selected {
  background: rgba(255, 255, 255, 0.1);
}

.model-item-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 4px 0;
}

.model-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.model-name {
  font-weight: 500;
  color: #333;
  font-size: 14px;
}

:deep(.dark) .model-name {
  color: #e5e5e5;
}

.model-id {
  font-size: 12px;
  color: #999;
}

:deep(.dark) .model-id {
  color: #666;
}

/* 空状态样式 */
.empty-state {
  padding: 40px 20px;
  text-align: center;
  color: #999;
}

.empty-vendor {
  padding: 40px 20px;
  text-align: center;
  color: #999;
}
</style>
