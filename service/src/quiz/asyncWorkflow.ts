/**
 * 异步工作流执行
 * 用于文件上传后的后台处理
 */

import type { WorkflowNodeConfig } from './types'
import { classifyFile, generateQuestionsFromNote } from './workflow'
import { createWorkflowProgressManager } from './workflowProgressManager'

/**
 * 异步执行文件分类工作流
 * @param userId 用户ID (user_id，不是auth0Id)
 * @param filePath 文件路径
 * @param workflowConfig 工作流配置
 * @returns workflowId
 */
export async function executeClassifyWorkflowAsync(
  userId: string,
  filePath: string,
  workflowConfig?: WorkflowNodeConfig[],
): Promise<string> {
  // 🔥 创建进度管理器（它会自动生成workflowId）
  const manager = createWorkflowProgressManager(userId, 1)
  const wfId = String(manager.workflowId)

  // 🔥 不等待，立即返回workflowId
  // 后台异步执行
  setImmediate(async () => {
    try {
      console.warn(`🚀 [异步工作流] 开始执行分类 ${wfId}`)

      // 步骤 1: 分类
      manager.updateNodeStatus('classify', 'running', '正在分析文件内容...')

      const classifyResult = await classifyFile(filePath, workflowConfig)

      if (classifyResult.error) {
        manager.updateNodeStatus('classify', 'error', classifyResult.error)
        manager.error(classifyResult.error, 'classify')
        return
      }

      manager.updateNodeStatus(
        'classify',
        'completed',
        `分类完成：${classifyResult.classification}`,
        {
          classification: classifyResult.classification,
          subject: classifyResult.subject,
        },
      )

      manager.complete({
        classification: classifyResult.classification,
        subject: classifyResult.subject,
      })

      console.warn(`✅ [异步工作流] 分类完成 ${wfId}`)
    }
    catch (error: any) {
      console.error(`❌ [异步工作流] 执行失败 ${wfId}:`, error)
      manager.error(error?.message || String(error))
    }
  })

  return wfId
}

/**
 * 异步执行题目生成工作流
 * @param userId 用户ID (user_id，不是auth0Id)
 * @param filePath 文件路径
 * @param questionTypes 题型配置
 * @param questionTypes.single_choice 单选题数量
 * @param questionTypes.multiple_choice 多选题数量
 * @param questionTypes.true_false 判断题数量
 * @param workflowConfig 工作流配置
 * @returns workflowId
 */
export async function executeGenerateQuestionsAsync(
  userId: string,
  filePath: string,
  questionTypes: {
    single_choice: number
    multiple_choice: number
    true_false: number
  },
  workflowConfig?: WorkflowNodeConfig[],
): Promise<string> {
  // 🔥 创建进度管理器（3个步骤：生成题目、审核打分、完成）
  const manager = createWorkflowProgressManager(userId, 3)
  const wfId = String(manager.workflowId)

  // 🔥 不等待，立即返回workflowId
  // 后台异步执行
  setImmediate(async () => {
    try {
      console.warn(`🚀 [异步工作流] 开始生成题目 ${wfId}`)

      // 🔥 将 manager 传递给 generateQuestionsFromNote，让其内部发出进度更新
      const result = await generateQuestionsFromNote(filePath, questionTypes, workflowConfig, manager)

      if (result.error) {
        manager.updateNodeStatus('generate_questions', 'error', result.error)
        manager.error(result.error, 'generate_questions')
        return
      }

      // 🔥 步骤 1 和 2 的进度更新已在 generateQuestionsFromNote 内部完成
      // 直接完成工作流
      manager.complete({
        questions: result.questions,
        scoreDistribution: result.scoreDistribution,
      })

      console.warn(`✅ [异步工作流] 题目生成完成 ${wfId}`)
    }
    catch (error: any) {
      console.error(`❌ [异步工作流] 题目生成失败 ${wfId}:`, error)
      manager.error(error?.message || String(error))
    }
  })

  return wfId
}
