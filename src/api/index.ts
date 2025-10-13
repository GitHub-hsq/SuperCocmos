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
    options?: { conversationId?: string, parentMessageId?: string, model?: string }
    signal?: GenericAbortSignal
    onDownloadProgress?: (progressEvent: AxiosProgressEvent) => void
  },
) {
  const settingStore = useSettingStore()
  const authStore = useAuthStore()

  let data: Record<string, any> = {
    prompt: params.prompt,
    options: params.options,
  }

  if (authStore.isChatGPTAPI) {
    data = {
      ...data,
      systemMessage: settingStore.systemMessage,
      temperature: settingStore.temperature,
      top_p: settingStore.top_p,
    }
  }

  // 如果 options 中包含模型信息，将其提取到顶层
  if (params.options?.model)
    data.model = params.options.model

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

// 模型管理 API
export function fetchModels<T = any>() {
  return get<T>({
    url: '/api/models',
  })
}

export function addModel<T = any>(data: { id: string, provider: string, displayName: string, enabled?: boolean }) {
  return post<T>({
    url: '/api/models/add',
    data,
  })
}

export function updateModel<T = any>(data: { id: string, provider?: string, displayName?: string, enabled?: boolean }) {
  return post<T>({
    url: '/api/models/update',
    data,
  })
}

export function deleteModel<T = any>(id: string) {
  return post<T>({
    url: '/api/models/delete',
    data: { id },
  })
}

export function testModel<T = any>(modelId: string) {
  return post<T>({
    url: '/api/models/test',
    data: { modelId },
  })
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
