/**
 * 带进度推送的工作流执行
 * 包装原有的 runWorkflow，在关键步骤推送 SSE 进度
 */

import type { WorkflowNodeConfig, WorkflowState } from './types'
import { classifyFile, runWorkflow } from './workflow'
import { createWorkflowProgressManager } from './workflowProgressManager'

/**
 * 带进度推送的工作流执行
 * @param userId 用户 ID（用于 SSE 推送）
 * @param filePath 文件路径
 * @param numQuestions 题目数量
 * @param workflowConfig 工作流配置
 */
export async function runWorkflowWithProgress(
  userId: string,
  filePath: string,
  numQuestions?: number,
  workflowConfig?: WorkflowNodeConfig[],
): Promise<WorkflowState> {
  // 创建进度管理器
  const progressManager = createWorkflowProgressManager(userId, 4)

  console.warn(`🚀 [Workflow] 开始执行工作流 ${progressManager.workflowId}`)

  try {
    // 步骤 1: 分类
    progressManager.updateNodeStatus('classify', 'running', '正在分析文件内容...')

    const classifyResult = await classifyFile(filePath, workflowConfig)

    if (classifyResult.error) {
      progressManager.updateNodeStatus('classify', 'error', classifyResult.error)
      progressManager.error(classifyResult.error, 'classify')
      throw new Error(classifyResult.error)
    }

    progressManager.updateNodeStatus(
      'classify',
      'completed',
      `分类完成：${classifyResult.classification}`,
      { classification: classifyResult.classification },
    )

    // 步骤 2-4: 根据分类执行不同的流程
    if (classifyResult.classification === 'question') {
      // 题目文件：解析 -> 审核
      progressManager.updateNodeStatus('parse_questions', 'running', '正在解析题目...')
    }
    else if (classifyResult.classification === 'note') {
      // 笔记文件：生成题目
      progressManager.updateNodeStatus('generate_questions', 'running', '正在生成题目...')
    }

    // 执行完整工作流
    const finalState = await runWorkflow(filePath, numQuestions, workflowConfig)

    // 检查是否有错误
    if (finalState.error) {
      progressManager.error(finalState.error)
      return finalState
    }

    // 完成
    progressManager.complete({
      questions: finalState.questions,
      classification: finalState.classification,
      subject: finalState.subject,
    })

    console.warn(`✅ [Workflow] 工作流 ${progressManager.workflowId} 执行完成`)

    return finalState
  }
  catch (error: any) {
    console.error(`❌ [Workflow] 工作流 ${progressManager.workflowId} 执行失败:`, error)

    const errorMessage = error?.message || String(error)
    progressManager.error(errorMessage)

    throw error
  }
}
