/**
 * 小说工作流相关类型定义
 */

export interface Novel {
  id: string
  user_id: string
  title: string
  genre?: string
  theme?: string
  idea?: string
  status: 'planning' | 'writing' | 'completed'
  current_volume: number
  total_volumes?: number
  created_at: string
  updated_at: string
}

export interface Volume {
  id: string
  novel_id: string
  volume_number: number
  outline?: string
  style_config?: StyleConfig
  breakdown?: ChapterBreakdown[]
  tasks?: TaskPanel
  status: 'outlining' | 'styling' | 'tasking' | 'writing' | 'completed' | 'archived'
  locked: boolean
  created_at: string
  updated_at: string
}

export interface Chapter {
  id: string
  volume_id: string
  chapter_number: number
  title?: string
  content?: string
  burst_point?: string
  score: number
  status: 'pending' | 'generating' | 'reviewing' | 'completed'
  created_at: string
  updated_at: string
}

export interface WorkflowExecution {
  id: string
  volume_id: string
  workflow_type: number
  status: 'running' | 'completed' | 'failed' | 'stopped'
  input?: any
  output?: any
  error?: string
  started_at: string
  completed_at?: string
}

export interface ChatSession {
  id: string
  volume_id: string
  workflow_type: number
  ai_role: string
  messages: ChatMessage[]
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  role: 'user' | 'ai' | 'system'
  content: string
  timestamp: string
}

// 风格配置
export interface StyleConfig {
  perspective: string // 人称视角
  rhythm: string // 节奏
  tone: string // 语气
  [key: string]: any
}

// 章节拆解
export interface ChapterBreakdown {
  chapter_number: number
  title: string
  summary: string
  key_events: string[]
  word_count_target: number
}

// 任务面板
export interface TaskPanel {
  chapters: ChapterTask[]
}

export interface ChapterTask {
  chapter_number: number
  title: string
  objective: string
  key_elements: string[]
  burst_point: string
  estimated_words: number
}

// 工作流1的状态
export interface Workflow1State {
  volume_id: string
  user_id: string
  idea: string
  chat_history: ChatMessage[]
  outline?: string
  review_score?: number
  review_feedback?: string
  iteration_count: number // 迭代次数
  best_outline?: string // 最优大纲
  best_score?: number // 最优分数
  execution_id?: string
}

// 工作流反馈
export interface UserFeedback {
  feedback: 'Accept' | 'Revise' | 'Reject'
  revision_note?: string
}
