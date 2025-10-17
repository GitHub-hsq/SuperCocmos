/**
 * 用户配置服务
 * 提供用户配置的 CRUD 操作
 * 集成 Redis 缓存
 */

import { USER_CONFIG_KEYS } from '../cache/cacheKeys'
import { CACHE_TTL, deleteCached, getCached, setCached } from '../cache/cacheService'
import { supabase } from './supabaseClient'

/**
 * 获取用户完整配置（带缓存）
 */
export async function getUserConfig(userId: string) {
  // 尝试从缓存获取
  const cacheKey = USER_CONFIG_KEYS.full(userId)
  const cached = await getCached(cacheKey)
  if (cached) {
    return cached
  }

  // 缓存未命中，从数据库查询
  const { data, error } = await supabase
    .from('user_configs')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) {
    // 如果用户配置不存在，创建默认配置
    if (error.code === 'PGRST116') {
      console.warn(`ℹ️  [ConfigService] 用户 ${userId} 配置不存在，创建默认配置`)
      return await createUserConfig(userId)
    }
    throw error
  }

  // 保存到缓存
  await setCached(cacheKey, data, CACHE_TTL.USER_CONFIG)

  return data
}

/**
 * 创建用户默认配置
 */
export async function createUserConfig(userId: string) {
  const { data, error } = await supabase
    .from('user_configs')
    .insert({
      user_id: userId,
      // 使用数据库默认值
    })
    .select()
    .single()

  if (error)
    throw error

  console.warn(`✅ [ConfigService] 已为用户 ${userId} 创建默认配置`)
  return data
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
