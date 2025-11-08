/**
 * 配置格式转换器
 * 将前端的工作流配置格式转换为后端工作流所需的格式
 */

import type { ModelConfig, ModelInfo, WorkflowNodeConfig, WorkflowNodeType } from '../quiz/types'

/**
 * 模型配置缓存
 * 避免重复查询数据库
 */
const _modelConfigCache = new Map<string, ModelInfo>()
const CACHE_MAX_SIZE = 100 // 最多缓存100个模型配置
const CACHE_TTL = 5 * 60 * 1000 // 缓存5分钟

interface CacheEntry {
  data: ModelInfo
  timestamp: number
}

const modelConfigCacheWithTTL = new Map<string, CacheEntry>()

/**
 * 前端工作流配置格式（从数据库中获取）
 * 这是 Config.WorkflowConfig 的实际结构
 */
interface FrontendWorkflowNodeConfig {
  displayName: string
  description: string
  modelId: string | null // display_name 格式（如 "OpenAI_gpt-4"）
  parameters: {
    temperature: number
    topP: number
    maxTokens: number
  }
  systemPrompt?: string | null
  subjectSpecific?: Record<string, string> // 学科专属模型ID
}

interface FrontendWorkflowConfig {
  classify: FrontendWorkflowNodeConfig
  parse_questions: FrontendWorkflowNodeConfig
  generate_questions: FrontendWorkflowNodeConfig
  review_and_score: FrontendWorkflowNodeConfig
  revise?: FrontendWorkflowNodeConfig // 向后兼容旧配置
}

/**
 * 从 modelId 中提取供应商和模型信息
 * 支持两种格式：
 * 1. display_name 格式：Provider_ModelID（如 "OpenAI_gpt-4"）
 * 2. UUID 格式：需要从数据库查询（如 "ff5fae90-bc15-43d6-bb73-625f5d71cbfc"）
 * @param modelIdOrDisplayName 模型ID或display_name
 * @returns ModelInfo 对象
 */
async function parseModelId(modelIdOrDisplayName: string | null): Promise<ModelInfo | null> {
  if (!modelIdOrDisplayName)
    return null

  // 🔥 检查缓存
  const cached = modelConfigCacheWithTTL.get(modelIdOrDisplayName)
  if (cached) {
    const now = Date.now()
    if (now - cached.timestamp < CACHE_TTL) {
      // console.warn('🎯 [配置缓存] 命中缓存:', modelIdOrDisplayName)
      return cached.data
    }
    else {
      // 缓存过期，删除
      modelConfigCacheWithTTL.delete(modelIdOrDisplayName)
    }
  }

  // 检查是否为 UUID 格式（8-4-4-4-12）
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const isUUID = uuidRegex.test(modelIdOrDisplayName)

  let modelInfo: ModelInfo | null = null

  if (isUUID) {
    // UUID 格式：从数据库查询模型信息（包含供应商凭证）
    try {
      const { getModelWithProviderById } = await import('../db/providerService')
      const model = await getModelWithProviderById(modelIdOrDisplayName)

      if (model && model.provider) {
        console.warn('✅ [配置转换] 成功加载模型配置:', {
          modelId: model.id,
          modelName: model.model_id,
          providerName: model.provider.name,
          hasApiKey: !!model.provider.api_key,
          hasBaseUrl: !!model.provider.base_url,
        })

        modelInfo = {
          id: model.id,
          name: model.model_id,
          provider: model.provider.name.toLowerCase() as any,
          apiKey: model.provider.api_key,
          baseURL: model.provider.base_url,
        }
      }
      else {
        console.error('❌ [配置转换] 模型或供应商信息不完整:', {
          modelId: modelIdOrDisplayName,
          hasModel: !!model,
          hasProvider: !!model?.provider,
        })
      }
    }
    catch (error) {
      console.error('❌ [配置转换] 从数据库查询模型失败:', error)
      return null
    }
  }
  else {
    // display_name 格式：Provider_ModelID
    const parts = modelIdOrDisplayName.split('_')
    if (parts.length < 2)
      return null

    const provider = parts[0]
    const modelId = parts.slice(1).join('_') // 处理模型ID中可能包含下划线的情况

    modelInfo = {
      id: modelIdOrDisplayName,
      name: modelId,
      provider: provider.toLowerCase() as any,
      // apiKey 和 baseURL 由后端从数据库加载
    }
  }

  // 🔥 存入缓存
  if (modelInfo) {
    modelConfigCacheWithTTL.set(modelIdOrDisplayName, {
      data: modelInfo,
      timestamp: Date.now(),
    })

    // 🔥 限制缓存大小
    if (modelConfigCacheWithTTL.size > CACHE_MAX_SIZE) {
      // 删除最早的条目
      const firstKey = modelConfigCacheWithTTL.keys().next().value
      if (firstKey) {
        modelConfigCacheWithTTL.delete(firstKey)
      }
    }
  }

  return modelInfo
}

/**
 * 将前端工作流配置转换为后端格式
 * @param frontendConfig 前端配置对象（从数据库加载）
 * @returns 后端工作流配置数组
 */
export async function convertFrontendConfigToBackend(
  frontendConfig: FrontendWorkflowConfig,
): Promise<WorkflowNodeConfig[]> {
  const result: WorkflowNodeConfig[] = []

  // 遍历所有节点类型
  const nodeTypes: WorkflowNodeType[] = ['classify', 'parse_questions', 'generate_questions', 'review_and_score']

  for (const nodeType of nodeTypes) {
    // 🔥 向后兼容：如果是 review_and_score 节点，优先使用 review_and_score，否则使用 revise
    let frontendNode = frontendConfig[nodeType]
    if (!frontendNode && nodeType === 'review_and_score') {
      frontendNode = frontendConfig.revise
    }
    if (!frontendNode)
      continue

    // 解析模型信息（支持 UUID 和 display_name）
    const modelInfo = await parseModelId(frontendNode.modelId)
    if (!modelInfo) {
      // 如果没有配置模型，跳过（使用默认模型）
      console.warn(`⚠️  [配置转换] 节点 ${nodeType} 没有配置模型或解析失败，将使用默认模型`)
      continue
    }

    // 构建模型配置
    const modelConfig: ModelConfig = {
      temperature: frontendNode.parameters.temperature,
      top_p: frontendNode.parameters.topP,
      max_tokens: frontendNode.parameters.maxTokens,
    }

    // 构建后端节点配置
    const backendNode: WorkflowNodeConfig = {
      nodeType,
      modelInfo,
      config: modelConfig,
      systemPrompt: frontendNode.systemPrompt || undefined,
    }

    // 处理学科专属模型（如果有）
    if (frontendNode.subjectSpecific) {
      const subjectSpecific: Partial<Record<string, ModelInfo>> = {}
      for (const [subject, modelIdOrDisplayName] of Object.entries(frontendNode.subjectSpecific)) {
        const subjectModelInfo = await parseModelId(modelIdOrDisplayName)
        if (subjectModelInfo) {
          subjectSpecific[subject] = subjectModelInfo
        }
      }
      if (Object.keys(subjectSpecific).length > 0) {
        backendNode.subjectSpecific = subjectSpecific as any
      }
    }

    result.push(backendNode)
  }

  return result
}

/**
 * 测试函数：验证转换逻辑
 */
export function testConverter() {
  const frontendConfig: FrontendWorkflowConfig = {
    classify: {
      displayName: '题目分类',
      description: '识别题目所属学科',
      modelId: 'OpenAI_gpt-4o-mini',
      parameters: {
        temperature: 0.3,
        topP: 0.8,
        maxTokens: 2048,
      },
      systemPrompt: '你是一个分类器...',
    },
    parse_questions: {
      displayName: '题目解析',
      description: '提取题目信息',
      modelId: 'OpenAI_gpt-4',
      parameters: {
        temperature: 0.5,
        topP: 0.9,
        maxTokens: 4096,
      },
    },
    generate_questions: {
      displayName: '题目生成',
      description: '生成练习题',
      modelId: 'OpenAI_gpt-4',
      parameters: {
        temperature: 0.8,
        topP: 0.95,
        maxTokens: 8192,
      },
      systemPrompt: '你是出题助手...',
      subjectSpecific: {
        math: 'OpenAI_gpt-4',
        physics: 'DeepSeek_deepseek-chat',
      },
    },
    revise: {
      displayName: '结果审核',
      description: '检查题目质量',
      modelId: null,
      parameters: {
        temperature: 0.3,
        topP: 0.8,
        maxTokens: 4096,
      },
    },
  }

  const backendConfig = convertFrontendConfigToBackend(frontendConfig)
  console.warn('转换结果:', JSON.stringify(backendConfig, null, 2))
  return backendConfig
}
