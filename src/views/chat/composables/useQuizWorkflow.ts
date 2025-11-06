import type { WritableComputedRef } from 'vue'
import { useMessage } from 'naive-ui'
import { ref } from 'vue'
import { fetchQuizFeedback, fetchQuizGenerate } from '@/api'

interface QuizConfig {
  single_choice: number
  multiple_choice: number
  true_false: number
}

/**
 * Quiz 工作流相关操作
 * 依赖 useFileUpload 提供的状态
 */
export function useQuizWorkflow(deps: {
  uploadedFilePath: WritableComputedRef<string>
  workflowStage: WritableComputedRef<string>
  generatedQuestions: WritableComputedRef<any[]>
  scoreDistribution: WritableComputedRef<any>
}) {
  const ms = useMessage()
  const quizLoading = ref(false)

  const {
    uploadedFilePath,
    workflowStage,
    generatedQuestions,
    scoreDistribution,
  } = deps

  // 处理题目配置提交
  async function handleQuizConfigSubmit(config: QuizConfig) {
    try {
      quizLoading.value = true
      workflowStage.value = 'generating'

      const result = await fetchQuizGenerate(uploadedFilePath.value, config)

      // 🔥 检查响应状态
      if (result.status === 'Success' && result.data && result.data.questions) {
        generatedQuestions.value = result.data.questions
        // 保存分数分配信息
        if (result.data.scoreDistribution)
          scoreDistribution.value = result.data.scoreDistribution

        workflowStage.value = 'preview'
        ms.success('题目生成成功！')
      }
      else {
        // 🔥 显示具体的错误信息
        const errorMessage = result.message || '题目生成失败'
        ms.error(errorMessage)
        workflowStage.value = 'config'
        console.error('题目生成失败:', result)
      }
    }
    catch (error: any) {
      // 🔥 改进错误信息显示
      let errorMessage = '题目生成失败'

      if (error?.response?.data?.message) {
        // 后端返回的错误信息
        errorMessage = error.response.data.message
      }
      else if (error?.message) {
        // 网络错误或其他错误
        errorMessage = error.message
      }

      // 🔥 检查是否是配置问题
      if (errorMessage.includes('API_KEY') || errorMessage.includes('未配置')) {
        errorMessage += '\n\n请前往"设置 → 供应商配置"检查API Key配置，或在"工作流配置"中选择已配置的模型。'
      }

      ms.error(errorMessage, { duration: 5000 })
      workflowStage.value = 'config'
      console.error('题目生成失败:', error)
    }
    finally {
      quizLoading.value = false
    }
  }

  // 处理题目预览 - 接受
  function handleQuizAccept() {
    workflowStage.value = 'answering'
    ms.success('已接受题目，开始答题吧！')
  }

  // 处理题目预览 - 拒绝
  async function handleQuizReject() {
    try {
      await fetchQuizFeedback(uploadedFilePath.value, 'Reject')
      workflowStage.value = 'config'
      generatedQuestions.value = []
      ms.info('已拒绝题目，请重新配置')
    }
    catch (error: any) {
      ms.error(`操作失败：${error?.message || '未知错误'}`)
    }
  }

  // 处理题目预览 - 修改
  async function handleQuizRevise(note: string) {
    try {
      quizLoading.value = true
      await fetchQuizFeedback(uploadedFilePath.value, 'Revise', note)

      // 重新生成题目
      ms.info('正在根据您的意见重新生成题目...')
      workflowStage.value = 'generating'

      // 这里可以调用重新生成的 API
      // 暂时回到配置页面
      setTimeout(() => {
        workflowStage.value = 'config'
        ms.warning('修改功能开发中，请重新配置生成')
        quizLoading.value = false
      }, 1000)
    }
    catch (error: any) {
      ms.error(`操作失败：${error?.message || '未知错误'}`)
      quizLoading.value = false
    }
  }

  // 处理答题提交
  function handleQuizSubmit(answers: Record<number, string[]>, timeSpent: number) {
    if (import.meta.env.DEV) {
      console.warn('答题完成', { answers, timeSpent })
    }
    ms.success('答题完成！')
  }

  return {
    // 状态
    quizLoading,

    // 方法
    handleQuizConfigSubmit,
    handleQuizAccept,
    handleQuizReject,
    handleQuizRevise,
    handleQuizSubmit,
  }
}
