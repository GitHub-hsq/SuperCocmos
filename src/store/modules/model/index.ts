import { defineStore } from 'pinia'
import type { Model } from '@/typings/model'
import { defaultModelState, getLocalWorkflowConfig, setLocalWorkflowConfig } from './helper'
import { store } from '@/store/helper'
import { fetchModels } from '@/api'

// 后端模型数据格式
interface BackendModelInfo {
  id: string
  provider: string
  displayName: string
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export const useModelStore = defineStore('model-store', {
  state: (): Model.ModelState => {
    const defaultState = defaultModelState()
    // 只从本地存储读取工作流配置，模型列表从后端获取
    const localWorkflowConfig = getLocalWorkflowConfig()
    return {
      ...defaultState,
      workflowNodes: localWorkflowConfig || defaultState.workflowNodes,
    }
  },

  getters: {
    // 获取当前选中的模型
    currentModel(state): Model.ModelInfo | undefined {
      // 从所有provider中查找
      for (const provider of state.providers) {
        const model = provider.models.find(m => m.id === state.currentModelId)
        if (model)
          return model
      }
      return undefined
    },

    // 获取当前供应商
    currentProvider(state): Model.ProviderInfo | undefined {
      return state.providers.find(p => p.id === state.currentProviderId)
    },

    // 获取所有已启用的模型
    enabledModels(state): Model.ModelInfo[] {
      const models: Model.ModelInfo[] = []
      state.providers.forEach((provider) => {
        if (provider.enabled) {
          models.push(...provider.models.filter(m => m.enabled !== false))
        }
      })
      return models
    },

    // 根据供应商ID获取模型列表
    getModelsByProvider: state => (providerId: Model.ProviderType): Model.ModelInfo[] => {
      const provider = state.providers.find(p => p.id === providerId)
      return provider?.models || []
    },

    // 根据节点类型获取配置
    getNodeConfig: state => (nodeType: Model.WorkflowNodeType): Model.WorkflowNodeConfig | undefined => {
      return state.workflowNodes.find(n => n.nodeType === nodeType)
    },
  },

  actions: {
    // 从后端加载模型列表
    async loadModelsFromBackend() {
      try {
        const response = await fetchModels<BackendModelInfo[]>()
        if (response.status === 'Success' && response.data) {
          // 将后端数据转换为前端格式
          const modelsData = response.data
          
          // 按供应商分组
          const providerMap = new Map<string, BackendModelInfo[]>()
          modelsData.forEach((model) => {
            if (!providerMap.has(model.provider)) {
              providerMap.set(model.provider, [])
            }
            providerMap.get(model.provider)!.push(model)
          })
          
          // 构建providers数组
          this.providers = Array.from(providerMap.entries()).map(([providerName, models]) => {
            const providerId = providerName.toLowerCase() as Model.ProviderType
            const hasEnabledModel = models.some(m => m.enabled)
            
            return {
              id: providerId,
              name: providerId,
              displayName: providerName,
              enabled: hasEnabledModel, // 如果有任何模型启用，则供应商启用
              models: models.map(m => ({
                id: m.id,
                name: m.id,
                displayName: m.displayName,
                provider: providerId,
                enabled: m.enabled,
              })),
            }
          })
          
          // 如果当前选中的模型不在列表中，选择第一个启用的模型
          const currentModelExists = this.enabledModels.some(m => m.id === this.currentModelId)
          if (!currentModelExists && this.enabledModels.length > 0) {
            const firstModel = this.enabledModels[0]
            this.currentModelId = firstModel.id
            this.currentProviderId = firstModel.provider
          }
          
          return true
        }
        return false
      } catch (error) {
        console.error('从后端加载模型失败:', error)
        return false
      }
    },

    // 设置当前模型
    setCurrentModel(modelId: string) {
      // 验证模型是否存在
      const model = this.enabledModels.find(m => m.id === modelId)
      if (model) {
        this.currentModelId = modelId
        this.currentProviderId = model.provider
        // 不再保存到localStorage
      }
    },

    // 设置当前供应商
    setCurrentProvider(providerId: Model.ProviderType) {
      this.currentProviderId = providerId
    },

    // 添加供应商
    addProvider(provider: Model.ProviderInfo) {
      const existingIndex = this.providers.findIndex(p => p.id === provider.id)
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
      const provider = this.providers.find(p => p.id === providerId)
      if (provider) {
        Object.assign(provider, updates)
      }
    },

    // 删除供应商
    removeProvider(providerId: Model.ProviderType) {
      const index = this.providers.findIndex(p => p.id === providerId)
      if (index >= 0) {
        this.providers.splice(index, 1)
      }
    },

    // 添加模型到供应商
    addModelToProvider(providerId: Model.ProviderType, model: Model.ModelInfo) {
      const provider = this.providers.find(p => p.id === providerId)
      if (provider) {
        const existingIndex = provider.models.findIndex(m => m.id === model.id)
        if (existingIndex >= 0) {
          provider.models[existingIndex] = model
        }
        else {
          provider.models.push(model)
        }
      }
    },

    // 从供应商中删除模型
    removeModelFromProvider(providerId: Model.ProviderType, modelId: string) {
      const provider = this.providers.find(p => p.id === providerId)
      if (provider) {
        const index = provider.models.findIndex(m => m.id === modelId)
        if (index >= 0) {
          provider.models.splice(index, 1)
        }
      }
    },

    // 更新工作流节点配置
    updateWorkflowNodeConfig(nodeType: Model.WorkflowNodeType, config: Partial<Model.WorkflowNodeConfig>) {
      const node = this.workflowNodes.find(n => n.nodeType === nodeType)
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
