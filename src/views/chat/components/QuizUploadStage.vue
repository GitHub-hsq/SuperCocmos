<script setup lang="ts">
/**
 * 笔记转题目 - 文件上传阶段
 *
 * 流程：
 * 1. 用户上传文件
 * 2. 上传成功后显示等待状态
 * 3. 建立 SSE 连接监听分类进度
 * 4. 分类完成后发射事件给父组件
 */
import type { UploadFileInfo } from 'naive-ui'
import { CloudUploadOutline } from '@vicons/ionicons5'
import { NCard, NIcon, NUpload, NUploadDragger, useMessage } from 'naive-ui'
import { nextTick, onUnmounted, ref } from 'vue'
import { t } from '@/locales'
import WorkflowNodeDiagram from './WorkflowNodeDiagram.vue'

interface WorkflowNode {
  type: string
  label: string
  status: 'pending' | 'running' | 'completed' | 'error'
  message?: string
}

interface Props {
  uploadHeaders?: Record<string, string>
  nodes: WorkflowNode[] // 🔥 接收从父组件传入的节点状态
  onAddLog?: (message: string, type: 'info' | 'success' | 'error') => void // 🔥 全局日志添加函数
}

const props = withDefaults(defineProps<Props>(), {
  uploadHeaders: () => ({}),
})

const emit = defineEmits<{
  classifyComplete: [filePath: string, classification: string, subject: string]
}>()

const ms = useMessage()

// 上传状态
const uploadFileList = ref<UploadFileInfo[]>([])
const uploading = ref(false)

// 分类状态
const classifying = ref(false)
const uploadedFilePath = ref('')
const workflowId = ref('')

// SSE 连接
const eventSource = ref<EventSource | null>(null)

// 🔥 使用从父组件传入的节点
const nodes = ref(props.nodes)

// 日志
interface LogEntry {
  time: string
  message: string
  type: 'info' | 'success' | 'error'
}

const logs = ref<LogEntry[]>([])
const logsContainer = ref<HTMLElement | null>(null)

// 添加日志
function addLog(message: string, type: 'info' | 'success' | 'error' = 'info') {
  const now = new Date()
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`

  logs.value.push({ time, message, type })

  // 🔥 同时添加到全局日志
  if (props.onAddLog) {
    props.onAddLog(message, type)
  }

  // 滚动到底部
  nextTick(() => {
    if (logsContainer.value) {
      logsContainer.value.scrollTop = logsContainer.value.scrollHeight
    }
  })
}

// 添加节点分隔线
function addNodeSeparator(nodeLabel: string, icon: string = '📝') {
  const leftPad = '─'.repeat(10)
  const rightPad = '─'.repeat(10)
  addLog(`${leftPad} ${icon} ${nodeLabel} ${rightPad}`, 'info')
}

// 更新节点状态
function updateNodeStatus(
  nodeType: string,
  status: 'pending' | 'running' | 'completed' | 'error',
  message: string,
) {
  const node = nodes.value.find(n => n.type === nodeType)
  if (node) {
    node.status = status
    node.message = message
  }
}

// 文件上传前的验证
function handleBeforeUpload(data: { file: UploadFileInfo, fileList: UploadFileInfo[] }): boolean {
  const { file: fileInfo } = data
  const rawFile = fileInfo.file as File | null

  if (!rawFile) {
    ms.warning(t('common.wrong'))
    return false
  }

  const fileName = rawFile.name
  const fileSize = rawFile.size

  // 获取文件扩展名
  const extension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase()

  // 允许的扩展名
  const allowedExtensions = ['.doc', '.docx', '.pdf', '.md', '.txt']
  if (!allowedExtensions.includes(extension)) {
    ms.warning('不支持的文件类型，仅支持 .doc, .docx, .pdf, .md, .txt')
    return false
  }

  // Word/PDF 文件大小限制（10MB）
  const wordOrPdfExtensions = ['.doc', '.docx', '.pdf']
  const isWordOrPdf = wordOrPdfExtensions.includes(extension)
  const maxSize = 10 * 1024 * 1024 // 10MB

  if (isWordOrPdf && fileSize > maxSize) {
    ms.warning('Word/PDF 文件不能超过 10MB')
    return false
  }

  // 文本文件大小限制（5MB）
  const otherMaxSize = 5 * 1024 * 1024
  if (!isWordOrPdf && fileSize > otherMaxSize) {
    ms.warning('文本文件不能超过 5MB')
    return false
  }

  uploading.value = true
  return true
}

// 上传成功
function handleUploadSuccess(options: { file: UploadFileInfo, event?: ProgressEvent }) {
  uploading.value = false

  try {
    const xhr = options.event?.target as XMLHttpRequest
    if (xhr && xhr.responseText) {
      const response = JSON.parse(xhr.responseText)

      if (response.status === 'Success' && response.data?.filePath && response.data?.workflowId) {
        const displayName = response.data.originalName || options.file.name
        ms.success(`文件 ${displayName} 上传成功！正在分类...`)

        // 保存文件路径和 workflowId
        uploadedFilePath.value = response.data.filePath
        workflowId.value = response.data.workflowId

        // 切换到分类状态
        classifying.value = true

        // 初始化日志
        addLog(`文件上传成功: ${displayName}`, 'success')
        addLog('', 'info') // 空行
        addNodeSeparator('内容分类', '🔍')
        addLog('正在启动分类工作流...', 'info')

        // 🔥 立即将第一个节点设置为 running 状态
        updateNodeStatus('classify', 'running', '正在分析文件内容...')

        // 建立 SSE 连接
        setupSSEConnection()
      }
      else {
        ms.error(response.message || '文件上传失败')
      }
    }
  }
  catch (error: any) {
    ms.error(`处理上传文件失败：${error?.message || '未知错误'}`)
  }
}

// 上传失败
function handleUploadError(options: { file: UploadFileInfo, event?: ProgressEvent }) {
  uploading.value = false
  ms.error(`文件 ${options.file.name} 上传失败`)
}

// 文件列表变化
function handleUploadChange(options: { fileList: UploadFileInfo[] }) {
  uploadFileList.value = options.fileList
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

      if (data.nodeType === 'classify') {
        if (data.nodeStatus === 'running') {
          updateNodeStatus('classify', 'running', data.nodeMessage || '正在分析文件内容...')
          addLog(data.nodeMessage || '正在分析文件内容...', 'info')
        }
        else if (data.nodeStatus === 'completed') {
          updateNodeStatus('classify', 'completed', '分类完成')
          addLog('✅ 分类完成', 'success')

          // 显示分类结果详情
          if (data.result) {
            if (data.result.classification) {
              addLog(`📋 文件类型: ${data.result.classification}`, 'success')
            }
            if (data.result.subject) {
              addLog(`📚 所属科目: ${data.result.subject}`, 'success')
            }
          }
        }
      }
    })

    // 监听工作流完成事件
    eventSource.value.addEventListener('workflow_completed', (event) => {
      const data = JSON.parse(event.data)

      // 提取分类结果
      if (data.result && data.result.classification) {
        const classification = data.result.classification
        const subject = data.result.subject || ''

        addLog('🎉 分类工作流完成', 'success')

        // 延迟一下让用户看到完成状态
        setTimeout(() => {
          closeSSEConnection()
          // 发射分类完成事件
          emit('classifyComplete', uploadedFilePath.value, classification, subject)
        }, 1000)
      }
    })

    // 监听工作流错误事件
    eventSource.value.addEventListener('workflow_error', (event) => {
      const data = JSON.parse(event.data)
      console.error('[Classification SSE] 工作流错误:', data)

      updateNodeStatus('classify', 'error', data.error || '分类失败')
      addLog(data.error || '分类失败', 'error')

      ms.error('文件分类失败，请重新上传')

      // 延迟后重置状态
      setTimeout(() => {
        closeSSEConnection()
        resetState()
      }, 2000)
    })

    eventSource.value.onerror = (error) => {
      console.error('[Classification SSE] 连接错误:', error)
    }
  }
  catch (error) {
    console.error('[Classification SSE] 连接失败:', error)
    ms.error('无法建立连接，请刷新页面重试')
  }
}

// 断开 SSE 连接
function closeSSEConnection() {
  if (eventSource.value) {
    eventSource.value.close()
    eventSource.value = null
  }
}

// 重置状态
function resetState() {
  classifying.value = false
  uploadedFilePath.value = ''
  workflowId.value = ''
  logs.value = []
  uploadFileList.value = []
  // 🔥 不重置节点状态，节点由父组件管理
}

// 组件卸载时断开连接
onUnmounted(() => {
  closeSSEConnection()
})
</script>

<template>
  <div class="quiz-upload-stage">
    <!-- 上传界面（居中显示，无工作流图） -->
    <div v-if="!classifying" class="upload-container">
      <NUpload
        v-model:file-list="uploadFileList"
        action="/api/upload"
        :max="1"
        :show-file-list="true"
        :headers="uploadHeaders"
        class="upload-box"
        @before-upload="handleBeforeUpload"
        @finish="handleUploadSuccess"
        @error="handleUploadError"
        @change="handleUploadChange"
      >
        <NUploadDragger>
          <div class="upload-content">
            <div class="upload-icon">
              <NIcon size="64" :depth="3">
                <CloudUploadOutline />
              </NIcon>
            </div>
            <div class="upload-text">
              <p class="upload-title">
                点击或拖拽文件到此处上传
              </p>
              <p class="upload-hint">
                支持 Word、PDF、Markdown、TXT 格式
              </p>
              <p class="upload-hint">
                最大 10MB (Word/PDF) 或 5MB (文本)
              </p>
            </div>
          </div>
        </NUploadDragger>

        <div v-if="uploading" class="upload-loading">
          <p>正在上传文件...</p>
        </div>
      </NUpload>
    </div>

    <!-- 分类进度界面（左右布局） -->
    <div v-else class="classification-container">
      <!-- 左侧：执行日志 (75%) -->
      <div class="logs-section">
        <NCard title="分类日志" class="logs-card">
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
  </div>
</template>

<style scoped>
.quiz-upload-stage {
  width: 100%;
  height: 100%;
  background-color: #f2f2f7;
  overflow: hidden;
}

.dark .quiz-upload-stage {
  background-color: #000000;
}

/* ==================== 上传界面（居中显示）==================== */
.upload-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 20px;
}

.upload-box {
  width: 100%;
  max-width: 800px;
  background-color: #ffffff;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.dark .upload-box {
  background-color: #1c1c1e;
}

.upload-tips {
  font-size: 14px;
  color: #8e8e93;
}

.upload-content {
  padding: 40px 20px;
  text-align: center;
}

.upload-icon {
  margin-bottom: 20px;
  color: #000000;
}

.dark .upload-icon {
  color: #ffffff;
}

.upload-text {
  margin-top: 16px;
}

.upload-title {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 12px;
  color: #000000;
}

.dark .upload-title {
  color: #ffffff;
}

.upload-hint {
  font-size: 14px;
  color: #8e8e93;
  margin: 4px 0;
}

.upload-loading {
  margin-top: 20px;
  text-align: center;
  color: #000000;
  font-size: 14px;
}

.dark .upload-loading {
  color: #ffffff;
}

/* ==================== 分类进度界面（左右布局）==================== */
.classification-container {
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

/* 右侧：工作流节点图 (25%) */
.diagram-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ==================== 响应式布局 ==================== */
@media (max-width: 1200px) {
  .classification-container {
    flex-direction: column;
  }

  .logs-section {
    flex: 2;
  }

  .diagram-section {
    flex: 1;
    min-height: 300px;
  }
}
</style>
