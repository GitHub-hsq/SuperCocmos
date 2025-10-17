// ============================================
// 用户配置类型定义 V2
// ============================================

declare namespace Config {
  // ============================================
  // 1. 用户设置（个人信息 + 界面偏好）
  // ============================================
  interface UserSettings {
    avatar: string // 头像链接
    name: string // 显示名称
    theme: 'auto' | 'light' | 'dark' // 主题模式
    language: 'zh-CN' | 'en-US' // 界面语言
  }

  // ============================================
  // 2. 聊天配置
  // ============================================
  interface ChatConfig {
    // 默认模型选择（存储模型ID）
    defaultModel: {
      providerId: string // 供应商ID
      modelId: string // 模型ID（这里是 display_name，全局唯一）
    } | null

    // 模型参数
    parameters: {
      temperature: number // 创造力 0-2，默认0.7
      topP: number // 多样性 0-1，默认0.9
      maxTokens: number // 回复长度 100-128000，默认4096
    }

    // 系统提示词
    systemPrompt: string // 角色设定

    // 流式输出
    streamEnabled: boolean // 打字机效果
  }

  // ============================================
  // 3. 工作流配置
  // ============================================
  type WorkflowNodeType = 'classify' | 'parse_questions' | 'generate_questions' | 'revise'
  type Subject = 'math' | 'physics' | 'chemistry' | 'biology' | 'chinese' | 'english'

  interface WorkflowNodeConfig {
    displayName: string // 节点显示名称
    description: string // 节点功能说明
    modelId: string | null // 使用的模型ID（display_name）
    parameters: {
      temperature: number
      topP: number
      maxTokens: number
    }
    systemPrompt?: string | null // 专属提示词（可选）
    subjectSpecific?: Partial<Record<Subject, string>> // 学科专属模型
  }

  interface WorkflowConfig {
    classify: WorkflowNodeConfig
    parse_questions: WorkflowNodeConfig
    generate_questions: WorkflowNodeConfig
    revise: WorkflowNodeConfig
  }

  // ============================================
  // 4. 完整的用户配置
  // ============================================
  interface UserConfig {
    id: string
    userId: string
    userSettings: UserSettings
    chatConfig: ChatConfig
    workflowConfig: WorkflowConfig
    additionalConfig?: Record<string, any>
    createdAt: string
    updatedAt: string
  }

  // ============================================
  // 5. 配置更新请求（部分更新）
  // ============================================
  interface UpdateUserSettingsRequest {
    userSettings?: Partial<UserSettings>
  }

  interface UpdateChatConfigRequest {
    chatConfig?: Partial<ChatConfig>
  }

  interface UpdateWorkflowConfigRequest {
    workflowConfig?: Partial<WorkflowConfig>
  }

  type UpdateConfigRequest =
    | UpdateUserSettingsRequest
    | UpdateChatConfigRequest
    | UpdateWorkflowConfigRequest

  // ============================================
  // 6. 配置预设
  // ============================================
  interface ConfigPreset {
    name: string
    description: string
    icon?: string
    parameters: {
      temperature: number
      topP: number
      maxTokens: number
    }
  }

  // 预定义的配置预设
  interface ChatPresets {
    creative: ConfigPreset // 创意模式
    balanced: ConfigPreset // 平衡模式
    precise: ConfigPreset // 精确模式
  }

  // ============================================
  // 7. 模型显示相关（隐藏供应商信息）
  // ============================================
  // 模型显示信息（用户友好）
  interface ModelDisplayInfo {
    id: string // 模型唯一ID（display_name: Provider_ModelID）
    displayName: string // 用户看到的名称（隐藏供应商）
    fullName: string // 完整名称（包含供应商，仅管理员可见）
    modelId: string // 原始模型ID（如：gpt-4o）
    provider: string // 供应商名称（仅管理员可见）
    enabled: boolean // 是否启用
    description?: string // 模型描述
  }

  // 模型选项（用于下拉选择）
  interface ModelOption {
    label: string // 显示名称
    value: string // 模型ID（display_name）
    disabled?: boolean // 是否禁用
    group?: string // 分组名称（可选）
  }

  // ============================================
  // 8. 缓存相关
  // ============================================
  interface CachedModelData {
    models: ModelDisplayInfo[]
    timestamp: number // 缓存时间戳
    expiresAt: number // 过期时间戳
  }

  interface CacheConfig {
    key: string // 缓存键名
    ttl: number // 过期时间（毫秒）
    version: string // 缓存版本
  }
}

