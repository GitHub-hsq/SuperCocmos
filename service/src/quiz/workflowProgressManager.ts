/**
 * 工作流进度管理器
 * 负责将工作流执行进度通过 SSE 推送给前端
 */

import type { WorkflowNodeType } from './types'
import { randomBytes } from 'node:crypto'
import { broadcastWorkflowCompleted, broadcastWorkflowError, broadcastWorkflowProgress } from '../services/sseEventBroadcaster'

export interface WorkflowProgressManager {
  workflowId: string
  userId: string
  totalSteps: number
  currentStep: number

  // 节点进度更新
  updateNodeStatus: (
    nodeType: WorkflowNodeType,
    status: 'pending' | 'running' | 'completed' | 'error',
    message?: string,
    result?: any
  ) => void

  // 完成工作流
  complete: (result: any) => void

  // 报告错误
  error: (error: string, nodeType?: WorkflowNodeType) => void
}

/**
 * 创建工作流进度管理器
 */
export function createWorkflowProgressManager(
  userId: string,
  totalSteps: number = 4, // 默认 4 个步骤：classify, generate, parse, review
): WorkflowProgressManager {
  // 生成URL安全的随机工作流ID
  const generatedWorkflowId = randomBytes(16).toString('base64url').substring(0, 21)
  const currentStep = 0

  return {
    workflowId: generatedWorkflowId,
    userId,
    totalSteps,
    currentStep,

    updateNodeStatus(nodeType, status, message, result) {
      console.warn(`📡 [Workflow Progress] ${generatedWorkflowId} - ${nodeType}: ${status}`)

      // 通过 SSE 推送进度（不再发送假的进度百分比）
      broadcastWorkflowProgress(
        userId,
        generatedWorkflowId,
        nodeType,
        status,
        message,
        undefined, // 移除假的进度百分比
        result,
      )
    },

    complete(result) {
      console.warn(`✅ [Workflow Complete] ${generatedWorkflowId}`)

      // 推送完成事件
      broadcastWorkflowCompleted(userId, generatedWorkflowId, result)
    },

    error(error, nodeType) {
      console.error(`❌ [Workflow Error] ${generatedWorkflowId} - ${nodeType || 'unknown'}: ${error}`)

      // 推送错误事件
      broadcastWorkflowError(userId, generatedWorkflowId, error, nodeType)
    },
  }
}
