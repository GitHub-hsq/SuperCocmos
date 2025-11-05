<script setup lang="ts">
import { NButton, NDescriptions, NDescriptionsItem, NTag } from 'naive-ui'
import { useNovelStore } from '@/store'

const novelStore = useNovelStore()

// 类型标签颜色映射
const genreColors: Record<string, string> = {
  玄幻: 'warning',
  言情: 'error',
  科幻: 'info',
  武侠: 'success',
  悬疑: 'default',
  都市: 'primary',
  历史: 'warning',
}

function getStatusText(status: string) {
  const statusMap: Record<string, string> = {
    planning: '规划中',
    writing: '创作中',
    completed: '已完成',
    paused: '暂停',
  }
  return statusMap[status] || status
}

function handleEditNovel() {
  // TODO: 打开编辑对话框
}

function handleGenerateOutline() {
  // TODO: 调用大纲生成工作流
}
</script>

<template>
  <div v-if="novelStore.currentNovel" class="novel-introduction">
    <!-- 封面和基本信息 -->
    <div class="intro-header">
      <div class="cover-section">
        <div v-if="novelStore.currentNovel.cover" class="cover-image">
          <img :src="novelStore.currentNovel.cover" :alt="novelStore.currentNovel.title">
        </div>
        <div v-else class="cover-placeholder">
          <span class="text-8xl">📚</span>
        </div>
      </div>

      <div class="info-section">
        <div class="title-row">
          <h1 class="novel-title">
            {{ novelStore.currentNovel.title }}
          </h1>
          <NButton text @click="handleEditNovel">
            <template #icon>
              <span>✏️</span>
            </template>
            编辑
          </NButton>
        </div>

        <div class="meta-info">
          <NTag
            v-if="novelStore.currentNovel.genre"
            :type="(genreColors[novelStore.currentNovel.genre] as any) || 'default'"
            size="medium"
          >
            {{ novelStore.currentNovel.genre }}
          </NTag>

          <NTag :bordered="false">
            {{ getStatusText(novelStore.currentNovel.status) }}
          </NTag>
        </div>

        <NDescriptions :column="2" class="novel-desc">
          <NDescriptionsItem label="卷数">
            {{ novelStore.currentNovel.volumeCount }}
          </NDescriptionsItem>
          <NDescriptionsItem label="章节数">
            {{ novelStore.currentNovel.chapterCount }}
          </NDescriptionsItem>
          <NDescriptionsItem label="总字数">
            {{ novelStore.currentNovel.totalWordCount ? `${(novelStore.currentNovel.totalWordCount / 10000).toFixed(1)}万字` : '0字' }}
          </NDescriptionsItem>
          <NDescriptionsItem label="创建时间">
            {{ new Date(novelStore.currentNovel.createdAt).toLocaleDateString() }}
          </NDescriptionsItem>
        </NDescriptions>
      </div>
    </div>

    <!-- 详细信息 -->
    <div class="intro-content">
      <!-- 主题 -->
      <div v-if="novelStore.currentNovel.theme" class="content-section">
        <h3 class="section-title">
          主题
        </h3>
        <p class="section-text">
          {{ novelStore.currentNovel.theme }}
        </p>
      </div>

      <!-- 简介 -->
      <div v-if="novelStore.currentNovel.introduction" class="content-section">
        <h3 class="section-title">
          简介
        </h3>
        <p class="section-text">
          {{ novelStore.currentNovel.introduction }}
        </p>
      </div>

      <!-- 操作按钮 -->
      <div class="action-section">
        <NButton type="primary" size="large" @click="handleGenerateOutline">
          <template #icon>
            <span>🤖</span>
          </template>
          AI生成大纲
        </NButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.novel-introduction {
  max-width: 900px;
}

/* 头部区域 */
.intro-header {
  display: flex;
  gap: 32px;
  margin-bottom: 40px;
  padding-bottom: 32px;
  border-bottom: 1px solid var(--divider-color);
}

.cover-section {
  flex-shrink: 0;
}

.cover-image {
  width: 200px;
  height: 280px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.cover-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-placeholder {
  width: 200px;
  height: 280px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.info-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.novel-title {
  font-size: 32px;
  font-weight: 700;
  margin: 0;
  color: var(--text-color);
}

.meta-info {
  display: flex;
  gap: 12px;
  align-items: center;
}

.novel-desc {
  margin-top: 12px;
}

/* 内容区域 */
.intro-content {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.content-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  color: var(--text-color);
}

.section-text {
  font-size: 16px;
  line-height: 1.8;
  color: var(--text-color-2);
  margin: 0;
  white-space: pre-wrap;
}

.action-section {
  display: flex;
  gap: 16px;
  padding-top: 16px;
}

/* 响应式 */
@media (max-width: 768px) {
  .intro-header {
    flex-direction: column;
  }

  .cover-image,
  .cover-placeholder {
    width: 100%;
    max-width: 300px;
    margin: 0 auto;
  }

  .novel-title {
    font-size: 24px;
  }
}
</style>
