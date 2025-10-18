/// <reference path="../../../typings/model.d.ts" />
import { ss } from '@/utils/storage'

const LOCAL_NAME = 'workflowConfig'
const PROVIDERS_CACHE_KEY = 'providers_cache'
const CACHE_EXPIRY_KEY = 'providers_cache_expiry'
const CURRENT_MODEL_ID_KEY = 'current_model_id'
const CACHE_DURATION = 1000 * 60 * 30 // 30分钟缓存过期时间

// 默认工作流节点配置
export function getDefaultWorkflowNodes(): Model.WorkflowNodeConfig[] {
  return [
    {
      nodeType: 'classify',
      modelId: 'gpt-4o-mini', // 默认使用 GPT-4o Mini
      config: {
        temperature: 0,
        top_p: 1,
      },
    },
    {
      nodeType: 'parse_questions',
      modelId: 'gpt-4o', // 默认
      config: {
        temperature: 0.3,
        top_p: 0.9,
      },
      subjectSpecific: {},
    },
    {
      nodeType: 'generate_questions',
      modelId: 'gpt-4o', // 默认
      config: {
        temperature: 0.7,
        top_p: 0.9,
      },
      subjectSpecific: {},
    },
    {
      nodeType: 'revise',
      modelId: 'gpt-4o',
      config: {
        temperature: 0.5,
        top_p: 0.9,
      },
    },
  ]
}

export function defaultModelState(): Model.ModelState {
  return {
    currentModelId: 'gpt-4o',
    currentProviderId: 'openai',
    providers: [], // 不再设置默认providers，从后端获取
    workflowNodes: getDefaultWorkflowNodes(),
    isProvidersLoaded: false, // 初始化为未加载
  }
}

// ========== 工作流配置相关 ==========
// 只从本地存储读取工作流配置
export function getLocalWorkflowConfig(): Model.WorkflowNodeConfig[] | null {
  const localConfig = ss.get(LOCAL_NAME)
  return localConfig || null
}

// 只保存工作流配置到本地存储
export function setLocalWorkflowConfig(workflowNodes: Model.WorkflowNodeConfig[]): void {
  ss.set(LOCAL_NAME, workflowNodes)
}

// ========== 供应商缓存相关 ==========
// 保存供应商列表到 localStorage（带过期时间）
export function saveProvidersCache(providers: Model.ProviderInfo[]): void {
  try {
    const now = Date.now()
    ss.set(PROVIDERS_CACHE_KEY, providers)
    ss.set(CACHE_EXPIRY_KEY, now + CACHE_DURATION)
  }
  catch (error) {
    console.error('❌ [缓存] 保存供应商列表失败:', error)
  }
}

// 从 localStorage 读取供应商列表（检查是否过期）
export function getProvidersCache(): Model.ProviderInfo[] | null {
  try {
    const expiry = ss.get(CACHE_EXPIRY_KEY)
    const now = Date.now()

    if (!expiry || now > expiry) {
      // 缓存已过期或不存在
      if (expiry)
        clearProvidersCache()

      return null
    }

    const providers = ss.get(PROVIDERS_CACHE_KEY)
    if (providers && Array.isArray(providers) && providers.length > 0)
      return providers

    return null
  }
  catch (error) {
    console.error('❌ [缓存] 读取供应商列表失败:', error)
    return null
  }
}

// 清除供应商缓存
export function clearProvidersCache(): void {
  try {
    ss.remove(PROVIDERS_CACHE_KEY)
    ss.remove(CACHE_EXPIRY_KEY)
  }
  catch (error) {
    console.error('❌ [缓存] 清除供应商列表失败:', error)
  }
}

// ========== 当前模型ID相关 ==========
// 保存当前选中的模型ID
export function saveCurrentModelId(modelId: string): void {
  try {
    ss.set(CURRENT_MODEL_ID_KEY, modelId)
  }
  catch (error) {
    console.error('❌ [缓存] 保存模型ID失败:', error)
  }
}

// 获取当前选中的模型ID
export function getCurrentModelId(): string | null {
  try {
    return ss.get(CURRENT_MODEL_ID_KEY)
  }
  catch (error) {
    console.error('❌ [缓存] 读取模型ID失败:', error)
    return null
  }
}

// 清除当前模型ID
export function clearCurrentModelId(): void {
  try {
    ss.remove(CURRENT_MODEL_ID_KEY)
  }
  catch (error) {
    console.error('❌ [缓存] 清除模型ID失败:', error)
  }
}

// ========== 兼容旧代码的方法 ==========
export function getLocalModelState(): Model.ModelState {
  return defaultModelState()
}

export function setLocalModelState(state: Model.ModelState): void {
  // 只保存工作流配置
  setLocalWorkflowConfig(state.workflowNodes)
}
