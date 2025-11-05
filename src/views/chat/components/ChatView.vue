<script setup lang="ts">
import type { Ref } from 'vue'
import { NButton, NIcon, NInput, NText, NUpload, NUploadDragger } from 'naive-ui'
import planningIcon from '@/assets/icons/planning.svg'
import testIcon from '@/assets/icons/test.svg'
import writingIcon from '@/assets/icons/writing.svg'
import { SvgIcon } from '@/components/common'
import { t } from '@/locales'
import { Message, QuizAnswer, QuizConfig, QuizPreview } from '.'
import HeaderComponent from './Header/index.vue'
import ModelSelector from './ModelSelector/index.vue'

// Props 定义
interface Props {
  isMobile: boolean
  usingContext: boolean
  dataSources: any[]
  isFooterElevated: boolean
  isDarkTheme: boolean
  prompt: string
  placeholder: string
  buttonDisabled: boolean
  loading: boolean
  isMultiLine: boolean
  footerClass: any
  footerStyle: any
  scrollRef: any
  inputRef: Ref<any>
  uploadHeaders: Record<string, string>
  chatStore: any
  rightSiderCollapsed: boolean
  rightSiderWidth: number
  workflowStage: string
  uploadedFilePath: string
  generatedQuestions: any[]
  scoreDistribution: any
  quizLoading: boolean
}

defineProps<Props>()

// Emits 定义
const emit = defineEmits<{
  (e: 'update:prompt', value: string): void
  (e: 'export'): void
  (e: 'enter', event: KeyboardEvent): void
  (e: 'submit'): void
  (e: 'stop'): void
  (e: 'regenerate', index: number): void
  (e: 'delete', index: number): void
  (e: 'toggleRightSider'): void
  (e: 'resizeStart', event: MouseEvent): void
  (e: 'beforeUpload', options: any): void
  (e: 'uploadChange', options: any): void
  (e: 'uploadSuccess', options: any): void
  (e: 'uploadError', options: any): void
  (e: 'uploadRemove', options: any): void
  (e: 'quizConfigSubmit', config: any): void
  (e: 'quizAccept'): void
  (e: 'quizReject'): void
  (e: 'quizRevise', note: string): void
  (e: 'quizSubmit', answers: Record<number, string[]>, timeSpent: number): void
}>()

// 处理事件转发
function handleExport() {
  emit('export')
}

function handleEnter(event: KeyboardEvent) {
  emit('enter', event)
}

function handleSubmit() {
  emit('submit')
}

function handleStop() {
  emit('stop')
}

function onRegenerate(index: number) {
  emit('regenerate', index)
}

function handleDelete(index: number) {
  emit('delete', index)
}

function toggleRightSider() {
  emit('toggleRightSider')
}

function handleResizeStart(event: MouseEvent) {
  emit('resizeStart', event)
}

function handleBeforeUpload(options: any) {
  emit('beforeUpload', options)
}

function handleUploadChange(options: any) {
  emit('uploadChange', options)
}

function handleUploadSuccess(options: any) {
  emit('uploadSuccess', options)
}

function handleUploadError(options: any) {
  emit('uploadError', options)
}

function handleUploadRemove(options: any) {
  emit('uploadRemove', options)
}

function handleQuizConfigSubmit(config: any) {
  emit('quizConfigSubmit', config)
}

function handleQuizAccept() {
  emit('quizAccept')
}

function handleQuizReject() {
  emit('quizReject')
}

function handleQuizRevise(note: string) {
  emit('quizRevise', note)
}

function handleQuizSubmit(answers: Record<number, string[]>, timeSpent: number) {
  emit('quizSubmit', answers, timeSpent)
}
</script>

<template>
  <!-- 聊天页面 - 包含Header -->
  <div class="flex-1 overflow-hidden flex flex-col relative bg-white dark:bg-[#161618]">
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
            <div id="scrollRef" class="h-full overflow-hidden overflow-y-auto" :class="{ 'mobile-scrollbar-hide': isMobile }">
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
                    :value="prompt"
                    type="textarea"
                    :placeholder="placeholder"
                    :autofocus="false"
                    :autosize="{ minRows: 2, maxRows: isMobile ? 6 : 12 }"
                    class="chat-input-multiline"
                    @update:value="$emit('update:prompt', $event)"
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
                      :value="prompt"
                      type="textarea"
                      :placeholder="placeholder"
                      :autosize="{ minRows: 1, maxRows: isMobile ? 6 : 12 }"
                      class="chat-input-single"
                      @update:value="$emit('update:prompt', $event)"
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
</template>

<style scoped>
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

/* 移动端隐藏滚动条 */
.mobile-scrollbar-hide {
  -ms-overflow-style: none; /* IE 和 Edge */
  scrollbar-width: none; /* Firefox */
}

.mobile-scrollbar-hide::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
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
</style>
