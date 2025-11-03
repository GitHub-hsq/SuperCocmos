import type { UploadFileInfo } from 'naive-ui'
import type { ComputedRef } from 'vue'
import { useMessage } from 'naive-ui'
import { computed, ref } from 'vue'
import { fetchDeleteFile } from '@/api'
import { t } from '@/locales'
import { useChatStore } from '@/store'

/**
 * 文件上传功能
 */
export function useFileUpload(uuid: ComputedRef<string>) {
  const ms = useMessage()
  const chatStore = useChatStore()

  const uploadFileList = ref<UploadFileInfo[]>([])

  // 工作流状态 - 从 store 获取和更新
  const workflowState = computed(() => chatStore.getWorkflowStateByUuid(uuid.value))

  const uploadedFilePath = computed({
    get: () => workflowState.value?.uploadedFilePath || '',
    set: val => chatStore.updateWorkflowStateSome(uuid.value, { uploadedFilePath: val }),
  })

  const workflowStage = computed({
    get: () => workflowState.value?.stage || 'idle',
    set: val => chatStore.updateWorkflowStateSome(uuid.value, { stage: val }),
  })

  const classification = computed({
    get: () => workflowState.value?.classification || '',
    set: val => chatStore.updateWorkflowStateSome(uuid.value, { classification: val }),
  })

  const generatedQuestions = computed({
    get: () => workflowState.value?.generatedQuestions || [],
    set: val => chatStore.updateWorkflowStateSome(uuid.value, { generatedQuestions: val }),
  })

  const scoreDistribution = computed({
    get: () => workflowState.value?.scoreDistribution,
    set: val => chatStore.updateWorkflowStateSome(uuid.value, { scoreDistribution: val }),
  })

  function handleUploadChange(options: { fileList: UploadFileInfo[] }) {
    uploadFileList.value = options.fileList
  }

  // 文件上传时的回调，判断是否上传
  async function handleBeforeUpload(data: { file: UploadFileInfo, fileList: UploadFileInfo[] }) {
    const { file: fileInfo } = data

    const rawFile = fileInfo.file as File | null

    if (!rawFile) {
      ms.warning(t('common.wrong'))
      return false
    }

    const fileName = rawFile.name
    const fileSize = rawFile.size // 字节

    // 1. 获取文件扩展名（转小写，兼容大小写）
    const extension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase()

    // 2. 定义允许的扩展名
    const allowedExtensions = ['.doc', '.docx', '.pdf', '.md', '.txt']
    if (!allowedExtensions.includes(extension)) {
      ms.warning(t('不支持的文件类型'))
      return false
    }

    // 3. 定义 Word/PDF 的扩展名（需要限制 10MB）
    const wordOrPdfExtensions = ['.doc', '.docx', '.pdf']
    const isWordOrPdf = wordOrPdfExtensions.includes(extension)
    const maxSize = 10 * 1024 * 1024 // 10MB

    if (isWordOrPdf && fileSize > maxSize) {
      ms.warning(t('文件不能超过 10MB', { size: '10MB' }))
      return false
    }

    // 对 .md / .txt 也限制（5MB）
    const otherMaxSize = 5 * 1024 * 1024
    if (!isWordOrPdf && fileSize > otherMaxSize) {
      ms.warning('文本文件不能超过 5MB')
      return false
    }
    return true
  }

  function handleUploadSuccess(options: {
    file: UploadFileInfo
    event?: ProgressEvent
  }) {
    try {
      const { file } = options

      // 获取响应数据
      const xhr = options.event?.target as XMLHttpRequest
      if (xhr && xhr.responseText) {
        const response = JSON.parse(xhr.responseText)

        // 检查响应状态
        if (response.status === 'Success' && response.data?.filePath) {
          // 保存文件路径
          uploadedFilePath.value = response.data.filePath
          classification.value = response.data.classification || ''

          // 使用原始文件名显示（如果有的话）
          const displayName = response.data.originalName || file.name
          ms.success(`文件 ${displayName} 上传成功！`)

          // 根据分类结果决定下一步
          if (response.data.classification === 'note') {
            // 笔记类型：显示题目配置界面
            workflowStage.value = 'config'
            ms.info('检测到笔记内容，请配置题目类型和数量')
          }
          else if (response.data.classification === 'question') {
            // 题目类型：提示用户
            workflowStage.value = 'idle'
            ms.info('检测到题目内容，您可以继续其他操作')
          }
          else if (response.data.error) {
            ms.error(response.data.error)
            workflowStage.value = 'idle'
          }
          else {
            workflowStage.value = 'idle'
          }
        }
        else {
          ms.error('文件上传失败，响应格式错误')
        }
      }
    }
    catch (error: any) {
      ms.error(`处理上传文件失败：${error?.message || '未知错误'}`)
    }
  }

  // 处理上传错误
  function handleUploadError(options: {
    file: UploadFileInfo
    event?: ProgressEvent
  }) {
    const { file } = options
    ms.error(`文件 ${file.name} 上传失败`)
  }

  // 处理文件删除
  async function handleUploadRemove(options: {
    file: UploadFileInfo
    fileList: UploadFileInfo[]
  }): Promise<boolean> {
    try {
      const { file, fileList } = options

      // 如果已经上传到服务器，需要删除服务器上的文件
      if (uploadedFilePath.value) {
        await fetchDeleteFile(uploadedFilePath.value)
        uploadedFilePath.value = ''
        ms.success(`文件 ${file.name} 已删除`)
      }
      else {
        ms.info(`文件 ${file.name} 已从列表中移除`)
      }

      // 重置工作流状态
      workflowStage.value = 'idle'
      classification.value = ''
      generatedQuestions.value = []

      // 更新文件列表（fileList 已经是过滤后的列表）
      uploadFileList.value = fileList

      return true // 返回 true 表示允许删除
    }
    catch (error: any) {
      ms.error(`删除文件失败：${error?.message || '未知错误'}`)
      return false // 返回 false 表示删除失败
    }
  }

  return {
    // 状态
    uploadFileList,
    workflowState,
    uploadedFilePath,
    workflowStage,
    classification,
    generatedQuestions,
    scoreDistribution,

    // 方法
    handleUploadChange,
    handleBeforeUpload,
    handleUploadSuccess,
    handleUploadError,
    handleUploadRemove,
  }
}
