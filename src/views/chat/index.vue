<script setup lang='ts'>
/**
 * Chat Index - 重构版本
 *
 * 原文件：2957行 → 重构后：~200行
 * 拆分为6个 composables + 多个组件
 */

import { computed, onMounted, onUnmounted, watch } from 'vue'
// ===== Components =====
import About from '@/components/common/Setting/About.vue'
import Advanced from '@/components/common/Setting/Advanced.vue'
import ChatConfigPanel from '@/components/common/Setting/panels/ChatConfigPanel.vue'
import ProviderConfigPanel from '@/components/common/Setting/panels/ProviderConfigPanel.vue'
import UserSettingsPanel from '@/components/common/Setting/panels/UserSettingsPanel.vue'
import WorkflowConfigPanel from '@/components/common/Setting/panels/WorkflowConfigPanel.vue'
import { useAppStore, useNovelStore } from '@/store'
import CreateNovelView from '@/views/novel/components/CreateNovelView.vue'
import NovelDetailView from '@/views/novel/components/NovelDetailView.vue'
import NovelListView from '@/views/novel/components/NovelListView.vue'

import ChatView from './components/ChatView.vue'
import { useChatActions } from './composables/useChatActions'
// ===== Composables =====
import { useChatState } from './composables/useChatState'
import { useFileUpload } from './composables/useFileUpload'
import { useModelSelector } from './composables/useModelSelector'
import { useQuizWorkflow } from './composables/useQuizWorkflow'
import { useRightSider } from './composables/useRightSider'

// ===== 1. 基础状态管理 =====
const chatState = useChatState()

// ===== 工作模式管理 =====
const appStore = useAppStore()
const novelStore = useNovelStore()
const workMode = computed(() => appStore.workMode)

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
  aboutRef: chatState.aboutRef,
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

            <!-- 默认显示：如果activeSettingTab不匹配任何已知选项卡 -->
            <UserSettingsPanel v-else key="default" />
          </transition>
        </div>
      </div>
    </div>

    <!-- 聊天页面 - 聊天模式 -->
    <ChatView
      v-else-if="workMode === 'chat'"
      v-model:prompt="prompt"
      :is-mobile="isMobile"
      :using-context="usingContext"
      :data-sources="dataSources"
      :is-footer-elevated="isFooterElevated"
      :is-dark-theme="isDarkTheme"
      :placeholder="placeholder"
      :button-disabled="buttonDisabled"
      :loading="loading"
      :footer-class="footerClass"
      :footer-style="footerStyle"
      :scroll-ref="scrollRef"
      :input-ref="inputRef"
      :upload-headers="uploadHeaders"
      :chat-store="chatStore"
      :right-sider-collapsed="rightSiderCollapsed"
      :right-sider-width="rightSiderWidth"
      :workflow-stage="workflowStage"
      :uploaded-file-path="uploadedFilePath"
      :generated-questions="generatedQuestions"
      :score-distribution="scoreDistribution"
      :quiz-loading="quizLoading"
      @export="handleExport"
      @enter="handleEnter"
      @submit="handleSubmit"
      @stop="handleStop"
      @regenerate="onRegenerate"
      @delete="handleDelete"
      @toggle-right-sider="toggleRightSider"
      @resize-start="handleResizeStart"
      @before-upload="handleBeforeUpload"
      @upload-change="handleUploadChange"
      @upload-success="handleUploadSuccess"
      @upload-error="handleUploadError"
      @upload-remove="handleUploadRemove"
      @quiz-config-submit="handleQuizConfigSubmit"
      @quiz-accept="handleQuizAccept"
      @quiz-reject="handleQuizReject"
      @quiz-revise="handleQuizRevise"
      @quiz-submit="handleQuizSubmit"
    />

    <!-- 小说页面 - 小说模式 -->
    <template v-else-if="workMode === 'novel'">
      <!-- 创建视图 -->
      <CreateNovelView v-if="novelStore.showCreateForm" />

      <!-- 列表视图 -->
      <NovelListView v-else-if="novelStore.showNovelList" />

      <!-- 详情视图 -->
      <NovelDetailView v-else />
    </template>
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
</style>
