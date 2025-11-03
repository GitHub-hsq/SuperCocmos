import { computed, ref } from 'vue'
import { useModelStore } from '@/store'

export interface ModelItem {
  id: string
  name: string
  modelId?: string
  provider: string
  providerId?: string
  displayName: string
  enabled: boolean
  deleted: boolean
  created?: string
}

/**
 * 模型选择器功能
 */
export function useModelSelector() {
  const modelStore = useModelStore()

  // 模型选择器状态
  const showModelSelector = ref(false)
  const activeVendor = ref('') // 当前激活的供应商
  const modelSearch = ref('')
  const selectedModelFromPopover = ref<string | null>(null)
  const currentSelectedModel = ref<ModelItem | null>(null)

  // 获取供应商列表（只显示已启用的供应商）
  const availableVendors = computed(() => {
    try {
      // 从ModelStore获取启用的供应商和模型
      return modelStore.providers
        .filter((provider: any) => provider.enabled && provider.models.length > 0)
        .map((provider: any) => ({
          label: provider.displayName || provider.name,
          key: provider.id,
          count: provider.models.filter((m: any) => m.enabled).length,
        }))
    }
    catch (error) {
      console.error('❌ [模型] 获取供应商列表失败:', error)
      return []
    }
  })

  // 获取当前供应商的模型列表
  const currentVendorModels = computed(() => {
    try {
      // 从ModelStore获取当前供应商的模型
      const provider = modelStore.providers.find((p: any) => p.id === activeVendor.value)

      if (!provider || !provider.enabled)
        return []

      let filteredModels = provider.models.map((model: any) => ({
        id: model.id,
        name: model.name || model.modelId || model.displayName,
        modelId: model.modelId,
        provider: model.provider,
        providerId: model.providerId,
        displayName: model.displayName || model.name || model.modelId,
        enabled: model.enabled !== false,
        deleted: false,
      }))

      // 搜索过滤
      if (modelSearch.value) {
        const keyword = modelSearch.value.toLowerCase()
        filteredModels = filteredModels.filter((model: any) =>
          model.name?.toLowerCase().includes(keyword)
          || model.displayName?.toLowerCase().includes(keyword),
        )
      }

      return filteredModels
    }
    catch (error) {
      console.error('❌ [模型] 获取模型列表失败:', error)
      return []
    }
  })

  // 选择供应商（hover 时触发）
  function handleVendorHover(vendor: string) {
    activeVendor.value = vendor
    modelSearch.value = '' // 清空搜索
  }

  // 加载当前选中的模型
  function loadCurrentModel() {
    try {
      // 从ModelStore获取当前选中的模型
      const currentModelFromStore = modelStore.currentModel

      if (currentModelFromStore) {
        // 检查模型是否仍然存在于可用模型列表中
        const isModelAvailable = modelStore.enabledModels.some((m: any) => m.id === currentModelFromStore.id)

        if (isModelAvailable) {
          // 模型存在，直接使用
          currentSelectedModel.value = {
            id: currentModelFromStore.id,
            name: currentModelFromStore.name || '',
            modelId: currentModelFromStore.modelId || currentModelFromStore.name || '',
            provider: currentModelFromStore.provider,
            providerId: currentModelFromStore.providerId || currentModelFromStore.provider,
            displayName: currentModelFromStore.displayName || currentModelFromStore.name || currentModelFromStore.modelId || '',
            enabled: true,
            deleted: false,
          }
          selectedModelFromPopover.value = currentModelFromStore.id

          // 自动绑定供应商信息
          if (currentModelFromStore.providerId) {
            // 设置 ModelStore 的当前供应商
            if (!modelStore.currentProviderId) {
              modelStore.setCurrentProvider(currentModelFromStore.providerId as any)
            }
            // 同时设置模型选择器 UI 的激活供应商
            activeVendor.value = currentModelFromStore.providerId
          }
        }
        else {
          // 模型不存在，重置为默认状态
          if (import.meta.env.DEV) {
            console.warn('⚠️ [模型] 已保存的模型不存在，重置为默认状态')
          }
          resetToDefaultModel()
        }
      }
      else {
        // 没有保存的模型，重置为默认状态
        resetToDefaultModel()
      }
    }
    catch (error) {
      console.error('❌ [模型] 加载当前模型失败:', error)
      resetToDefaultModel()
    }
  }

  // 重置为默认模型状态
  function resetToDefaultModel() {
    currentSelectedModel.value = null
    selectedModelFromPopover.value = null
    // 清除ModelStore中的当前模型选择
    modelStore.currentModelId = ''
    modelStore.recordState()
  }

  // 选择模型
  function handleSelectModel(model: ModelItem) {
    selectedModelFromPopover.value = model.id
    currentSelectedModel.value = model

    // 自动绑定供应商信息，减少后续查询
    if (model.providerId && model.providerId !== modelStore.currentProviderId) {
      modelStore.setCurrentProvider(model.providerId as any)
    }

    // 保存到ModelStore（异步保存到数据库）
    modelStore.setCurrentModel(model.id).catch((error) => {
      console.error('❌ [模型] 保存模型选择失败:', error)
    })

    // 关闭弹窗
    showModelSelector.value = false
  }

  return {
    // 状态
    showModelSelector,
    activeVendor,
    modelSearch,
    selectedModelFromPopover,
    currentSelectedModel,
    availableVendors,
    currentVendorModels,

    // 方法
    handleVendorHover,
    loadCurrentModel,
    resetToDefaultModel,
    handleSelectModel,
  }
}
