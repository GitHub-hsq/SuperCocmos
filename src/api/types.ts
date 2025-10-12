/**
 * API 接口类型定义
 */

// 基础响应类型
export interface ApiResponse<T = any> {
  status: 'Success' | 'Fail'
  message: string
  data: T | null
}

// 用户相关类型
export interface User {
  id: string
  username?: string
  nickname?: string
  email: string
  password?: string
  created_at?: string
  updated_at?: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  user: Omit<User, 'password'>
  token: string
}

export interface RegisterRequest {
  email: string
  password: string
  name?: string
}

export interface RegisterResponse {
  user: Omit<User, 'password'>
}

export interface UpdateUserRequest {
  username?: string
  nickname?: string
  email?: string
  password?: string
}

export interface UserListResponse {
  users: Omit<User, 'password'>[]
  total: number
}

// 聊天相关类型
export interface ChatRequest {
  prompt: string
  options?: {
    conversationId?: string
    parentMessageId?: string
    model?: string
  }
  systemMessage?: string
  temperature?: number
  top_p?: number
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: number
}

// 文件上传类型
export interface FileUploadResponse {
  filePath: string
  originalName: string
  fileName: string
  classification?: string
  error?: string
}

export interface DeleteFileRequest {
  filePath: string
}

// 测验相关类型
export interface QuizRunRequest {
  filePath: string
  numQuestions?: number
  workflowConfig?: WorkflowNodeConfig[]
}

export interface QuizGenerateRequest {
  filePath: string
  questionTypes: {
    single_choice: number
    multiple_choice: number
    true_false: number
  }
}

export interface QuizFeedbackRequest {
  workflowId: string
  feedback: 'Accept' | 'Reject' | 'Revise'
  revision_note?: string
}

export interface WorkflowNodeConfig {
  id: string
  type: string
  config: Record<string, any>
}

// 模型管理类型
export interface Model {
  id: string
  provider: string
  displayName: string
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export interface AddModelRequest {
  id: string
  provider: string
  displayName: string
  enabled?: boolean
}

export interface UpdateModelRequest {
  id: string
  provider?: string
  displayName?: string
  enabled?: boolean
}

export interface TestModelRequest {
  modelId: string
}

export interface TestModelResponse {
  success: boolean
  response?: string
  model?: string
  usage?: any
  error?: string
  statusCode?: number
}

// 工作流配置类型
export interface WorkflowConfigResponse {
  config: WorkflowNodeConfig[]
}

// 验证码相关类型
export interface SendCodeRequest {
  email: string
}

export interface VerifyCodeRequest {
  email: string
  code: string
}

export interface CompleteSignupRequest {
  email: string
  code: string
  nickname: string
  password: string
}

// API 使用量类型
export interface UsageResponse {
  total_tokens?: number
  total_cost?: number
  usage?: any
}

// 会话相关类型
export interface SessionResponse {
  auth: boolean
  model: string
}

// 验证相关类型
export interface VerifyRequest {
  token: string
}

// 配置相关类型
export interface ConfigResponse {
  apiModel: string
  reverseProxy: string
  timeoutMs: number
  socksProxy: string
  httpsProxy: string
  usage: string
}
