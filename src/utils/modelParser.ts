/// <reference path="../typings/model.d.ts" />
// 模型解析工具 - 从 API 返回的数据中智能识别供应商和模型型号

// API 返回的原始模型数据
export interface RawModelData {
  id: string
  object: string
  created: number
  owned_by: string
  supported_endpoint_types?: string[]
}

// 供应商识别规则
const providerRules: Array<{
  provider: Model.ProviderType
  patterns: RegExp[]
  keywords: string[]
}> = [
  {
    provider: 'openai',
    patterns: [/^(gpt-|chatgpt-|o1-|o3-)/i, /^openai\//i, /^basic\/chatgpt/i],
    keywords: ['gpt', 'chatgpt', 'openai'],
  },
  {
    provider: 'anthropic',
    patterns: [/claude/i, /^az\/claude/i, /anthropic\//i],
    keywords: ['claude', 'anthropic'],
  },
  {
    provider: 'deepseek',
    patterns: [/^deepseek/i, /deepseek\//i],
    keywords: ['deepseek'],
  },
  {
    provider: 'google',
    patterns: [/^gemini/i, /^google\//i, /google\/gemini/i],
    keywords: ['gemini', 'google'],
  },
  {
    provider: 'xai',
    patterns: [/^grok/i, /^xai\//i],
    keywords: ['grok', 'xai'],
  },
  {
    provider: 'doubao',
    patterns: [/^doubao/i, /豆包/, /^bytedance\//i],
    keywords: ['doubao', 'bytedance'],
  },
  {
    provider: 'qwen',
    patterns: [/^qwen/i, /^通义/, /^alibaba\//i],
    keywords: ['qwen', 'tongyi', 'alibaba'],
  },
]

/**
 * 识别供应商
 */
export function identifyProvider(modelId: string, ownedBy: string): Model.ProviderType | null {
  const lowerModelId = modelId.toLowerCase()
  const lowerOwnedBy = ownedBy.toLowerCase()

  // 如果 owned_by 是有效的供应商，直接返回
  const directMatch = providerRules.find(rule => rule.provider === lowerOwnedBy)
  if (directMatch)
    return directMatch.provider

  // 从 model id 中匹配
  for (const rule of providerRules) {
    // 检查正则匹配
    if (rule.patterns.some(pattern => pattern.test(modelId)))
      return rule.provider

    // 检查关键词
    if (rule.keywords.some(keyword => lowerModelId.includes(keyword)))
      return rule.provider
  }

  return null
}

/**
 * 提取模型名称
 * 规则：
 * 1. 如果有前缀（如 az/, basic/, google/），去掉前缀
 * 2. 如果没有前缀，直接使用原始ID作为模型名称
 * 3. 保留核心模型名称
 */
export function extractModelName(modelId: string): string {
  // 检查是否包含斜杠
  if (modelId.includes('/')) {
    // 去除常见前缀
    const prefixes = ['az/', 'basic/', 'google/', 'openai/', 'anthropic/', 'xai/', 'deepseek/', 'alibaba/', 'bytedance/']
    let modelName = modelId

    for (const prefix of prefixes) {
      if (modelName.startsWith(prefix)) {
        modelName = modelName.substring(prefix.length)
        break
      }
    }

    return modelName
  }

  // 如果没有斜杠，直接返回原始ID作为模型名称
  return modelId
}

/**
 * 生成显示名称
 */
export function generateDisplayName(modelName: string, _provider: Model.ProviderType): string {
  // 特殊处理一些常见的模型
  const nameMap: Record<string, string> = {
    'gpt-4o': 'GPT-4o',
    'gpt-4o-mini': 'GPT-4o Mini',
    'chatgpt-4o-latest': 'ChatGPT-4o Latest',
    'gpt-4-turbo': 'GPT-4 Turbo',
    'gpt-3.5-turbo': 'GPT-3.5 Turbo',
    'o1': 'O1',
    'o1-mini': 'O1 Mini',
    'claude-3-5-haiku-20241022': 'Claude 3.5 Haiku',
    'claude-3-7-sonnet-20250219': 'Claude 3.7 Sonnet',
    'claude-opus-4-20250514': 'Claude Opus 4',
    'claude-opus-4-20250514-thinking': 'Claude Opus 4 (Thinking)',
    'claude-sonnet-4-20250514': 'Claude Sonnet 4',
    'deepseek-v3': 'DeepSeek V3',
    'deepseek-chat': 'DeepSeek Chat',
    'deepseek-reasoner': 'DeepSeek R1',
    'gemini-1.5-pro': 'Gemini 1.5 Pro',
    'gemini-1.5-flash': 'Gemini 1.5 Flash',
    'gemini-2.0-flash': 'Gemini 2.0 Flash',
    'grok-beta': 'Grok Beta',
  }

  // 检查是否有映射
  const mapped = nameMap[modelName.toLowerCase()]
  if (mapped)
    return mapped

  // 如果包含 thinking 关键词，添加标识
  if (modelName.includes('thinking'))
    return `${capitalizeWords(modelName.replace('-thinking', ''))} (Thinking)`

  // 默认：首字母大写
  return capitalizeWords(modelName)
}

/**
 * 首字母大写
 */
function capitalizeWords(str: string): string {
  return str
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * 推断模型能力
 */
export function inferCapabilities(modelName: string, provider: Model.ProviderType): string[] {
  const capabilities: string[] = []
  const lowerName = modelName.toLowerCase()

  // 通用能力推断
  if (lowerName.includes('thinking') || lowerName.includes('reasoner') || lowerName.includes('o1') || lowerName.includes('r1'))
    capabilities.push('推理')

  if (provider === 'openai' || provider === 'deepseek')
    capabilities.push('代码')

  if (lowerName.includes('mini') || lowerName.includes('flash') || lowerName.includes('turbo'))
    capabilities.push('快速')

  if (lowerName.includes('vision') || lowerName.includes('gemini'))
    capabilities.push('多模态')

  if (provider === 'anthropic' || provider === 'qwen')
    capabilities.push('语言')

  if (lowerName.includes('gpt-4') || lowerName.includes('claude') || lowerName.includes('deepseek'))
    capabilities.push('通用')

  return capabilities.length > 0 ? capabilities : ['通用']
}

/**
 * 解析原始模型数据
 */
export function parseRawModel(raw: RawModelData): Model.ModelInfo | null {
  // 识别供应商
  const provider = identifyProvider(raw.id, raw.owned_by)
  if (!provider)
    return null

  // 提取模型名称
  const modelName = extractModelName(raw.id)

  // 生成显示名称
  const displayName = generateDisplayName(modelName, provider)

  // 推断能力
  const capabilities = inferCapabilities(modelName, provider)

  return {
    id: raw.id,
    name: modelName,
    displayName,
    provider,
    capabilities,
  }
}

/**
 * 批量解析模型数据并按供应商分组
 */
export function parseAndGroupModels(rawModels: RawModelData[]): Record<Model.ProviderType, Model.ModelInfo[]> {
  const grouped: Record<string, Model.ModelInfo[]> = {
    openai: [],
    anthropic: [],
    deepseek: [],
    google: [],
    xai: [],
    doubao: [],
    qwen: [],
  }

  for (const raw of rawModels) {
    const model = parseRawModel(raw)
    if (model) {
      if (!grouped[model.provider])
        grouped[model.provider] = []

      grouped[model.provider].push(model)
    }
  }

  return grouped as Record<Model.ProviderType, Model.ModelInfo[]>
}
