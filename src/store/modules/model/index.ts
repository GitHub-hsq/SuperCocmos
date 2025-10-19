/// <reference path="../../../typings/model.d.ts" />
import { defineStore } from 'pinia'
import { fetchProviders } from '@/api'
import { store } from '@/store/helper'
import { clearCurrentModelId, clearProvidersCache, defaultModelState, getCurrentModelId, getLocalWorkflowConfig, getProvidersCache, saveCurrentModelId, saveProvidersCache, setLocalWorkflowConfig } from './helper'

// 后端供应商数据格式（使用下划线命名，匹配后端 API 和 Redis 缓存格式）
interface BackendProviderInfo {
  id: string
  name: string
  base_url: string // 🔥 下划线命名
  api_key: string // 🔥 下划线命名
  models: BackendModelInfo[]
  created_at?: string // 🔥 下划线命名
  updated_at?: string // 🔥 下划线命名
}

// 后端模型数据格式（使用下划线命名，匹配后端 API 和 Redis 缓存格式）
interface BackendModelInfo {
  id: string
  model_id: string // 🔥 下划线命名
  display_name: string // 🔥 下划线命名
  enabled: boolean
  provider_id: string // 🔥 下划线命名
  created_at?: string // 🔥 下划线命名
  updated_at?: string // 🔥 下划线命名
}

export const useModelStore = defineStore('model-store', {
  state: (): Model.ModelState => {
    const defaultState = defaultModelState()
    // 从本地存储读取工作流配置和当前模型ID
    const localWorkflowConfig = getLocalWorkflowConfig()
    const cachedModelId = getCurrentModelId()

    return {
      ...defaultState,
      workflowNodes: localWorkflowConfig || defaultState.workflowNodes,
      currentModelId: cachedModelId || defaultState.currentModelId, // 🔥 优先使用缓存的模型ID
    }
  },

  getters: {
    // 获取当前选中的模型
    currentModel(state): Model.ModelInfo | undefined {
      // 从所有provider中查找
      for (const provider of state.providers) {
        const model = provider.models.find((m: any) => m.id === state.currentModelId)
        if (model) {
          return model
        }
      }
      return undefined
    },

    // 获取当前供应商
    currentProvider(state): Model.ProviderInfo | undefined {
      return state.providers.find((p: any) => p.id === state.currentProviderId)
    },

    // 获取所有已启用的模型
    enabledModels(state): Model.ModelInfo[] {
      const models: Model.ModelInfo[] = []
      state.providers.forEach((provider: any) => {
        if (provider.enabled)
          models.push(...provider.models.filter((m: any) => m.enabled !== false))
      })
      return models
    },

    // 根据供应商ID获取模型列表
    getModelsByProvider: state => (providerId: Model.ProviderType): Model.ModelInfo[] => {
      const provider = state.providers.find((p: any) => p.id === providerId)
      return provider?.models || []
    },

    // 根据节点类型获取配置
    getNodeConfig: state => (nodeType: Model.WorkflowNodeType): Model.WorkflowNodeConfig | undefined => {
      return state.workflowNodes.find((n: any) => n.nodeType === nodeType)
    },
  },

  actions: {
    // 从后端加载模型列表（使用新的 Provider 结构，支持缓存优先）
    async loadModelsFromBackend(forceRefresh = false) {
      try {
        // 🔥 如果不是强制刷新且已经加载过，直接返回
        if (!forceRefresh && this.isProvidersLoaded)
          return true

        // 🔥 如果不是强制刷新，先尝试从缓存加载
        if (!forceRefresh) {
          const cachedProviders = getProvidersCache()
          if (cachedProviders && cachedProviders.length > 0) {
            this.providers = cachedProviders
            this.isProvidersLoaded = true // 标记已加载

            // 验证当前模型是否存在
            this.validateCurrentModel()
            return true
          }
        }
        else {
          clearProvidersCache()
          this.isProvidersLoaded = false // 重置加载状态
        }

        // 从后端加载
        const response = await fetchProviders<BackendProviderInfo[]>()
        if (response.status === 'Success' && response.data) {
          // 将后端数据转换为前端格式
          const providersData = response.data

          // 构建providers数组
          this.providers = providersData.map((provider) => {
            // 🔥 修复：使用后端提供的 UUID 作为 providerId，而不是 name.toLowerCase()
            const providerId = provider.id as Model.ProviderType
            const hasEnabledModel = provider.models.some(m => m.enabled)

            const mappedProvider = {
              id: providerId, // 使用 UUID
              name: provider.name, // 使用原始名称
              displayName: provider.name, // 显示名称就是供应商名称
              enabled: hasEnabledModel, // 如果有任何模型启用，则供应商启用
              models: provider.models.map((m) => {
                const mappedModel = {
                  id: m.id, // 模型的 UUID（用于前端标识）
                  modelId: m.model_id, // 🔥 从下划线字段读取
                  name: m.model_id || m.display_name || m.id, // 原始模型ID
                  displayName: m.display_name || m.model_id || m.id, // 🔥 从下划线字段读取
                  provider: providerId, // 关联到供应商 UUID
                  providerId: provider.id, // 🔥 供应商 UUID（用于查找 baseUrl）
                  enabled: m.enabled,
                }

                return mappedModel
              }),
            }

            return mappedProvider
          })

          // 🔥 保存到缓存
          saveProvidersCache(this.providers)

          // 🔥 标记已加载
          this.isProvidersLoaded = true

          // 验证当前模型是否存在
          this.validateCurrentModel()

          return true
        }
        return false
      }
      catch (error) {
        console.error('❌ [ModelStore] 从后端加载模型失败:', error)
        return false
      }
    },

    // 验证当前模型是否存在，不存在则选择第一个可用模型
    validateCurrentModel() {
      const currentModelExists = this.enabledModels.some((m: any) => m.id === this.currentModelId)
      if (!currentModelExists && this.enabledModels.length > 0) {
        const firstModel = this.enabledModels[0]
        this.currentModelId = firstModel.id
        this.currentProviderId = firstModel.provider
        saveCurrentModelId(this.currentModelId)
      }
      else if (!currentModelExists && this.enabledModels.length === 0) {
        clearCurrentModelId()
      }
    },

    // 设置当前模型
    setCurrentModel(modelId: string) {
      // 验证模型是否存在
      const model = this.enabledModels.find((m: any) => m.id === modelId)
      if (model) {
        this.currentModelId = modelId
        this.currentProviderId = model.provider
        // 🔥 保存到 localStorage
        saveCurrentModelId(modelId)
      }
    },

    // 设置当前供应商
    setCurrentProvider(providerId: Model.ProviderType) {
      this.currentProviderId = providerId
    },

    // 添加供应商
    addProvider(provider: Model.ProviderInfo) {
      const existingIndex = this.providers.findIndex((p: any) => p.id === provider.id)
      if (existingIndex >= 0) {
        // 更新现有供应商
        this.providers[existingIndex] = provider
      }
      else {
        // 添加新供应商
        this.providers.push(provider)
      }
    },

    // 更新供应商
    updateProvider(providerId: Model.ProviderType, updates: Partial<Model.ProviderInfo>) {
      const provider = this.providers.find((p: any) => p.id === providerId)
      if (provider)
        Object.assign(provider, updates)
    },

    // 删除供应商
    removeProvider(providerId: Model.ProviderType) {
      const index = this.providers.findIndex((p: any) => p.id === providerId)
      if (index >= 0)
        this.providers.splice(index, 1)
    },

    // 添加模型到供应商
    addModelToProvider(providerId: Model.ProviderType, model: Model.ModelInfo) {
      const provider = this.providers.find((p: any) => p.id === providerId)
      if (provider) {
        const existingIndex = provider.models.findIndex((m: any) => m.id === model.id)
        if (existingIndex >= 0)
          provider.models[existingIndex] = model

        else
          provider.models.push(model)
      }
    },

    // 从供应商中删除模型
    removeModelFromProvider(providerId: Model.ProviderType, modelId: string) {
      const provider = this.providers.find((p: any) => p.id === providerId)
      if (provider) {
        const index = provider.models.findIndex((m: any) => m.id === modelId)
        if (index >= 0)
          provider.models.splice(index, 1)
      }
    },

    // 更新工作流节点配置
    updateWorkflowNodeConfig(nodeType: Model.WorkflowNodeType, config: Partial<Model.WorkflowNodeConfig>) {
      const node = this.workflowNodes.find((n: any) => n.nodeType === nodeType)
      if (node) {
        Object.assign(node, config)
        this.recordWorkflowConfig()
      }
    },

    // 重置为默认配置
    resetToDefault() {
      const defaultState = defaultModelState()
      this.workflowNodes = defaultState.workflowNodes
      this.recordWorkflowConfig()
    },

    // 记录工作流配置到本地存储（不再保存模型列表）
    recordWorkflowConfig() {
      setLocalWorkflowConfig(this.workflowNodes)
    },

    // 兼容旧代码的方法
    recordState() {
      this.recordWorkflowConfig()
    },
  },
})

export function useModelStoreWithOut() {
  return useModelStore(store)
}
