/**
 * 用户配置服务
 * 提供用户配置的 CRUD 操作
 * 集成 Redis 缓存
 */

import { USER_CONFIG_KEYS } from '../cache/cacheKeys'
import { CACHE_TTL, deleteCached, getCached, setCached } from '../cache/cacheService'
import { logger } from '../utils/logger'
import { supabase } from './supabaseClient'

/**
 * 获取用户完整配置（带缓存）
 */
export async function getUserConfig(userId: string) {
  const startTime = performance.now()

  // 尝试从缓存获取
  const cacheKey = USER_CONFIG_KEYS.full(userId)
  const cached = await getCached(cacheKey)
  const cacheTime = performance.now() - startTime

  if (cached) {
    if (cacheTime > 100) {
      logger.warn(`⚠️ [ConfigService] 缓存读取耗时: ${cacheTime.toFixed(0)}ms (userId: ${userId.substring(0, 8)}...)`)
    }
    return cached
  }

  // 缓存未命中，从数据库查询
  const dbStartTime = performance.now()
  const { data, error } = await supabase
    .from('user_configs')
    .select('*')
    .eq('user_id', userId)
    .single()

  const dbTime = performance.now() - dbStartTime

  if (dbTime > 500) {
    logger.warn(`⚠️ [ConfigService] 数据库查询耗时: ${dbTime.toFixed(0)}ms (userId: ${userId.substring(0, 8)}...)`)
  }

  if (error) {
    // 如果用户配置不存在，创建默认配置
    if (error.code === 'PGRST116') {
      logger.debug(`ℹ️  [ConfigService] 用户 ${userId.substring(0, 8)}... 配置不存在，创建默认配置`)
      try {
        return await createUserConfig(userId)
      }
      catch (createError: any) {
        // 🔥 如果创建失败（可能是并发创建），重新查询一次
        // 因为另一个请求可能已经创建了配置
        if (createError.code === '23505') {
          logger.warn(`⚠️ [ConfigService] 创建配置时发生并发冲突，重新查询: ${userId.substring(0, 8)}...`)
          const { data: retryData, error: retryError } = await supabase
            .from('user_configs')
            .select('*')
            .eq('user_id', userId)
            .single()

          if (retryError) {
            logger.error(`❌ [ConfigService] 重新查询配置失败:`, retryError)
            throw retryError
          }

          // 立即写入缓存
          await setCached(cacheKey, retryData, CACHE_TTL.USER_CONFIG)
          return retryData
        }
        throw createError
      }
    }
    throw error
  }

  // 保存到缓存（同步写入，确保后续请求能命中缓存）
  await setCached(cacheKey, data, CACHE_TTL.USER_CONFIG)

  return data
}

/**
 * 创建用户默认配置
 * 🔥 处理并发创建：如果配置已存在，则直接查询并返回
 */
export async function createUserConfig(userId: string) {
  try {
    const { data, error } = await supabase
      .from('user_configs')
      .insert({
        user_id: userId,
        // 使用数据库默认值
      })
      .select()
      .single()

    if (error) {
      // 🔥 处理并发创建：如果配置已存在（PostgreSQL 错误码 23505），则查询并返回
      if (error.code === '23505') {
        logger.warn(`⚠️ [ConfigService] 配置已存在（并发创建），重新查询: ${userId.substring(0, 8)}...`)
        // 配置已存在，重新查询
        const { data: existingData, error: queryError } = await supabase
          .from('user_configs')
          .select('*')
          .eq('user_id', userId)
          .single()

        if (queryError) {
          logger.error(`❌ [ConfigService] 重新查询配置失败:`, queryError)
          throw queryError
        }

        // 立即写入缓存
        const cacheKey = USER_CONFIG_KEYS.full(userId)
        await setCached(cacheKey, existingData, CACHE_TTL.USER_CONFIG)

        logger.warn(`✅ [ConfigService] 已从数据库获取现有配置并缓存: ${userId.substring(0, 8)}...`)
        return existingData
      }

      // 其他错误直接抛出
      throw error
    }

    // 🔥 立即写入缓存（确保后续请求能命中缓存）
    const cacheKey = USER_CONFIG_KEYS.full(userId)
    await setCached(cacheKey, data, CACHE_TTL.USER_CONFIG)

    logger.warn(`✅ [ConfigService] 已为用户 ${userId.substring(0, 8)}... 创建默认配置并缓存`)
    return data
  }
  catch (error: any) {
    logger.error(`❌ [ConfigService] 创建用户配置失败:`, error)
    throw error
  }
}

/**
 * 获取用户设置
 */
export async function getUserSettings(userId: string) {
  const config = await getUserConfig(userId)
  return config.user_settings
}

/**
 * 更新用户设置（部分更新）
 */
export async function updateUserSettings(userId: string, updates: any) {
  // 先获取当前配置
  const currentConfig = await getUserConfig(userId)

  // 合并更新
  const newSettings = {
    ...currentConfig.user_settings,
    ...updates,
  }

  // 更新数据库
  const { data, error } = await supabase
    .from('user_configs')
    .update({
      user_settings: newSettings,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select('user_settings')
    .single()

  if (error)
    throw error

  // 清除用户配置缓存
  await deleteCached(USER_CONFIG_KEYS.full(userId))
  await deleteCached(USER_CONFIG_KEYS.settings(userId))

  return data.user_settings
}

/**
 * 获取聊天配置
 */
export async function getChatConfig(userId: string) {
  const config = await getUserConfig(userId)
  return config.chat_config
}

/**
 * 更新聊天配置（部分更新）
 */
export async function updateChatConfig(userId: string, updates: any) {
  // 先获取当前配置
  const currentConfig = await getUserConfig(userId)

  // 合并更新（深度合并 parameters）
  const newChatConfig = {
    ...currentConfig.chat_config,
    ...updates,
  }

  // 如果 updates 包含 parameters，也要深度合并
  if (updates.parameters && currentConfig.chat_config.parameters) {
    newChatConfig.parameters = {
      ...currentConfig.chat_config.parameters,
      ...updates.parameters,
    }
  }

  // 更新数据库
  const { data, error } = await supabase
    .from('user_configs')
    .update({
      chat_config: newChatConfig,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select('chat_config')
    .single()

  if (error)
    throw error

  // 清除用户配置缓存
  await deleteCached(USER_CONFIG_KEYS.full(userId))
  await deleteCached(USER_CONFIG_KEYS.chat(userId))

  return data.chat_config
}

/**
 * 获取工作流配置
 */
export async function getWorkflowConfig(userId: string) {
  const config = await getUserConfig(userId)
  return config.workflow_config
}

/**
 * 更新工作流配置（部分更新）
 */
export async function updateWorkflowConfig(userId: string, updates: any) {
  // 先获取当前配置
  const currentConfig = await getUserConfig(userId)

  // 深度合并工作流配置（每个节点独立合并）
  const newWorkflowConfig = { ...currentConfig.workflow_config }

  for (const [nodeKey, nodeUpdates] of Object.entries(updates)) {
    if (typeof nodeUpdates === 'object' && nodeUpdates !== null) {
      newWorkflowConfig[nodeKey] = {
        ...(currentConfig.workflow_config[nodeKey] || {}),
        ...(nodeUpdates as any),
      }

      // 如果节点包含 parameters，也要深度合并
      const typedNodeUpdates = nodeUpdates as any
      if (typedNodeUpdates.parameters && currentConfig.workflow_config[nodeKey]?.parameters) {
        newWorkflowConfig[nodeKey].parameters = {
          ...currentConfig.workflow_config[nodeKey].parameters,
          ...typedNodeUpdates.parameters,
        }
      }

      // 如果节点包含 subjectSpecific，也要深度合并
      if (typedNodeUpdates.subjectSpecific && currentConfig.workflow_config[nodeKey]?.subjectSpecific) {
        newWorkflowConfig[nodeKey].subjectSpecific = {
          ...currentConfig.workflow_config[nodeKey].subjectSpecific,
          ...typedNodeUpdates.subjectSpecific,
        }
      }
    }
  }

  // 更新数据库
  const { data, error } = await supabase
    .from('user_configs')
    .update({
      workflow_config: newWorkflowConfig,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select('workflow_config')
    .single()

  if (error)
    throw error

  // 清除用户配置缓存
  await deleteCached(USER_CONFIG_KEYS.full(userId))
  await deleteCached(USER_CONFIG_KEYS.workflow(userId))

  return data.workflow_config
}

/**
 * 获取额外配置
 */
export async function getAdditionalConfig(userId: string) {
  const config = await getUserConfig(userId)
  return config.additional_config
}

/**
 * 更新额外配置（部分更新）
 */
export async function updateAdditionalConfig(userId: string, updates: any) {
  // 先获取当前配置
  const currentConfig = await getUserConfig(userId)

  // 合并更新
  const newAdditionalConfig = {
    ...currentConfig.additional_config,
    ...updates,
  }

  // 更新数据库
  const { data, error } = await supabase
    .from('user_configs')
    .update({
      additional_config: newAdditionalConfig,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select('additional_config')
    .single()

  if (error)
    throw error

  // 清除用户配置缓存
  await deleteCached(USER_CONFIG_KEYS.full(userId))

  return data.additional_config
}

/**
 * 删除用户配置（慎用！）
 */
export async function deleteUserConfig(userId: string) {
  const { error } = await supabase
    .from('user_configs')
    .delete()
    .eq('user_id', userId)

  if (error)
    throw error

  // 清除所有相关缓存
  await deleteCached(USER_CONFIG_KEYS.full(userId))
  await deleteCached(USER_CONFIG_KEYS.settings(userId))
  await deleteCached(USER_CONFIG_KEYS.chat(userId))
  await deleteCached(USER_CONFIG_KEYS.workflow(userId))

  console.warn(`⚠️  [ConfigService] 已删除用户 ${userId} 的配置`)
}

/**
 * 重置用户配置为默认值
 */
export async function resetUserConfig(userId: string) {
  // 删除现有配置
  await deleteUserConfig(userId)

  // 创建新的默认配置
  return await createUserConfig(userId)
}
