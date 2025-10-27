<script setup>
import { CheckmarkOutline } from '@vicons/ionicons5'
import { NButton, NDrawer, NDrawerContent, NEmpty, NIcon, NInput, NLayout, NLayoutContent, NLayoutHeader, NLayoutSider, NList, NListItem, NMenu, NScrollbar, NSpin } from 'naive-ui'
import { computed, onMounted, ref } from 'vue'
import { useModelStore } from '@/store/modules/model'

const modelStore = useModelStore()

// 状态
const show = ref(false)
const activeProvider = ref('')
const search = ref('')
const loading = ref(false)

// 计算属性：获取供应商列表
const providers = computed(() => {
  return modelStore.providers.filter(p => p.enabled && p.models.length > 0)
})

// 左侧菜单配置
const vendorOptions = computed(() => {
  return providers.value.map(provider => ({
    label: provider.displayName || provider.name,
    key: provider.id,
  }))
})

// 当前供应商的模型列表
const currentProviderModels = computed(() => {
  const provider = providers.value.find(p => p.id === activeProvider.value)
  return provider?.models.filter(m => m.enabled) || []
})

// 过滤后的模型列表
const filteredModels = computed(() => {
  if (!search.value) {
    return currentProviderModels.value
  }
  return currentProviderModels.value.filter(m =>
    m.displayName.toLowerCase().includes(search.value.toLowerCase())
    || m.modelId.toLowerCase().includes(search.value.toLowerCase()),
  )
})

// 当前选中的模型
const selectedModel = computed(() => modelStore.currentModel)

// 初始化时设置默认选中的供应商
onMounted(async () => {
  // 如果模型列表未加载，尝试加载
  if (!modelStore.isProvidersLoaded) {
    loading.value = true
    try {
      await modelStore.loadModelsFromBackend()
    }
    catch (error) {
      console.error('❌ 加载模型列表失败:', error)
    }
    finally {
      loading.value = false
    }
  }

  // 设置初始选中的供应商
  if (selectedModel.value) {
    activeProvider.value = selectedModel.value.providerId
  }
  else if (providers.value.length > 0) {
    activeProvider.value = providers.value[0].id
  }
})

// 方法：选择供应商
function handleSelectVendor(providerId) {
  activeProvider.value = providerId
  search.value = '' // 切换供应商时清空搜索
}

// 方法：选择模型
function selectModel(model) {
  modelStore.setCurrentModel(model.id)
  console.log('✅ 已选择模型:', {
    id: model.id,
    displayName: model.displayName,
    modelId: model.modelId,
  })
  show.value = false // 选择后自动关闭
}

// 打开抽屉时刷新选中状态
function handleOpen() {
  show.value = true

  // 如果有选中的模型，定位到对应的供应商
  if (selectedModel.value) {
    activeProvider.value = selectedModel.value.providerId
  }
}
</script>

<template>
  <div>
    <NDrawer v-model:show="show" placement="right" width="800">
      <NDrawerContent title="模型选择器">
        <NSpin :show="loading">
          <template v-if="providers.length === 0 && !loading">
            <NEmpty description="暂无可用模型" />
          </template>

          <template v-else>
            <NLayout has-sider style="height: 600px;">
              <!-- 左侧供应商 -->
              <NLayoutSider width="200" bordered>
                <NMenu
                  v-model:value="activeProvider"
                  :options="vendorOptions"
                  @update:value="handleSelectVendor"
                />
              </NLayoutSider>

              <!-- 右侧模型区 -->
              <NLayout>
                <NLayoutHeader bordered style="padding: 12px;">
                  <NInput
                    v-model:value="search"
                    placeholder="🔍 搜索模型名称..."
                    clearable
                  />
                </NLayoutHeader>
                <NLayoutContent>
                  <NScrollbar style="height: 100%">
                    <template v-if="filteredModels.length === 0">
                      <NEmpty description="未找到匹配的模型" style="padding: 40px;" />
                    </template>

                    <template v-else>
                      <NList bordered>
                        <NListItem
                          v-for="model in filteredModels"
                          :key="model.id"
                          class="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                          @click="selectModel(model)"
                        >
                          <div class="flex justify-between items-center w-full">
                            <div class="flex flex-col">
                              <span class="font-medium">{{ model.displayName }}</span>
                              <span class="text-xs text-gray-500 dark:text-gray-400">{{ model.modelId }}</span>
                            </div>
                            <NIcon
                              v-if="selectedModel && model.id === selectedModel.id"
                              color="#18a058"
                              size="20"
                            >
                              <CheckmarkOutline />
                            </NIcon>
                          </div>
                        </NListItem>
                      </NList>
                    </template>
                  </NScrollbar>
                </NLayoutContent>
              </NLayout>
            </NLayout>
          </template>
        </NSpin>

        <template #footer>
          <div class="flex justify-between items-center">
            <div class="text-sm text-gray-500 dark:text-gray-400">
              当前模型: {{ selectedModel ? selectedModel.displayName : '未选择' }}
            </div>
            <NButton @click="show = false">
              关闭
            </NButton>
          </div>
        </template>
      </NDrawerContent>
    </NDrawer>

    <!-- 悬浮按钮 -->
    <NButton
      circle
      trigger="click"
      style="position: fixed; bottom: 20px; right: 20px; z-index: 999;"
      @click="handleOpen"
    >
      模型
    </NButton>
  </div>
</template>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}
.hover\:bg-gray-100:hover {
  background-color: #f5f5f5;
}
.dark .dark\:hover\:bg-gray-800:hover {
  background-color: #1f2937;
}
</style>
