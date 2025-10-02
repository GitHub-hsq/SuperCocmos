// 模型和供应商相关类型定义

declare namespace Model {
  // 供应商类型
  type ProviderType = 'openai' | 'deepseek' | 'anthropic' | 'google' | 'xai' | 'doubao' | 'qwen'

  // 学科门类
  type Subject = 'math' | 'physics' | 'chemistry' | 'biology' | 'chinese' | 'english'

  // 模型配置参数
  interface ModelConfig {
    temperature?: number
    top_p?: number
    max_tokens?: number
    presence_penalty?: number
    frequency_penalty?: number
  }

  // 模型信息
  interface ModelInfo {
    id: string // 模型唯一标识
    name: string // 模型名称
    displayName: string // 显示名称
    provider: ProviderType // 所属供应商
    enabled?: boolean // 是否启用
    description?: string // 描述
    capabilities?: string[] // 能力标签（如：推理、数学、语言等）
    maxTokens?: number // 最大 token 数
    config?: ModelConfig // 默认配置
  }

  // 供应商信息
  interface ProviderInfo {
    id: ProviderType
    name: string // 供应商名称
    displayName: string // 显示名称
    apiKey?: string // API Key
    baseURL?: string // API Base URL
    models: ModelInfo[] // 该供应商的模型列表
    enabled: boolean // 是否启用
  }

  // 工作流节点类型
  type WorkflowNodeType = 'classify' | 'parse_questions' | 'generate_questions' | 'revise'

  // 工作流节点模型配置
  interface WorkflowNodeConfig {
    nodeType: WorkflowNodeType
    modelId: string // 使用的模型ID
    config?: ModelConfig // 节点专属配置
    subjectSpecific?: Partial<Record<Subject, string>> // 学科特定模型配置
  }

  // 模型状态
  interface ModelState {
    // 当前选中的模型（用于普通聊天）
    currentModelId: string
    // 当前选中的供应商
    currentProviderId: ProviderType
    // 所有供应商配置
    providers: ProviderInfo[]
    // 工作流节点配置
    workflowNodes: WorkflowNodeConfig[]
  }
}

