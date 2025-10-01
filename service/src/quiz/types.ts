import type { RunnableConfig } from '@langchain/core/runnables'

export interface QuizItemOption {
  label: string
}

export type QuizType = 'single_choice' | 'multiple_choice' | 'true_false' | 'unknown'

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
  questions: QuizItem[]
  num_questions: number
  user_feedback?: UserFeedback
  revision_note?: string
  error?: string
  saved_path?: string
  retry_count?: number
}

export interface HumanFeedbackInput {
  feedback: UserFeedback
  revision_note?: string
}
