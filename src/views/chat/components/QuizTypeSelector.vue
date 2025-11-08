<script setup lang="ts">
/**
 * 笔记转题目 - 题型选择阶段
 * 左右布局：题型选择 | 工作流图
 */
import { NButton, NCard, NInputNumber, NSpace, NText } from 'naive-ui'
import { computed, ref } from 'vue'
import { SvgIcon } from '@/components/common'
import WorkflowNodeDiagram from './WorkflowNodeDiagram.vue'

interface Props {
  filePath: string
  nodes?: Array<{ type: string, label: string, status: 'pending' | 'running' | 'completed' | 'error', message: string }>
}

interface Emits {
  (e: 'confirm', config: { single_choice: number, multiple_choice: number, true_false: number }): void
  (e: 'back'): void
}

const props = withDefaults(defineProps<Props>(), {
  nodes: () => [
    { type: 'classify', label: '内容分类', status: 'completed' as const, message: '分类完成' },
    { type: 'question_types', label: '试卷题目分配', status: 'running' as const, message: '请配置题型和数量' },
    { type: 'generate', label: '试卷生成', status: 'pending' as const, message: '' },
    { type: 'review', label: '专家审核', status: 'pending' as const, message: '' },
    { type: 'preview', label: '预览', status: 'pending' as const, message: '' },
  ],
})

const emit = defineEmits<Emits>()

// 题目数量配置（默认值）
const singleChoiceCount = ref(5)
const multipleChoiceCount = ref(3)
const trueFalseCount = ref(2)

// 计算总题数
const totalCount = computed(() =>
  singleChoiceCount.value + multipleChoiceCount.value + trueFalseCount.value,
)

// 从文件路径提取文件名
const fileName = computed(() => {
  if (!props.filePath)
    return ''
  const parts = props.filePath.split(/[/\\]/)
  return parts[parts.length - 1]
})

// 确认生成试卷
function handleConfirm() {
  emit('confirm', {
    single_choice: singleChoiceCount.value,
    multiple_choice: multipleChoiceCount.value,
    true_false: trueFalseCount.value,
  })
}

// 返回上一步
function handleBack() {
  emit('back')
}
</script>

<template>
  <div class="quiz-type-selector">
    <!-- 左右布局：题型选择 | 工作流图 (3:1) -->
    <div class="selector-workflow-container">
      <!-- 左侧：题型选择 (75%) -->
      <div class="selector-section">
        <NCard
          title="配置题目类型"
          :bordered="false"
          class="selector-card"
        >
          <template #header-extra>
            <NText depth="3">
              共 {{ totalCount }} 题
            </NText>
          </template>

          <!-- 文件信息 -->
          <div v-if="fileName" class="file-info">
            <div class="file-info-label">
              <SvgIcon icon="ri:file-text-line" class="text-lg" />
              <span>已上传文件：</span>
            </div>
            <div class="file-info-name">
              {{ fileName }}
            </div>
          </div>

          <!-- 题型配置 -->
          <NSpace vertical :size="20" class="config-section">
            <div class="config-item">
              <div class="config-label">
                <SvgIcon icon="ri:checkbox-circle-line" class="text-xl" />
                <span class="font-medium">单选题</span>
              </div>
              <NInputNumber
                v-model:value="singleChoiceCount"
                :min="0"
                :max="50"
                class="config-input"
              />
            </div>

            <div class="config-item">
              <div class="config-label">
                <SvgIcon icon="ri:checkbox-multiple-line" class="text-xl" />
                <span class="font-medium">多选题</span>
              </div>
              <NInputNumber
                v-model:value="multipleChoiceCount"
                :min="0"
                :max="50"
                class="config-input"
              />
            </div>

            <div class="config-item">
              <div class="config-label">
                <SvgIcon icon="ri:question-answer-line" class="text-xl" />
                <span class="font-medium">判断题</span>
              </div>
              <NInputNumber
                v-model:value="trueFalseCount"
                :min="0"
                :max="50"
                class="config-input"
              />
            </div>
          </NSpace>

          <!-- 操作按钮 -->
          <NSpace class="action-buttons" :size="12">
            <NButton
              @click="handleBack"
            >
              <template #icon>
                <SvgIcon icon="ri:arrow-left-line" />
              </template>
              返回
            </NButton>

            <NButton
              type="primary"
              :disabled="totalCount === 0"
              @click="handleConfirm"
            >
              <template #icon>
                <SvgIcon icon="ri:sparkling-line" />
              </template>
              生成试卷
            </NButton>
          </NSpace>
        </NCard>
      </div>

      <!-- 右侧：工作流节点图 (25%) -->
      <div class="diagram-section">
        <WorkflowNodeDiagram :nodes="nodes" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.quiz-type-selector {
  width: 100%;
  height: 100%;
  background-color: #f2f2f7;
  overflow: hidden;
}

.dark .quiz-type-selector {
  background-color: #000000;
}

/* ==================== 左右布局容器（3:1）==================== */
.selector-workflow-container {
  display: flex;
  gap: 16px;
  width: 100%;
  height: 100%;
  padding: 20px;
}

/* 左侧：题型选择 (75%) */
.selector-section {
  flex: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow-y: auto;
}

.selector-card {
  width: 100%;
  max-width: 600px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.dark .selector-card {
  background-color: #1c1c1e;
}

/* 右侧：工作流节点图 (25%) */
.diagram-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ==================== 文件信息 ==================== */
.file-info {
  padding: 16px;
  background-color: #f2f2f7;
  border: 1px solid #e5e5ea;
  border-radius: 8px;
  margin-bottom: 24px;
}

.dark .file-info {
  background-color: #2c2c2e;
  border-color: #3a3a3c;
}

.file-info-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #8e8e93;
  margin-bottom: 8px;
}

.file-info-name {
  font-size: 15px;
  font-weight: 500;
  color: #000000;
  word-break: break-all;
  padding-left: 28px;
}

.dark .file-info-name {
  color: #ffffff;
}

/* ==================== 题型配置 ==================== */
.config-section {
  width: 100%;
}

.config-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
}

.config-label {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  color: #000000;
}

.dark .config-label {
  color: #ffffff;
}

.config-input {
  width: 140px;
}

.action-buttons {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
}

.action-buttons .n-button {
  min-width: 120px;
}

/* ==================== 响应式布局 ==================== */
@media (max-width: 1200px) {
  .selector-workflow-container {
    flex-direction: column;
  }

  .selector-section {
    flex: 2;
  }

  .diagram-section {
    flex: 1;
    min-height: 300px;
  }
}
</style>
