<script setup lang="ts">
/**
 * 笔记转题目 - 工作流执行视图
 * 左侧 75%：执行日志（可滚动）
 * 右侧 25%：工作流节点图（固定）
 */
import { NButton, NCard, NInput, NSpace, useMessage } from 'naive-ui'
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { fetchQuizGenerate } from '@/api'
import { SvgIcon } from '@/components/common'
import { useWorkflowSSE } from '@/composables/useWorkflowSSE'
import QuizPreview from './QuizPreview.vue'
import WorkflowNodeDiagram from './WorkflowNodeDiagram.vue'

interface WorkflowNode {
  type: string
  label: string
  status: 'pending' | 'running' | 'completed' | 'error'
  message?: string
}

interface Props {
  filePath: string
  questionTypes: {
    single_choice: number
    multiple_choice: number
    true_false: number
  }
  nodes: WorkflowNode[] // 🔥 接收从父组件传入的节点状态
  initialLogs?: Array<{ time: string, message: string, type: 'info' | 'success' | 'error' }> // 🔥 初始日志
}

interface Emits {
  (e: 'accept', questions: any[], scoreDistribution: any): void
  (e: 'cancel'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const ms = useMessage()

// 🔥 使用从父组件传入的节点
const nodes = ref(props.nodes)

// 🔥 传入节点引用和初始日志给 useWorkflowSSE
const {
  logs,
  workflowStatus,
  errorMessage,
  updateNodeStatus,
  handleWorkflowProgress,
  handleWorkflowCompleted,
  handleWorkflowError,
} = useWorkflowSSE(nodes, props.initialLogs)

// 题目生成结果
const generatedQuestions = ref<any[]>([])
const scoreDistribution = ref<any>(null)

// 修改意见
const revisionNote = ref('')

// SSE 连接
const eventSource = ref<EventSource | null>(null)
const logsContainer = ref<HTMLElement | null>(null)

// 开始生成题目
async function startGeneration() {
  try {
    // 🔥 不清空日志，追加内容
    workflowStatus.value = 'running'

    // 建立 SSE 连接（监听工作流进度）
    setupSSEConnection()

    // 🔥 调用生成 API（后端立即返回 workflowId，然后异步执行）
    const result = await fetchQuizGenerate(props.filePath, props.questionTypes)

    if (result.status === 'Success' && result.data && result.data.workflowId) {
      // 🔥 立即设置 generate 节点为 running 状态（使用 updateNodeStatus 以添加分隔线）
      updateNodeStatus('generate', 'running', '正在生成试卷...')

      ms.success('试卷生成任务已启动，正在后台处理...')
      // 🔥 等待 SSE 事件推送结果
    }
    else {
      const errorMsg = result.message || '试卷生成失败'
      handleWorkflowError({ error: errorMsg })
      ms.error(errorMsg)
    }
  }
  catch (err: any) {
    let errorMsg = '试卷生成失败'

    if (err?.response?.data?.message)
      errorMsg = err.response.data.message
    else if (err?.message)
      errorMsg = err.message

    if (errorMsg.includes('API_KEY') || errorMsg.includes('未配置')) {
      errorMsg = '❌ API Key 未配置\n\n请按以下步骤配置：\n1. 点击左侧"设置"按钮\n2. 选择"工作流配置"选项卡\n3. 为每个节点配置模型和 API Key'
    }

    handleWorkflowError({ error: errorMsg })
    ms.error(errorMsg, { duration: 8000 })
    console.error('试卷生成失败:', err)
  }
}

// 建立 SSE 连接
function setupSSEConnection() {
  const baseURL = import.meta.env.VITE_APP_API_BASE_URL || ''
  let url: string

  if (!baseURL) {
    url = '/api/events/sync'
  }
  else {
    const normalizedBaseURL = baseURL.replace(/\/+$/, '')
    url = normalizedBaseURL.endsWith('/api')
      ? `${normalizedBaseURL}/events/sync`
      : `${normalizedBaseURL}/api/events/sync`
  }

  try {
    eventSource.value = new EventSource(url, { withCredentials: true })

    // 监听工作流进度事件
    eventSource.value.addEventListener('workflow_progress', (event) => {
      const data = JSON.parse(event.data)
      handleWorkflowProgress(data)
      scrollLogsToBottom()
    })

    // 监听工作流完成事件
    eventSource.value.addEventListener('workflow_completed', (event) => {
      const data = JSON.parse(event.data)
      handleWorkflowCompleted(data)

      // 🔥 从完成事件中提取题目数据
      if (data.result && data.result.questions) {
        generatedQuestions.value = data.result.questions
        scoreDistribution.value = data.result.scoreDistribution || null

        // 🔥 更新 preview 节点状态为 running（显示预览阶段）
        updateNodeStatus('preview', 'running', '正在预览题目...')
      }

      scrollLogsToBottom()
    })

    // 监听工作流错误事件
    eventSource.value.addEventListener('workflow_error', (event) => {
      const data = JSON.parse(event.data)
      console.error('[Workflow SSE] 工作流错误:', data)
      handleWorkflowError(data)
      scrollLogsToBottom()
    })

    eventSource.value.onerror = (error) => {
      console.error('[Workflow SSE] 连接错误:', error)
    }
  }
  catch (error) {
    console.error('[Workflow SSE] 连接失败:', error)
  }
}

// 断开 SSE 连接
function closeSSEConnection() {
  if (eventSource.value) {
    eventSource.value.close()
    eventSource.value = null
  }
}

// 滚动日志到底部
function scrollLogsToBottom() {
  nextTick(() => {
    if (logsContainer.value) {
      logsContainer.value.scrollTop = logsContainer.value.scrollHeight
    }
  })
}

// 接受题目
function handleAccept() {
  // 🔥 更新 preview 节点为完成状态
  updateNodeStatus('preview', 'completed', '已接受题目')
  emit('accept', generatedQuestions.value, scoreDistribution.value)
}

// 取消/返回
function handleCancel() {
  // 🔥 更新 preview 节点为取消状态（重置为 pending）
  updateNodeStatus('preview', 'pending', '')
  emit('cancel')
}

// 修改意见
function handleRevise() {
  if (revisionNote.value.trim()) {
    // TODO: 实现修改意见功能
    ms.warning('修改意见功能开发中...')
    revisionNote.value = ''
  }
}

// 组件挂载/卸载
onMounted(() => {
  startGeneration()
})

onUnmounted(() => {
  closeSSEConnection()
})

// 显示状态计算
const showWorkflowProgress = computed(() => workflowStatus.value === 'running')
const showPreview = computed(() => workflowStatus.value === 'completed' && generatedQuestions.value.length > 0)
const showError = computed(() => workflowStatus.value === 'error')
</script>

<template>
  <div class="quiz-workflow-view">
    <!-- 工作流进度展示（3:1 布局） -->
    <div v-if="showWorkflowProgress" class="workflow-progress-container">
      <!-- 左侧：执行日志 (75%) -->
      <div class="logs-section">
        <NCard title="执行日志" class="logs-card">
          <!-- 日志列表 -->
          <div ref="logsContainer" class="logs-container">
            <div
              v-for="(log, index) in logs"
              :key="index"
              class="log-item"
              :class="[`log-${log.type}`]"
            >
              <span class="log-time">{{ log.time }}</span>
              <span class="log-message">{{ log.message }}</span>
            </div>
          </div>
        </NCard>
      </div>

      <!-- 右侧：工作流节点图 (25%) -->
      <div class="diagram-section">
        <WorkflowNodeDiagram :nodes="nodes" />
      </div>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="showError" class="error-container">
      <NCard title="生成失败" class="error-card">
        <p class="error-message">
          {{ errorMessage }}
        </p>
        <NButton type="primary" @click="handleCancel">
          返回重新配置
        </NButton>
      </NCard>
    </div>

    <!-- 预览内容（左右布局：预览 + 流程图） -->
    <div v-else-if="showPreview" class="preview-workflow-container">
      <!-- 左侧：题目预览 (75%) -->
      <div class="preview-section">
        <QuizPreview
          :questions="generatedQuestions"
          :score-distribution="scoreDistribution"
        />
      </div>

      <!-- 右侧：工作流节点图 + 操作按钮 (25%) -->
      <div class="diagram-section">
        <WorkflowNodeDiagram :nodes="nodes" />

        <!-- 操作按钮区域 -->
        <div class="action-buttons">
          <NCard size="small">
            <NSpace vertical :size="12">
              <NSpace :size="12">
                <NButton type="success" @click="handleAccept">
                  <template #icon>
                    <SvgIcon icon="ri:check-line" />
                  </template>
                  接受
                </NButton>
                <NButton type="error" @click="handleCancel">
                  <template #icon>
                    <SvgIcon icon="ri:close-line" />
                  </template>
                  拒绝
                </NButton>
              </NSpace>

              <div class="flex gap-2">
                <NInput
                  v-model:value="revisionNote"
                  type="textarea"
                  placeholder="输入修改意见..."
                  :autosize="{ minRows: 2, maxRows: 4 }"
                  class="flex-1"
                />
                <NButton
                  type="primary"
                  :disabled="!revisionNote.trim()"
                  @click="handleRevise"
                >
                  <template #icon>
                    <SvgIcon icon="ri:send-plane-fill" />
                  </template>
                </NButton>
              </div>
            </NSpace>
          </NCard>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.quiz-workflow-view {
  width: 100%;
  height: 100%;
  background-color: #f2f2f7;
  overflow: hidden;
}

.dark .quiz-workflow-view {
  background-color: #000000;
}

/* ==================== 工作流进度容器（3:1 布局）==================== */
.workflow-progress-container {
  display: flex;
  gap: 16px;
  width: 100%;
  height: 100%;
  padding: 20px;
}

/* 左侧：执行日志 (75%) */
.logs-section {
  flex: 3;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.logs-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* 🔥 确保 NCard 的内容区域参与 flex 布局 */
.logs-card :deep(.n-card__content) {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.logs-container {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  background-color: #fafafa;
  border-radius: 6px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.8;
}

.dark .logs-container {
  background-color: #101014;
}

.log-item {
  margin-bottom: 8px;
  display: flex;
  gap: 12px;
}

.log-time {
  flex-shrink: 0;
  color: #8e8e93;
  font-size: 12px;
}

.log-message {
  flex: 1;
  color: #000000;
}

.dark .log-message {
  color: #ffffff;
}

/* 日志类型样式 */
.log-item.log-info .log-message {
  color: #000000;
}

.dark .log-item.log-info .log-message {
  color: #ffffff;
}

.log-item.log-success .log-message {
  color: #000000;
  font-weight: 600;
}

.dark .log-item.log-success .log-message {
  color: #ffffff;
  font-weight: 600;
}

.log-item.log-error .log-message {
  color: #8e8e93;
}

.dark .log-item.log-error .log-message {
  color: #8e8e93;
}

/* 右侧：工作流节点图 (25%) */
.diagram-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  gap: 16px;
}

.action-buttons {
  margin-top: auto;
  padding-top: 16px;
}

/* ==================== 错误状态 ==================== */
.error-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.error-card {
  max-width: 600px;
  width: 100%;
}

.error-message {
  color: #8e8e93;
  margin-bottom: 20px;
  white-space: pre-wrap;
  line-height: 1.8;
  font-size: 15px;
}

/* ==================== 预览 + 工作流容器（3:1 布局）==================== */
.preview-workflow-container {
  display: flex;
  gap: 16px;
  width: 100%;
  height: 100%;
  padding: 20px;
}

/* 左侧：题目预览 (75%) */
.preview-section {
  flex: 3;
  overflow-y: auto;
}

/* 右侧：工作流节点图 (25%) - 复用 diagram-section 样式 */

/* ==================== 响应式布局 ==================== */
@media (max-width: 1200px) {
  .workflow-progress-container,
  .preview-workflow-container {
    flex-direction: column;
  }

  .logs-section,
  .preview-section {
    flex: 2;
  }

  .diagram-section {
    flex: 1;
    min-height: 300px;
  }
}
</style>
