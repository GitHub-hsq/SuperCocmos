<script setup lang="ts">
import { NButton, NCard } from 'naive-ui'
/**
 * 答题卡组件
 * 显示题目编号和答题状态
 * 包含计时器和提交按钮
 */
import { computed } from 'vue'
import { SvgIcon } from '@/components/common'

interface Props {
  questions: any[]
  answers: Record<number, string[]>
  timeSpent: number // 已用时间（秒）
  isFinished: boolean // 是否已完成
}

const props = defineProps<Props>()

const emit = defineEmits<{
  jumpTo: [questionIndex: number]
  submit: []
}>()

// 按题型分类题目
const questionsByType = computed(() => {
  const result: Record<string, number[]> = {
    single_choice: [],
    multiple_choice: [],
    true_false: [],
  }

  props.questions.forEach((q, index) => {
    if (q.type && result[q.type]) {
      result[q.type].push(index)
    }
  })

  return result
})

// 题型名称映射
const typeNames: Record<string, string> = {
  single_choice: '单选题',
  multiple_choice: '多选题',
  true_false: '判断题',
}

// 检查题目是否已答
function isAnswered(questionIndex: number): boolean {
  const answer = props.answers[questionIndex]
  return !!(answer && answer.length > 0)
}

// 跳转到指定题目
function jumpToQuestion(questionIndex: number) {
  emit('jumpTo', questionIndex)
}

// 统计信息
const stats = computed(() => {
  const total = props.questions.length
  const answered = Object.keys(props.answers).filter((key) => {
    const answer = props.answers[Number(key)]
    return answer && answer.length > 0
  }).length

  return {
    total,
    answered,
    unanswered: total - answered,
    progress: total > 0 ? Math.round((answered / total) * 100) : 0,
  }
})

// 是否全部作答
const allAnswered = computed(() => stats.value.answered === stats.value.total)

// 格式化时间（HH:MM:SS）
const formattedTime = computed(() => {
  const hours = Math.floor(props.timeSpent / 3600)
  const minutes = Math.floor((props.timeSpent % 3600) / 60)
  const seconds = props.timeSpent % 60

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})

// 提交答案
function handleSubmit() {
  emit('submit')
}
</script>

<template>
  <div class="answer-sheet">
    <NCard title="答题卡" :bordered="false" class="answer-sheet-card">
      <!-- 可滚动内容容器 -->
      <div class="answer-sheet-content">
        <!-- 计时器（顶部） -->
        <div class="timer-section">
          <div class="timer-display">
            <SvgIcon icon="ri:time-line" class="timer-icon" />
            <span class="timer-text">{{ formattedTime }}</span>
          </div>
        </div>

        <!-- 进度统计 -->
        <div class="stats-section">
          <div class="stat-item">
            <span class="stat-label">总题数：</span>
            <span class="stat-value">{{ stats.total }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">已答：</span>
            <span class="stat-value answered">{{ stats.answered }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">未答：</span>
            <span class="stat-value unanswered">{{ stats.unanswered }}</span>
          </div>
          <div class="stat-item progress">
            <span class="stat-label">进度：</span>
            <span class="stat-value">{{ stats.progress }}%</span>
          </div>
        </div>

        <!-- 答题卡主体 -->
        <div class="answer-grid-section">
          <div
            v-for="(indices, type) in questionsByType"
            v-show="indices.length > 0"
            :key="type"
            class="type-section"
          >
            <!-- 题型标题 -->
            <div class="type-header">
              {{ typeNames[type] }} ({{ indices.length }}题)
            </div>

            <!-- 题目编号网格 -->
            <div class="question-grid">
              <button
                v-for="(questionIndex, idx) in indices"
                :key="questionIndex"
                class="question-number"
                :class="{
                  answered: isAnswered(questionIndex),
                  unanswered: !isAnswered(questionIndex),
                }"
                @click="jumpToQuestion(questionIndex)"
              >
                {{ idx + 1 }}
              </button>
            </div>
          </div>
        </div>

        <!-- 图例 -->
        <div class="legend">
          <div class="legend-item">
            <span class="legend-box answered" />
            <span class="legend-text">已答</span>
          </div>
          <div class="legend-item">
            <span class="legend-box unanswered" />
            <span class="legend-text">未答</span>
          </div>
        </div>

        <!-- 提交按钮（底部） -->
        <div v-if="!isFinished" class="submit-section">
          <NButton
            type="primary"
            size="large"
            class="submit-button"
            :disabled="!allAnswered"
            @click="handleSubmit"
          >
            <template #icon>
              <SvgIcon icon="ri:send-plane-fill" />
            </template>
            提交答案
          </NButton>
          <div v-if="!allAnswered" class="submit-hint">
            还有 {{ stats.unanswered }} 题未完成
          </div>
        </div>
      </div>
    </NCard>
  </div>
</template>

<style scoped>
.answer-sheet {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.answer-sheet-card {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 可滚动内容容器 */
.answer-sheet-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px;
}

/* ==================== 计时器区（顶部）==================== */
.timer-section {
  margin-bottom: 16px;
}

.timer-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background-color: #000000;
  border-radius: 8px;
}

.dark .timer-display {
  background-color: #ffffff;
}

.timer-icon {
  font-size: 20px;
  color: #ffffff;
}

.dark .timer-icon {
  color: #000000;
}

.timer-text {
  font-size: 18px;
  font-weight: 600;
  color: #ffffff;
  font-family: 'Monaco', 'Consolas', monospace;
}

.dark .timer-text {
  color: #000000;
}

/* ==================== 统计区 ==================== */
.stats-section {
  padding: 16px;
  background-color: #f2f2f7;
  border-radius: 8px;
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dark .stats-section {
  background-color: #1c1c1e;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.stat-item.progress {
  padding-top: 8px;
  border-top: 1px solid #e5e5ea;
  margin-top: 4px;
}

.dark .stat-item.progress {
  border-top-color: #3a3a3c;
}

.stat-label {
  color: #8e8e93;
  font-weight: 500;
}

.dark .stat-label {
  color: #8e8e93;
}

.stat-value {
  color: #000000;
  font-weight: 600;
  font-size: 16px;
}

.dark .stat-value {
  color: #ffffff;
}

.stat-value.answered {
  color: #000000;
}

.dark .stat-value.answered {
  color: #ffffff;
}

.stat-value.unanswered {
  color: #8e8e93;
}

.dark .stat-value.unanswered {
  color: #8e8e93;
}

/* ==================== 答题卡主体 ==================== */
.answer-grid-section {
  margin-bottom: 20px;
}

.type-section {
  margin-bottom: 24px;
}

.type-section:last-child {
  margin-bottom: 0;
}

.type-header {
  font-size: 14px;
  font-weight: 600;
  color: #000000;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 2px solid #e5e5ea;
}

.dark .type-header {
  color: #ffffff;
  border-bottom-color: #3a3a3c;
}

.question-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}

.question-number {
  width: 100%;
  aspect-ratio: 1;
  min-height: 40px;
  border: 1px solid #e5e5ea;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: #ffffff;
  color: #8e8e93;
}

.dark .question-number {
  background-color: #2c2c2e;
  border-color: #3a3a3c;
}

/* 已答题目 */
.question-number.answered {
  background-color: #000000;
  color: #ffffff;
  border-color: #000000;
}

.dark .question-number.answered {
  background-color: #ffffff;
  color: #000000;
  border-color: #ffffff;
}

.question-number.answered:hover {
  background-color: #1c1c1e;
  transform: scale(1.05);
}

.dark .question-number.answered:hover {
  background-color: #e5e5ea;
  transform: scale(1.05);
}

/* 未答题目 */
.question-number.unanswered {
  background-color: #ffffff;
  color: #8e8e93;
  border-color: #e5e5ea;
}

.dark .question-number.unanswered {
  background-color: #2c2c2e;
  color: #636366;
  border-color: #3a3a3c;
}

.question-number.unanswered:hover {
  background-color: #f2f2f7;
  border-color: #8e8e93;
  transform: scale(1.05);
}

.dark .question-number.unanswered:hover {
  background-color: #3a3a3c;
  border-color: #636366;
}

/* ==================== 图例 ==================== */
.legend {
  display: flex;
  gap: 16px;
  padding-top: 16px;
  margin-top: 8px;
  border-top: 1px solid #e5e5ea;
}

.dark .legend {
  border-top-color: #3a3a3c;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.legend-box {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1px solid transparent;
}

.legend-box.answered {
  background-color: #000000;
  border-color: #000000;
}

.dark .legend-box.answered {
  background-color: #ffffff;
  border-color: #ffffff;
}

.legend-box.unanswered {
  background-color: #ffffff;
  border-color: #e5e5ea;
}

.dark .legend-box.unanswered {
  background-color: #2c2c2e;
  border-color: #3a3a3c;
}

.legend-text {
  font-size: 13px;
  color: #8e8e93;
}

.dark .legend-text {
  color: #8e8e93;
}

/* ==================== 提交按钮区（底部）==================== */
.submit-section {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #e5e5ea;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dark .submit-section {
  border-top-color: #3a3a3c;
}

.submit-button {
  width: 100%;
  height: 44px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 8px;
}

.submit-hint {
  text-align: center;
  font-size: 13px;
  color: #8e8e93;
}

/* ==================== 响应式 ==================== */
@media (max-width: 768px) {
  .question-grid {
    grid-template-columns: repeat(4, 1fr);
  }

  .question-number {
    min-height: 36px;
    font-size: 13px;
  }
}
</style>
