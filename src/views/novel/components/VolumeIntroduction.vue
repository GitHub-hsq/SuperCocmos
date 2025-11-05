<script setup lang="ts">
import { NButton, NDescriptions, NDescriptionsItem, NTag } from 'naive-ui'
import { computed } from 'vue'
import { useNovelStore } from '@/store'

const novelStore = useNovelStore()

const currentVolume = computed(() => {
  if (!novelStore.selectedVolumeId)
    return null
  return novelStore.volumes.find(v => v.id === novelStore.selectedVolumeId)
})

const volumeChapters = computed(() => {
  if (!novelStore.selectedVolumeId)
    return []
  return novelStore.chapters.filter(c => c.volumeId === novelStore.selectedVolumeId)
})

const totalWordCount = computed(() => {
  return volumeChapters.value.reduce((sum, chapter) => sum + chapter.wordCount, 0)
})

function getStatusText(status: string) {
  const statusMap: Record<string, string> = {
    planning: '规划中',
    writing: '创作中',
    completed: '已完成',
  }
  return statusMap[status] || status
}

function handleEditVolume() {
  // TODO: 打开编辑对话框
}

function handleGenerateChapters() {
  // TODO: 调用章节生成工作流
}
</script>

<template>
  <div v-if="currentVolume" class="volume-introduction">
    <!-- 卷标题和操作 -->
    <div class="volume-header">
      <div class="title-section">
        <h1 class="volume-title">
          第{{ currentVolume.volumeNumber }}卷
          <template v-if="currentVolume.title">
            ： {{ currentVolume.title }}
          </template>
        </h1>
        <div class="header-actions">
          <NTag :bordered="false">
            {{ getStatusText(currentVolume.status) }}
          </NTag>
          <NTag v-if="currentVolume.locked" type="warning">
            🔒 已锁定
          </NTag>
          <NButton text @click="handleEditVolume">
            <template #icon>
              <span>✏️</span>
            </template>
            编辑
          </NButton>
        </div>
      </div>

      <!-- 统计信息 -->
      <NDescriptions :column="3" class="volume-stats">
        <NDescriptionsItem label="章节数">
          {{ volumeChapters.length }}
        </NDescriptionsItem>
        <NDescriptionsItem label="总字数">
          {{ totalWordCount ? `${(totalWordCount / 10000).toFixed(1)}万字` : '0字' }}
        </NDescriptionsItem>
        <NDescriptionsItem label="创建时间">
          {{ new Date(currentVolume.createdAt).toLocaleDateString() }}
        </NDescriptionsItem>
      </NDescriptions>
    </div>

    <!-- 卷介绍 -->
    <div v-if="currentVolume.introduction" class="content-section">
      <h3 class="section-title">
        卷介绍
      </h3>
      <p class="section-text">
        {{ currentVolume.introduction }}
      </p>
    </div>

    <!-- 卷大纲 -->
    <div v-if="currentVolume.outline" class="content-section">
      <h3 class="section-title">
        卷大纲
      </h3>
      <div class="outline-content">
        <p class="section-text">
          {{ currentVolume.outline }}
        </p>
      </div>
    </div>

    <!-- 章节列表 -->
    <div class="content-section">
      <h3 class="section-title">
        章节列表
      </h3>
      <div class="chapters-list">
        <div
          v-for="chapter in volumeChapters"
          :key="chapter.id"
          class="chapter-item"
          @click="novelStore.selectChapter(chapter.id)"
        >
          <div class="chapter-info">
            <span class="chapter-number">第{{ chapter.chapterNumber }}章</span>
            <span class="chapter-title">{{ chapter.title }}</span>
          </div>
          <div class="chapter-meta">
            <span class="chapter-words">{{ chapter.wordCount }}字</span>
            <NTag size="small" :bordered="false">
              {{ getStatusText(chapter.status) }}
            </NTag>
          </div>
        </div>

        <div v-if="volumeChapters.length === 0" class="empty-chapters">
          暂无章节，点击左侧"+ 新建章节"开始创作
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="action-section">
      <NButton
        v-if="!currentVolume.locked"
        type="primary"
        size="large"
        @click="handleGenerateChapters"
      >
        <template #icon>
          <span>🤖</span>
        </template>
        AI生成章节
      </NButton>
    </div>
  </div>
</template>

<style scoped>
.volume-introduction {
  max-width: 900px;
}

/* 头部区域 */
.volume-header {
  margin-bottom: 40px;
  padding-bottom: 32px;
  border-bottom: 1px solid var(--divider-color);
}

.title-section {
  margin-bottom: 24px;
}

.volume-title {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 16px 0;
  color: var(--text-color);
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.volume-stats {
  margin-top: 16px;
}

/* 内容区域 */
.content-section {
  margin-bottom: 32px;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 16px 0;
  color: var(--text-color);
}

.section-text {
  font-size: 16px;
  line-height: 1.8;
  color: var(--text-color-2);
  margin: 0;
  white-space: pre-wrap;
}

.outline-content {
  background: var(--card-bg);
  padding: 20px;
  border-radius: 8px;
  border-left: 4px solid var(--primary-color);
}

/* 章节列表 */
.chapters-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chapter-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: var(--card-bg);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.chapter-item:hover {
  border-color: var(--primary-color);
  transform: translateX(4px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.chapter-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.chapter-number {
  font-weight: 600;
  color: var(--primary-color);
  min-width: 80px;
}

.chapter-title {
  font-size: 15px;
  color: var(--text-color);
}

.chapter-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.chapter-words {
  font-size: 13px;
  color: var(--text-color-3);
}

.empty-chapters {
  padding: 40px;
  text-align: center;
  color: var(--text-color-3);
  background: var(--card-bg);
  border-radius: 8px;
  border: 2px dashed var(--divider-color);
}

/* 操作区域 */
.action-section {
  display: flex;
  gap: 16px;
  padding-top: 16px;
}

/* 暗色模式 */
.dark .outline-content,
.dark .chapter-item,
.dark .empty-chapters {
  background: #2c2c2c;
}
</style>
