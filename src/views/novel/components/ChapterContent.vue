<script setup lang="ts">
import { NButton, NInput, NTag } from 'naive-ui'
import { computed, ref } from 'vue'
import { useNovelStore } from '@/store'

const novelStore = useNovelStore()

const currentChapter = computed(() => {
  if (!novelStore.selectedChapterId)
    return null
  return novelStore.chapters.find(c => c.id === novelStore.selectedChapterId)
})

const isEditing = ref(false)
const editingContent = ref('')

function getStatusText(status: string) {
  const statusMap: Record<string, string> = {
    draft: '草稿',
    writing: '创作中',
    completed: '已完成',
  }
  return statusMap[status] || status
}

function handleEdit() {
  if (currentChapter.value) {
    editingContent.value = currentChapter.value.content
    isEditing.value = true
  }
}

function handleSave() {
  // TODO: 调用API保存章节内容
  isEditing.value = false
}

function handleCancel() {
  isEditing.value = false
  editingContent.value = ''
}

function handleAIGenerate() {
  // TODO: 调用AI生成工作流
}

function handleAIRefine() {
  // TODO: 调用AI润色工作流
}
</script>

<template>
  <div v-if="currentChapter" class="chapter-content">
    <!-- 章节头部 -->
    <div class="chapter-header">
      <div class="title-section">
        <h1 class="chapter-title">
          第{{ currentChapter.chapterNumber }}章 {{ currentChapter.title }}
        </h1>
        <div class="header-meta">
          <NTag :bordered="false">
            {{ getStatusText(currentChapter.status) }}
          </NTag>
          <span class="word-count">{{ currentChapter.wordCount }}字</span>
          <span class="create-time">{{ new Date(currentChapter.createdAt).toLocaleString() }}</span>
        </div>
      </div>

      <div class="header-actions">
        <template v-if="!isEditing">
          <NButton @click="handleEdit">
            <template #icon>
              <span>✏️</span>
            </template>
            编辑
          </NButton>
          <NButton type="primary" @click="handleAIGenerate">
            <template #icon>
              <span>🤖</span>
            </template>
            AI生成
          </NButton>
          <NButton @click="handleAIRefine">
            <template #icon>
              <span>✨</span>
            </template>
            AI润色
          </NButton>
        </template>
        <template v-else>
          <NButton type="primary" @click="handleSave">
            保存
          </NButton>
          <NButton @click="handleCancel">
            取消
          </NButton>
        </template>
      </div>
    </div>

    <!-- 章节内容 -->
    <div class="content-body">
      <!-- 编辑模式 -->
      <div v-if="isEditing" class="editing-mode">
        <NInput
          v-model:value="editingContent"
          type="textarea"
          placeholder="在此输入章节内容..."
          :autosize="{ minRows: 20, maxRows: 50 }"
          :maxlength="50000"
          show-count
        />
      </div>

      <!-- 阅读模式 -->
      <div v-else class="reading-mode">
        <div v-if="currentChapter.content" class="content-text">
          {{ currentChapter.content }}
        </div>
        <div v-else class="empty-content">
          <p class="empty-text">
            暂无内容
          </p>
          <p class="empty-hint">
            点击"编辑"开始写作，或点击"AI生成"让AI帮你创作
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chapter-content {
  max-width: 900px;
}

/* 头部区域 */
.chapter-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--divider-color);
  gap: 24px;
}

.title-section {
  flex: 1;
}

.chapter-title {
  font-size: 26px;
  font-weight: 700;
  margin: 0 0 12px 0;
  color: var(--text-color);
  line-height: 1.4;
}

.header-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.word-count,
.create-time {
  font-size: 14px;
  color: var(--text-color-3);
}

.header-actions {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}

/* 内容区域 */
.content-body {
  min-height: 500px;
}

/* 编辑模式 */
.editing-mode {
  width: 100%;
}

:deep(.n-input__textarea-el) {
  font-size: 16px;
  line-height: 2;
  font-family: 'Microsoft YaHei', 'PingFang SC', sans-serif;
}

/* 阅读模式 */
.reading-mode {
  width: 100%;
}

.content-text {
  font-size: 16px;
  line-height: 2;
  color: var(--text-color);
  white-space: pre-wrap;
  word-wrap: break-word;
  text-align: justify;
  text-indent: 2em;
}

.content-text::first-line {
  text-indent: 2em;
}

/* 空内容提示 */
.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 40px;
  background: var(--card-bg);
  border-radius: 12px;
  border: 2px dashed var(--divider-color);
}

.empty-text {
  font-size: 20px;
  color: var(--text-color-2);
  margin: 0 0 12px 0;
}

.empty-hint {
  font-size: 14px;
  color: var(--text-color-3);
  margin: 0;
}

/* 响应式 */
@media (max-width: 768px) {
  .chapter-header {
    flex-direction: column;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .chapter-title {
    font-size: 20px;
  }

  .content-text {
    font-size: 15px;
    line-height: 1.8;
  }
}

/* 暗色模式 */
.dark .empty-content {
  background: #2c2c2c;
}
</style>
