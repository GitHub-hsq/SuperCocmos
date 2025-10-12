<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { NButton, NCard, NSpace, NTag } from 'naive-ui'
import { Checkboxes, Radio, SvgIcon } from '@/components/common'

interface Question {
  type: 'single_choice' | 'multiple_choice' | 'true_false'
  question: string
  options: string[]
  answer: string[]
  explanation?: string
  score?: number
}

interface ScoreDistribution {
  single_choice?: { perQuestion: number; total: number }
  multiple_choice?: { perQuestion: number; total: number }
  true_false?: { perQuestion: number; total: number }
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

// 用户答案
const userAnswers = ref<Record<number, string[]>>({})

// 计时器
const timeSpent = ref(0)
const isStarted = ref(false)
const isFinished = ref(false)
let timer: NodeJS.Timeout | null = null

// 分数
const score = ref(0)

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

// 提交答案
function submitAnswers() {
  // 检查是否全部作答
  if (!allAnswered.value) {
    // 找到第一个未作答的题目
    const firstUnansweredIndex = props.questions.findIndex((_, index) => {
      const answer = userAnswers.value[index]
      return !answer || answer.length === 0
    })

    if (firstUnansweredIndex !== -1) {
      // 滚动到该题目
      const element = document.getElementById(`question-${firstUnansweredIndex}`)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        // 添加高亮效果
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
  let correct = 0
  props.questions.forEach((question, index) => {
    const userAnswer = userAnswers.value[index] || []
    const correctAnswer = [...question.answer].sort()
    const userAnswerSorted = [...userAnswer].sort()

    if (JSON.stringify(correctAnswer) === JSON.stringify(userAnswerSorted))
      correct++
  })

  score.value = Math.round((correct / props.questions.length) * 100)
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

// 检查答案是否正确（提交后显示）
function isAnswerCorrect(questionIndex: number): boolean {
  const userAnswer = userAnswers.value[questionIndex] || []
  const correctAnswer = [...props.questions[questionIndex].answer].sort()
  const userAnswerSorted = [...userAnswer].sort()
  return JSON.stringify(correctAnswer) === JSON.stringify(userAnswerSorted)
}

// 获取题型文本

// function getQuestionTypeText(type: string): string {
//   switch (type) {
//     case 'single_choice':
//       return '单选题'
//     case 'multiple_choice':
//       return '多选题'
//     case 'true_false':
//       return '判断题'
//     default:
//       return '未知'
//   }
// }

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
    questions: Array<{ question: any; globalIndex: number }>
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
      const description = `${sectionName}、${typeTextMap[type]}：本题共 ${questionsOfType.length} 小题，每小题 ${perQuestion} 分，共 ${total} 分。`

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
  <div class="quiz-answer-container">
    <!-- 未开始 -->
    <NCard v-if="!isStarted" title="准备答题" class="text-center">
      <NSpace vertical :size="16">
        <div>
          <SvgIcon icon="ri:file-list-3-line" class="text-6xl text-blue-500" />
        </div>
        <div>
          <div class="text-lg font-medium mb-2">
            共 {{ questions.length }} 题
          </div>
          <div class="text-sm text-neutral-500">
            点击开始按钮，开始计时答题
          </div>
        </div>
        <NButton type="primary" size="large" @click="startQuiz">
          <template #icon>
            <SvgIcon icon="ri:play-circle-line" />
          </template>
          开始答题
        </NButton>
      </NSpace>
    </NCard>

    <!-- 答题中 -->
    <div v-else>
      <!-- 计时器（悬浮） -->
      <div class="fixed top-20 right-4 z-10">
        <NCard size="small" :bordered="true">
          <div class="flex items-center gap-2">
            <SvgIcon icon="ri:time-line" class="text-lg" />
            <span class="text-lg font-mono font-bold">{{ formattedTime }}</span>
          </div>
        </NCard>
      </div>

      <!-- 试卷标题 -->
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold">
          {{ currentYear }}年国家公务员考试
        </h1>
      </div>

      <!-- 按题型分组显示题目 -->
      <div v-for="(group, groupIdx) in groupedQuestions" :key="groupIdx" class="mb-8">
        <!-- 题型说明 -->
        <div class="mb-4 pl-4">
          <div class="text-base font-medium">
            {{ group.description }}
          </div>
        </div>

        <!-- 该题型的所有题目 -->
        <NSpace vertical :size="16">
          <div
            v-for="(item, itemIdx) in group.questions"
            :id="`question-${item.globalIndex}`"
            :key="item.globalIndex"
            class="pl-4"
          >
            <NSpace vertical :size="8">
              <!-- 题目标题 -->
              <div class="flex items-start justify-between">
                <div class="text-base flex-1">
                  <span class="font-medium">{{ item.globalIndex + 1 }}.</span>
                  <span class="ml-1">{{ item.question.question }}</span>
                  <NTag
                    v-if="isFinished"
                    :type="isAnswerCorrect(item.globalIndex) ? 'success' : 'error'"
                    size="small"
                    class="ml-2"
                  >
                    {{ isAnswerCorrect(item.globalIndex) ? '✓ 正确' : '✗ 错误' }}
                  </NTag>
                </div>
              </div>

              <!-- 单选题 -->
              <div
                v-if="item.question.type === 'single_choice'"
                class="ml-6"
              >
                <NSpace vertical>
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
              </div>

              <!-- 多选题 -->
              <div
                v-else-if="item.question.type === 'multiple_choice'"
                class="ml-6"
              >
                <NSpace vertical>
                  <Checkboxes
                    v-for="(option, optIndex) in item.question.options"
                    :key="optIndex"
                    :model-value="userAnswers[item.globalIndex]?.includes(getOptionLabel(optIndex)) || false"
                    :disabled="isFinished"
                    @update:model-value="(checked) => {
                      const currentAnswers = userAnswers[item.globalIndex] || []
                      const optionLabel = getOptionLabel(optIndex)
                      if (checked) {
                        if (!currentAnswers.includes(optionLabel)) {
                          userAnswers[item.globalIndex] = [...currentAnswers, optionLabel]
                        }
                      } else {
                        userAnswers[item.globalIndex] = currentAnswers.filter(a => a !== optionLabel)
                      }
                    }"
                  >
                    {{ getOptionLabel(optIndex) }}. {{ option.replace(/^[A-Z]\.\s*/, '') }}
                  </Checkboxes>
                </NSpace>
              </div>

              <!-- 判断题 -->
              <div
                v-else
                class="ml-6"
              >
                <NSpace>
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
              <div v-if="isFinished" class="mt-2 ml-6 p-3 bg-neutral-100 dark:bg-neutral-800 rounded">
                <div class="mb-2">
                  <span class="font-medium text-green-600 dark:text-green-400">正确答案: </span>
                  <span>{{ item.question.answer.join(', ') }}</span>
                </div>
                <div v-if="item.question.explanation" class="text-sm text-neutral-600 dark:text-neutral-400">
                  <span class="font-medium">解析: </span>{{ item.question.explanation }}
                </div>
              </div>
            </NSpace>

            <!-- 题目之间的分隔线 -->
            <div v-if="itemIdx < group.questions.length - 1" class="mt-4 border-b border-neutral-200 dark:border-neutral-700" />
          </div>
        </NSpace>
      </div>

      <!-- 提交按钮 -->
      <div v-if="!isFinished" class="mt-6 text-center">
        <NButton
          type="primary"
          size="large"
          @click="submitAnswers"
        >
          <template #icon>
            <SvgIcon icon="ri:send-plane-fill" />
          </template>
          提交答案
        </NButton>
        <div v-if="!allAnswered" class="mt-2 text-sm text-amber-600 dark:text-amber-400">
          还有 {{ props.questions.length - Object.values(userAnswers).filter(a => a && a.length > 0).length }} 题未完成
        </div>
      </div>

      <!-- 成绩展示 -->
      <NCard v-else class="mt-6 text-center" title="答题完成">
        <NSpace vertical :size="16">
          <div>
            <div class="text-6xl font-bold text-blue-500 mb-2">
              {{ score }}
            </div>
            <div class="text-lg text-neutral-600 dark:text-neutral-400">
              分
            </div>
          </div>
          <div class="text-sm text-neutral-500">
            用时: {{ formattedTime }}
          </div>
        </NSpace>
      </NCard>
    </div>
  </div>
</template>

<style scoped>
.quiz-answer-container {
  max-width: 800px;
  margin: 0 auto;
  padding-bottom: 2rem;
}

/* 高亮未完成题目的动画效果 */
.highlight-unanswered {
  animation: highlight-pulse 0.5s ease-in-out 3;
  padding: 12px;
  margin: -12px;
  border-radius: 8px;
  background-color: rgba(245, 158, 11, 0.1);
  border-left: 4px solid #f59e0b !important;
}

@keyframes highlight-pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4);
  }
  50% {
    box-shadow: 0 0 0 10px rgba(245, 158, 11, 0);
  }
}
</style>
