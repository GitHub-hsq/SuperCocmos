/**
 * Redis 缓存服务
 * 提供统一的缓存操作接口
 */

import { redis } from './redisClient'

/**
 * 缓存配置（TTL单位：秒）
 */
export const CACHE_TTL = {
  USER_INFO: 60 * 60, // 用户信息: 1小时
  USER_CONFIG: 60 * 60, // 用户配置: 1小时
  USER_ROLES: 60 * 60, // 用户角色: 1小时
  USER_CONVERSATIONS: 30 * 60, // 用户会话列表: 30分钟
  USER_SESSION: 24 * 60 * 60, // 用户会话消息: 24小时
  PROVIDER_LIST: 30 * 60, // 供应商列表: 30分钟
  MODEL_LIST: 30 * 60, // 模型列表: 30分钟
  ROLE_LIST: 60 * 60, // 角色列表: 1小时
}

/**
 * 从缓存获取数据
 */
export async function getCached<T>(key: string): Promise<T | null> {
  if (!redis) {
    console.warn('⚠️  [Cache] Redis 未启用，跳过缓存读取')
    return null
  }

  try {
    const cached = await redis.get(key)
    if (!cached) {
      return null
    }

    const data = JSON.parse(cached) as T
    return data
  }
  catch (error: any) {
    console.error(`❌ [Cache] 读取缓存失败: ${key}`, error.message)
    return null
  }
}

/**
 * 设置缓存
 */
export async function setCached(key: string, value: any, ttl: number): Promise<boolean> {
  if (!redis) {
    console.warn('⚠️  [Cache] Redis 未启用，跳过缓存写入')
    return false
  }

  try {
    const serialized = JSON.stringify(value)
    await redis.setex(key, ttl, serialized)
    return true
  }
  catch (error: any) {
    console.error(`❌ [Cache] 写入缓存失败: ${key}`, error.message)
    return false
  }
}

/**
 * 删除缓存
 */
export async function deleteCached(key: string): Promise<boolean> {
  if (!redis) {
    console.warn('⚠️  [Cache] Redis 未启用，跳过缓存删除')
    return false
  }

  try {
    await redis.del(key)
    return true
  }
  catch (error: any) {
    console.error(`❌ [Cache] 删除缓存失败: ${key}`, error.message)
    return false
  }
}

/**
 * 删除匹配模式的所有缓存
 */
export async function deletePattern(pattern: string): Promise<number> {
  if (!redis) {
    console.warn('⚠️  [Cache] Redis 未启用，跳过模式删除')
    return 0
  }

  try {
    const keys = await redis.keys(pattern)
    if (keys.length === 0) {
      return 0
    }

    await redis.del(...keys)
    return keys.length
  }
  catch (error: any) {
    console.error(`❌ [Cache] 删除模式缓存失败: ${pattern}`, error.message)
    return 0
  }
}

/**
 * 清空所有缓存
 */
export async function flushAll(): Promise<boolean> {
  if (!redis) {
    console.warn('⚠️  [Cache] Redis 未启用，跳过清空操作')
    return false
  }

  try {
    await redis.flushall()
    return true
  }
  catch (error: any) {
    console.error('❌ [Cache] 清空缓存失败:', error.message)
    return false
  }
}

/**
 * 检查缓存键是否存在
 */
export async function exists(key: string): Promise<boolean> {
  if (!redis) {
    return false
  }

  try {
    const result = await redis.exists(key)
    return result === 1
  }
  catch (error: any) {
    console.error(`❌ [Cache] 检查缓存存在失败: ${key}`, error.message)
    return false
  }
}

/**
 * 获取缓存的剩余过期时间（秒）
 */
export async function getTTL(key: string): Promise<number> {
  if (!redis) {
    return -1
  }

  try {
    const ttl = await redis.ttl(key)
    return ttl
  }
  catch (error: any) {
    console.error(`❌ [Cache] 获取 TTL 失败: ${key}`, error.message)
    return -1
  }
}

/**
 * 缓存辅助函数：获取或设置缓存
 * 如果缓存存在，返回缓存数据；否则执行 fetchFn 并缓存结果
 */
export async function getOrSet<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number,
): Promise<T> {
  // 尝试从缓存获取
  const cached = await getCached<T>(key)
  if (cached !== null) {
    return cached
  }

  // 缓存不存在，执行获取函数
  const data = await fetchFn()

  // 保存到缓存
  await setCached(key, data, ttl)

  return data
}
