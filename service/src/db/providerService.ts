import { supabase } from './supabaseClient'

// ============================================
// 类型定义
// ============================================

export interface Provider {
  id: string
  name: string
  base_url: string
  api_key: string
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

export interface Model {
  id: string
  model_id: string
  display_name: string
  enabled: boolean
  provider_id: string
  created_at?: string
  updated_at?: string
  deleted_at?: string | null
}

export interface ProviderWithModels extends Omit<Provider, 'deleted_at'> {
  models: Model[]
}

// ============================================
// Provider 服务函数
// ============================================

/**
 * 获取所有供应商及其模型（使用视图）
 */
export async function getAllProvidersWithModels(): Promise<ProviderWithModels[]> {
  try {
    const { data, error } = await supabase
      .from('providers_with_models')
      .select('*')

    if (error)
      throw error

    // 转换数据库字段名到后端格式（视图使用驼峰命名，需要转换为下划线）
    return (data || []).map((item: any) => ({
      id: item.provider_id,
      name: item.provider_name,
      base_url: item.base_url,
      api_key: item.api_key,
      enabled: true, // 视图没有 provider.enabled，默认为 true
      models: (item.models || []).map((model: any) => ({
        id: model.id,
        model_id: model.modelId, // 🔧 驼峰转下划线
        display_name: model.displayName, // 🔧 驼峰转下划线
        enabled: model.enabled,
        provider_id: model.providerId, // 🔧 驼峰转下划线
        created_at: model.createdAt, // 🔧 驼峰转下划线
        updated_at: model.updatedAt, // 🔧 驼峰转下划线
      })),
      created_at: item.provider_created_at,
      updated_at: item.provider_updated_at,
    }))
  }
  catch (error) {
    console.error('获取供应商列表失败:', error)
    throw error
  }
}

/**
 * 获取所有供应商（不包含模型）
 */
export async function getAllProviders(): Promise<Provider[]> {
  try {
    const { data, error } = await supabase
      .from('providers')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error)
      throw error

    return data || []
  }
  catch (error) {
    console.error('获取供应商列表失败:', error)
    throw error
  }
}

/**
 * 根据ID获取供应商
 */
export async function getProviderById(id: string): Promise<Provider | null> {
  try {
    const { data, error } = await supabase
      .from('providers')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error) {
      if (error.code === 'PGRST116') // 未找到记录
        return null
      throw error
    }

    return data
  }
  catch (error) {
    console.error('获取供应商失败:', error)
    throw error
  }
}

/**
 * 创建新供应商
 */
export async function createProvider(provider: Omit<Provider, 'id' | 'created_at' | 'updated_at'>): Promise<Provider> {
  try {
    const { data, error } = await supabase
      .from('providers')
      .insert({
        name: provider.name,
        base_url: provider.base_url,
        api_key: provider.api_key,
      })
      .select()
      .single()

    if (error)
      throw error

    return data
  }
  catch (error) {
    console.error('创建供应商失败:', error)
    throw error
  }
}

/**
 * 更新供应商
 */
export async function updateProvider(id: string, updates: Partial<Omit<Provider, 'id' | 'created_at' | 'updated_at'>>): Promise<Provider> {
  try {
    const { data, error } = await supabase
      .from('providers')
      .update(updates)
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single()

    if (error)
      throw error

    return data
  }
  catch (error) {
    console.error('更新供应商失败:', error)
    throw error
  }
}

/**
 * 删除供应商（软删除）
 */
export async function deleteProvider(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('providers')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error)
      throw error
  }
  catch (error) {
    console.error('删除供应商失败:', error)
    throw error
  }
}

// ============================================
// Model 服务函数
// ============================================

/**
 * 获取所有模型
 */
export async function getAllModels(): Promise<Model[]> {
  try {
    const { data, error } = await supabase
      .from('models')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error)
      throw error

    return data || []
  }
  catch (error) {
    console.error('获取模型列表失败:', error)
    throw error
  }
}

/**
 * 根据供应商ID获取模型
 */
export async function getModelsByProviderId(providerId: string): Promise<Model[]> {
  try {
    const { data, error } = await supabase
      .from('models')
      .select('*')
      .eq('provider_id', providerId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error)
      throw error

    return data || []
  }
  catch (error) {
    console.error('获取供应商模型失败:', error)
    throw error
  }
}

/**
 * 根据ID获取模型
 */
export async function getModelById(id: string): Promise<Model | null> {
  try {
    const { data, error } = await supabase
      .from('models')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error) {
      if (error.code === 'PGRST116')
        return null
      throw error
    }

    return data
  }
  catch (error) {
    console.error('获取模型失败:', error)
    throw error
  }
}

/**
 * 创建新模型
 */
export async function createModel(model: Omit<Model, 'id' | 'created_at' | 'updated_at'>): Promise<Model> {
  try {
    const { data, error } = await supabase
      .from('models')
      .insert({
        model_id: model.model_id,
        display_name: model.display_name,
        enabled: model.enabled ?? true,
        provider_id: model.provider_id,
      })
      .select()
      .single()

    if (error)
      throw error

    return data
  }
  catch (error) {
    console.error('创建模型失败:', error)
    throw error
  }
}

/**
 * 更新模型
 */
export async function updateModel(id: string, updates: Partial<Omit<Model, 'id' | 'created_at' | 'updated_at' | 'provider_id'>>): Promise<Model> {
  try {
    const { data, error } = await supabase
      .from('models')
      .update(updates)
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single()

    if (error)
      throw error

    return data
  }
  catch (error) {
    console.error('更新模型失败:', error)
    throw error
  }
}

/**
 * 删除模型（软删除）
 */
export async function deleteModel(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('models')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error)
      throw error
  }
  catch (error) {
    console.error('删除模型失败:', error)
    throw error
  }
}

/**
 * 切换模型启用状态
 */
export async function toggleModelEnabled(id: string, enabled: boolean): Promise<Model> {
  try {
    const { data, error } = await supabase
      .from('models')
      .update({ enabled })
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single()

    if (error)
      throw error

    return data
  }
  catch (error) {
    console.error('切换模型状态失败:', error)
    throw error
  }
}

// ============================================
// 查询模型配置（用于聊天时获取 Provider 信息）
// ============================================

export interface ModelWithProvider extends Model {
  provider: Provider
}

/**
 * 根据 display_name 查询模型及其 Provider 信息
 * 用于聊天时根据模型名称获取 API 配置
 */
export async function getModelWithProviderByDisplayName(displayName: string): Promise<ModelWithProvider | null> {
  try {
    const { data, error } = await supabase
      .from('models')
      .select(`
        *,
        provider:providers(*)
      `)
      .eq('display_name', displayName)
      .eq('enabled', true)
      .is('deleted_at', null)
      .single()

    if (error) {
      if (error.code === 'PGRST116')
        return null
      throw error
    }

    if (!data || !data.provider)
      return null

    return {
      ...data,
      provider: Array.isArray(data.provider) ? data.provider[0] : data.provider,
    }
  }
  catch (error) {
    console.error('查询模型配置失败:', error)
    return null
  }
}

/**
 * 根据 model_id 查询所有匹配的模型及其 Provider 信息
 * 可能返回多个结果（同一 model_id 可能有多个供应商）
 */
export async function getModelsWithProviderByModelId(modelId: string): Promise<ModelWithProvider[]> {
  try {
    console.warn(`🔍 [DB] 开始查询模型: model_id="${modelId}"`)

    const { data, error } = await supabase
      .from('models')
      .select(`
        *,
        provider:providers(*)
      `)
      .eq('model_id', modelId)
      .eq('enabled', true)
      .is('deleted_at', null)

    if (error) {
      console.error('❌ [DB] Supabase 查询错误:', error)
      throw error
    }

    console.warn(`📊 [DB] 查询结果数量: ${data?.length || 0}`)
    if (data && data.length > 0) {
      console.warn(`📝 [DB] 查询到的模型:`, data.map((m: any) => ({
        id: m.id,
        model_id: m.model_id,
        display_name: m.display_name,
        enabled: m.enabled,
        provider_id: m.provider_id,
        provider_name: m.provider?.name || 'NO PROVIDER',
      })))
    }
    else {
      console.warn('⚠️ [DB] 未找到匹配的模型，尝试查询所有数据以调试...')

      // 调试：查询所有模型看看数据库里有什么
      const { data: allModels } = await supabase
        .from('models')
        .select('id, model_id, display_name, enabled, deleted_at, provider_id')
        .is('deleted_at', null)
        .limit(10)

      console.warn('📋 [DB] 数据库中的前10个模型:', allModels)
    }

    return (data || []).map((item: any) => ({
      ...item,
      provider: Array.isArray(item.provider) ? item.provider[0] : item.provider,
    }))
  }
  catch (error) {
    console.error('❌ [DB] 查询模型配置失败:', error)
    return []
  }
}
