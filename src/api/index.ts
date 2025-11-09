import type { AxiosProgressEvent, GenericAbortSignal } from 'axios'
import type {
  ApiResponse,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  UpdateUserRequest,
  User,
  UserListResponse,
} from './types'
import { useAuthStore, useSettingStore } from '@/store'
import { get, post } from '@/utils/request'

export function fetchChatAPI<T = any>(
  prompt: string,
  options?: { conversationId?: string, parentMessageId?: string },
  signal?: GenericAbortSignal,
) {
  return post<T>({
    url: '/chat',
    data: { prompt, options },
    signal,
  })
}

export function fetchChatConfig<T = any>() {
  return post<T>({
    url: '/config',
  })
}

export function fetchChatAPIProcess<T = any>(
  params: {
    prompt: string
    options?: Chat.ConversationRequest
    signal?: GenericAbortSignal
    onDownloadProgress?: (progressEvent: AxiosProgressEvent) => void
  },
) {
  const settingStore = useSettingStore()
  const authStore = useAuthStore()

  // 🔥 构建请求数据，避免参数重复
  let data: Record<string, any> = {
    prompt: params.prompt,
  }

  // 🔥 如果有 options，直接使用 options 中的参数，避免重复
  if (params.options) {
    // 直接使用 options 中的所有参数
    data = {
      ...data,
      ...params.options,
    }
  }

  // 🔥 只有在没有 options 或 options 中没有这些参数时，才使用 settingStore 的默认值
  if (authStore.isChatGPTAPI) {
    if (!data.systemMessage)
      data.systemMessage = settingStore.systemMessage
    if (data.temperature === undefined)
      data.temperature = settingStore.temperature
    if (data.top_p === undefined)
      data.top_p = settingStore.top_p
  }

  return post<T>({
    url: '/chat-process',
    data,
    signal: params.signal,
    onDownloadProgress: params.onDownloadProgress,
  })
}

export function fetchSession<T>() {
  return post<T>({
    url: '/session',
  })
}

export function fetchVerify<T>(token: string) {
  return post<T>({
    url: '/verify',
    data: { token },
  })
}

export function fetchQuizRun<T = any>(filePath: string, numQuestions?: number) {
  return post<T>({
    url: '/quiz/run',
    data: { filePath, numQuestions },
  })
}

export function fetchQuizSave<T = any>(payload: any) {
  return post<T>({
    url: '/quiz/save',
    data: payload,
  })
}

export function fetchDeleteFile<T = any>(filePath: string) {
  return post<T>({
    url: '/upload/delete',
    data: { filePath },
  })
}

export function fetchQuizGenerate<T = any>(
  filePath: string,
  questionTypes: { single_choice: number, multiple_choice: number, true_false: number },
) {
  return post<T>({
    url: '/quiz/generate',
    data: { filePath, questionTypes },
  })
}

export function fetchQuizFeedback<T = any>(
  workflowId: string,
  feedback: 'Accept' | 'Reject' | 'Revise',
  revision_note?: string,
) {
  return post<T>({
    url: '/quiz/feedback',
    data: { workflowId, feedback, revision_note },
  })
}

export function fetchQuizSubmit<T = any>(
  filePath: string,
  questions: any[],
  answers: Record<number, string[]>,
  timeSpent: number,
) {
  return post<T>({
    url: '/quiz/submit',
    data: { filePath, questions, answers, timeSpent },
  })
}

// 获取可用的模型列表
export function fetchAvailableModels<T = any>() {
  return post<T>({
    url: '/models/list',
  })
}

// 获取 API 使用量
export function fetchAPIUsage<T = any>() {
  return post<T>({
    url: '/usage',
  })
}

// ==================== 供应商管理 API ====================
// 获取所有供应商及其模型
export function fetchProviders<T = any>() {
  return get<T>({
    url: '/providers',
  })
}

// 创建供应商
export function addProvider<T = any>(data: { name: string, baseUrl: string, apiKey: string }) {
  return post<T>({
    url: '/providers',
    data,
  })
}

// 更新供应商
export function updateProvider<T = any>(id: string, data: { name?: string, baseUrl?: string, apiKey?: string }) {
  return post<T>({
    url: `/providers/${id}`,
    data,
    method: 'PUT',
  })
}

// 删除供应商
export function deleteProvider<T = any>(id: string) {
  return post<T>({
    url: `/providers/${id}`,
    method: 'DELETE',
  })
}

// ==================== 模型管理 API ====================
// 创建模型
export function addModel<T = any>(data: { modelId: string, displayName: string, enabled?: boolean, providerId: string, roleIds?: number[] }) {
  return post<T>({
    url: '/models',
    data,
  })
}

// 更新模型
export function updateModel<T = any>(id: string, data: { modelId?: string, displayName?: string, enabled?: boolean }) {
  return post<T>({
    url: `/models/${id}`,
    data,
    method: 'PUT',
  })
}

// 删除模型
export function deleteModel<T = any>(id: string) {
  return post<T>({
    url: `/models/${id}`,
    method: 'DELETE',
  })
}

// 切换模型启用状态
export function toggleModelEnabled<T = any>(id: string, enabled: boolean) {
  return post<T>({
    url: `/models/${id}/toggle`,
    data: { enabled },
    method: 'PATCH',
  })
}

// 测试模型连接
export function testModelConnection<T = any>(id: string) {
  return post<T>({
    url: `/models/${id}/test`,
    method: 'POST',
  })
}

// 获取供应商的可用模型列表（直接调用供应商的 /v1/models 接口）
export async function fetchProviderModels(baseUrl: string, apiKey: string): Promise<{ id: string, object: string, created: number, owned_by: string }[]> {
  try {
    // 确保 baseUrl 以 /v1 结尾
    const normalizedBaseUrl = baseUrl.endsWith('/v1') ? baseUrl : baseUrl.endsWith('/') ? `${baseUrl}v1` : `${baseUrl}/v1`
    const modelsUrl = `${normalizedBaseUrl}/models`

    const axios = (await import('axios')).default
    const response = await axios.get(modelsUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000, // 10秒超时
    })

    // 处理 OpenAI 兼容格式的响应
    if (response.data?.data && Array.isArray(response.data.data)) {
      return response.data.data
    }
    // 如果直接返回数组
    if (Array.isArray(response.data)) {
      return response.data
    }

    return []
  }
  catch (error: any) {
    console.error('获取供应商模型列表失败:', error)
    throw new Error(error.response?.data?.error?.message || error.message || '获取模型列表失败')
  }
}

// 认证相关 API
export function fetchLogin(data: LoginRequest) {
  return post<ApiResponse<LoginResponse>>({
    url: '/auth/login',
    data,
  })
}

export function fetchRegister(data: RegisterRequest) {
  return post<ApiResponse<RegisterResponse>>({
    url: '/auth/register',
    data,
  })
}

// 新的邮箱验证流程 API
export function fetchSendVerificationCode<T = any>(data: { email: string }) {
  return post<T>({
    url: '/auth/send-code',
    data,
  })
}

export function fetchVerifyCode<T = any>(data: { email: string, code: string }) {
  return post<T>({
    url: '/auth/verify-code',
    data,
  })
}

export function fetchCompleteSignup<T = any>(data: { email: string, code: string, nickname: string, password: string }) {
  return post<T>({
    url: '/auth/complete-signup',
    data,
  })
}

export function fetchLoginWithPassword(data: LoginRequest) {
  return post<ApiResponse<LoginResponse>>({
    url: '/auth/login',
    data,
  })
}

// 用户管理 API
export function fetchUser(id: string) {
  return get<ApiResponse<{ user: Omit<User, 'password'> }>>({
    url: `/user/${id}`,
  })
}

export function updateUser(id: string, data: UpdateUserRequest) {
  return post<ApiResponse<{ user: Omit<User, 'password'> }>>({
    url: `/user/${id}`,
    data,
  })
}

export function deleteUser(id: string) {
  return post<ApiResponse<null>>({
    url: `/user/${id}`,
  })
}

export function fetchUsers() {
  return get<ApiResponse<UserListResponse>>({
    url: '/users',
  })
}
