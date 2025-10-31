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
    uuid: string // 🔥 前端使用的 nanoid（用于路由）
    backendConversationId?: string // 🔥 后端返回的 UUID（用于 API 请求）
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
    conversationId?: string // 后端 UUID（可能为空）
    frontendUuid?: string // 🔥 前端 nanoid（用于数据库映射）
    parentMessageId?: string
    model?: string
    providerId?: string // 供应商 ID
    systemMessage?: string // 系统提示词
    temperature?: number // 温度参数
    top_p?: number // Top P 参数
    maxTokens?: number // 最大输出 tokens
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

  // ==================== 🔥 V2 新架构类型定义 ====================

  /**
   * 会话元数据（轻量级）
   * 用于 localStorage 存储和会话列表显示
   */
  interface ConversationMetadata {
    uuid: string // 前端 nanoid（用于路由）
    backendConversationId: string // 后端 UUID（用于 API 请求）
    title: string // 会话标题
    isEdit: boolean // 是否处于编辑状态
    mode: 'normal' | 'noteToQuestion' | 'noteToStory' // 会话模式

    // 统计信息（从服务器同步）
    messageCount: number // 消息总数
    lastMessagePreview: string // 最后一条消息预览
    lastMessageTime: string // 最后消息时间
    updatedAt: string // 更新时间

    // 本地标记（不同步到服务器）
    hasUnreadMessages: boolean // 是否有未读消息
  }

  /**
   * 当前消息缓存
   * 只存储当前查看会话的消息（临时缓存）
   */
  interface CurrentMessagesCache {
    conversationId: string | null // 当前会话 ID
    messages: Chat[] // 消息列表
    lastSyncTime: number // 最后同步时间戳
  }

  /**
   * V2 存储结构（轻量级）
   * 只在 localStorage 中保存会话元数据，消息按需加载
   */
  interface ChatStorageV2 {
    version: 2 // 版本号（用于数据迁移识别）
    active: string | null // 当前激活的会话 UUID

    // 🔥 只保存会话元数据
    conversations: ConversationMetadata[]

    // 🔥 当前查看会话的消息（临时缓存，可选）
    currentMessages: CurrentMessagesCache

    // 保留的配置
    usingContext: boolean
    chatMode: 'normal' | 'noteToQuestion' | 'noteToStory'
  }

  /**
   * 后端返回的会话元数据格式
   */
  interface ConversationMetadataResponse {
    id: string // 后端 UUID
    title: string
    frontend_uuid?: string // 前端 UUID（如果有）
    message_count: number
    last_message: string
    last_message_time: string
    updated_at: string
  }

  /**
   * 后端返回的消息格式
   */
  interface MessageResponse {
    id: string
    conversation_id: string
    role: 'user' | 'assistant' | 'system'
    content: string
    tokens?: number
    created_at: string
  }
}
