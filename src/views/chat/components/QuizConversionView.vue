<script setup lang="ts">
/**
 * 笔记转题目 - 主视图
 *
 * 工作流阶段：
 * 1. upload: 文件上传
 * 2. type-select: 题型选择
 * 3. workflow: 工作流执行（左侧预览 + 右侧步骤）
 * 4. answer: 做题页面
 * 5. result: 结果展示
 */

import { useAuth0 } from '@auth0/auth0-vue'
import { onMounted, ref } from 'vue'
import QuizAnswer from './QuizAnswer.vue'
import QuizResultView from './QuizResultView.vue'
import QuizTypeSel from './QuizTypeSelector.vue'
import QuizUploadStage from './QuizUploadStage.vue'
import QuizWorkflowView from './QuizWorkflowView.vue'

const auth0 = useAuth0()

// 当前阶段
type Stage = 'upload' | 'type-select' | 'workflow' | 'answer' | 'result'
const currentStage = ref<Stage>('upload')

// 上传请求头（包含 token）
const uploadHeaders = ref<Record<string, string>>({})
const headersReady = ref(false)

// 初始化上传请求头
async function updateUploadHeaders() {
  try {
    if (auth0.isAuthenticated.value) {
      const token = await auth0.getAccessTokenSilently({
        authorizationParams: {
          audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        },
      })
      if (token) {
        uploadHeaders.value = {
          Authorization: `Bearer ${token}`,
        }
      }
    }
  }
  catch (error) {
    console.error('❌ [Upload] 获取 token 失败:', error)
  }
  finally {
    headersReady.value = true
  }
}

onMounted(async () => {
  await updateUploadHeaders()
})

// 上传的文件路径
const uploadedFilePath = ref('')

// 选择的题型
const selectedQuestionTypes = ref({
  single_choice: 5,
  multiple_choice: 3,
  true_false: 2,
})

// 生成的题目
const generatedQuestions = ref<any[]>([])

// 分数分配信息
const scoreDistribution = ref<any>(null)

// 用户答案
const userAnswers = ref<Record<number, string[]>>({})

// 答题时间
const timeSpent = ref(0)

// 答题结果
const quizResult = ref<any>(null)

// 工作流节点（5个固定节点）
const workflowNodes = ref<Array<{
  type: string
  label: string
  status: 'pending' | 'running' | 'completed' | 'error'
  message: string
}>>([
  { type: 'classify', label: '内容分类', status: 'pending', message: '' },
  { type: 'question_types', label: '试卷题目分配', status: 'pending', message: '' },
  { type: 'generate', label: '试卷生成', status: 'pending', message: '' },
  { type: 'review', label: '专家审核', status: 'pending', message: '' },
  { type: 'preview', label: '预览', status: 'pending', message: '' },
])

// 🔥 全局日志数组（在组件切换时保持日志连续性）
const globalLogs = ref<Array<{ time: string, message: string, type: 'info' | 'success' | 'error' }>>([])

// 添加日志到全局日志
function addGlobalLog(message: string, type: 'info' | 'success' | 'error' = 'info') {
  const now = new Date()
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
  globalLogs.value.push({ time, message, type })
}

// 添加节点分隔线
function addNodeSeparator(nodeLabel: string, icon: string = '📝') {
  const leftPad = '─'.repeat(10)
  const rightPad = '─'.repeat(10)
  addGlobalLog(`${leftPad} ${icon} ${nodeLabel} ${rightPad}`, 'info')
}

// ===== 事件处理 =====

// 1. 分类完成（上传和分类都完成了）
function handleClassifyComplete(filePath: string, classification: string, _subject: string) {
  uploadedFilePath.value = filePath

  // 更新工作流节点状态
  workflowNodes.value[0].status = 'completed'
  workflowNodes.value[0].message = `分类为：${classification === 'note' ? '笔记' : '题目'}`

  // 🔥 不在这里添加日志，因为 QuizUploadStage 已经通过 onAddLog 添加到全局日志了

  // 如果分类为笔记，进入题型选择
  if (classification === 'note') {
    workflowNodes.value[1].status = 'running'
    workflowNodes.value[1].message = '请配置题型和数量'
    currentStage.value = 'type-select'
  }
  else {
    // 如果分类为题目，自动进入下一步
    workflowNodes.value[1].status = 'completed'
    workflowNodes.value[1].message = '识别到试卷题目'
    // TODO: 自动进入题目生成流程
    currentStage.value = 'workflow'
  }
}

// 2. 题型选择完成
function handleTypeSelectConfirm(types: any) {
  selectedQuestionTypes.value = types
  // 🔥 更新 question_types 节点为完成状态
  workflowNodes.value[1].status = 'completed'
  workflowNodes.value[1].message = '题型配置完成'

  // 🔥 将题型配置添加到全局日志（带分隔线）
  addGlobalLog('', 'info') // 空行
  addNodeSeparator('试卷题目分配', '⚙️')
  addGlobalLog('✅ 试卷题目分配完成', 'success')
  addGlobalLog(`  📝 单选题: ${types.single_choice} 题`, 'info')
  addGlobalLog(`  📝 多选题: ${types.multiple_choice} 题`, 'info')
  addGlobalLog(`  📝 判断题: ${types.true_false} 题`, 'info')

  currentStage.value = 'workflow'
}

// 3. 题型选择返回
function handleTypeSelectBack() {
  currentStage.value = 'upload'
  uploadedFilePath.value = ''

  // 🔥 重置工作流节点状态（返回上传阶段）
  workflowNodes.value.forEach((node) => {
    node.status = 'pending'
    node.message = ''
  })
}

// 4. 工作流完成（题目生成完成，用户接受预览）
function handleWorkflowAccept(questions: any[], distribution: any) {
  generatedQuestions.value = questions
  scoreDistribution.value = distribution
  currentStage.value = 'answer'
}

// 5. 工作流取消（返回题型选择）
function handleWorkflowCancel() {
  // 🔥 重置生成相关的节点状态（保留分类和题型分配的completed状态）
  workflowNodes.value[2].status = 'pending' // generate
  workflowNodes.value[2].message = ''
  workflowNodes.value[3].status = 'pending' // review
  workflowNodes.value[3].message = ''
  workflowNodes.value[4].status = 'pending' // preview
  workflowNodes.value[4].message = ''

  // 将 question_types 节点设置回 running 状态
  workflowNodes.value[1].status = 'running'
  workflowNodes.value[1].message = '请配置题型和数量'

  currentStage.value = 'type-select'
}

// 6. 答题提交
function handleQuizSubmit(answers: Record<number, string[]>, time: number) {
  userAnswers.value = answers
  timeSpent.value = time

  // 计算结果
  calculateResult()

  currentStage.value = 'result'
}

// 7. 重新开始
function handleRestart() {
  currentStage.value = 'upload'
  uploadedFilePath.value = ''
  generatedQuestions.value = []
  scoreDistribution.value = null
  userAnswers.value = {}
  timeSpent.value = 0
  quizResult.value = null

  // 🔥 重置工作流节点状态
  workflowNodes.value.forEach((node) => {
    node.status = 'pending'
    node.message = ''
  })

  // 🔥 清空全局日志
  globalLogs.value = []
}

// ===== 计算结果 =====
function calculateResult() {
  let totalScore = 0
  let earnedScore = 0
  const statistics: any = {
    single_choice: { correct: 0, total: 0, earnedScore: 0, maxScore: 0 },
    multiple_choice: { correct: 0, total: 0, earnedScore: 0, maxScore: 0 },
    true_false: { correct: 0, total: 0, earnedScore: 0, maxScore: 0 },
  }

  generatedQuestions.value.forEach((question, index) => {
    const userAnswer = userAnswers.value[index] || []
    const correctAnswer = [...question.answer].sort()
    const userAnswerSorted = [...userAnswer].sort()
    const isCorrect = JSON.stringify(correctAnswer) === JSON.stringify(userAnswerSorted)
    const questionScore = question.score || 0

    totalScore += questionScore

    if (isCorrect) {
      earnedScore += questionScore
    }

    // 统计
    const type = question.type
    if (type in statistics) {
      statistics[type].total++
      statistics[type].maxScore += questionScore
      if (isCorrect) {
        statistics[type].correct++
        statistics[type].earnedScore += questionScore
      }
    }
  })

  quizResult.value = {
    totalScore,
    earnedScore,
    accuracy: totalScore > 0 ? Math.round((earnedScore / totalScore) * 100) : 0,
    statistics,
  }
}
</script>

<template>
  <div class="quiz-conversion-container">
    <!-- 阶段1：文件上传 + 分类 -->
    <QuizUploadStage
      v-if="currentStage === 'upload' && headersReady"
      :upload-headers="uploadHeaders"
      :nodes="workflowNodes"
      :on-add-log="addGlobalLog"
      @classify-complete="handleClassifyComplete"
    />

    <!-- 阶段2：题型选择 -->
    <QuizTypeSel
      v-else-if="currentStage === 'type-select'"
      :file-path="uploadedFilePath"
      :nodes="workflowNodes"
      @confirm="handleTypeSelectConfirm"
      @back="handleTypeSelectBack"
    />

    <!-- 阶段3：工作流执行（左侧预览 + 右侧步骤） -->
    <QuizWorkflowView
      v-else-if="currentStage === 'workflow'"
      :file-path="uploadedFilePath"
      :question-types="selectedQuestionTypes"
      :nodes="workflowNodes"
      :initial-logs="globalLogs"
      @accept="handleWorkflowAccept"
      @cancel="handleWorkflowCancel"
    />

    <!-- 阶段4：做题页面 -->
    <QuizAnswer
      v-else-if="currentStage === 'answer'"
      :questions="generatedQuestions"
      :score-distribution="scoreDistribution"
      @submit="handleQuizSubmit"
    />

    <!-- 阶段5：结果展示 -->
    <QuizResultView
      v-else-if="currentStage === 'result'"
      :questions="generatedQuestions"
      :user-answers="userAnswers"
      :time-spent="timeSpent"
      :result="quizResult"
      @restart="handleRestart"
    />
  </div>
</template>

<style scoped>
.quiz-conversion-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: #f2f2f7;
}

.dark .quiz-conversion-container {
  background-color: #000000;
}
</style>
