<script setup lang="ts">
import { NButton } from 'naive-ui'
import { SvgIcon } from '@/components/common'
import { useNovelStore } from '@/store'
import ChapterContent from './ChapterContent.vue'
import NovelIntroduction from './NovelIntroduction.vue'
import VolumeIntroduction from './VolumeIntroduction.vue'

const novelStore = useNovelStore()

function handleBackToList() {
  novelStore.backToList()
}
</script>

<template>
  <div class="novel-detail-view">
    <!-- 顶部工具栏 -->
    <div class="detail-header">
      <NButton text class="back-button" @click="handleBackToList">
        <template #icon>
          <SvgIcon icon="ri:arrow-left-line" class="text-lg" />
        </template>
        <span class="back-text">返回列表</span>
      </NButton>
    </div>

    <div class="content-container">
      <!-- 书籍介绍 -->
      <NovelIntroduction v-if="novelStore.selectedViewType === 'novel'" />

      <!-- 卷介绍 -->
      <VolumeIntroduction v-else-if="novelStore.selectedViewType === 'volume'" />

      <!-- 章节内容 -->
      <ChapterContent v-else-if="novelStore.selectedViewType === 'chapter'" />
    </div>
  </div>
</template>

<style scoped>
.novel-detail-view {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.detail-header {
  flex-shrink: 0;
  padding: 16px 24px;
  border-bottom: 1px solid var(--divider-color);
  background: var(--card-bg);
  display: flex;
  justify-content: flex-end;
}

.back-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  transition: all 0.2s;
  color: var(--text-color);
}

.back-button:hover {
  background: var(--hover-bg);
}

.back-text {
  font-size: 14px;
  font-weight: 500;
}

.content-container {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

/* 暗色模式 */
:deep(.dark) .detail-header {
  background: #2c2c2c;
  border-bottom-color: #3a3a3c;
}

:deep(.dark) .back-button {
  color: #c9d1d9;
}

:deep(.dark) .back-button:hover {
  background: rgba(255, 255, 255, 0.05);
}
</style>
