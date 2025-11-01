/**
 * 模型-角色访问控制服务
 * 管理不同会员等级对模型的访问权限
 */

import type { Model } from './providerService'
import { supabase } from './supabaseClient'

// ============================================
// 类型定义
// ============================================

export interface ModelRoleAccess {
  id: string
  model_id: string
  role_id: number // ✅ BIGINT 类型对应 number
  created_at: string
}

export interface ModelWithAccessRoles extends Model {
  accessible_roles: Array<{
    roleId: number // ✅ BIGINT 类型对应 number
    roleName: string
    roleDescription: string | null
  }>
}

// ============================================
// 权限检查函数
// ============================================

/**
 * 检查用户是否有权限访问指定模型
 * @param userId 用户ID（Supabase UUID）
 * @param modelId 模型ID（Supabase UUID）
 */
export async function userCanAccessModel(userId: string, modelId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('user_can_access_model', {
      p_user_id: userId,
      p_model_id: modelId,
    })

    if (error) {
      console.error('检查模型访问权限失败:', error)
      return false
    }

    return data === true
  }
  catch (error) {
    console.error('检查模型访问权限异常:', error)
    return false
  }
}

/**
 * 获取用户可访问的所有模型
 * @param userId 用户ID（Supabase UUID）
 */
export async function getUserAccessibleModels(userId: string): Promise<Model[]> {
  try {
    const { data, error } = await supabase.rpc('get_user_accessible_models', {
      p_user_id: userId,
    })

    if (error) {
      console.error('获取用户可访问模型失败:', error)
      return []
    }

    return data || []
  }
  catch (error) {
    console.error('获取用户可访问模型异常:', error)
    return []
  }
}

/**
 * 获取用户可访问的供应商及其模型（带权限过滤）
 * @param userId 用户ID（Supabase UUID）
 */
export async function getUserAccessibleProvidersWithModels(userId: string) {
  try {
    // 先获取用户可访问的模型ID列表
    const accessibleModels = await getUserAccessibleModels(userId)
    const accessibleModelIds = new Set(accessibleModels.map(m => m.id))

    // 获取所有供应商和模型
    const { data: providers, error } = await supabase
      .from('providers_with_models')
      .select('*')

    if (error)
      throw error

    // 过滤每个供应商的模型
    const filteredProviders = (providers || []).map((provider: any) => {
      const models = (provider.models || []).filter((model: any) =>
        accessibleModelIds.has(model.id),
      )

      return {
        id: provider.provider_id,
        name: provider.provider_name,
        base_url: provider.base_url,
        api_key: provider.api_key,
        models,
        created_at: provider.provider_created_at,
        updated_at: provider.provider_updated_at,
      }
    }).filter((provider: any) => provider.models.length > 0) // 只返回有可访问模型的供应商

    return filteredProviders
  }
  catch (error) {
    console.error('获取用户可访问的供应商和模型失败:', error)
    return []
  }
}

// ============================================
// 模型-角色关联管理（仅管理员）
// ============================================

/**
 * 为模型分配角色权限
 * @param modelId 模型ID
 * @param roleId 角色ID
 */
export async function assignRoleToModel(modelId: string, roleId: number): Promise<ModelRoleAccess | null> {
  try {
    const { data, error } = await supabase
      .from('model_role_access')
      .insert({
        model_id: modelId,
        role_id: roleId,
      })
      .select()
      .single()

    if (error) {
      console.error('分配模型角色失败:', error)
      return null
    }

    console.warn(`✅ 为模型 ${modelId} 分配角色 ${roleId}`)
    return data
  }
  catch (error) {
    console.error('分配模型角色异常:', error)
    return null
  }
}

/**
 * 移除模型的角色权限
 * @param modelId 模型ID
 * @param roleId 角色ID
 */
export async function removeRoleFromModel(modelId: string, roleId: number): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('model_role_access')
      .delete()
      .eq('model_id', modelId)
      .eq('role_id', roleId)

    if (error) {
      console.error('移除模型角色失败:', error)
      return false
    }

    console.warn(`✅ 移除模型 ${modelId} 的角色 ${roleId}`)
    return true
  }
  catch (error) {
    console.error('移除模型角色异常:', error)
    return false
  }
}

/**
 * 批量设置模型的角色权限（覆盖现有权限）
 * @param modelId 模型ID
 * @param roleIds 角色ID数组
 */
export async function setModelRoles(modelId: string, roleIds: number[]): Promise<boolean> {
  try {
    // 1. 删除该模型的所有现有权限
    const { error: deleteError } = await supabase
      .from('model_role_access')
      .delete()
      .eq('model_id', modelId)

    if (deleteError) {
      console.error('清空模型角色失败:', deleteError)
      return false
    }

    // 2. 如果 roleIds 为空，表示对所有人开放
    if (roleIds.length === 0) {
      console.warn(`✅ 模型 ${modelId} 对所有人开放`)
      return true
    }

    // 3. 批量插入新的权限
    const inserts = roleIds.map(roleId => ({
      model_id: modelId,
      role_id: roleId,
    }))

    const { error: insertError } = await supabase
      .from('model_role_access')
      .insert(inserts)

    if (insertError) {
      console.error('批量设置模型角色失败:', insertError)
      return false
    }

    console.warn(`✅ 为模型 ${modelId} 设置角色: ${roleIds.join(', ')}`)
    return true
  }
  catch (error) {
    console.error('设置模型角色异常:', error)
    return false
  }
}

/**
 * 获取模型的所有可访问角色
 * @param modelId 模型ID
 */
export async function getModelAccessRoles(modelId: string): Promise<number[]> {
  try {
    const { data, error } = await supabase
      .from('model_role_access')
      .select('role_id')
      .eq('model_id', modelId)

    if (error) {
      console.error('获取模型角色失败:', error)
      return []
    }

    return (data || []).map(item => item.role_id)
  }
  catch (error) {
    console.error('获取模型角色异常:', error)
    return []
  }
}

/**
 * 获取所有模型及其可访问角色（使用视图）+ Redis 缓存
 */
export async function getAllModelsWithRoles(): Promise<ModelWithAccessRoles[]> {
  try {
    // 🔥 1. 尝试从 Redis 缓存获取
    const { getModelsWithRolesFromCache } = await import('../cache/modelCache')
    const cached = await getModelsWithRolesFromCache()
    if (cached) {
      console.warn(`✅ [缓存] models_with_roles 缓存命中，返回 ${cached.length} 个模型`)
      return cached
    }

    console.warn(`⚠️ [缓存] models_with_roles 缓存未命中，查询数据库...`)

    // 🔥 2. 从数据库查询
    const { data, error } = await supabase
      .from('models_with_roles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('获取模型和角色列表失败:', error)
      return []
    }

    const result = (data || []).map((item: any) => {
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

    // 🔥 3. 写入 Redis 缓存
    if (result.length > 0) {
      const { redis } = await import('../cache/redisClient.auto')
      const MODELS_WITH_ROLES_KEY = 'models_with_roles:all'
      const CACHE_TTL = 86400 // 24小时
      if (redis) {
        await redis.setex(MODELS_WITH_ROLES_KEY, CACHE_TTL, JSON.stringify(result))
        console.warn(`💾 [缓存] 已缓存 models_with_roles: ${result.length} 个模型`)
      }
    }

    return result
  }
  catch (error) {
    console.error('获取模型和角色列表异常:', error)
    return []
  }
}

/**
 * 检查模型是否对所有人开放（没有角色限制）
 * @param modelId 模型ID
 */
export async function isModelPublic(modelId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('model_role_access')
      .select('id')
      .eq('model_id', modelId)
      .limit(1)

    if (error) {
      console.error('检查模型公开状态失败:', error)
      return false
    }

    // 如果没有任何角色限制，表示对所有人开放
    return !data || data.length === 0
  }
  catch (error) {
    console.error('检查模型公开状态异常:', error)
    return false
  }
}
