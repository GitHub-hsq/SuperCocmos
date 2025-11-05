<script setup lang="ts">
import { NButton, NSpin } from 'naive-ui'
import { ref } from 'vue'
import { useNovelStore } from '@/store'
import CreateNovelDialog from './CreateNovelDialog.vue'
import NovelCard from './NovelCard.vue'

const novelStore = useNovelStore()
const showCreateDialog = ref(false)

function handleCreateNovel() {
  showCreateDialog.value = true
}
</script>

<template>
  <div class="novel-list-view">
    <NSpin :show="novelStore.isLoading">
      <div class="list-container">
        <!-- 顶部：开启新篇章按钮 -->
        <div class="create-section">
          <NButton
            type="primary"
            size="large"
            class="create-button"
            @click="handleCreateNovel"
          >
            <template #icon>
              <span class="text-xl">📖</span>
            </template>
            开启新篇章
          </NButton>
        </div>

        <!-- 小说卡片网格 -->
        <div class="novels-grid">
          <NovelCard
            v-for="novel in novelStore.novels"
            :key="novel.id"
            :novel="novel"
            @click="novelStore.selectNovel(novel)"
          />

          <!-- 新建卡片 -->
          <div class="novel-card add-card" @click="handleCreateNovel">
            <div class="add-icon">
              <span class="text-6xl">+</span>
            </div>
            <div class="add-text">
              新建小说
            </div>
          </div>
        </div>
      </div>
    </NSpin>

    <!-- 新建小说对话框 -->
    <CreateNovelDialog v-model:show="showCreateDialog" />
  </div>
</template>

<style scoped>
.novel-list-view {
  height: 100%;
  overflow-y: auto;
  padding: 24px;
}

.list-container {
  max-width: 1400px;
  margin: 0 auto;
}

/* 开启新篇章按钮区域 */
.create-section {
  display: flex;
  justify-content: center;
  margin-bottom: 40px;
}

.create-button {
  width: 50%;
  min-width: 300px;
  max-width: 500px;
  height: 60px;
  font-size: 18px;
  font-weight: 600;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.create-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
}

/* 小说卡片网格 */
.novels-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
}

/* 新建卡片 */
.add-card {
  border: 2px dashed #d9d9d9;
  background: transparent;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.add-card:hover {
  border-color: #40a9ff;
  background: rgba(64, 169, 255, 0.05);
}

.add-icon {
  color: #bfbfbf;
  transition: color 0.3s ease;
}

.add-card:hover .add-icon {
  color: #40a9ff;
}

.add-text {
  margin-top: 12px;
  font-size: 16px;
  color: #8c8c8c;
}

/* 响应式：移动端 */
@media (max-width: 768px) {
  .novel-list-view {
    padding: 16px;
  }

  .create-button {
    width: 100%;
    min-width: unset;
  }

  .novels-grid {
    grid-template-columns: 1fr;
  }
}

/* 响应式：平板 */
@media (min-width: 769px) and (max-width: 1024px) {
  .novels-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
