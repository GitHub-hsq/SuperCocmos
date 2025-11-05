<script setup lang="ts">
import type { Novel } from '@/types/novel'
import { NTag } from 'naive-ui'

defineProps<{
  novel: Novel
}>()

// 类型标签颜色映射
const genreColors: Record<string, string> = {
  玄幻: 'warning',
  言情: 'error',
  科幻: 'info',
  武侠: 'success',
  悬疑: 'default',
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
</script>

<template>
  <div class="novel-card">
    <!-- 封面区域 -->
    <div class="card-cover">
      <div v-if="novel.cover" class="cover-image">
        <img :src="novel.cover" :alt="novel.title">
      </div>
      <div v-else class="cover-placeholder">
        <span class="text-5xl">📚</span>
      </div>

      <!-- 状态标签 -->
      <div class="status-badge">
        {{ getStatusText(novel.status) }}
      </div>
    </div>

    <!-- 信息区域 -->
    <div class="card-info">
      <h3 class="novel-title" :title="novel.title">
        {{ novel.title }}
      </h3>

      <div class="novel-meta">
        <NTag v-if="novel.genre" :type="(genreColors[novel.genre] as any) || 'default'" size="small">
          {{ novel.genre }}
        </NTag>

        <span class="meta-text">
          {{ novel.volumeCount }}卷 / {{ novel.chapterCount }}章
        </span>

        <span v-if="novel.totalWordCount" class="meta-text">
          {{ (novel.totalWordCount / 10000).toFixed(1) }}万字
        </span>
      </div>

      <p v-if="novel.introduction" class="novel-intro">
        {{ novel.introduction }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.novel-card {
  background: var(--card-bg);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  height: 360px;
  display: flex;
  flex-direction: column;
}

.novel-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

/* 封面区域 */
.card-cover {
  position: relative;
  width: 100%;
  height: 200px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  overflow: hidden;
}

.cover-image {
  width: 100%;
  height: 100%;
}

.cover-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.status-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

/* 信息区域 */
.card-info {
  padding: 16px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.novel-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 12px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-color);
}

.novel-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.meta-text {
  font-size: 13px;
  color: var(--text-color-3);
}

.novel-intro {
  font-size: 14px;
  color: var(--text-color-2);
  line-height: 1.6;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  flex: 1;
}

/* 暗色模式 */
.dark .novel-card {
  background: #2c2c2c;
}

.dark .novel-title {
  color: #e0e0e0;
}
</style>
