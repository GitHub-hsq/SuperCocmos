/**
 * 模型和供应商 Redis 缓存服务
 * 启动时预加载所有数据到 Redis，提供快速查询
 */

import type { ModelWithProvider } from '../db/providerService'
import { getAllProvidersWithModels } from '../db/providerService'
import { redis } from './redisClient.auto'
import { logger } from '../utils/logger'

const CACHE_PREFIX = 'model_cache:'
const PROVIDER_CACHE_PREFIX = 'provider_cache:'
const MODELS_WITH_ROLES_KEY = 'models_with_roles:all' // 🔥 models_with_roles 视图缓存键
const CACHE_TTL = 86400 // 24小时（避免频繁过期导致缓存未命中）

/**
 * 预加载所有模型和供应商到 Redis
 */
export async function preloadModelsToRedis(): Promise<void> {
  try {
    const startTime = Date.now()

    // 从数据库获取所有供应商和模型
    const providers = await getAllProvidersWithModels()

    let modelCount = 0
    let providerCount = 0
    const cacheKeySamples: string[] = [] // 记录缓存键样本，用于调试

    // 🔥 缓存整个供应商列表（与 Controller 的查询匹配）
    await redis.setex('providers:list', CACHE_TTL, JSON.stringify(providers))

    // 缓存每个供应商
    for (const provider of providers) {
      const providerKey = `${PROVIDER_CACHE_PREFIX}${provider.id}`
      await redis.setex(
        providerKey,
        CACHE_TTL,
        JSON.stringify({
          id: provider.id,
          name: provider.name,
          base_url: provider.base_url,
          api_key: provider.api_key,
        }),
      )
      providerCount++

      // 缓存每个模型
      for (const model of provider.models) {
        // 使用 model_id + provider_id 作为 key
        const cacheKey = `${CACHE_PREFIX}${model.model_id}:${provider.id}`

        const modelData: ModelWithProvider = {
          id: model.id,
          model_id: model.model_id,
          display_name: model.display_name,
          enabled: model.enabled,
          provider_id: model.provider_id,
          provider: {
            id: provider.id,
            name: provider.name,
            base_url: provider.base_url,
            api_key: provider.api_key,
            enabled: provider.enabled,
            created_at: provider.created_at,
            updated_at: provider.updated_at,
          },
        }

        await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(modelData))

        // 记录前3个缓存键样本用于调试
        if (cacheKeySamples.length < 3) {
          cacheKeySamples.push(cacheKey)
        }

        modelCount++
      }
    }

    const endTime = Date.now()
    logger.info(`✅ [Redis缓存] 预加载完成: ${providerCount} 个供应商, ${modelCount} 个模型, 耗时 ${endTime - startTime}ms`)
    if (cacheKeySamples.length > 0) {
      logger.debug(`📋 [Redis缓存] 缓存键样本:`, cacheKeySamples.slice(0, 3))
    }
  }
  catch (error) {
    console.error('❌ [缓存] 预加载失败:', error)
    // 不抛出错误，让服务继续启动（降级到数据库查询）
  }
}

/**
 * 从 Redis 缓存获取模型配置
 */
export async function getModelFromCache(modelId: string, providerId: string): Promise<ModelWithProvider | null> {
  try {
    const cacheKey = `${CACHE_PREFIX}${modelId}:${providerId}`
    const cached = await redis.get(cacheKey)

    if (cached) {
      logger.debug(`✅ [缓存] 命中: ${cacheKey}`)
      return JSON.parse(cached)
    }

    console.warn(`⚠️ [缓存] 未命中: ${cacheKey}`)
    return null
  }
  catch (error) {
    console.error('❌ [缓存] 获取模型失败:', error)
    return null
  }
}

/**
 * 从 Redis 缓存获取供应商配置
 */
export async function getProviderFromCache(providerId: string): Promise<any> {
  try {
    const cacheKey = `${PROVIDER_CACHE_PREFIX}${providerId}`
    const cached = await redis.get(cacheKey)

    if (cached) {
      return JSON.parse(cached)
    }

    return null
  }
  catch (error) {
    console.error('❌ [缓存] 获取供应商失败:', error)
    return null
  }
}

/**
 * 清除所有模型缓存
 */
export async function clearModelCache(): Promise<void> {
  try {
    const keys = await redis.keys(`${CACHE_PREFIX}*`)
    if (keys.length > 0) {
      await redis.del(...keys)
    }
    console.warn(`🗑️ [缓存] 已清除 ${keys.length} 个模型缓存`)
  }
  catch (error) {
    console.error('❌ [缓存] 清除缓存失败:', error)
  }
}

/**
 * 🔥 预加载 models_with_roles 视图到 Redis
 */
export async function preloadModelsWithRolesToRedis(): Promise<void> {
  try {
    const startTime = Date.now()

    // 🔥 直接从数据库查询（避免循环依赖）
    const { supabase } = await import('../db/supabaseClient')
    const { data, error } = await supabase
      .from('models_with_roles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      logger.warn('⚠️ [Redis缓存] 查询 models_with_roles 失败，跳过预加载:', error.message)
      return
    }

    if (!data || data.length === 0) {
      logger.warn('⚠️ [Redis缓存] 未找到模型角色数据，跳过预加载')
      return
    }

    // 格式化数据
    const models = data.map((item: any) => {
      // 🔥 解析 accessible_roles（可能是 JSON 字符串）
      let accessibleRoles = item.accessible_roles || []
      if (typeof accessibleRoles === 'string') {
        try {
          accessibleRoles = JSON.parse(accessibleRoles)
        }
        catch {
          accessibleRoles = []
        }
      }

      return {
        id: item.model_id,
        model_id: item.model_identifier,
        display_name: item.display_name,
        enabled: item.enabled,
        provider_id: item.provider_id,
        created_at: item.created_at,
        updated_at: item.updated_at,
        accessible_roles: accessibleRoles,
      }
    })

    // 缓存整个列表
    await redis.setex(MODELS_WITH_ROLES_KEY, CACHE_TTL, JSON.stringify(models))

    const endTime = Date.now()
    logger.info(`✅ [Redis缓存] models_with_roles 预加载完成: ${models.length} 个模型, 耗时 ${endTime - startTime}ms`)
  }
  catch (error) {
    console.error('❌ [缓存] models_with_roles 预加载失败:', error)
    // 不抛出错误，让服务继续启动（降级到数据库查询）
  }
}

/**
 * 🔥 从 Redis 缓存获取所有模型及其可访问角色
 */
export async function getModelsWithRolesFromCache(): Promise<any[] | null> {
  try {
    if (!redis) {
      return null
    }

    const cached = await redis.get(MODELS_WITH_ROLES_KEY)
    if (cached) {
      logger.debug(`✅ [缓存] models_with_roles 缓存命中`)
      return JSON.parse(cached)
    }

    return null
  }
  catch (error) {
    console.error('❌ [缓存] 获取 models_with_roles 失败:', error)
    return null
  }
}

/**
 * 🔥 清除 models_with_roles 视图缓存（当模型角色变更时调用）
 */
export async function clearModelsWithRolesCache(): Promise<void> {
  try {
    if (!redis) {
      return
    }

    await redis.del(MODELS_WITH_ROLES_KEY)
    logger.warn('🗑️ [缓存] 已清除 models_with_roles 缓存')
  }
  catch (error) {
    console.error('❌ [缓存] 清除 models_with_roles 缓存失败:', error)
  }
}

/**
 * 🔥 更新 models_with_roles 视图缓存中的单个模型（追加/更新模式）
 * @param modelId 模型ID（UUID）
 * @param roleIds 角色ID数组
 * @param modelInfo 模型基本信息（可选，如果缓存中没有）
 */
export async function updateModelRolesInCache(
  modelId: string,
  roleIds: number[],
  modelInfo?: {
    model_id: string
    display_name: string
    enabled: boolean
    provider_id: string
    created_at: string
    updated_at: string
  },
): Promise<void> {
  try {
    if (!redis) {
      return
    }

    // 🔥 1. 获取角色信息（从缓存）
    const { getAllRolesFromCache } = await import('./roleCache')
    const roles = await getAllRolesFromCache()
    if (!roles || roles.length === 0) {
      logger.warn('⚠️ [缓存] 角色缓存未找到，跳过更新 models_with_roles 缓存')
      return
    }

    // 🔥 2. 构建 accessible_roles 数组
    const accessibleRoles = roleIds
      .map(roleId => {
        const role = roles.find(r => r.role_id === roleId)
        return role ? {
          roleId: role.role_id,
          roleName: role.role_name,
          roleDescription: role.role_description,
        } : null
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)

    // 🔥 3. 获取当前缓存
    const cached = await getModelsWithRolesFromCache()
    if (!cached || cached.length === 0) {
      logger.warn('⚠️ [缓存] models_with_roles 缓存未找到，跳过更新')
      return
    }

    // 🔥 4. 查找并更新模型
    const modelIndex = cached.findIndex((m: any) => m.id === modelId)
    if (modelIndex >= 0) {
      // 更新现有模型
      cached[modelIndex].accessible_roles = accessibleRoles
      cached[modelIndex].updated_at = new Date().toISOString()
    }
    else if (modelInfo) {
      // 添加新模型（如果提供了模型信息）
      cached.push({
        id: modelId,
        model_id: modelInfo.model_id,
        display_name: modelInfo.display_name,
        enabled: modelInfo.enabled,
        provider_id: modelInfo.provider_id,
        created_at: modelInfo.created_at,
        updated_at: modelInfo.updated_at,
        accessible_roles: accessibleRoles,
      })
    }
    else {
      logger.warn(`⚠️ [缓存] 模型 ${modelId} 不在缓存中，且未提供模型信息，跳过更新`)
      return
    }

    // 🔥 5. 写回缓存
    await redis.setex(MODELS_WITH_ROLES_KEY, CACHE_TTL, JSON.stringify(cached))
    logger.info(`✅ [缓存] 已更新 models_with_roles 缓存中的模型: ${modelId}, 角色: ${roleIds.join(', ')}`)
  }
  catch (error) {
    console.error('❌ [缓存] 更新 models_with_roles 缓存失败:', error)
  }
}
