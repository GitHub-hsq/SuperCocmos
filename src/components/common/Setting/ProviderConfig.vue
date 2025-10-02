<script setup lang="ts">
import { computed, h, ref, watch } from 'vue'
import { NButton, NDataTable, NForm, NFormItem, NInput, NModal, NPopconfirm, NSpace, NSwitch, NTag, useMessage } from 'naive-ui'
import type { DataTableColumns } from 'naive-ui'
import { SvgIcon } from '@/components/common'
import { addModel, deleteModel, fetchModels, testModel, updateModel } from '@/api'
import { useModelStore } from '@/store'

interface Props {
  visible?: boolean
}

const props = defineProps<Props>()

// 定义模型数据类型
interface ModelItem {
  id: string
  provider: string
  displayName: string
  enabled: boolean
  createdAt: string
  updatedAt: string
}

const message = useMessage()
const modelStore = useModelStore()

// 是否已加载过数据
const hasLoaded = ref(false)

// 加载模型状态
const loadingModels = ref(false)

// 模型列表
const modelsList = ref<ModelItem[]>([])

// 新增模型对话框
const showAddModel = ref(false)
const addModelForm = ref({
  id: '',
  provider: '',
  displayName: '',
  enabled: true,
})

// 测试模型相关
const testingModel = ref(false)
const testResult = ref<{ success: boolean; message: string; response?: string } | null>(null)

// 监听模型ID变化，自动同步到显示名称
watch(() => addModelForm.value.id, (newId) => {
  // 只在显示名称为空或与旧ID相同时才自动同步
  if (!addModelForm.value.displayName || addModelForm.value.displayName === oldModelId.value) {
    addModelForm.value.displayName = newId
  }
  oldModelId.value = newId
})

// 记录上一次的模型ID，用于判断是否自动同步
const oldModelId = ref('')

// 编辑模型对话框
const showEditModel = ref(false)
const editModelForm = ref<ModelItem | null>(null)

// 过滤后的模型列表（已启用的）
const enabledModels = computed(() => {
  return modelsList.value.filter(model => model.enabled)
})

// 过滤后的模型列表（已禁用的）
const disabledModels = computed(() => {
  return modelsList.value.filter(model => !model.enabled)
})

// 表格列定义
const columns: DataTableColumns<ModelItem> = [
  {
    title: '模型ID',
    key: 'id',
    ellipsis: { tooltip: true },
    width: 200,
  },
  {
    title: '供应商',
    key: 'provider',
    width: 150,
    render: (row) => {
      const colorMap: Record<string, 'success' | 'info' | 'warning' | 'error' | 'default'> = {
        'OpenAI': 'success',
        'Anthropic': 'info',
        'Google': 'warning',
        'DeepSeek': 'error',
      }
      const tagType = colorMap[row.provider] || 'default'
      return h(NTag, {
        type: tagType,
        size: 'small',
      }, { default: () => row.provider })
    },
  },
  {
    title: '显示名称',
    key: 'displayName',
    ellipsis: { tooltip: true },
    width: 180,
  },
  {
    title: '启用状态',
    key: 'enabled',
    width: 100,
    render: (row) => {
      return h(NSwitch, {
        value: row.enabled,
        onUpdateValue: (value: boolean) => {
          toggleModelEnabled(row.id, value)
        },
      })
    },
  },
  {
    title: '创建时间',
    key: 'createdAt',
    width: 180,
    render: (row) => {
      return new Date(row.createdAt).toLocaleString('zh-CN')
    },
  },
  {
    title: '操作',
    key: 'actions',
    width: 150,
    fixed: 'right',
    render: (row) => {
      return h('div', { class: 'flex gap-2' }, [
        h(NButton, {
          size: 'small',
          type: 'primary',
          secondary: true,
          onClick: () => editModel(row),
        }, { default: () => '编辑' }),
        h(NPopconfirm, {
          onPositiveClick: () => handleDeleteModel(row.id),
        }, {
          trigger: () => h(NButton, {
            size: 'small',
            type: 'error',
          }, { default: () => '删除' }),
          default: () => '确定要删除这个模型吗？',
        }),
      ])
    },
  },
]

// 从后端加载模型列表
async function loadModels() {
  loadingModels.value = true
  try {
    const response = await fetchModels<ModelItem[]>()
    if (response.status === 'Success' && response.data) {
      modelsList.value = response.data
      hasLoaded.value = true
    } else {
      message.error('加载模型列表失败')
    }
  } catch (error: any) {
    console.error('加载模型列表失败:', error)
    message.error(`加载失败: ${error.message || '未知错误'}`)
  } finally {
    loadingModels.value = false
  }
}

// 切换模型启用状态
async function toggleModelEnabled(id: string, enabled: boolean) {
  try {
    const response = await updateModel({ id, enabled })
    if (response.status === 'Success') {
      const model = modelsList.value.find(m => m.id === id)
      if (model) {
        model.enabled = enabled
      }
      message.success(enabled ? '模型已启用' : '模型已禁用')
      // 重新加载到ModelStore
      await modelStore.loadModelsFromBackend()
    } else {
      message.error('操作失败')
    }
  } catch (error) {
    console.error('切换模型状态失败:', error)
    message.error('操作失败')
  }
}

// 打开新增模型对话框
function openAddModel() {
  addModelForm.value = {
    id: '',
    provider: '',
    displayName: '',
    enabled: true,
  }
  oldModelId.value = ''
  testResult.value = null
  showAddModel.value = true
}

// 提交新增模型
async function handleAddModel() {
  if (!addModelForm.value.id || !addModelForm.value.provider || !addModelForm.value.displayName) {
    message.warning('请填写完整的模型信息')
    return
  }

  try {
    const response = await addModel(addModelForm.value)
    if (response.status === 'Success') {
      message.success('模型添加成功')
      showAddModel.value = false
      await loadModels() // 重新加载列表
      // 重新加载到ModelStore，这样其他地方也能立即看到
      await modelStore.loadModelsFromBackend()
    } else {
      // 正确显示后端返回的错误消息
      message.error(response.message || '模型添加失败')
    }
  } catch (error: any) {
    console.error('添加模型失败:', error)
    // 从error.response中获取后端返回的message
    const errorMessage = error.response?.data?.message || error.message || '未知错误'
    message.error(errorMessage)
  }
}

// 编辑模型
function editModel(model: ModelItem) {
  editModelForm.value = { ...model }
  showEditModel.value = true
}

// 提交编辑模型
async function handleEditModel() {
  if (!editModelForm.value) return

  if (!editModelForm.value.provider || !editModelForm.value.displayName) {
    message.warning('请填写完整的模型信息')
    return
  }

  try {
    const response = await updateModel({
      id: editModelForm.value.id,
      provider: editModelForm.value.provider,
      displayName: editModelForm.value.displayName,
    })
    if (response.status === 'Success') {
      message.success('模型更新成功')
      showEditModel.value = false
      await loadModels() // 重新加载列表
      // 重新加载到ModelStore
      await modelStore.loadModelsFromBackend()
    } else {
      message.error(response.message || '模型更新失败')
    }
  } catch (error: any) {
    console.error('更新模型失败:', error)
    message.error(`更新失败: ${error.message || '未知错误'}`)
  }
}

// 删除模型
async function handleDeleteModel(id: string) {
  try {
    const response = await deleteModel(id)
    if (response.status === 'Success') {
      message.success('模型删除成功')
      await loadModels() // 重新加载列表
      // 重新加载到ModelStore
      await modelStore.loadModelsFromBackend()
    } else {
      message.error(response.message || '模型删除失败')
    }
  } catch (error: any) {
    console.error('删除模型失败:', error)
    message.error(`删除失败: ${error.message || '未知错误'}`)
  }
}

// 测试模型连接
async function handleTestModel() {
  if (!addModelForm.value.id) {
    message.warning('请先填写模型ID')
    return
  }

  // 检查模型ID是否已存在
  const existingModel = modelsList.value.find(m => m.id === addModelForm.value.id)
  if (existingModel) {
    testResult.value = {
      success: false,
      message: `模型ID "${addModelForm.value.id}" 已存在，请使用其他ID`,
    }
    return
  }

  testingModel.value = true
  testResult.value = null

  try {
    const response = await testModel(addModelForm.value.id)
    
    if (response.status === 'Success' && response.data?.success) {
      testResult.value = {
        success: true,
        message: '测试成功！模型响应正常',
        response: response.data.response,
      }
    } else {
      testResult.value = {
        success: false,
        message: response.data?.error || response.message || '测试失败',
      }
    }
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message || '测试过程出错'
    testResult.value = {
      success: false,
      message: errorMessage,
    }
  } finally {
    testingModel.value = false
  }
}

// 监听visible变化，只在第一次显示时加载数据
watch(() => props.visible, (visible) => {
  if (visible && !hasLoaded.value) {
    loadModels()
  }
}, { immediate: true })
</script>

<template>
  <div class="p-4 space-y-4">
    <!-- 标题和操作栏 -->
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-semibold">模型配置</h3>
      <NSpace>
        <NButton 
          type="primary" 
          @click="openAddModel"
        >
          <template #icon>
            <SvgIcon icon="ri:add-line" />
          </template>
          新增模型
        </NButton>
        <NButton 
          secondary
          :loading="loadingModels"
          @click="loadModels"
        >
          <template #icon>
            <SvgIcon icon="ri:refresh-line" />
          </template>
          刷新
        </NButton>
      </NSpace>
    </div>

    <!-- 统计信息 -->
    <div class="flex gap-4 text-sm">
      <span class="text-neutral-600 dark:text-neutral-400">
        总计: <span class="font-semibold text-neutral-900 dark:text-neutral-100">{{ modelsList.length }}</span> 个模型
      </span>
      <span class="text-neutral-600 dark:text-neutral-400">
        已启用: <span class="font-semibold text-green-600">{{ enabledModels.length }}</span>
      </span>
      <span class="text-neutral-600 dark:text-neutral-400">
        已禁用: <span class="font-semibold text-orange-600">{{ disabledModels.length }}</span>
      </span>
    </div>

    <!-- 模型列表表格 -->
    <div class="overflow-auto" style="max-height: 60vh;">
      <NDataTable
        :columns="columns"
        :data="modelsList"
        :bordered="false"
        :single-line="false"
        size="small"
        :scroll-x="1200"
        :loading="loadingModels"
      />
    </div>

    <!-- 新增模型对话框 -->
    <NModal
      v-model:show="showAddModel"
      title="新增模型"
      preset="card"
      style="width: 600px; max-width: 90vw;"
    >
      <NForm
        :model="addModelForm"
        label-placement="left"
        label-width="100"
      >
        <NFormItem label="模型ID" required>
          <NInput
            v-model:value="addModelForm.id"
            placeholder="例如: gpt-4o, claude-3-5-sonnet"
          />
        </NFormItem>
        <NFormItem label="供应商" required>
          <NInput
            v-model:value="addModelForm.provider"
            placeholder="例如: OpenAI, Anthropic"
          />
        </NFormItem>
        <NFormItem label="显示名称" required>
          <NInput
            v-model:value="addModelForm.displayName"
            placeholder="例如: GPT-4o, Claude 3.5 Sonnet"
          />
        </NFormItem>
        
        <!-- 测试模型按钮 -->
        <NFormItem label="连接测试">
          <div class="w-full space-y-2">
            <NButton
              :loading="testingModel"
              :disabled="!addModelForm.id"
              @click="handleTestModel"
            >
              <template #icon>
                <SvgIcon icon="ri:plug-line" />
              </template>
              {{ testingModel ? '测试中...' : '测试连接' }}
            </NButton>
            
            <!-- 测试结果显示 -->
            <div
              v-if="testResult"
              class="p-3 rounded-lg"
              :class="testResult.success ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'"
            >
              <div class="flex items-start gap-2">
                <SvgIcon
                  :icon="testResult.success ? 'ri:checkbox-circle-fill' : 'ri:close-circle-fill'"
                  :class="testResult.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'"
                  class="text-lg mt-0.5"
                />
                <div class="flex-1">
                  <div
                    class="font-medium text-sm"
                    :class="testResult.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'"
                  >
                    {{ testResult.message }}
                  </div>
                  <div
                    v-if="testResult.response"
                    class="mt-1 text-xs text-gray-600 dark:text-gray-400"
                  >
                    响应: {{ testResult.response.substring(0, 100) }}{{ testResult.response.length > 100 ? '...' : '' }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </NFormItem>
      </NForm>

      <template #footer>
        <div class="flex justify-end gap-2">
          <NButton @click="showAddModel = false">
            取消
          </NButton>
          <NButton type="primary" @click="handleAddModel">
            确定
          </NButton>
        </div>
      </template>
    </NModal>

    <!-- 编辑模型对话框 -->
    <NModal
      v-model:show="showEditModel"
      title="编辑模型"
      preset="card"
      style="width: 600px; max-width: 90vw;"
    >
      <NForm
        v-if="editModelForm"
        :model="editModelForm"
        label-placement="left"
        label-width="100"
      >
        <NFormItem label="模型ID">
          <NInput
            v-model:value="editModelForm.id"
            disabled
          />
        </NFormItem>
        <NFormItem label="供应商" required>
          <NInput
            v-model:value="editModelForm.provider"
            placeholder="例如: OpenAI, Anthropic"
          />
        </NFormItem>
        <NFormItem label="显示名称" required>
          <NInput
            v-model:value="editModelForm.displayName"
            placeholder="例如: GPT-4o, Claude 3.5 Sonnet"
          />
        </NFormItem>
      </NForm>

      <template #footer>
        <div class="flex justify-end gap-2">
          <NButton @click="showEditModel = false">
            取消
          </NButton>
          <NButton type="primary" @click="handleEditModel">
            保存
          </NButton>
        </div>
      </template>
    </NModal>
  </div>
</template>

<style scoped>
/* 自定义样式 */
</style>

