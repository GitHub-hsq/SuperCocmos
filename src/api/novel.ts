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
}): Promise<APIResponse<{ novel: Novel, first_volume: Volume }>> {
  return post<APIResponse>({
    url: '/novels',
    data,
  })
}

export function getUserNovels(): Promise<APIResponse<Novel[]>> {
  return post<APIResponse>({
    url: '/novels',
    method: 'GET',
  })
}

export function getNovel(novelId: string): Promise<APIResponse<Novel & { volumes: Volume[] }>> {
  return post<APIResponse>({
    url: `/novels/${novelId}`,
    method: 'GET',
  })
}

export function updateNovel(novelId: string, updates: Partial<Novel>): Promise<APIResponse<Novel>> {
  return post<APIResponse>({
    url: `/novels/${novelId}`,
    method: 'PATCH',
    data: updates,
  })
}

export function deleteNovel(novelId: string): Promise<APIResponse> {
  return post<APIResponse>({
    url: `/novels/${novelId}`,
    method: 'DELETE',
  })
}

// ==================== 卷管理 ====================

export function getVolume(volumeId: string): Promise<APIResponse<Volume>> {
  return post<APIResponse>({
    url: `/volumes/${volumeId}`,
    method: 'GET',
  })
}

export function updateVolume(volumeId: string, updates: Partial<Volume>): Promise<APIResponse<Volume>> {
  return post<APIResponse>({
    url: `/volumes/${volumeId}`,
    method: 'PATCH',
    data: updates,
  })
}

// ==================== 工作流执行 ====================

export function startWorkflow1(volumeId: string, input?: {
  idea?: string
  chat_history?: ChatMessage[]
}): Promise<APIResponse<{ execution_id: string, status: string }>> {
  return post<APIResponse>({
    url: `/volumes/${volumeId}/workflow/1/start`,
    data: input || {},
  })
}

export function getWorkflowStatus(executionId: string): Promise<APIResponse<WorkflowExecution>> {
  return post<APIResponse>({
    url: `/workflow/${executionId}/status`,
    method: 'GET',
  })
}

// ==================== 聊天交互 ====================

export function chatWithAI(
  volumeId: string,
  aiRole: string,
  data: { message: string, workflow_type: number },
): Promise<APIResponse<{ reply: string }>> {
  return post<APIResponse>({
    url: `/volumes/${volumeId}/chat/${aiRole}`,
    data,
  })
}

export function getChatHistory(
  volumeId: string,
  aiRole: string,
  workflowType: number,
): Promise<APIResponse<ChatMessage[]>> {
  return post<APIResponse>({
    url: `/volumes/${volumeId}/chat/${aiRole}?workflow_type=${workflowType}`,
    method: 'GET',
  })
}
