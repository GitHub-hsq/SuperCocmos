<script setup lang="ts">
/**
 * 笔记转题目 - 结果展示页面
 * 显示总分、各题型得分、详细题目结果
 */
import { NButton, NCard, NDivider, NSpace, NTag } from 'naive-ui'
import { computed } from 'vue'
import { SvgIcon } from '@/components/common'

interface Question {
  type: 'single_choice' | 'multiple_choice' | 'true_false'
  question: string
  options: string[]
  answer: string[]
  explanation?: string
  score?: number
  difficulty?: 'easy' | 'medium' | 'hard'
  knowledge_point?: string
}

interface Result {
  totalScore: number
  earnedScore: number
  accuracy: number
  statistics: {
    single_choice: { correct: number, total: number, earnedScore: number, maxScore: number }
    multiple_choice: { correct: number, total: number, earnedScore: number, maxScore: number }
    true_false: { correct: number, total: number, earnedScore: number, maxScore: number }
  }
}

interface Props {
  questions: Question[]
  userAnswers: Record<number, string[]>
  timeSpent: number
  result: Result
}

interface Emits {
  (e: 'restart'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 获取选项标签 (A, B, C, D...)
function getOptionLabel(index: number): string {
  return String.fromCharCode(65 + index)
}

// 格式化时间
const formattedTime = computed(() => {
  const minutes = Math.floor(props.timeSpent / 60)
  const seconds = props.timeSpent % 60
  return `${minutes}分${seconds}秒`
})

// 判断答案是否正确
function isCorrect(questionIndex: number): boolean {
  const userAnswer = props.userAnswers[questionIndex] || []
  const correctAnswer = [...props.questions[questionIndex].answer].sort()
  const userAnswerSorted = [...userAnswer].sort()
  return JSON.stringify(correctAnswer) === JSON.stringify(userAnswerSorted)
}

// 按题型分组题目
const groupedQuestions = computed(() => {
  const groups: Array<{
    type: 'single_choice' | 'multiple_choice' | 'true_false'
    typeName: string
    questions: Array<{ question: Question, index: number }>
  }> = []

  const types: Array<'single_choice' | 'multiple_choice' | 'true_false'> = ['single_choice', 'multiple_choice', 'true_false']
  const typeTextMap = {
    single_choice: '单选题',
    multiple_choice: '多选题',
    true_false: '判断题',
  }

  types.forEach((type) => {
    const questionsOfType = props.questions
      .map((q, idx) => ({ question: q, index: idx }))
      .filter(item => item.question.type === type)

    if (questionsOfType.length > 0) {
      groups.push({
        type,
        typeName: typeTextMap[type],
        questions: questionsOfType,
      })
    }
  })

  return groups
})

// 获取成绩等级
const gradeLevel = computed(() => {
  const accuracy = props.result.accuracy
  if (accuracy >= 90)
    return { text: '优秀', color: '#18a058' }
  if (accuracy >= 80)
    return { text: '良好', color: '#2080f0' }
  if (accuracy >= 70)
    return { text: '中等', color: '#f0a020' }
  if (accuracy >= 60)
    return { text: '及格', color: '#f08c20' }
  return { text: '不及格', color: '#d03050' }
})

// 重新开始
function handleRestart() {
  emit('restart')
}
</script>

<template>
  <div class="quiz-result-view">
    <div class="result-container">
      <!-- 总分卡片 -->
      <NCard class="score-card" :bordered="false">
        <div class="score-header">
          <div class="score-main">
            <div class="score-value">
              {{ result.earnedScore }}
            </div>
            <div class="score-total">
              / {{ result.totalScore }} 分
            </div>
          </div>
          <div class="score-info">
            <NTag :bordered="false" size="large" :color="{ color: gradeLevel.color, textColor: '#fff' }">
              {{ gradeLevel.text }}
            </NTag>
            <div class="score-details">
              <div class="detail-item">
                <SvgIcon icon="ri:time-line" class="detail-icon" />
                <span>用时：{{ formattedTime }}</span>
              </div>
              <div class="detail-item">
                <SvgIcon icon="ri:percent-line" class="detail-icon" />
                <span>正确率：{{ result.accuracy }}%</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 各题型统计 -->
        <NDivider />
        <div class="statistics-section">
          <h3 class="section-title">
            各题型得分统计
          </h3>
          <NSpace :size="12">
            <div
              v-if="result.statistics.single_choice.total > 0"
              class="stat-item"
            >
              <div class="stat-type">
                单选题
              </div>
              <div class="stat-score">
                {{ result.statistics.single_choice.earnedScore }} / {{ result.statistics.single_choice.maxScore }}
              </div>
              <div class="stat-count">
                {{ result.statistics.single_choice.correct }} / {{ result.statistics.single_choice.total }} 题
              </div>
            </div>

            <div
              v-if="result.statistics.multiple_choice.total > 0"
              class="stat-item"
            >
              <div class="stat-type">
                多选题
              </div>
              <div class="stat-score">
                {{ result.statistics.multiple_choice.earnedScore }} / {{ result.statistics.multiple_choice.maxScore }}
              </div>
              <div class="stat-count">
                {{ result.statistics.multiple_choice.correct }} / {{ result.statistics.multiple_choice.total }} 题
              </div>
            </div>

            <div
              v-if="result.statistics.true_false.total > 0"
              class="stat-item"
            >
              <div class="stat-type">
                判断题
              </div>
              <div class="stat-score">
                {{ result.statistics.true_false.earnedScore }} / {{ result.statistics.true_false.maxScore }}
              </div>
              <div class="stat-count">
                {{ result.statistics.true_false.correct }} / {{ result.statistics.true_false.total }} 题
              </div>
            </div>
          </NSpace>
        </div>

        <!-- 重新开始按钮 -->
        <NDivider />
        <NButton type="primary" block size="large" @click="handleRestart">
          <template #icon>
            <SvgIcon icon="ri:restart-line" />
          </template>
          重新开始
        </NButton>
      </NCard>

      <!-- 详细题目结果 -->
      <div class="questions-section">
        <h2 class="questions-title">
          详细结果
        </h2>

        <div
          v-for="group in groupedQuestions"
          :key="group.type"
          class="question-group"
        >
          <h3 class="group-title">
            {{ group.typeName }}
          </h3>

          <NCard
            v-for="item in group.questions"
            :key="item.index"
            class="question-card"
            :bordered="false"
          >
            <!-- 题目状态 -->
            <div class="question-status">
              <NTag
                v-if="isCorrect(item.index)"
                :bordered="false"
                type="success"
                size="small"
              >
                <template #icon>
                  <SvgIcon icon="ri:checkbox-circle-fill" />
                </template>
                正确 +{{ item.question.score }}分
              </NTag>
              <NTag
                v-else
                :bordered="false"
                type="error"
                size="small"
              >
                <template #icon>
                  <SvgIcon icon="ri:close-circle-fill" />
                </template>
                错误 +0分
              </NTag>
            </div>

            <!-- 题目内容 -->
            <div class="question-content">
              <div class="question-text">
                {{ item.index + 1 }}. {{ item.question.question }}
              </div>

              <!-- 选项 -->
              <div class="question-options">
                <div
                  v-for="(option, optIndex) in item.question.options"
                  :key="optIndex"
                  class="option-item"
                  :class="{
                    'option-correct': item.question.answer.includes(getOptionLabel(optIndex)),
                    'option-wrong': userAnswers[item.index]?.includes(getOptionLabel(optIndex)) && !item.question.answer.includes(getOptionLabel(optIndex)),
                    'option-selected': userAnswers[item.index]?.includes(getOptionLabel(optIndex)),
                  }"
                >
                  <span class="option-label">{{ getOptionLabel(optIndex) }}.</span>
                  <span class="option-text">{{ option }}</span>
                </div>
              </div>

              <!-- 答案信息 -->
              <div class="answer-info">
                <div class="answer-row">
                  <span class="answer-label">你的答案：</span>
                  <span class="answer-value user-answer">
                    {{ userAnswers[item.index]?.join(', ') || '未作答' }}
                  </span>
                </div>
                <div class="answer-row">
                  <span class="answer-label">正确答案：</span>
                  <span class="answer-value correct-answer">
                    {{ item.question.answer.join(', ') }}
                  </span>
                </div>
              </div>

              <!-- 解析 -->
              <div v-if="item.question.explanation" class="explanation">
                <div class="explanation-label">
                  <SvgIcon icon="ri:lightbulb-line" class="explanation-icon" />
                  <span>解析：</span>
                </div>
                <div class="explanation-text">
                  {{ item.question.explanation }}
                </div>
              </div>
            </div>
          </NCard>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.quiz-result-view {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  background-color: #f5f5f5;
  padding: 20px;
}

.dark .quiz-result-view {
  background-color: #1a1a1a;
}

.result-container {
  max-width: 1200px;
  margin: 0 auto;
}

/* 总分卡片 */
.score-card {
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.dark .score-card {
  background-color: #2a2a2a;
}

.score-header {
  display: flex;
  align-items: center;
  gap: 32px;
}

.score-main {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.score-value {
  font-size: 64px;
  font-weight: bold;
  color: #18a058;
  line-height: 1;
}

.score-total {
  font-size: 24px;
  color: #999;
}

.score-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.score-details {
  display: flex;
  gap: 24px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #666;
}

.dark .detail-item {
  color: #aaa;
}

.detail-icon {
  font-size: 16px;
}

/* 统计部分 */
.statistics-section {
  margin: 16px 0;
}

.section-title {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 16px;
  color: #333;
}

.dark .section-title {
  color: #ddd;
}

.stat-item {
  padding: 16px;
  background-color: #f7f7f7;
  border-radius: 8px;
  min-width: 150px;
}

.dark .stat-item {
  background-color: #333;
}

.stat-type {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.dark .stat-type {
  color: #aaa;
}

.stat-score {
  font-size: 20px;
  font-weight: bold;
  color: #333;
  margin-bottom: 4px;
}

.dark .stat-score {
  color: #ddd;
}

.stat-count {
  font-size: 12px;
  color: #999;
}

/* 题目详细结果 */
.questions-section {
  margin-top: 24px;
}

.questions-title {
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 16px;
  color: #333;
}

.dark .questions-title {
  color: #ddd;
}

.question-group {
  margin-bottom: 32px;
}

.group-title {
  font-size: 18px;
  font-weight: 500;
  margin-bottom: 16px;
  color: #555;
}

.dark .group-title {
  color: #bbb;
}

.question-card {
  margin-bottom: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.dark .question-card {
  background-color: #2a2a2a;
}

.question-status {
  margin-bottom: 12px;
}

.question-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.question-text {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  line-height: 1.6;
}

.dark .question-text {
  color: #ddd;
}

.question-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.option-item {
  padding: 12px;
  border-radius: 6px;
  background-color: #f7f7f7;
  display: flex;
  gap: 8px;
}

.dark .option-item {
  background-color: #333;
}

.option-item.option-correct {
  background-color: #e8f5e9;
  border: 1px solid #4caf50;
}

.dark .option-item.option-correct {
  background-color: #1b5e20;
  border-color: #4caf50;
}

.option-item.option-wrong {
  background-color: #ffebee;
  border: 1px solid #f44336;
}

.dark .option-item.option-wrong {
  background-color: #5c1a1a;
  border-color: #f44336;
}

.option-label {
  font-weight: 500;
  color: #666;
}

.dark .option-label {
  color: #aaa;
}

.option-text {
  color: #333;
}

.dark .option-text {
  color: #ddd;
}

.answer-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background-color: #f0f7ff;
  border-radius: 6px;
}

.dark .answer-info {
  background-color: #1e3a5f;
}

.answer-row {
  display: flex;
  gap: 8px;
  font-size: 14px;
}

.answer-label {
  color: #666;
  min-width: 80px;
}

.dark .answer-label {
  color: #aaa;
}

.answer-value {
  font-weight: 500;
}

.user-answer {
  color: #2080f0;
}

.correct-answer {
  color: #18a058;
}

.explanation {
  padding: 12px;
  background-color: #fffbeb;
  border-left: 3px solid #f0a020;
  border-radius: 4px;
}

.dark .explanation {
  background-color: #3a2e1a;
}

.explanation-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
  color: #f0a020;
  margin-bottom: 8px;
}

.explanation-icon {
  font-size: 16px;
}

.explanation-text {
  color: #666;
  line-height: 1.6;
  font-size: 14px;
}

.dark .explanation-text {
  color: #aaa;
}
</style>
