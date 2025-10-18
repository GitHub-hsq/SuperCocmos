/**
 * 模型显示名称处理工具
 * 用于在隐藏供应商信息的同时，保证模型名称的唯一性
 */

/**
 * 模型信息（后端返回的完整信息）
 */
interface RawModelInfo {
  id: string // UUID
  modelId: string // 原始模型ID，如：gpt-4o
  displayName: string // 全局唯一名称，如：OpenAI_gpt-4o
  provider: string // 供应商名称
  enabled: boolean
}

/**
 * 用户友好的模型显示信息
 */
interface ModelDisplayInfo {
  id: string // 使用 displayName 作为唯一标识
  displayName: string // 用户看到的名称（经过处理）
  fullName: string // 完整名称（供应商_模型ID，管理员可见）
  modelId: string // 原始模型ID
  provider: string // 供应商名称（仅内部使用）
  enabled: boolean
  description?: string
}

/**
 * 生成用户友好的模型显示名称
 *
 * 策略：
 * 1. 如果只有一个供应商提供该模型，直接显示模型名（如：gpt-4o）
 * 2. 如果多个供应商提供相同模型，使用编号区分（如：gpt-4o #1, gpt-4o #2）
 * 3. 管理员模式：显示完整名称（供应商_模型ID）
 *
 * @param models 原始模型列表
 * @param isAdmin 是否为管理员
 * @returns 处理后的模型显示信息
 */
export function generateModelDisplayNames(
  models: RawModelInfo[],
  isAdmin: boolean = false,
): ModelDisplayInfo[] {
  // 管理员模式：直接返回完整信息
  if (isAdmin) {
    return models.map(model => ({
      id: model.displayName, // 使用 displayName 作为全局唯一ID
      displayName: model.displayName, // 显示完整名称：供应商_模型ID
      fullName: model.displayName,
      modelId: model.modelId,
      provider: model.provider,
      enabled: model.enabled,
      description: `${model.provider} - ${model.modelId}`,
    }))
  }

  // 普通用户模式：隐藏供应商信息
  // 1. 统计每个 modelId 出现的次数
  const modelIdCounts = new Map<string, number>()
  const modelIdProviders = new Map<string, string[]>()

  models.forEach((model) => {
    const count = modelIdCounts.get(model.modelId) || 0
    modelIdCounts.set(model.modelId, count + 1)

    const providers = modelIdProviders.get(model.modelId) || []
    if (!providers.includes(model.provider))
      providers.push(model.provider)

    modelIdProviders.set(model.modelId, providers)
  })

  // 2. 为每个 modelId 创建索引映射
  const modelIdIndexMap = new Map<string, Map<string, number>>()
  models.forEach((model) => {
    const count = modelIdCounts.get(model.modelId) || 0
    if (count > 1) {
      // 多个供应商提供相同模型，需要编号
      if (!modelIdIndexMap.has(model.modelId))
        modelIdIndexMap.set(model.modelId, new Map())

      const indexMap = modelIdIndexMap.get(model.modelId)!
      if (!indexMap.has(model.provider))
        indexMap.set(model.provider, indexMap.size + 1)
    }
  })

  // 3. 生成显示名称
  return models.map((model) => {
    const count = modelIdCounts.get(model.modelId) || 1
    let displayName = model.modelId

    if (count > 1) {
      // 多个供应商提供相同模型，添加编号
      const indexMap = modelIdIndexMap.get(model.modelId)!
      const index = indexMap.get(model.provider) || 1
      displayName = `${model.modelId} #${index}`
    }

    return {
      id: model.displayName, // 重要：使用 displayName（供应商_模型ID）作为唯一ID
      displayName, // 用户看到的名称
      fullName: model.displayName, // 完整名称
      modelId: model.modelId,
      provider: model.provider,
      enabled: model.enabled,
      description: count > 1 ? `第 ${modelIdIndexMap.get(model.modelId)!.get(model.provider)} 个 ${model.modelId}` : undefined,
    }
  })
}

/**
 * 根据模型ID查找模型信息
 * @param models 模型列表
 * @param modelId 模型ID（displayName，即：供应商_模型ID）
 * @returns 模型信息
 */
export function findModelById(
  models: ModelDisplayInfo[],
  modelId: string,
): ModelDisplayInfo | undefined {
  return models.find(m => m.id === modelId)
}

/**
 * 根据原始模型ID查找所有匹配的模型
 * @param models 模型列表
 * @param rawModelId 原始模型ID（如：gpt-4o）
 * @returns 匹配的模型列表
 */
export function findModelsByRawId(
  models: ModelDisplayInfo[],
  rawModelId: string,
): ModelDisplayInfo[] {
  return models.filter(m => m.modelId === rawModelId)
}

/**
 * 按供应商分组模型
 * @param models 模型列表
 * @returns 分组后的模型
 */
export function groupModelsByProvider(
  models: ModelDisplayInfo[],
): Record<string, ModelDisplayInfo[]> {
  const grouped: Record<string, ModelDisplayInfo[]> = {}

  models.forEach((model) => {
    if (!grouped[model.provider])
      grouped[model.provider] = []

    grouped[model.provider].push(model)
  })

  return grouped
}

/**
 * 生成模型选项（用于下拉选择）
 * @param models 模型列表
 * @param enabledOnly 是否只显示已启用的模型
 * @param groupByProvider 是否按供应商分组（仅管理员）
 * @returns 模型选项列表
 */
export function generateModelOptions(
  models: ModelDisplayInfo[],
  enabledOnly: boolean = true,
  groupByProvider: boolean = false,
): Config.ModelOption[] {
  const filteredModels = enabledOnly ? models.filter(m => m.enabled) : models

  if (!groupByProvider) {
    // 不分组，直接返回
    return filteredModels.map(model => ({
      label: model.displayName,
      value: model.id, // 使用全局唯一的 display_name
      disabled: !model.enabled,
    }))
  }

  // 按供应商分组（管理员模式）
  const grouped = groupModelsByProvider(filteredModels)
  const options: Config.ModelOption[] = []

  Object.keys(grouped).forEach((provider) => {
    grouped[provider].forEach((model) => {
      options.push({
        label: model.displayName,
        value: model.id,
        disabled: !model.enabled,
        group: provider,
      })
    })
  })

  return options
}

/**
 * 从 localStorage 读取缓存的模型数据
 * @param cacheKey 缓存键名
 * @param _ttl 过期时间（毫秒），默认30分钟
 * @returns 缓存的模型数据，如果过期则返回 null
 */
export function getCachedModels(
  cacheKey: string = 'model_cache',
  _ttl: number = 30 * 60 * 1000, // 30分钟
): Config.CachedModelData | null {
  try {
    const cached = localStorage.getItem(cacheKey)
    if (!cached)
      return null

    const data: Config.CachedModelData = JSON.parse(cached)

    // 检查是否过期
    if (Date.now() > data.expiresAt)
      return null

    return data
  }
  catch (error) {
    console.error('[ModelCache] 读取缓存失败:', error)
    return null
  }
}

/**
 * 将模型数据保存到 localStorage
 * @param models 模型列表
 * @param cacheKey 缓存键名
 * @param ttl 过期时间（毫秒），默认30分钟
 */
export function setCachedModels(
  models: ModelDisplayInfo[],
  cacheKey: string = 'model_cache',
  ttl: number = 30 * 60 * 1000, // 30分钟
): void {
  try {
    const data: Config.CachedModelData = {
      models,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
    }

    localStorage.setItem(cacheKey, JSON.stringify(data))
  }
  catch (error) {
    console.error('[ModelCache] 保存缓存失败:', error)
  }
}

/**
 * 清除模型缓存
 * @param cacheKey 缓存键名
 */
export function clearCachedModels(cacheKey: string = 'model_cache'): void {
  try {
    localStorage.removeItem(cacheKey)
  }
  catch (error) {
    console.error('[ModelCache] 清除缓存失败:', error)
  }
}
