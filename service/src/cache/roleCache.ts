/**
 * 角色 Redis 缓存服务
 * 启动时预加载所有角色到 Redis，提供快速查询
 */

import type { Role } from '../db/roleService'
import { getAllRoles } from '../db/roleService'
import { logger } from '../utils/logger'
import { redis } from './redisClient.auto'

const ROLE_LIST_KEY = 'roles:list'
const ROLE_ID_PREFIX = 'role:'
const ROLE_NAME_PREFIX = 'role:name:'
const CACHE_TTL = 3600 // 1小时

/**
 * 预加载所有角色到 Redis
 */
export async function preloadRolesToRedis(): Promise<void> {
  try {
    const _startTime = Date.now()

    // 从数据库获取所有角色
    const roles = await getAllRoles()

    if (!roles || roles.length === 0) {
      console.warn('⚠️ [Redis缓存] 未找到角色数据，跳过预加载')
      return
    }

    let _cacheCount = 0

    // 🔥 1. 缓存整个角色列表
    await redis.setex(ROLE_LIST_KEY, CACHE_TTL, JSON.stringify(roles))
    _cacheCount++

    // 🔥 2. 缓存每个角色（通过ID索引）
    for (const role of roles) {
      const roleByIdKey = `${ROLE_ID_PREFIX}${role.role_id}`
      await redis.setex(roleByIdKey, CACHE_TTL, JSON.stringify(role))
      _cacheCount++

      // 🔥 3. 缓存每个角色（通过名称索引）
      const roleByNameKey = `${ROLE_NAME_PREFIX}${role.role_name}`
      await redis.setex(roleByNameKey, CACHE_TTL, JSON.stringify(role))
      _cacheCount++
    }

    // 🔥 简化日志：不再单独输出角色预加载完成信息
  }
  catch (error) {
    console.error('❌ [缓存] 角色预加载失败:', error)
    // 不抛出错误，让服务继续启动（降级到数据库查询）
  }
}

/**
 * 从 Redis 缓存获取所有角色
 */
export async function getAllRolesFromCache(): Promise<Role[] | null> {
  try {
    const cached = await redis.get(ROLE_LIST_KEY)

    if (cached) {
      logger.debug('✅ [缓存] 角色列表缓存命中')
      return JSON.parse(cached)
    }

    console.warn('⚠️ [缓存] 角色列表缓存未命中')
    return null
  }
  catch (error) {
    console.error('❌ [缓存] 获取角色列表失败:', error)
    return null
  }
}

/**
 * 从 Redis 缓存获取单个角色（通过ID）
 */
export async function getRoleByIdFromCache(roleId: number): Promise<Role | null> {
  try {
    const cacheKey = `${ROLE_ID_PREFIX}${roleId}`
    const cached = await redis.get(cacheKey)

    if (cached) {
      logger.debug(`✅ [缓存] 角色缓存命中: ID=${roleId}`)
      return JSON.parse(cached)
    }

    console.warn(`⚠️ [缓存] 角色缓存未命中: ID=${roleId}`)
    return null
  }
  catch (error) {
    console.error('❌ [缓存] 获取角色失败:', error)
    return null
  }
}

/**
 * 从 Redis 缓存获取单个角色（通过名称）
 */
export async function getRoleByNameFromCache(roleName: string): Promise<Role | null> {
  try {
    const cacheKey = `${ROLE_NAME_PREFIX}${roleName}`
    const cached = await redis.get(cacheKey)

    if (cached) {
      logger.debug(`✅ [缓存] 角色缓存命中: ${roleName}`)
      return JSON.parse(cached)
    }

    console.warn(`⚠️ [缓存] 角色缓存未命中: ${roleName}`)
    return null
  }
  catch (error) {
    console.error('❌ [缓存] 获取角色失败:', error)
    return null
  }
}

/**
 * 清除所有角色缓存
 */
export async function clearRoleCache(): Promise<void> {
  try {
    const keys = await redis.keys('role*')
    if (keys.length > 0) {
      await redis.del(...keys)
    }
    console.warn(`🗑️ [缓存] 已清除 ${keys.length} 个角色缓存`)
  }
  catch (error) {
    console.error('❌ [缓存] 清除角色缓存失败:', error)
  }
}
