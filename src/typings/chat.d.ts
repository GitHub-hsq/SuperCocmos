declare namespace Chat {

  interface Chat {
    dateTime: string
    text: string
    inversion?: boolean
    error?: boolean
    loading?: boolean
    conversationOptions?: ConversationRequest | null
    requestOptions: { prompt: string, options?: ConversationRequest | null }
  }

  interface History {
    title: string
    isEdit: boolean
    uuid: string
    mode: 'normal' | 'noteToQuestion' | 'noteToStory'
  }

  // 工作流状态
  type WorkflowStage = 'idle' | 'config' | 'generating' | 'preview' | 'answering' | 'finished'

  interface QuizQuestion {
    type: 'single_choice' | 'multiple_choice' | 'true_false'
    question: string
    options: string[]
    answer: string[]
    explanation?: string
    score?: number
  }

  interface ScoreDistribution {
    single_choice?: { perQuestion: number, total: number }
    multiple_choice?: { perQuestion: number, total: number }
    true_false?: { perQuestion: number, total: number }
  }

  interface WorkflowState {
    stage: WorkflowStage
    uploadedFilePath: string
    classification: string
    generatedQuestions: QuizQuestion[]
    scoreDistribution?: ScoreDistribution
  }

  interface ChatState {
    active: string | null
    usingContext: boolean
    history: History[]
    chat: { uuid: string, data: Chat[] }[]
    chatMode: 'normal' | 'noteToQuestion' | 'noteToStory'
    workflowStates: { uuid: string, state: WorkflowState }[]
  }

  interface ConversationRequest {
    conversationId?: string
    parentMessageId?: string
    model?: string
  }

  interface ConversationResponse {
    conversationId: string
    detail: {
      choices: { finish_reason: string, index: number, logprobs: any, text: string }[]
      created: number
      id: string
      model: string
      object: string
      usage: { completion_tokens: number, prompt_tokens: number, total_tokens: number }
    }
    id: string
    parentMessageId: string
    role: string
    text: string
  }
}
