<script setup lang="ts">
import { NCard, NCheckbox, NCheckboxGroup, NRadio, NRadioGroup, NSpace, NTag } from 'naive-ui'
import { computed } from 'vue'

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

interface QuizPreviewProps {
  questions: Question[]
  scoreDistribution?: ScoreDistribution
}

const props = defineProps<QuizPreviewProps>()

// 获取选项标签 (A, B, C, D...)
function getOptionLabel(index: number): string {
  return String.fromCharCode(65 + index)
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
      // 多选题不显示"每小题x分"，因为每题分数可能不同
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
</script>

<template>
  <div class="quiz-preview-container">
    <NCard title="题目预览" class="mb-4">
      <template #header-extra>
        <NTag :bordered="false" type="info">
          共 {{ questions.length }} 题
        </NTag>
      </template>

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
            :key="item.globalIndex"
            class="pl-4"
          >
            <NSpace vertical :size="8">
              <!-- 题目标题 -->
              <div class="text-base">
                <span class="font-medium">{{ item.globalIndex + 1 }}.</span>
                <span class="ml-1">{{ item.question.question }}</span>
              </div>

              <!-- 单选题 -->
              <NRadioGroup
                v-if="item.question.type === 'single_choice'"
                :value="item.question.answer[0]"
                :disabled="true"
                class="ml-6"
              >
                <NSpace vertical>
                  <NRadio
                    v-for="(option, optIndex) in item.question.options"
                    :key="optIndex"
                    :value="getOptionLabel(optIndex)"
                  >
                    {{ getOptionLabel(optIndex) }}. {{ option.replace(/^[A-Z]\.\s*/, '') }}
                  </NRadio>
                </NSpace>
              </NRadioGroup>

              <!-- 多选题 -->
              <NCheckboxGroup
                v-else-if="item.question.type === 'multiple_choice'"
                :value="item.question.answer"
                :disabled="true"
                class="ml-6"
              >
                <NSpace vertical>
                  <NCheckbox
                    v-for="(option, optIndex) in item.question.options"
                    :key="optIndex"
                    :value="getOptionLabel(optIndex)"
                  >
                    {{ getOptionLabel(optIndex) }}. {{ option.replace(/^[A-Z]\.\s*/, '') }}
                  </NCheckbox>
                </NSpace>
              </NCheckboxGroup>

              <!-- 判断题 -->
              <NRadioGroup
                v-else
                :value="item.question.answer[0]"
                :disabled="true"
                class="ml-6"
              >
                <NSpace>
                  <NRadio value="正确">
                    正确
                  </NRadio>
                  <NRadio value="错误">
                    错误
                  </NRadio>
                </NSpace>
              </NRadioGroup>

              <!-- 答案和解析 -->
              <div class="mt-2 ml-6 p-3 bg-neutral-100 dark:bg-neutral-800 rounded">
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
    </NCard>
  </div>
</template>

<style scoped>
.quiz-preview-container {
  max-width: 800px;
  margin: 0 auto;
}
</style>
