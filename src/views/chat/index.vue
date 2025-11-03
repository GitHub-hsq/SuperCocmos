<script setup lang='ts'>
/**
 * Chat Index - 重构版本
 *
 * 原文件：2957行 → 重构后：~200行
 * 拆分为6个 composables + 多个组件
 */

import { NButton, NIcon, NInput, NText, NUpload, NUploadDragger } from 'naive-ui'
import { onMounted, onUnmounted, watch } from 'vue'
import planningIcon from '@/assets/icons/planning.svg'
import testIcon from '@/assets/icons/test.svg'
import writingIcon from '@/assets/icons/writing.svg'
// ===== Components =====
import { SvgIcon } from '@/components/common'

import About from '@/components/common/Setting/About.vue'
import Advanced from '@/components/common/Setting/Advanced.vue'
import ChatConfigPanel from '@/components/common/Setting/panels/ChatConfigPanel.vue'
import ProviderConfigPanel from '@/components/common/Setting/panels/ProviderConfigPanel.vue'
import UserSettingsPanel from '@/components/common/Setting/panels/UserSettingsPanel.vue'
import WorkflowConfigPanel from '@/components/common/Setting/panels/WorkflowConfigPanel.vue'

import { t } from '@/locales'
import { Message, QuizAnswer, QuizConfig, QuizPreview } from './components'
import HeaderComponent from './components/Header/index.vue'
import ModelSelector from './components/ModelSelector/index.vue'
import { useChatActions } from './composables/useChatActions'
// ===== Composables =====
import { useChatState } from './composables/useChatState'
import { useFileUpload } from './composables/useFileUpload'
import { useModelSelector } from './composables/useModelSelector'
import { useQuizWorkflow } from './composables/useQuizWorkflow'
import { useRightSider } from './composables/useRightSider'

// ===== 1. 基础状态管理 =====
const chatState = useChatState()

// ===== 2. 聊天操作（依赖 chatState） =====
const chatActions = useChatActions({
  router: chatState.router,
  dialog: chatState.dialog,
  ms: chatState.ms,
  auth0: chatState.auth0,
  chatStore: chatState.chatStore,
  configStore: chatState.configStore,
  modelStore: chatState.modelStore,
  uuid: chatState.uuid,
  dataSources: chatState.dataSources,
  prompt: chatState.prompt,
  loading: chatState.loading,
  isMobile: chatState.isMobile,
  currentConversationId: chatState.currentConversationId,
  currentSelectedModel: chatState.currentSelectedModel,
  addChat: chatState.addChat,
  updateChat: chatState.updateChat,
  updateChatSome: chatState.updateChatSome,
  getChatByUuidAndIndex: chatState.getChatByUuidAndIndex,
  scrollToBottom: chatState.scrollToBottom,
  scrollToBottomIfAtBottom: chatState.scrollToBottomIfAtBottom,
})

// ===== 3. 模型选择器 =====
const modelSelector = useModelSelector()

// ===== 4. 文件上传 =====
const fileUpload = useFileUpload(chatState.uuid)

// ===== 5. Quiz 工作流 =====
const quizWorkflow = useQuizWorkflow({
  uploadedFilePath: fileUpload.uploadedFilePath,
  workflowStage: fileUpload.workflowStage,
  generatedQuestions: fileUpload.generatedQuestions,
  scoreDistribution: fileUpload.scoreDistribution,
})

// ===== 6. 右侧栏控制 =====
const rightSider = useRightSider()

// ===== 解构需要在 template 中使用的属性 =====
// 从 chatState
const {
  dataSources,
  prompt,
  loading,
  inputRef,
  isMultiLine,
  isFooterElevated,
  isDarkTheme,
  showSettingsPage,
  activeSettingTab,
  isChatGPTAPI,
  aboutRef,
  placeholder,
  buttonDisabled,
  footerClass,
  footerStyle,
  uploadHeaders,
  isMobile,
  scrollRef,
  usingContext,
  chatStore,
} = chatState

// 从 chatActions
const {
  handleSubmit,
  handleDelete,
  handleExport,
  handleStop,
  handleEnter,
  onRegenerate,
} = chatActions

// 从 modelSelector
const {
  activeVendor,
  loadCurrentModel,
} = modelSelector

// 从 fileUpload
const {
  handleUploadChange,
  handleBeforeUpload,
  handleUploadSuccess,
  handleUploadError,
  handleUploadRemove,
  uploadedFilePath,
  workflowStage,
  generatedQuestions,
  scoreDistribution,
} = fileUpload

// 从 quizWorkflow
const {
  quizLoading,
  handleQuizConfigSubmit,
  handleQuizAccept,
  handleQuizReject,
  handleQuizRevise,
  handleQuizSubmit,
} = quizWorkflow

// 从 rightSider
const {
  rightSiderCollapsed,
  rightSiderWidth,
  toggleRightSider,
  handleResizeStart,
} = rightSider

// ===== 兼容性：保持原有的变量名 =====
// 这些变量名在 template 中直接使用，需要保持兼容
const { modelStore, appInitStore, auth0, notification } = chatState

// ===== 组件生命周期 =====
let viewportResizeHandler: (() => void) | null = null

onMounted(async () => {
  // 🔥 移动端键盘监听
  if (isMobile.value && typeof window !== 'undefined' && 'visualViewport' in window) {
    const visualViewport = window.visualViewport

    viewportResizeHandler = () => {
      if (visualViewport) {
        const viewportHeight = visualViewport.height
        const windowHeight = window.innerHeight
        const keyboardHeightValue = Math.max(0, windowHeight - viewportHeight)

        chatState.keyboardHeight.value = keyboardHeightValue
      }
    }

    visualViewport?.addEventListener('resize', viewportResizeHandler)
    visualViewport?.addEventListener('scroll', viewportResizeHandler)
  }

  // 初始化
  chatState.scrollToBottom()

  // 移动端自动 focus
  if (inputRef.value && isMobile.value)
    inputRef.value?.focus()

  // 🔐 显示权限通知
  if (auth0.isAuthenticated.value && !appInitStore.permissionNotificationShown) {
    appInitStore.showPermissionNotification(
      notification,
      auth0.user.value?.name || auth0.user.value?.email,
    )
  }

  // 加载当前选中的模型
  loadCurrentModel()

  // 初始化上传请求头
  await chatState.updateUploadHeaders()

  // 设置默认的 activeVendor
  if (modelStore.providers.length > 0 && !activeVendor.value) {
    const firstEnabledProvider = modelStore.providers.find((p: any) => p.enabled && p.models.length > 0)
    if (firstEnabledProvider) {
      activeVendor.value = firstEnabledProvider.id
      if (import.meta.env.DEV) {
        console.warn('✅ [Chat] 设置默认供应商:', firstEnabledProvider.displayName)
      }
    }
  }

  // 监听鼠标拖拽事件（右侧栏调整宽度）
  document.addEventListener('mousemove', rightSider.handleResizeMove)
  document.addEventListener('mouseup', rightSider.handleResizeEnd)
})

onUnmounted(() => {
  // 停止加载
  if (loading.value)
    handleStop()

  // 清理移动端键盘监听器
  if (isMobile.value && typeof window !== 'undefined' && 'visualViewport' in window && viewportResizeHandler) {
    const visualViewport = window.visualViewport
    visualViewport?.removeEventListener('resize', viewportResizeHandler)
    visualViewport?.removeEventListener('scroll', viewportResizeHandler)
    viewportResizeHandler = null
  }

  // 清理拖拽监听器
  document.removeEventListener('mousemove', rightSider.handleResizeMove)
  document.removeEventListener('mouseup', rightSider.handleResizeEnd)
})

// ===== 监听设置选项卡切换 =====
watch(activeSettingTab, (newValue) => {
  if (newValue === 'Config' && !chatState.hasLoadedUsage.value && isChatGPTAPI.value) {
    chatState.hasLoadedUsage.value = true
    setTimeout(() => {
      if (aboutRef.value && typeof aboutRef.value.fetchUsage === 'function')
        aboutRef.value.fetchUsage()
    }, 100)
  }
})
</script>

<template>
  <!-- TODO: 添加 Auth0 登录检查 -->
  <div class="flex flex-col w-full h-full overflow-hidden bg-white dark:bg-[#161618]">
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
        />

        <!-- Web端Header - 悬浮透明 -->
        <header v-if="!isMobile" class="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-0 bg-transparent">
          <div class="flex items-center space-x-4">
            <ModelSelector />
          </div>
          <div class="chat-header" />
          <div class="flex items-center space-x-2 hidden">
            <button v-if="!isMobile" class="chat-icon-btn" @click="handleExport">
              <SvgIcon icon="ri:download-2-line" />
            </button>
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
                <div id="scrollRef" ref="scrollRef" class="h-full overflow-hidden overflow-y-auto" :class="{ 'mobile-scrollbar-hide': isMobile }">
                  <div
                    class="w-full h-full max-w-screen-xl m-auto bg-white dark:bg-[#161618]"
                    :class="[isMobile ? '' : 'p-4']"
                    :style="isMobile ? 'padding: 0px 16px 5%;' : ''"
                  >
                    <div id="image-wrapper" class="relative h-full">
                      <template v-if="!dataSources.length">
                        <transition name="fade-slow" appear>
                          <div
                            v-if="isFooterElevated"
                            id="110110xxx"
                            key="new-chat-buttons"
                            class="flex flex-col items-center justify-center h-full min-h-0 text-center text-neutral-400 dark:text-neutral-500"
                            :style="!isMobile ? '' : ''"
                          >
                            <div :class="!isMobile ? 'mb-32' : 'mb-4'">
                              <span
                                :style="{
                                  ...(!isMobile ? { 'font-size': '2rem', 'line-height': '2rem' } : {}),
                                  color: isDarkTheme ? 'var(--dark-text-primary)' : 'var(--white-text-primary)',
                                }"
                                class="text-2xl"
                              >{{ t('chat.newChatTitle') }}</span>
                            </div>
                            <!-- Web端：为footer预留84px高度的空间，防止footer上移后遮挡内容 -->
                            <div v-if="!isMobile" style="height: 0px; flex-shrink: 0;" />
                            <div class="flex items-center flex-wrap justify-center gap-2 w-full max-w-[80%] px-4">
                              <NButton round>
                                <template #icon>
                                  <NIcon>
                                    <img :src="writingIcon" alt="写小说" class="w-4 h-4">
                                  </NIcon>
                                </template>
                                写小说
                              </NButton>
                              <NButton round>
                                <template #icon>
                                  <NIcon>
                                    <img :src="testIcon" alt="笔记测验" class="w-4 h-4">
                                  </NIcon>
                                </template>
                                笔记测验
                              </NButton>
                              <NButton round>
                                <template #icon>
                                  <NIcon>
                                    <img :src="planningIcon" alt="学习规划" class="w-4 h-4">
                                  </NIcon>
                                </template>
                                学习规划
                              </NButton>
                              <NButton round>
                                <template #icon>
                                  <NIcon>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-neutral-600 dark:text-neutral-400">
                                      <path d="M2 10v3" /><path d="M6 6v11" /><path d="M10 3v18" /><path d="M14 8v7" /><path d="M18 5v13" /><path d="M22 10v3" />
                                    </svg>
                                  </NIcon>
                                </template>
                                声音对话
                              </NButton>
                              <NButton round>
                                更多
                              </NButton>
                            </div>
                          </div>
                        </transition>
                      </template>
                      <template v-else>
                        <div :style="isMobile ? 'padding: 2rem 0 3rem;' : 'padding: 0 15% 5%;'">
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
                        </div>
                      </template>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Footer 固定在底部 -->
              <footer :class="footerClass" :style="footerStyle">
                <div class="w-full max-w-screen-xl m-auto" :style="isMobile ? '' : 'padding: 0 10%'">
                  <!-- 多行布局：上下结构 -->
                  <div v-if="isMultiLine" class="relative chat-input-wrapper chat-input-wrapper-multiline">
                    <!-- 输入框 - 最上层 -->
                    <div class="relative z-10 w-full mb-[35px]">
                      <NInput
                        ref="inputRef"
                        v-model:value="prompt"
                        type="textarea"
                        :placeholder="placeholder"
                        :autofocus="false"
                        :autosize="{ minRows: 2, maxRows: isMobile ? 6 : 12 }"
                        class="chat-input-multiline"
                        @keypress="handleEnter"
                      />
                    </div>

                    <!-- 下层工具栏 - 附件和发送/语音 -->
                    <div class="absolute bottom-2 left-3 right-3 flex items-center justify-between pointer-events-none" style="z-index: 5;">
                      <!-- 左侧附件按钮 -->
                      <button class="chat-icon-btn attachment-btn pointer-events-auto">
                        <SvgIcon icon="ri:attachment-2" />
                      </button>

                      <!-- 右侧语音/发送/停止按钮 -->
                      <!-- 响应期间显示停止按钮 -->
                      <button
                        v-if="loading"
                        class="chat-icon-btn voice-btn pointer-events-auto"
                        @click="handleStop"
                      >
                        <SvgIcon icon="ic:round-square" class="w-[14px] h-[14px]" />
                      </button>
                      <!-- 非响应期间：输入框为空显示语音按钮，有内容显示发送按钮 -->
                      <button
                        v-else-if="!prompt || prompt.trim() === ''"
                        class="chat-icon-btn voice-btn pointer-events-auto"
                      >
                        <SvgIcon icon="ri:mic-line" />
                      </button>
                      <button
                        v-else
                        class="composer-submit-btn pointer-events-auto"
                        :disabled="buttonDisabled"
                        @click="handleSubmit"
                      >
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" class="icon">
                          <path d="M8.99992 16V6.41407L5.70696 9.70704C5.31643 10.0976 4.68342 10.0976 4.29289 9.70704C3.90237 9.31652 3.90237 8.6835 4.29289 8.29298L9.29289 3.29298L9.36907 3.22462C9.76184 2.90427 10.3408 2.92686 10.707 3.29298L15.707 8.29298L15.7753 8.36915C16.0957 8.76192 16.0731 9.34092 15.707 9.70704C15.3408 10.0732 14.7618 10.0958 14.3691 9.7754L14.2929 9.70704L10.9999 6.41407V16C10.9999 16.5523 10.5522 17 9.99992 17C9.44764 17 8.99992 16.5523 8.99992 16Z" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <!-- 单行布局：左中右结构 -->
                  <div v-else class="chat-input-wrapper">
                    <div class="flex items-center px-1 w-full h-full">
                      <!-- 左侧附件按钮 -->
                      <button class="chat-icon-btn attachment-btn flex-shrink-0">
                        <SvgIcon icon="ri:attachment-2" />
                      </button>

                      <!-- 中间输入框 -->
                      <div class="flex-1">
                        <NInput
                          id="12312312"
                          ref="inputRef"
                          v-model:value="prompt"
                          type="textarea"
                          :placeholder="placeholder"
                          :autosize="{ minRows: 1, maxRows: isMobile ? 6 : 12 }"
                          class="chat-input-single"
                          @keypress="handleEnter"
                        />
                      </div>

                      <!-- 右侧语音/发送/停止按钮 -->
                      <!-- 响应期间显示停止按钮 -->
                      <button
                        v-if="loading"
                        class="chat-icon-btn voice-btn flex-shrink-0"
                        @click="handleStop"
                      >
                        <SvgIcon icon="ic:round-square" class="w-[14px] h-[14px]" />
                      </button>
                      <!-- 非响应期间：输入框为空显示语音按钮，有内容显示发送按钮 -->
                      <button
                        v-else-if="!prompt || prompt.trim() === ''"
                        class="chat-icon-btn voice-btn flex-shrink-0"
                      >
                        <SvgIcon icon="ri:mic-line" />
                      </button>
                      <button
                        v-else
                        class="composer-submit-btn flex-shrink-0"
                        :disabled="buttonDisabled"
                        @click="handleSubmit"
                      >
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" class="icon">
                          <path d="M8.99992 16V6.41407L5.70696 9.70704C5.31643 10.0976 4.68342 10.0976 4.29289 9.70704C3.90237 9.31652 3.90237 8.6835 4.29289 8.29298L9.29289 3.29298L9.36907 3.22462C9.76184 2.90427 10.3408 2.92686 10.707 3.29298L15.707 8.29298L15.7753 8.36915C16.0957 8.76192 16.0731 9.34092 15.707 9.70704C15.3408 10.0732 14.7618 10.0958 14.3691 9.7754L14.2929 9.70704L10.9999 6.41407V16C10.9999 16.5523 10.5522 17 9.99992 17C9.44764 17 8.99992 16.5523 8.99992 16Z" />
                        </svg>
                      </button>
                    </div>
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
                  :headers="uploadHeaders"
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
.classico {
  display: flex;
  flex-flow: column;
  gap: 1rem;
}

/* 🔥 Footer缓动效果 - 在80%后速度慢慢减少 */
.footer-transition {
  transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

/* 最外层包装器样式 - 统一背景 */
.chat-input-wrapper {
  display: flex;
  align-items: center;
  min-height: 60px;
  /* 🔥 默认单行样式：胶囊形状 */
  border-radius: 30px / 50%;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.08);
  padding: 0.5rem; /* 上下内边距 */
  transition: border-radius 0.2s ease; /* 平滑过渡 */
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1); /* 🍎 iOS 风格阴影 */
}

/* 🔥 多行模式：改为普通圆角（当高度超过单行时） */
.chat-input-wrapper-multiline {
  border-radius: 28px !important;
  align-items: flex-start !important; /* 多行时顶部对齐 */
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1) !important; /* 🍎 iOS 风格阴影 */
}

/* 移除边框 */
.chat-input-multiline :deep(.n-input__border),
.chat-input-multiline :deep(.n-input__state-border),
.chat-input-single :deep(.n-input__border),
.chat-input-single :deep(.n-input__state-border) {
  display: none;
}

/* 移除阴影效果 */
.chat-input-multiline :deep(.n-input),
.chat-input-single :deep(.n-input) {
  box-shadow: none !important;
}

/* 单行模式输入框 */
.chat-input-single :deep(.n-input) {
  height: 100%;
  min-height: auto;
}

.chat-input-single :deep(.n-input__textarea-el) {
  font-size: 16px;
  line-height: 1.5;
  resize: none;
  min-height: auto;
  /* 增加光标粗细 */
  caret-color: currentColor;
  text-shadow: 0 0 0.5px currentColor;
}

/* 暗黑模式输入框字体颜色 */
.dark .chat-input-single :deep(.n-input__textarea-el) {
  color: var(--dark-text-primary);
}

/* 多行输入框 */
.chat-input-multiline :deep(.n-input__textarea-el) {
  font-size: 16px;
  line-height: 1.5;
  resize: none;
  /* 增加光标粗细 */
  caret-color: currentColor;
  text-shadow: 0 0 0.5px currentColor;

  /* 🔥 上下边缘渐变遮罩效果 - 让文字自然消失而不是硬截断 */
  -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 8px, black calc(100% - 8px), transparent 100%);
  mask-image: linear-gradient(to bottom, transparent 0%, black 8px, black calc(100% - 8px), transparent 100%);
}

/* 暗黑模式多行输入框字体颜色 */
.dark .chat-input-multiline :deep(.n-input__textarea-el) {
  color: var(--dark-text-primary);
}

/* 统一的聊天区域图标按钮样式 */
.chat-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%; /* 圆形 */
  border: none;
  background: transparent;
  color: #4f555e;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 20px;
}

/* 暗黑模式按钮图标颜色 */
.dark .chat-icon-btn {
  color: var(--dark-text-primary);
}

/* 附件按钮特殊样式 - 透明背景，hover 显示圆形背景 */
.chat-icon-btn.attachment-btn {
  background: transparent;
}

.chat-icon-btn.attachment-btn:hover {
  background: rgba(0, 0, 0, 0.08);
}

.chat-icon-btn.attachment-btn:active {
  transform: scale(0.95);
}

/* 语音按钮样式 - 和发送按钮一致 */
.chat-icon-btn.voice-btn {
  background: #161618;
  color: #ffffff;
}

.dark .chat-icon-btn.voice-btn {
  background: var(--dark-text-primary);
  color: #161618;
}

.chat-icon-btn.voice-btn:hover {
  transform: scale(1.1);
}

.chat-icon-btn.voice-btn:active {
  transform: scale(0.95);
}

/* 发送按钮样式 */
.composer-submit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 3.40282e38px;
  border: none;
  background: #161618;
  color: #ffffff;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.dark .composer-submit-btn {
  background: var(--dark-text-primary);
  color: #161618;
}

.composer-submit-btn:hover:not(:disabled) {
  transform: scale(1.1);
}

.composer-submit-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.composer-submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Header 底部渐变雾气效果 - 亮色模式 */
.chat-header {
  flex: 1;
  top: 100%;
  left: 0;
  right: 0;
  height: 40px;
  pointer-events: none;
  background: linear-gradient(
    to top,
    rgba(255, 255, 255, 0.05) 0%,
    rgba(255, 255, 255, 0.3) 15%,
    rgba(255, 255, 255, 0.6) 35%,
    rgba(255, 255, 255, 0.9) 55%,
    rgba(255, 255, 255, 1) 65%
  );
}

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

/* 🔥 按钮区域淡入淡出效果 - 后半段缩短到1/3，便于观察 */
.fade-slow-enter-active {
  animation: fade-slow-enter 1s linear forwards;
}

.fade-slow-leave-active {
  animation: fade-slow-leave 1s linear forwards;
}

/* 初始/结束状态（Vue 自动应用，但显式定义以防） */
.fade-slow-enter-from,
.fade-slow-leave-to {
  opacity: 0;
}

.fade-slow-enter-to,
.fade-slow-leave-from {
  opacity: 1;
}

/* Keyframes 定义 */
@keyframes fade-slow-enter {
  0% {
    opacity: 0;
  }
  10% {
    /* 0s → 0.5s，快速变化到 0.5 */
    opacity: 0.5;
  }
  70% {
    /* 0.5s → 3.5s，缓慢变化到 1（主要缓慢变化阶段，持续3秒） */
    opacity: 1;
  }
  100% {
    /* 3.5s → 5s，保持不透明状态（无变化） */
    opacity: 1;
  }
}

@keyframes fade-slow-leave {
  0% {
    opacity: 1;
  }
  10% {
    /* 0s → 0.5s，快速变化到 0.5 */
    opacity: 0.5;
  }
  70% {
    /* 0.5s → 3.5s，缓慢变化到 0（主要缓慢变化阶段，持续3秒） */
    opacity: 0;
  }
  100% {
    /* 3.5s → 5s，保持透明状态（无变化） */
    opacity: 0;
  }
}

/* 🍎 iOS 风格 - 模型选择器弹出框样式 */
.model-selector-popup {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

/* 🍎 供应商列表样式 */
.vendor-sidebar {
  background: #fafafa;
}

.vendor-list {
  padding: 8px 0px;
}

.vendor-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  margin-bottom: 4px;
  border-radius: 8px; /* iOS 圆角 */
  cursor: pointer;
  transition: all 0.2s ease;
}

.vendor-item:hover {
  background: rgba(0, 0, 0, 0.05);
}

.vendor-item.active {
  background: rgba(0, 0, 0, 0.05);
  border-left: 3px solid #333333;
}

.vendor-name {
  font-weight: 500;
  color: #333;
}

.vendor-count {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 12px;
  background: #333333;
  color: white;
}

/* 🍎 搜索框样式 */
.search-header {
  padding: 8px;
}

/* 🍎 模型列表样式 */
.model-content {
  background: white;
}

.model-item {
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 10px; /* iOS 大圆角 */
  margin: 8px 12px;
  padding: 12px;
}

.model-item:hover {
  background: rgba(0, 0, 0, 0.05);
}

.model-item.selected {
  background: rgba(0, 0, 0, 0.1);
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

.model-id {
  font-size: 12px;
  color: #999;
}

/* 🍎 空状态样式 */
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

<style>
/* Header 底部渐变雾气效果 - 暗色模式 (全局样式，不受 scoped 限制) */
.dark .chat-header {
  background: linear-gradient(
    to top,
    rgba(22, 22, 24, 0.05) 0%,
    rgba(22, 22, 24, 0.3) 15%,
    rgba(22, 22, 24, 0.6) 35%,
    rgba(22, 22, 24, 0.9) 55%,
    rgba(22, 22, 24, 1) 65%
  ) !important;
}

/* 暗色主题下的按钮样式 */
.dark .chat-icon-btn {
  color: #ffffff;
}

/* 暗色主题下的附件按钮 */
.dark .chat-icon-btn.attachment-btn {
  background: transparent;
}

.dark .chat-icon-btn.attachment-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

/* 暗色主题下的语音按钮 */
.dark .chat-icon-btn.voice-btn {
  background: #ffffff;
  color: #161618;
}

.dark .composer-submit-btn {
  background: #ffffff;
  color: #161618;
}

/* 暗色主题下的输入框包装器 */
.dark .chat-input-wrapper {
  background: #2a2a2c;
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4); /* 🍎 iOS 风格阴影 - 暗黑模式 */
}

/* 暗色主题下的多行输入框 */
.dark .chat-input-wrapper-multiline {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4) !important; /* 🍎 iOS 风格阴影 - 暗黑模式 */
}

/* 🍎 iOS 风格 - 模型选择器 Popover 外层容器优化 */

/* 浅色模式 - 移除padding、设置透明背景、大圆角 */
.n-popover.n-popover-shared {
  --n-padding: 0px !important;
  --n-space: 0px !important;
  --n-border-radius: 12px !important;
  --n-color: transparent !important;
  --n-box-shadow: none !important;
  background: transparent !important;
  padding: 0 !important;
}

/* 暗黑模式 - 移除padding、设置透明背景、大圆角 */
.dark .n-popover.n-popover-shared {
  --n-padding: 0px !important;
  --n-space: 0px !important;
  --n-border-radius: 12px !important;
  --n-color: transparent !important;
  --n-box-shadow: none !important;
  background: transparent !important;
  padding: 0 !important;
}

/* 🍎 iOS 风格 - 浅色模式 - 模型选择器 */

.model-selector-popup {
  background: #ffffff;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  overflow: hidden;
}

/* 供应商侧边栏 */
.vendor-sidebar {
  background: #fafafa !important;
  border-right: 1px solid #e5e5e7 !important;
}

.vendor-item {
  background: transparent !important;
  color: #1c1c1e !important;
  border-radius: 10px;
  margin: 4px 8px;
  padding: 10px 12px;
  transition: all 0.2s ease;
  cursor: pointer;
}

.vendor-item:hover {
  background: #f0f0f0 !important;
}

.vendor-item.active {
  background: #e5e5e7 !important;
  font-weight: 500;
}

.vendor-name {
  color: #1c1c1e !important;
}

.vendor-item.active .vendor-name {
  color: #000000 !important;
}

.vendor-count {
  background: #e5e5e7;
  color: #666666;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
}

.vendor-item.active .vendor-count {
  background: rgba(0, 0, 0, 0.1);
  color: #000000;
}

/* 搜索头部 */
.search-header {
  background-color: #fafafa !important;
  border-bottom: 1px solid #e5e5e7 !important;
}

.search-header .n-input {
  background-color: #f0f0f0 !important;
  border-color: transparent !important;
  color: #1c1c1e !important;
  border-radius: 10px;
  box-shadow: none !important;
}

.search-header .n-input:hover {
  background-color: #e5e5e7 !important;
}

.search-header .n-input:focus-within {
  background-color: #e5e5e7 !important;
  border-color: transparent !important;
}

/* 隐藏搜索框的 focus 边框效果 */
.search-header .n-input__border,
.search-header .n-input__state-border {
  display: none !important;
}

.search-header .n-input__placeholder {
  color: #999999 !important;
}

.search-header .n-input__input-el {
  color: #1c1c1e !important;
}

/* 模型列表区域 */
.model-content {
  background: #ffffff !important;
}

/* NLayoutContent 背景透明 */
.model-selector-popup .n-layout-content {
  background: transparent !important;
  background-color: transparent !important;
}

/* 去掉 NList 的边框和分割线 */
.n-list {
  background: transparent !important;
  border: none !important;
}

/* 隐藏 NListItem 的分割线 */
.n-list-item__divider {
  display: none !important;
}

/* NListItem 本身的样式 - 加强选择器优先级 */
.model-selector-popup .n-list .n-list-item {
  border: none !important;
  background-color: transparent !important;
  background: transparent !important;
  margin: 0 !important;
  padding: 5px 12px !important;
  border-radius: 10px !important;
  transition: all 0.2s ease;
  cursor: pointer;
}

.model-selector-popup .n-list .n-list-item:hover {
  background-color: #f5f5f5 !important;
  background: #f5f5f5 !important;
}

/* 选中时不要背景色，只显示 √ */
.model-selector-popup .n-list .n-list-item.selected {
  background-color: transparent !important;
  background: transparent !important;
}

/* 选中项的 hover 效果 - 确保选中的项也能 hover */
.model-selector-popup .n-list .n-list-item.selected:hover {
  background-color: #f5f5f5 !important;
  background: #f5f5f5 !important;
}

/* NListItem 内部的 main 区域 */
.model-selector-popup .n-list .n-list-item .n-list-item__main {
  padding: 0 !important;
}

/* model-item 内容区域 */
.model-item {
  background: transparent !important;
  border-radius: 10px !important;
  padding: 8px 12px !important;
  border: none !important;
}

.model-item .model-item-content {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  width: 100% !important;
}

.model-name {
  color: #1c1c1e !important;
  font-weight: 500;
}

.model-item.selected .model-name {
  color: #000000 !important;
}

.model-id {
  color: #666666 !important;
  font-size: 12px;
}

.model-item.selected .model-id {
  color: #333333 !important;
}

.model-item .n-icon {
  color: #000000 !important;
}

/* 空状态 */
.empty-state,
.empty-vendor {
  color: #999999 !important;
}

/* 布局边框 */
.n-layout-sider {
  border-color: #e5e5e7 !important;
}

.n-layout-header {
  border-color: #e5e5e7 !important;
}

/* 滚动条 */
.n-scrollbar-rail {
  background-color: transparent !important;
}

.n-scrollbar-rail__scrollbar {
  background-color: #d1d1d6 !important;
  border-radius: 4px;
}

/* 🍎 iOS 风格 - 暗黑模式 - 模型选择器 */

.dark .model-selector-popup {
  background: #1c1c1e;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  border-radius: 12px;
  overflow: hidden;
}

/* 🍎 iOS 风格 - 供应商侧边栏 (暗黑模式) */
.dark .vendor-sidebar {
  background: #1c1c1e !important;
  border-right: 1px solid #38383a !important;
}

.dark .vendor-item {
  background: transparent !important;
  color: var(--dark-text-primary) !important;
  border-radius: 10px;
  margin: 4px 8px;
  padding: 10px 12px;
  transition: all 0.2s ease;
  cursor: pointer;
}

.dark .vendor-item:hover {
  background: #2c2c2e !important;
}

.dark .vendor-item.active {
  background: #464646 !important;
  font-weight: 500;
}

.dark .vendor-name {
  color: var(--dark-text-primary) !important;
}

.dark .vendor-item.active .vendor-name {
  color: #ffffff !important;
}

.dark .vendor-count {
  background: #3a3a3c;
  color: var(--dark-text-primary);
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
}

.dark .vendor-item.active .vendor-count {
  background: rgba(255, 255, 255, 0.15);
  color: #ffffff;
}

/* 搜索头部 */
.dark .search-header {
  background-color: transparent !important;
  border-bottom: 1px solid #38383a !important;
}

.dark .search-header .n-input {
  background-color: #3a3a3c !important;
  border-color: transparent !important;
  color: var(--dark-text-primary) !important;
  border-radius: 10px;
  box-shadow: none !important;
}

.dark .search-header .n-input:hover {
  background-color: #48484a !important;
}

.dark .search-header .n-input:focus-within {
  background-color: #48484a !important;
  border-color: transparent !important;
}

/* 隐藏搜索框的 focus 边框效果 */
.dark .search-header .n-input__border,
.dark .search-header .n-input__state-border {
  display: none !important;
}

.dark .search-header .n-input__placeholder {
  color: #aeaeb2 !important;
}

.dark .search-header .n-input__input-el {
  color: var(--dark-text-primary) !important;
}

/* 🍎 iOS 风格 - 模型列表区域 (暗黑模式) */
.dark .model-content {
  background: #1c1c1e !important;
}

/* NLayoutContent 背景透明 */
.dark .model-selector-popup .n-layout-content {
  background: transparent !important;
  background-color: transparent !important;
}

/* 去掉 NList 的边框和分割线 */
.dark .n-list {
  background: transparent !important;
  border: none !important;
}

/* 隐藏 NListItem 的分割线 */
.dark .n-list-item__divider {
  display: none !important;
}

/* NListItem 本身的样式 - 加强选择器优先级 */
.dark .model-selector-popup .n-list .n-list-item {
  border: none !important;
  background-color: transparent !important;
  background: transparent !important;
  margin: 0 !important;
  padding: 5px 12px !important;
  border-radius: 10px !important;
  transition: all 0.2s ease;
  cursor: pointer;
}

.dark .model-selector-popup .n-list .n-list-item:hover {
  background-color: #2c2c2e !important;
  background: #2c2c2e !important;
}

/* 选中时不要背景色，只显示 √ */
.dark .model-selector-popup .n-list .n-list-item.selected {
  background-color: transparent !important;
  background: transparent !important;
}

/* 选中项的 hover 效果 - 确保选中的项也能 hover */
.dark .model-selector-popup .n-list .n-list-item.selected:hover {
  background-color: #2c2c2e !important;
  background: #2c2c2e !important;
}

/* NListItem 内部的 main 区域 */
.dark .model-selector-popup .n-list .n-list-item .n-list-item__main {
  padding: 0 !important;
}

/* model-item 内容区域 */
.dark .model-item {
  background: transparent !important;
  border-radius: 10px !important;
  padding: 8px 12px !important;
  border: none !important;
}

.dark .model-item .model-item-content {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  width: 100% !important;
}

.dark .model-name {
  color: var(--dark-text-primary) !important;
  font-weight: 500;
}

.dark .model-item.selected .model-name {
  color: #ffffff !important;
}

.dark .model-id {
  color: #aeaeb2 !important;
  font-size: 12px;
}

.dark .model-item.selected .model-id {
  color: rgba(255, 255, 255, 0.7) !important;
}

.dark .model-item .n-icon {
  color: #ffffff !important;
}

/* 空状态 */
.dark .empty-state,
.dark .empty-vendor {
  color: #aeaeb2 !important;
}

/* 布局边框 */
.dark .n-layout-sider {
  border-color: #38383a !important;
}

.dark .n-layout-header {
  border-color: #38383a !important;
}

/* 滚动条 */
.dark .n-scrollbar-rail {
  background-color: transparent !important;
}

.dark .n-scrollbar-rail__scrollbar {
  background-color: #48484a !important;
  border-radius: 4px;
}

/* 移动端隐藏滚动条 */
.mobile-scrollbar-hide {
  -ms-overflow-style: none; /* IE 和 Edge */
  scrollbar-width: none; /* Firefox */
}

.mobile-scrollbar-hide::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
}
</style>
