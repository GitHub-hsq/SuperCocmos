<script setup lang='ts'>
/* eslint-disable unused-imports/no-unused-vars */
/* eslint-disable ts/ban-ts-comment */
// @ts-nocheck
/**
 * 重构后的 Chat Index 示例
 *
 * 这个文件展示了如何使用拆分后的 composables
 * 主文件从 2957 行精简到 ~200 行
 */

import { onMounted, onUnmounted } from 'vue'

// ===== 组件导入 =====
import { useChatActions } from './composables/useChatActions'

// ✅ 已完成：核心 composables
import { useChatState } from './composables/useChatState'
import { useFileUpload } from './composables/useFileUpload'

import { useModelSelector } from './composables/useModelSelector'
import { useQuizWorkflow } from './composables/useQuizWorkflow'
// ===== Composables 导入 =====
import { useRightSider } from './composables/useRightSider'

// ===== 临时：使用原有逻辑（待替换为 composables） =====
// 这部分在完成 useChatState 和 useChatActions 后会被替换

// ===== 使用所有 Composables =====

// 1️⃣ 基础状态管理
const chatState = useChatState()

// 2️⃣ 聊天操作（依赖 chatState）
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

// 3️⃣ 模型选择器
const modelSelector = useModelSelector()

// 4️⃣ 文件上传
const fileUpload = useFileUpload(chatState.uuid)

// 5️⃣ Quiz 工作流
const quizWorkflow = useQuizWorkflow({
  uploadedFilePath: fileUpload.uploadedFilePath,
  workflowStage: fileUpload.workflowStage,
  generatedQuestions: fileUpload.generatedQuestions,
  scoreDistribution: fileUpload.scoreDistribution,
})

// 6️⃣ 右侧栏控制
const rightSider = useRightSider()

// ===== 组件生命周期 =====
onMounted(async () => {
  // 初始化逻辑
  await modelSelector.loadCurrentModel()
  await chatState.updateUploadHeaders()
})

onUnmounted(() => {
  // 清理逻辑
  // 如果有需要清理的定时器或事件监听器，在这里清理
})
</script>

<template>
  <div class="flex flex-col w-full h-full overflow-hidden bg-white dark:bg-[#161618]">
    <!-- 示例：完整的模板结构会在这里 -->

    <!--
    基本结构：

    <transition name="fade" mode="out-in">
      // 设置页面
      <SettingsPage v-if="showSettingsPage" />

      // 聊天页面
      <div v-else class="chat-page">
        // Header with Model Selector
        <header>
          <ModelSelector />
        </header>

        // 消息列表
        <main>
          <Message
            v-for="(item, index) in dataSources"
            :key="index"
            :data="item"
            @delete="() => handleDelete(index)"
          />
        </main>

        // 输入框
        <ChatInput
          v-model:prompt="prompt"
          :loading="loading"
          @submit="handleSubmit"
        />

        // 右侧栏
        <RightSider />
      </div>
    </transition>
    -->

    <div class="text-center p-8">
      <h2 class="text-2xl font-bold mb-4">
        🎨 重构示例文件
      </h2>
      <p class="text-gray-600 dark:text-gray-400">
        这是展示如何使用拆分后的 composables 的示例文件
      </p>
      <p class="text-sm text-gray-500 mt-4">
        查看 REFACTORING_GUIDE.md 了解完整的重构步骤
      </p>
    </div>
  </div>
</template>

<style scoped>
.chat-page {
  display: flex;
  flex-direction: column;
  height: 100%;
}
</style>
