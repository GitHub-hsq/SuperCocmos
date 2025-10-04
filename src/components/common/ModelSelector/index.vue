<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NButton, NEmpty, NInput, NModal, NScrollbar, NTag } from 'naive-ui'
import { SvgIcon } from '@/components/common'
import { useModelStore } from '@/store'

interface Props {
  visible: boolean
}

interface Emit {
  (e: 'update:visible', visible: boolean): void
  (e: 'select', modelId: string, provider: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emit>()

const modelStore = useModelStore()

const show = computed({
  get() {
    return props.visible
  },
  set(visible: boolean) {
    emit('update:visible', visible)
  },
})

// 从ModelStore获取已启用的模型
const enabledModels = computed(() => {
  return modelStore.enabledModels.filter((m: any) => m.enabled !== false)
})

// 供应商列表（按模型数量统计）
const providers = computed(() => {
  const providerMap = new Map<string, { name: string; displayName: string; count: number }>()

  enabledModels.value.forEach((model: any) => {
    const providerId = model.provider
    const existing = providerMap.get(providerId)
    if (existing) {
      existing.count++
    }
    else {
      // 从providers中获取显示名称
      const provider = modelStore.providers.find((p: any) => p.id === providerId)
      providerMap.set(providerId, {
        name: providerId,
        displayName: provider?.displayName || providerId,
        count: 1,
      })
    }
  })

  return Array.from(providerMap.entries()).map(([id, data]) => ({
    id,
    name: data.displayName,
    count: data.count,
  }))
})

// 当前选中的供应商
const selectedProvider = ref<string>('')

// 搜索关键词
const searchKeyword = ref('')

// 当前供应商的模型列表（过滤后）
const currentModels = computed(() => {
  let models = enabledModels.value.filter((model: any) => {
    if (selectedProvider.value && model.provider !== selectedProvider.value)
      return false
    return true
  })

  // 搜索过滤
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    models = models.filter((model: any) =>
      model.name.toLowerCase().includes(keyword)
      || model.displayName.toLowerCase().includes(keyword),
    )
  }

  return models
})

// 当前选中的模型
const selectedModel = ref<string>('')

// 供应商颜色映射
const providerColorMap: Record<string, 'default' | 'error' | 'info' | 'success' | 'warning' | 'primary'> = {
  openai: 'success',
  anthropic: 'info',
  google: 'warning',
  deepseek: 'error',
}

// 选择供应商
function selectProvider(providerId: string) {
  selectedProvider.value = providerId
  searchKeyword.value = '' // 清空搜索
  // 如果该供应商有模型，自动选中第一个
  const models = enabledModels.value.filter((m: any) => m.provider === providerId)
  if (models.length > 0)
    selectedModel.value = models[0].id
}

// 选择模型
function selectModel(modelId: string) {
  selectedModel.value = modelId
}

// 确认选择
function handleConfirm() {
  if (selectedModel.value) {
    const model = enabledModels.value.find((m: any) => m.id === selectedModel.value)
    if (model) {
      // 更新 ModelStore
      modelStore.setCurrentModel(model.id)
      emit('select', model.id, model.provider)
    }
  }
  show.value = false
}

// 取消选择
function handleCancel() {
  show.value = false
}

// 监听对话框打开，初始化选择
watch(() => props.visible, (visible) => {
  if (visible) {
    // 使用当前选中的模型
    if (modelStore.currentModelId) {
      selectedModel.value = modelStore.currentModelId
      const currentModel = enabledModels.value.find((m: any) => m.id === modelStore.currentModelId)
      if (currentModel)
        selectedProvider.value = currentModel.provider
    }
    else if (providers.value.length > 0) {
      // 默认选择第一个供应商
      selectProvider(providers.value[0].id)
    }
  }
})
</script>

<template>
  <NModal
    v-model:show="show"
    :auto-focus="false"
    preset="card"
    title="选择模型"
    style="width: 90%; max-width: 900px"
  >
    <div class="flex gap-4" style="height: 500px">
      <!-- 左侧：供应商列表 -->
      <div class="w-1/3 flex flex-col border-r dark:border-neutral-700 pr-4">
        <div class="mb-3 text-sm font-semibold text-gray-600 dark:text-gray-400">
          供应商
        </div>

        <div v-if="providers.length === 0" class="flex-1 flex items-center justify-center">
          <NEmpty description="没有可用的供应商">
            <template #extra>
              <div class="text-sm text-gray-500">
                请先在设置中配置模型
              </div>
            </template>
          </NEmpty>
        </div>

        <NScrollbar v-else class="flex-1">
          <div class="space-y-2">
            <div
              v-for="provider in providers"
              :key="provider.id"
              class="p-4 rounded-lg cursor-pointer transition-all"
              :class="{
                'bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-500': selectedProvider === provider.id,
                'bg-gray-50 dark:bg-neutral-800 hover:bg-gray-100 dark:hover:bg-neutral-700 border-2 border-transparent': selectedProvider !== provider.id,
              }"
              @mouseenter="selectProvider(provider.id)"
            >
              <div class="flex items-center justify-between">
                <div class="font-medium">
                  {{ provider.name }}
                </div>
                <NTag
                  :type="providerColorMap[provider.id] || 'default'"
                  size="small"
                  round
                >
                  {{ provider.count }}
                </NTag>
              </div>
            </div>
          </div>
        </NScrollbar>
      </div>

      <!-- 右侧：模型列表 + 搜索 -->
      <div class="flex-1 flex flex-col">
        <div class="mb-3 text-sm font-semibold text-gray-600 dark:text-gray-400">
          模型
        </div>

        <!-- 搜索框 -->
        <div class="mb-3">
          <NInput
            v-model:value="searchKeyword"
            placeholder="搜索模型名称..."
            clearable
          >
            <template #prefix>
              <SvgIcon icon="ri:search-line" />
            </template>
          </NInput>
        </div>

        <!-- 模型列表 -->
        <div v-if="currentModels.length === 0" class="flex-1 flex items-center justify-center">
          <NEmpty :description="searchKeyword ? '没有找到匹配的模型' : '该供应商没有可用模型'" />
        </div>

        <NScrollbar v-else class="flex-1">
          <div class="space-y-2 pr-2">
            <div
              v-for="model in currentModels"
              :key="model.id"
              class="p-3 rounded-lg cursor-pointer transition-all"
              :class="{
                'bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-500': selectedModel === model.id,
                'bg-gray-50 dark:bg-neutral-800 hover:bg-gray-100 dark:hover:bg-neutral-700 border-2 border-transparent': selectedModel !== model.id,
              }"
              @click="selectModel(model.id)"
            >
              <div class="flex items-center justify-between">
                <div class="flex-1 min-w-0">
                  <div class="font-medium text-sm truncate">
                    {{ model.displayName || model.name }}
                  </div>
                  <div class="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                    {{ model.id }}
                  </div>
                </div>
                <SvgIcon
                  v-if="selectedModel === model.id"
                  class="text-blue-500 text-lg ml-2 flex-shrink-0"
                  icon="ri:checkbox-circle-fill"
                />
              </div>
            </div>
          </div>
        </NScrollbar>
      </div>
    </div>

    <!-- 底部按钮 -->
    <template #footer>
      <div class="flex justify-between items-center">
        <div v-if="selectedModel" class="text-sm text-gray-600 dark:text-gray-400">
          已选择: <span class="font-medium">{{ enabledModels.find((m: any) => m.id === selectedModel)?.displayName }}</span>
        </div>
        <div v-else />
        <div class="flex gap-2">
          <NButton @click="handleCancel">
            取消
          </NButton>
          <NButton type="primary" :disabled="!selectedModel" @click="handleConfirm">
            确认
          </NButton>
        </div>
      </div>
    </template>
  </NModal>
</template>

<style scoped>
/* 自定义滚动条样式 */
:deep(.n-scrollbar-content) {
  padding-right: 8px;
}
</style>
