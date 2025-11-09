<script setup lang="ts">
/**
 * 答题页面
 * 左侧：答题区域（可滚动）
 * 右侧：答题卡
 */
import { NButton, NCard, NScrollbar, NSpace, useMessage } from 'naive-ui'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Checkboxes, Radio, SvgIcon } from '@/components/common'
import AnswerSheet from './AnswerSheet.vue'

interface Question {
  type: 'single_choice' | 'multiple_choice' | 'true_false'
  question: string
  options: string[]
  answer: string[]
  explanation?: string
  score?: number
}

interface ScoreDistribution {
  single_choice?: { perQuestion: number, total: number }
  multiple_choice?: { perQuestion: number, total: number }
  true_false?: { perQuestion: number, total: number }
}

interface QuizAnswerProps {
  questions: Question[]
  scoreDistribution?: ScoreDistribution
}

interface QuizAnswerEmits {
  (e: 'submit', answers: Record<number, string[]>, timeSpent: number): void
}

const props = defineProps<QuizAnswerProps>()
const emit = defineEmits<QuizAnswerEmits>()

const ms = useMessage()

// 用户答案
const userAnswers = ref<Record<number, string[]>>({})

// 计时器
const timeSpent = ref(0)
const isStarted = ref(false)
const isFinished = ref(false)
let timer: NodeJS.Timeout | null = null

// 分数
const score = ref(0)

// 滚动容器引用
const scrollContainerRef = ref<InstanceType<typeof NScrollbar> | null>(null)

// 检查是否全部作答
const allAnswered = computed(() => {
  return props.questions.every((_, index) => {
    const answer = userAnswers.value[index]
    return answer && answer.length > 0
  })
})

// 开始答题
function startQuiz() {
  isStarted.value = true
  timer = setInterval(() => {
    timeSpent.value++
  }, 1000)
}

// 跳转到指定题目
function jumpToQuestion(questionIndex: number) {
  const element = document.getElementById(`question-${questionIndex}`)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

// 提交答案
function submitAnswers() {
  // 检查是否全部作答
  if (!allAnswered.value) {
    const firstUnansweredIndex = props.questions.findIndex((_, index) => {
      const answer = userAnswers.value[index]
      return !answer || answer.length === 0
    })

    if (firstUnansweredIndex !== -1) {
      ms.warning(`还有 ${props.questions.length - Object.values(userAnswers).filter(a => a && a.length > 0).length} 题未完成`)
      jumpToQuestion(firstUnansweredIndex)

      // 添加高亮效果
      const element = document.getElementById(`question-${firstUnansweredIndex}`)
      if (element) {
        element.classList.add('highlight-unanswered')
        setTimeout(() => {
          element.classList.remove('highlight-unanswered')
        }, 2000)
      }
    }
    return
  }

  if (timer) {
    clearInterval(timer)
    timer = null
  }

  // 计算分数
  let earnedScore = 0
  props.questions.forEach((question, index) => {
    const userAnswer = userAnswers.value[index] || []
    const correctAnswer = [...question.answer].sort()
    const userAnswerSorted = [...userAnswer].sort()
    const isCorrect = JSON.stringify(correctAnswer) === JSON.stringify(userAnswerSorted)
    const questionScore = question.score || 0

    if (isCorrect) {
      earnedScore += questionScore
    }
  })

  score.value = earnedScore
  isFinished.value = true

  emit('submit', userAnswers.value, timeSpent.value)
}

// 格式化时间
const formattedTime = computed(() => {
  const minutes = Math.floor(timeSpent.value / 60)
  const seconds = timeSpent.value % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})

// 获取选项标签 (A, B, C, D...)
function getOptionLabel(index: number): string {
  return String.fromCharCode(65 + index)
}

// 处理多选题选择变化
function handleMultipleChoiceChange(questionIndex: number, optionIndex: number, checked: boolean) {
  const currentAnswers = userAnswers.value[questionIndex] || []
  const optionLabel = getOptionLabel(optionIndex)

  if (checked) {
    if (!currentAnswers.includes(optionLabel)) {
      userAnswers.value[questionIndex] = [...currentAnswers, optionLabel]
    }
  }
  else {
    userAnswers.value[questionIndex] = currentAnswers.filter((a: string) => a !== optionLabel)
  }
}

// 检查答案是否正确（提交后显示）
function isAnswerCorrect(questionIndex: number): boolean {
  const userAnswer = userAnswers.value[questionIndex] || []
  const correctAnswer = [...props.questions[questionIndex].answer].sort()
  const userAnswerSorted = [...userAnswer].sort()
  return JSON.stringify(correctAnswer) === JSON.stringify(userAnswerSorted)
}

// 统计各题型数量和分数
const questionStats = computed(() => {
  const stats = {
    single_choice: { count: 0, total: 0 },
    multiple_choice: { count: 0, total: 0 },
    true_false: { count: 0, total: 0 },
  }

  props.questions.forEach((q) => {
    if (q.type === 'single_choice') {
      stats.single_choice.count++
      stats.single_choice.total += q.score || 0
    }
    else if (q.type === 'multiple_choice') {
      stats.multiple_choice.count++
      stats.multiple_choice.total += q.score || 0
    }
    else if (q.type === 'true_false') {
      stats.true_false.count++
      stats.true_false.total += q.score || 0
    }
  })

  return stats
})

// 按题型分组的题目
const groupedQuestions = computed(() => {
  const groups: Array<{
    type: 'single_choice' | 'multiple_choice' | 'true_false'
    typeName: string
    description: string
    questions: Array<{ question: any, globalIndex: number }>
  }> = []

  const chineseNumbers = ['一', '二', '三', '四', '五']
  let sectionNumber = 0

  const types: Array<'single_choice' | 'multiple_choice' | 'true_false'> = ['single_choice', 'multiple_choice', 'true_false']

  types.forEach((type) => {
    const questionsOfType = props.questions
      .map((q, idx) => ({ question: q, globalIndex: idx }))
      .filter(item => item.question.type === type)

    if (questionsOfType.length > 0) {
      const stat = questionStats.value[type]
      const dist = props.scoreDistribution?.[type]
      const perQuestion = dist?.perQuestion || (stat.total / stat.count)
      const total = dist?.total || stat.total

      const typeTextMap = {
        single_choice: '单选题',
        multiple_choice: '多选题',
        true_false: '判断题',
      }

      const sectionName = chineseNumbers[sectionNumber]
      const description = type === 'multiple_choice'
        ? `${sectionName}、${typeTextMap[type]}：本题共 ${questionsOfType.length} 小题，共 ${total} 分。`
        : `${sectionName}、${typeTextMap[type]}：本题共 ${questionsOfType.length} 小题，每小题 ${perQuestion} 分，共 ${total} 分。`

      groups.push({
        type,
        typeName: typeTextMap[type],
        description,
        questions: questionsOfType,
      })

      sectionNumber++
    }
  })

  return groups
})

// 获取当前年份
const currentYear = new Date().getFullYear()

onMounted(() => {
  // 初始化答案
  props.questions.forEach((_, index) => {
    userAnswers.value[index] = []
  })
})

onUnmounted(() => {
  if (timer)
    clearInterval(timer)
})
</script>

<template>
  <div class="quiz-answer-wrapper">
    <!-- 未开始 -->
    <div v-if="!isStarted" class="start-container">
      <NCard title="准备答题" class="start-card">
        <NSpace vertical :size="20" align="center">
          <div class="start-icon">
            <SvgIcon icon="ri:file-list-3-line" class="icon-large" />
          </div>
          <div class="start-info">
            <div class="question-count">
              共 {{ questions.length }} 题
            </div>
            <div class="start-hint">
              点击开始按钮，开始计时答题
            </div>
          </div>
          <NButton size="large" class="start-button" @click="startQuiz">
            <template #icon>
              <SvgIcon icon="ri:play-circle-line" />
            </template>
            开始答题
          </NButton>
        </NSpace>
      </NCard>
    </div>

    <!-- 答题中/已完成 - 左右布局 -->
    <div v-else class="quiz-layout">
      <!-- 左侧：答题区域 -->
      <div class="quiz-main">
        <NScrollbar ref="scrollContainerRef" class="quiz-scroll">
          <div class="quiz-content">
            <!-- 试卷标题 -->
            <div class="paper-header">
              <h1 class="paper-title">
                {{ currentYear }}年国家公务员考试
              </h1>
            </div>

            <!-- 按题型分组显示题目 -->
            <div v-for="(group, groupIdx) in groupedQuestions" :key="groupIdx" class="question-group">
              <!-- 题型说明 -->
              <div class="group-header">
                {{ group.description }}
              </div>

              <!-- 该题型的所有题目 -->
              <div class="question-list">
                <div
                  v-for="(item, itemIdx) in group.questions"
                  :id="`question-${item.globalIndex}`"
                  :key="item.globalIndex"
                  class="question-item"
                >
                  <!-- 题目标题 -->
                  <div class="question-header">
                    <span class="question-number">{{ item.globalIndex + 1 }}.</span>
                    <span class="question-text">{{ item.question.question }}</span>
                    <span
                      v-if="isFinished"
                      class="question-result"
                      :class="isAnswerCorrect(item.globalIndex) ? 'correct' : 'incorrect'"
                    >
                      {{ isAnswerCorrect(item.globalIndex) ? '✓ 正确' : '✗ 错误' }}
                    </span>
                  </div>

                  <!-- 选项 -->
                  <div class="options-container">
                    <!-- 单选题 -->
                    <NSpace v-if="item.question.type === 'single_choice'" vertical :size="12">
                      <Radio
                        v-for="(option, optIndex) in item.question.options"
                        :key="optIndex"
                        :model-value="userAnswers[item.globalIndex]?.[0] === getOptionLabel(optIndex)"
                        :disabled="isFinished"
                        :value="getOptionLabel(optIndex)"
                        @change="(value) => {
                          userAnswers[item.globalIndex] = [value]
                        }"
                      >
                        {{ getOptionLabel(optIndex) }}. {{ option.replace(/^[A-Z]\.\s*/, '') }}
                      </Radio>
                    </NSpace>

                    <!-- 多选题 -->
                    <NSpace v-else-if="item.question.type === 'multiple_choice'" vertical :size="12">
                      <Checkboxes
                        v-for="(option, optIndex) in item.question.options"
                        :key="optIndex"
                        :model-value="userAnswers[item.globalIndex]?.includes(getOptionLabel(optIndex)) || false"
                        :disabled="isFinished"
                        @update:model-value="(checked: boolean) => handleMultipleChoiceChange(item.globalIndex, optIndex, checked)"
                      >
                        {{ getOptionLabel(optIndex) }}. {{ option.replace(/^[A-Z]\.\s*/, '') }}
                      </Checkboxes>
                    </NSpace>

                    <!-- 判断题 -->
                    <NSpace v-else :size="16">
                      <Radio
                        :model-value="userAnswers[item.globalIndex]?.[0] === '正确'"
                        :disabled="isFinished"
                        value="正确"
                        @change="(value) => {
                          userAnswers[item.globalIndex] = [value]
                        }"
                      >
                        正确
                      </Radio>
                      <Radio
                        :model-value="userAnswers[item.globalIndex]?.[0] === '错误'"
                        :disabled="isFinished"
                        value="错误"
                        @change="(value) => {
                          userAnswers[item.globalIndex] = [value]
                        }"
                      >
                        错误
                      </Radio>
                    </NSpace>
                  </div>

                  <!-- 答案和解析（提交后显示） -->
                  <div v-if="isFinished" class="answer-explanation">
                    <div class="correct-answer">
                      <span class="label">正确答案：</span>
                      <span class="value">{{ item.question.answer.join(', ') }}</span>
                    </div>
                    <div v-if="item.question.explanation" class="explanation">
                      <span class="label">解析：</span>
                      <span class="value">{{ item.question.explanation }}</span>
                    </div>
                  </div>

                  <!-- 题目分隔线 -->
                  <div v-if="itemIdx < group.questions.length - 1" class="question-divider" />
                </div>
              </div>
            </div>

            <!-- 成绩展示 -->
            <NCard v-if="isFinished" class="result-card" title="答题完成">
              <NSpace vertical :size="16" align="center">
                <div class="score-display">
                  <div class="score-value">
                    {{ score }}
                  </div>
                  <div class="score-label">
                    分
                  </div>
                </div>
                <div class="time-spent">
                  用时：{{ formattedTime }}
                </div>
              </NSpace>
            </NCard>
          </div>
        </NScrollbar>
      </div>

      <!-- 右侧：答题卡 -->
      <div class="answer-sheet-sidebar">
        <AnswerSheet
          :questions="questions"
          :answers="userAnswers"
          :time-spent="timeSpent"
          :is-finished="isFinished"
          @jump-to="jumpToQuestion"
          @submit="submitAnswers"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ==================== iOS 风格配色 ==================== */
.quiz-answer-wrapper {
  width: 100%;
  height: 100%;
  background-color: #f2f2f7;
}

.dark .quiz-answer-wrapper {
  background-color: #000000;
}

/* ==================== 开始页面 ==================== */
.start-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.start-card {
  max-width: 500px;
  background-color: #ffffff;
  border: none;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
}

.dark .start-card {
  background-color: #1c1c1e;
}

.start-icon {
  color: #8e8e93;
}

.icon-large {
  font-size: 64px;
}

.start-info {
  text-align: center;
}

.question-count {
  font-size: 18px;
  font-weight: 600;
  color: #000000;
  margin-bottom: 8px;
}

.dark .question-count {
  color: #ffffff;
}

.start-hint {
  font-size: 14px;
  color: #8e8e93;
}

.start-button {
  background-color: #000000;
  color: #ffffff;
  border: none;
  padding: 12px 32px;
}

.dark .start-button {
  background-color: #ffffff;
  color: #000000;
}

.start-button:hover {
  background-color: #1c1c1e;
}

.dark .start-button:hover {
  background-color: #e5e5ea;
}

/* ==================== 答题布局 ==================== */
.quiz-layout {
  display: flex;
  width: 100%;
  height: 100%;
  gap: 12px;
  padding: 8px;
}

.quiz-main {
  flex: 3;
  height: 100%;
  background-color: #ffffff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
}

.dark .quiz-main {
  background-color: #1c1c1e;
}

.quiz-scroll {
  height: 100%;
}

.quiz-content {
  padding: 32px;
  max-width: 900px;
  margin: 0 auto;
}

.answer-sheet-sidebar {
  flex: 1;
  max-width: 320px;
  height: 100%;
}

/* ==================== 计时器 ==================== */
.timer-card {
  position: sticky;
  top: 0;
  z-index: 10;
  background-color: #ffffff;
  margin-bottom: 24px;
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid #e5e5ea;
}

.dark .timer-card {
  background-color: #2c2c2e;
  border-color: #3a3a3c;
}

.timer-content {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
}

.timer-icon {
  font-size: 18px;
  color: #8e8e93;
}

.timer-text {
  font-size: 20px;
  font-weight: 600;
  font-family: 'SF Mono', 'Monaco', 'Courier New', monospace;
  color: #000000;
}

.dark .timer-text {
  color: #ffffff;
}

/* ==================== 试卷标题 ==================== */
.paper-header {
  text-align: center;
  margin-bottom: 32px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e5e5ea;
}

.dark .paper-header {
  border-bottom-color: #3a3a3c;
}

.paper-title {
  font-size: 24px;
  font-weight: 700;
  color: #000000;
  margin: 0;
}

.dark .paper-title {
  color: #ffffff;
}

/* ==================== 题目组 ==================== */
.question-group {
  margin-bottom: 32px;
}

.group-header {
  font-size: 15px;
  font-weight: 600;
  color: #000000;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 2px solid #e5e5ea;
}

.dark .group-header {
  color: #ffffff;
  border-bottom-color: #3a3a3c;
}

.question-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* ==================== 题目项 ==================== */
.question-item {
  padding: 16px;
  background-color: #f2f2f7;
  border-radius: 8px;
}

.dark .question-item {
  background-color: #2c2c2e;
}

.question-header {
  display: flex;
  align-items: flex-start;
  margin-bottom: 12px;
  gap: 8px;
}

.question-number {
  font-weight: 600;
  color: #000000;
  flex-shrink: 0;
}

.dark .question-number {
  color: #ffffff;
}

.question-text {
  flex: 1;
  color: #000000;
  line-height: 1.6;
}

.dark .question-text {
  color: #ffffff;
}

.question-result {
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
}

.question-result.correct {
  background-color: #e5e5ea;
  color: #000000;
}

.dark .question-result.correct {
  background-color: #3a3a3c;
  color: #ffffff;
}

.question-result.incorrect {
  background-color: #e5e5ea;
  color: #8e8e93;
}

.dark .question-result.incorrect {
  background-color: #3a3a3c;
  color: #636366;
}

.options-container {
  margin-left: 24px;
}

.question-divider {
  margin-top: 16px;
  height: 1px;
  background-color: #e5e5ea;
}

.dark .question-divider {
  background-color: #3a3a3c;
}

/* ==================== 答案解析 ==================== */
.answer-explanation {
  margin-top: 16px;
  margin-left: 24px;
  padding: 12px;
  background-color: #ffffff;
  border-radius: 6px;
  border-left: 3px solid #e5e5ea;
}

.dark .answer-explanation {
  background-color: #1c1c1e;
  border-left-color: #3a3a3c;
}

.correct-answer,
.explanation {
  margin-bottom: 8px;
  font-size: 14px;
  line-height: 1.6;
}

.correct-answer:last-child,
.explanation:last-child {
  margin-bottom: 0;
}

.correct-answer .label,
.explanation .label {
  font-weight: 600;
  color: #000000;
}

.dark .correct-answer .label,
.dark .explanation .label {
  color: #ffffff;
}

.correct-answer .value,
.explanation .value {
  color: #3a3a3c;
}

.dark .correct-answer .value,
.dark .explanation .value {
  color: #aeaeb2;
}

/* ==================== 提交按钮 ==================== */
.submit-container {
  margin-top: 32px;
  text-align: center;
}

.submit-button {
  background-color: #000000;
  color: #ffffff;
  border: none;
  padding: 12px 48px;
}

.dark .submit-button {
  background-color: #ffffff;
  color: #000000;
}

.submit-button:hover {
  background-color: #1c1c1e;
}

.dark .submit-button:hover {
  background-color: #e5e5ea;
}

.submit-hint {
  margin-top: 12px;
  font-size: 13px;
  color: #8e8e93;
}

/* ==================== 成绩卡片 ==================== */
.result-card {
  margin-top: 32px;
  background-color: #ffffff;
  border: none;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
}

.dark .result-card {
  background-color: #2c2c2e;
}

.score-display {
  text-align: center;
}

.score-value {
  font-size: 64px;
  font-weight: 700;
  color: #000000;
  line-height: 1;
}

.dark .score-value {
  color: #ffffff;
}

.score-label {
  font-size: 18px;
  color: #8e8e93;
  margin-top: 8px;
}

.time-spent {
  font-size: 14px;
  color: #8e8e93;
}

/* ==================== 高亮未完成题目 ==================== */
.highlight-unanswered {
  animation: highlight-pulse 0.5s ease-in-out 3;
  border: 2px solid #8e8e93 !important;
}

@keyframes highlight-pulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.01);
  }
}

/* ==================== 响应式 ==================== */
@media (max-width: 1200px) {
  .quiz-layout {
    flex-direction: column;
  }

  .answer-sheet-sidebar {
    max-width: 100%;
    height: 400px;
  }
}
</style>
