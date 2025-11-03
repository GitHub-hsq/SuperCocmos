/**
 * useChatState.ts
 * 聊天状态管理 Composable
 *
 * 负责管理：
 * - 基础依赖（router, dialog, message 等）
 * - Stores（appStore, chatStore, configStore 等）
 * - 核心状态（uuid, dataSources, prompt, loading 等）
 * - 计算属性（placeholder, buttonDisabled, footerStyle 等）
 * - Watch 监听（路由变化、输入框变化等）
 */

import type { UploadFileInfo } from 'naive-ui'
import type { Ref } from 'vue'
import { useAuth0 } from '@auth0/auth0-vue'
import { useDialog, useMessage, useNotification } from 'naive-ui'
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBasicLayout } from '@/hooks/useBasicLayout'
import { t } from '@/locales'
import { useAppInitStore, useAppStore, useAuthStore, useChatStore, useConfigStore, useModelStore } from '@/store'
import { setLocalPreferences } from '@/store/modules/chat/helper'
import { useChat } from '../hooks/useChat'
import { useScroll } from '../hooks/useScroll'
import { useUsingContext } from '../hooks/useUsingContext'

export interface ModelItem {
  id: string
  name: string
  modelId?: string
  provider: string
  providerId?: string
  displayName: string
  enabled: boolean
  deleted: boolean
}

export function useChatState() {
  // ===== 1. 基础依赖 =====
  const route = useRoute()
  const router = useRouter()
  const dialog = useDialog()
  const ms = useMessage()
  const notification = useNotification()
  const auth0 = useAuth0()

  // ===== 2. Stores =====
  const appStore = useAppStore()
  const appInitStore = useAppInitStore()
  const authStore = useAuthStore()
  const chatStore = useChatStore()
  const configStore = useConfigStore()
  const modelStore = useModelStore()

  // ===== 3. Hooks =====
  const { isMobile } = useBasicLayout()
  const { addChat, updateChat, updateChatSome, getChatByUuidAndIndex } = useChat()
  const { scrollRef, scrollToBottom, scrollToBottomIfAtBottom } = useScroll()
  const { usingContext } = useUsingContext()

  // ===== 4. 核心状态 =====
  // 🔥 使用 computed 让 uuid 响应式（路由变化时自动更新）
  const uuid = computed(() => (route.params.uuid as string) || '')
  const dataSources = computed(() => chatStore.getChatByUuid(uuid.value))
  const prompt = ref<string>('')
  const loading = ref<boolean>(false)
  const inputRef = ref<Ref | null>(null)
  const isMultiLine = ref<boolean>(false)
  const isFooterElevated = ref(true) // 新会话时footer上移的状态
  const currentConversationId = ref<string>('') // 当前对话ID（用于跨浏览器同步）
  const currentSelectedModel = ref<ModelItem | null>(null)

  // 判断是否是暗色主题（支持 auto 模式）
  const isDarkTheme = computed(() => {
    if (appStore.theme === 'auto') {
      return document.documentElement.classList.contains('dark')
    }
    return appStore.theme === 'dark'
  })

  // ===== 5. 设置页面相关 =====
  const showSettingsPage = computed(() => appStore.showSettingsPage)
  const activeSettingTab = computed(() => appStore.activeSettingTab)
  const isChatGPTAPI = computed<boolean>(() => !!authStore.isChatGPTAPI)
  const aboutRef = ref<any>(null)
  const hasLoadedUsage = ref(false)

  // ===== 6. 输入框相关 =====
  const placeholder = computed(() => {
    if (isMobile.value)
      return t('chat.placeholderMobile')
    return t('chat.placeholder')
  })

  const buttonDisabled = computed(() => {
    return loading.value || !prompt.value || prompt.value.trim() === ''
  })

  const footerClass = computed(() => {
    let classes = ['px-4', 'pb-6', 'pt-0', '!bg-transparent', 'backdrop-blur-md', 'footer-transition']
    if (isMobile.value)
      classes = ['sticky', 'left-0', 'bottom-0', 'right-0', 'overflow-hidden', '!bg-transparent', 'backdrop-blur-md']
    return classes
  })

  // 移动端键盘高度（用于动态调整 footer 位置）
  const keyboardHeight = ref(0)

  const footerStyle = computed(() => {
    let style = ''

    if (isMobile.value) {
      // 移动端：根据键盘高度动态调整 bottom 值，使输入框始终贴近键盘
      const bottomValue = keyboardHeight.value > 0 ? `${keyboardHeight.value}px` : '0px'
      style = `padding: 0px 16px 16px 16px; bottom: ${bottomValue}; transition: bottom 0.25s ease-out;`
    }
    else {
      // Web端：新会话时使用transform让输入框上移
      if (isFooterElevated.value && !dataSources.value.length) {
        style = 'transform: translateY(-49vh); position: relative;'
      }
    }

    return style
  })

  // ===== 7. 文件上传相关 =====
  const uploadFileList = ref<UploadFileInfo[]>([])

  // 上传请求头 - 使用 ref 以便异步更新
  const uploadHeaders = ref<Record<string, string>>({
    'Content-Type': 'multipart/form-data',
  })

  // 异步获取并更新上传请求头
  async function updateUploadHeaders() {
    try {
      if (auth0.isAuthenticated.value) {
        const token = await auth0.getAccessTokenSilently({
          authorizationParams: {
            audience: import.meta.env.VITE_AUTH0_AUDIENCE,
          },
        })
        if (token) {
          uploadHeaders.value = {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`,
          }
        }
      }
    }
    catch (error) {
      console.error('❌ [Upload] 获取 token 失败:', error)
    }
  }

  // ===== 8. 工作流状态 =====
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
    get: () => workflowState.value?.classification || undefined,
    set: val => chatStore.updateWorkflowStateSome(uuid.value, { classification: val }),
  })
  const generatedQuestions = computed({
    get: () => workflowState.value?.generatedQuestions || [],
    set: val => chatStore.updateWorkflowStateSome(uuid.value, { generatedQuestions: val }),
  })
  const scoreDistribution = computed({
    get: () => workflowState.value?.scoreDistribution || undefined,
    set: val => chatStore.updateWorkflowStateSome(uuid.value, { scoreDistribution: val }),
  })

  // ===== 9. Watch 监听 =====

  // 未知原因刷新页面，loading 状态不会重置，手动重置
  dataSources.value.forEach((item, index) => {
    if (item.loading)
      updateChatSome(uuid.value, index, { loading: false })
  })

  // 🔥 监听路由变化，实现组件复用时的数据更新
  watch(
    () => route.params.uuid,
    async (newUuid) => {
      // 处理 uuid 可能是数组的情况（TypeScript 类型）
      const uuidStr = Array.isArray(newUuid) ? newUuid[0] : newUuid

      if (uuidStr) {
        // 🔥 切换到已有会话，查找后端 UUID 映射
        const backendUuid = chatStore.getBackendConversationId(uuidStr)
        currentConversationId.value = backendUuid || ''

        if (import.meta.env.DEV) {
          console.warn('🔄 [对话] 切换到会话:', {
            前端nanoid: uuidStr,
            后端UUID: backendUuid || '（无映射，新会话）',
          })
        }

        // 🔥 刷新页面时，确保调用 setActive 加载当前会话的消息
        // 检查是否需要加载消息：
        // 1. 切换到不同的会话（chatStore.active !== uuidStr）
        // 2. 或者该会话的消息未加载（dataSources 为空，可能是刷新页面）
        const needLoadMessages = chatStore.active !== uuidStr || dataSources.value.length === 0

        if (needLoadMessages) {
          if (import.meta.env.DEV) {
            console.warn('🔄 [对话] 加载会话消息:', {
              uuid: uuidStr,
              原因: chatStore.active !== uuidStr ? '切换会话' : '消息未加载（刷新页面）',
            })
          }
          try {
            await chatStore.setActive(uuidStr, true)

            // 🔥 消息加载完成后，等待 DOM 更新并滚动到底部
            await nextTick()
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                scrollToBottom()
              })
            })
          }
          catch (error) {
            console.error('❌ [对话] 加载会话消息失败:', error)
          }
        }
      }
      else {
        // 用户在 /chat（无 uuid），准备接收第一条消息
        currentConversationId.value = ''

        // 🔥 清除 active，确保左侧不高亮任何会话
        if (chatStore.active !== null) {
          if (import.meta.env.DEV) {
            console.warn('🔄 [对话] URL 是 /chat，清除 active')
          }
          chatStore.active = null
          // 保存偏好设置到 localStorage
          setLocalPreferences({
            active: null,
            usingContext: chatStore.usingContext,
            chatMode: chatStore.chatMode,
          })
        }

        if (import.meta.env.DEV) {
          console.warn('🔄 [对话] 准备新建会话')
        }
      }
    },
    { immediate: true },
  )

  // 🔥 监听输入框的实际高度，判断是否多行
  const SINGLE_LINE_HEIGHT_THRESHOLD = 60

  watch(
    () => prompt.value,
    async () => {
      // 特殊处理：内容为空时，强制切换回单行模式
      if (!prompt.value || prompt.value.trim() === '') {
        isMultiLine.value = false
        return
      }

      // 等待 DOM 更新
      await nextTick()

      // 获取输入框元素
      const inputElement = inputRef.value?.$el?.querySelector('textarea')
      if (!inputElement) {
        // 降级：如果无法获取元素，使用换行符判断
        isMultiLine.value = prompt.value.includes('\n')
        return
      }

      // 根据实际渲染高度判断是否为多行
      const currentHeight = inputElement.scrollHeight
      isMultiLine.value = currentHeight > SINGLE_LINE_HEIGHT_THRESHOLD
    },
  )

  // 🔥 监听输入框模式切换，自动恢复焦点
  watch(isMultiLine, async (newValue, oldValue) => {
    if (newValue !== oldValue) {
      await nextTick()
      inputRef.value?.focus()
    }
  })

  // 🔥 监听设置页面切换，从设置页面返回聊天界面时自动滚动到底部
  watch(showSettingsPage, (newValue, oldValue) => {
    if (oldValue === true && newValue === false) {
      setTimeout(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (scrollRef.value) {
              const maxScrollTop = scrollRef.value.scrollHeight - scrollRef.value.clientHeight
              scrollRef.value.scrollTop = maxScrollTop
            }
          })
        })
      }, 350)
    }
  })

  // 🔥 监听会话切换，切换会话时自动滚动到底部
  watch(() => chatStore.active, async (newActive, oldActive) => {
    if (newActive && oldActive && newActive !== oldActive) {
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 100))

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToBottom()

          if (import.meta.env.DEV && scrollRef.value) {
            const maxScrollTop = scrollRef.value.scrollHeight - scrollRef.value.clientHeight
            console.warn('✅ [滚动] 切换会话后滚动到底部', {
              会话: newActive,
              scrollTop: maxScrollTop,
              scrollHeight: scrollRef.value.scrollHeight,
              clientHeight: scrollRef.value.clientHeight,
            })
          }
        })
      })
    }
  })

  // 🔥 监听 ModelStore 的 currentModel 变化
  watch(
    () => modelStore.currentModel,
    async (newModel) => {
      if (newModel) {
        const isModelAvailable = modelStore.enabledModels.some((m: any) => m.id === newModel.id)

        if (isModelAvailable) {
          currentSelectedModel.value = {
            id: newModel.id,
            name: newModel.name || '',
            modelId: newModel.modelId || newModel.name || '',
            provider: newModel.provider,
            providerId: newModel.providerId || newModel.provider,
            displayName: newModel.displayName || newModel.name || newModel.modelId || '',
            enabled: true,
            deleted: false,
          }

          if (import.meta.env.DEV) {
            console.warn('✅ [Chat] ModelStore 模型变化，已更新 currentSelectedModel:', {
              id: newModel.id,
              modelId: newModel.modelId,
              providerId: newModel.providerId || newModel.provider,
              displayName: newModel.displayName,
            })
          }
        }
      }
    },
    { immediate: true },
  )

  // 🔥 监听消息列表变化，当有新消息时恢复footer位置
  watch(dataSources, (newSources, oldSources) => {
    if (oldSources && oldSources.length === 0 && newSources.length > 0) {
      setTimeout(() => {
        isFooterElevated.value = false
      }, 100)
    }
    else if (newSources.length === 0 && oldSources && oldSources.length > 0) {
      isFooterElevated.value = true
    }
  }, { immediate: true })

  // 🔥 监听当前会话的消息数据变化，当消息加载完成后滚动到底部
  watch(
    () => [chatStore.active, dataSources.value.length] as const,
    async ([newActive, newLength], [oldActive]) => {
      if (newActive && newActive !== oldActive && newLength > 0) {
        await nextTick()
        await new Promise(resolve => setTimeout(resolve, 150))

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            scrollToBottom()

            if (import.meta.env.DEV && scrollRef.value) {
              const maxScrollTop = scrollRef.value.scrollHeight - scrollRef.value.clientHeight
              console.warn('✅ [滚动] 消息加载完成后滚动到底部', {
                会话: newActive,
                消息数: newLength,
                scrollTop: maxScrollTop,
                scrollHeight: scrollRef.value.scrollHeight,
                clientHeight: scrollRef.value.clientHeight,
              })
            }
          })
        })
      }
    },
  )

  // ===== 返回所有状态和方法 =====
  return {
    // 基础依赖
    route,
    router,
    dialog,
    ms,
    notification,
    auth0,

    // Stores
    appStore,
    appInitStore,
    authStore,
    chatStore,
    configStore,
    modelStore,

    // Hooks
    isMobile,
    addChat,
    updateChat,
    updateChatSome,
    getChatByUuidAndIndex,
    scrollRef,
    scrollToBottom,
    scrollToBottomIfAtBottom,
    usingContext,

    // 核心状态
    uuid,
    dataSources,
    prompt,
    loading,
    inputRef,
    isMultiLine,
    isFooterElevated,
    currentConversationId,
    currentSelectedModel,
    isDarkTheme,

    // 设置页面相关
    showSettingsPage,
    activeSettingTab,
    isChatGPTAPI,
    aboutRef,
    hasLoadedUsage,

    // 输入框相关
    placeholder,
    buttonDisabled,
    footerClass,
    keyboardHeight,
    footerStyle,

    // 文件上传相关
    uploadFileList,
    uploadHeaders,
    updateUploadHeaders,

    // 工作流状态
    workflowState,
    uploadedFilePath,
    workflowStage,
    classification,
    generatedQuestions,
    scoreDistribution,
  }
}
