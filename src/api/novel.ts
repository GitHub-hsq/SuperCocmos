/**
 * 小说API请求封装
 */

import type { APIResponse, ChatMessage, Novel, Volume, WorkflowExecution } from '@/types/novel'
import { post } from '@/utils/request'

// ==================== 小说管理 ====================

export function createNovel(data: {
  title: string
  genre?: string
  theme?: string
  idea?: string
}) {
  return post<APIResponse<{ novel: Novel, first_volume: Volume }>>({
    url: '/novels',
    data,
  })
}

export function getUserNovels() {
  return post<APIResponse<Novel[]>>({
    url: '/novels',
    method: 'GET',
  })
}

export function getNovel(novelId: string) {
  return post<APIResponse<Novel & { volumes: Volume[] }>>({
    url: `/novels/${novelId}`,
    method: 'GET',
  })
}

export function updateNovel(novelId: string, updates: Partial<Novel>) {
  return post<APIResponse<Novel>>({
    url: `/novels/${novelId}`,
    method: 'PATCH',
    data: updates,
  })
}

export function deleteNovel(novelId: string) {
  return post<APIResponse>({
    url: `/novels/${novelId}`,
    method: 'DELETE',
  })
}

// ==================== 卷管理 ====================

export function getVolume(volumeId: string) {
  return post<APIResponse<Volume>>({
    url: `/volumes/${volumeId}`,
    method: 'GET',
  })
}

export function updateVolume(volumeId: string, updates: Partial<Volume>) {
  return post<APIResponse<Volume>>({
    url: `/volumes/${volumeId}`,
    method: 'PATCH',
    data: updates,
  })
}

// ==================== 工作流执行 ====================

export function startWorkflow1(volumeId: string, input?: {
  idea?: string
  chat_history?: ChatMessage[]
}) {
  return post<APIResponse<{ execution_id: string, status: string }>>({
    url: `/volumes/${volumeId}/workflow/1/start`,
    data: input || {},
  })
}

export function getWorkflowStatus(executionId: string) {
  return post<APIResponse<WorkflowExecution>>({
    url: `/workflow/${executionId}/status`,
    method: 'GET',
  })
}

// ==================== 聊天交互 ====================

export function chatWithAI(
  volumeId: string,
  aiRole: string,
  data: { message: string, workflow_type: number },
) {
  return post<APIResponse<{ reply: string }>>({
    url: `/volumes/${volumeId}/chat/${aiRole}`,
    data,
  })
}

export function getChatHistory(
  volumeId: string,
  aiRole: string,
  workflowType: number,
) {
  return post<APIResponse<ChatMessage[]>>({
    url: `/volumes/${volumeId}/chat/${aiRole}?workflow_type=${workflowType}`,
    method: 'GET',
  })
}
