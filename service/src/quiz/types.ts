import type { RunnableConfig } from '@langchain/core/runnables'

export interface QuizItemOption {
  label: string
}

export type QuizType = 'single_choice' | 'multiple_choice' | 'true_false' | 'unknown'

// 学科门类
export type Subject = 'math' | 'physics' | 'chemistry' | 'biology' | 'chinese' | 'english' | 'unknown'

// 供应商类型
export type ProviderType = 'openai' | 'deepseek' | 'anthropic' | 'google' | 'xai' | 'doubao' | 'qwen'

// 模型配置参数
export interface ModelConfig {
  temperature?: number
  top_p?: number
  max_tokens?: number
  presence_penalty?: number
  frequency_penalty?: number
}

// 模型信息
export interface ModelInfo {
  id: string
  name: string
  provider: ProviderType
  apiKey?: string
  baseURL?: string
}

// 工作流节点类型
export type WorkflowNodeType = 'classify' | 'parse_questions' | 'generate_questions' | 'revise'

// 工作流节点配置
export interface WorkflowNodeConfig {
  nodeType: WorkflowNodeType
  modelInfo: ModelInfo
  config?: ModelConfig
  subjectSpecific?: Partial<Record<Subject, ModelInfo>>
}

export interface RunInput {
  filePath: string
  numQuestions?: number
}

export interface RunOutput {
  classification: ClassificationLabel
  questions: QuizItem[]
  textLength: number
}

export interface SavePayloadMeta {
  sourceFile?: string
  classification: ClassificationLabel
}

export interface SavePayload {
  questions: QuizItem[]
  meta: SavePayloadMeta
}

export type WorkflowConfig = RunnableConfig & { configurable?: { num_questions?: number } }

// types.ts
export type ClassificationLabel = 'note' | 'question' | 'mixed' | 'unknown'
export type UserFeedback = 'Accept' | 'Reject' | 'Revise'

export interface QuizItem {
  id?: number
  type: 'single_choice' | 'multiple_choice' | 'true_false' | 'unknown'
  question: string
  options: string[]
  answer: string | null
  explanation?: string
}

export interface WorkflowState {
  file_path: string
  text: string
  classification: ClassificationLabel
  subject?: Subject // 新增：学科分类
  questions: QuizItem[]
  num_questions: number
  user_feedback?: UserFeedback
  revision_note?: string
  error?: string
  saved_path?: string
  retry_count?: number
  workflowConfig?: WorkflowNodeConfig[] // 新增：工作流配置
}

export interface HumanFeedbackInput {
  feedback: UserFeedback
  revision_note?: string
}
