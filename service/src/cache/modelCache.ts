/**
 * 模型和供应商 Redis 缓存服务
 * 启动时预加载所有数据到 Redis，提供快速查询
 */

import type { ModelWithProvider } from '../db/providerService'
import { getAllProvidersWithModels } from '../db/providerService'
import { redis } from './redisClient'

const CACHE_PREFIX = 'model_cache:'
const PROVIDER_CACHE_PREFIX = 'provider_cache:'
const CACHE_TTL = 3600 // 1小时

/**
 * 预加载所有模型和供应商到 Redis
 */
export async function preloadModelsToRedis(): Promise<void> {
  try {
    console.warn('🔄 [缓存] 开始预加载模型和供应商到 Redis...')
    const startTime = Date.now()

    // 从数据库获取所有供应商和模型
    const providers = await getAllProvidersWithModels()

    let modelCount = 0
    let providerCount = 0

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
        modelCount++
      }
    }

    const endTime = Date.now()
    console.warn(`✅ [缓存] 预加载完成: ${providerCount} 个供应商, ${modelCount} 个模型, 耗时 ${endTime - startTime}ms`)
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
      console.warn(`✅ [缓存] 命中: ${modelId}`)
      return JSON.parse(cached)
    }

    console.warn(`⚠️ [缓存] 未命中: ${modelId}`)
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
