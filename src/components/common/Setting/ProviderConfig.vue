<script setup lang="ts">
import type { DataTableColumns } from 'naive-ui'
import type { Role } from '@/api/services/roleService'
import { NButton, NCheckbox, NCheckboxGroup, NDataTable, NForm, NFormItem, NInput, NModal, NPopconfirm, NSpace, NSwitch, NTag, useMessage } from 'naive-ui'
import { computed, h, ref, watch } from 'vue'
import { addModel, addProvider, toggleModelEnabled as apiToggleModelEnabled, deleteModel, deleteProvider, fetchProviderModels, fetchProviders, testModelConnection, updateModel, updateProvider } from '@/api'
import { getAllModelsWithRoles, getAllRoles } from '@/api/services/roleService'
import { SvgIcon } from '@/components/common'
import { useModelStore } from '@/store'
import ModelRoleDialog from './ModelRoleDialog.vue'

interface Props {
  visible?: boolean
}

const props = defineProps<Props>()

// 定义供应商数据类型
interface ProviderItem {
  id: string
  name: string
  baseUrl: string
  apiKey: string
  models: ModelItem[]
  createdAt?: string
  updatedAt?: string
}

// 定义模型数据类型
interface ModelItem {
  id: string
  modelId: string
  displayName: string
  enabled: boolean
  providerId: string
  createdAt?: string
  updatedAt?: string
  accessibleRoles?: Array<{
    roleId: number
    roleName: string
    roleDescription: string | null
  }>
}

const message = useMessage()
const modelStore = useModelStore()

// 是否已加载过数据
const hasLoaded = ref(false)

// 加载状态
const loading = ref(false)

// 供应商列表
const providersList = ref<ProviderItem[]>([])

// 展开的行keys
const expandedRowKeys = ref<string[]>([])

// ========== 角色权限相关 ==========
const allRoles = ref<Role[]>([])
const loadingRoles = ref(false)
const roleDialogVisible = ref(false)
const currentModel = ref<ModelItem | null>(null)

// ========== 供应商相关 ==========
// 新增供应商对话框
const showAddProvider = ref(false)
const addProviderForm = ref({
  name: '',
  baseUrl: '',
  apiKey: '',
})

// 编辑供应商对话框
const showEditProvider = ref(false)
const editProviderForm = ref<ProviderItem | null>(null)

// ========== 供应商模型列表相关 ==========
// 从供应商获取的模型列表（用于批量添加）
interface ProviderModelItem {
  id: string // 模型ID
  displayName: string // 显示名称（可编辑）
  selected: boolean // 是否选中
  owned_by?: string
  created?: number
  object?: string
}

const providerModelsList = ref<ProviderModelItem[]>([])
const loadingProviderModels = ref(false)
const editingDisplayNameIndex = ref<number | null>(null)
const editingDisplayNameValue = ref('')
const testingProviderModelIndex = ref<number | null>(null)

// ========== 模型相关 ==========
// 新增模型对话框
const showAddModel = ref(false)
const addModelForm = ref({
  modelId: '',
  displayName: '',
  providerId: '',
})
// 🔥 新增模型时选择的角色ID列表（默认选择 Free 角色）
const addModelSelectedRoleIds = ref<number[]>([])

// 编辑模型对话框
const showEditModel = ref(false)
const editModelForm = ref<ModelItem | null>(null)

// 记录上一次的模型ID，用于判断是否自动同步
const oldModelId = ref('')

// 测试模型连接
const testingModel = ref(false)
const testResult = ref<{ success: boolean, message: string, responseTime?: number } | null>(null)

// 监听模型ID变化，自动生成 display_name（供应商名_模型ID）
watch(() => addModelForm.value.modelId, (newId) => {
  // 只在显示名称为空或与旧ID格式相同时才自动生成
  if (!addModelForm.value.displayName || addModelForm.value.displayName === oldModelId.value) {
    // 获取当前供应商名称
    const provider = providersList.value.find(p => p.id === addModelForm.value.providerId)
    if (provider && newId) {
      // 自动生成格式：供应商名_模型ID
      addModelForm.value.displayName = `${provider.name}_${newId}`
    }
  }

  oldModelId.value = addModelForm.value.displayName
})

// 统计信息
const totalModels = computed(() => {
  return providersList.value.reduce((sum, provider) => sum + provider.models.length, 0)
})

const enabledModels = computed(() => {
  return providersList.value.reduce((sum, provider) =>
    sum + provider.models.filter(m => m.enabled).length, 0)
})

const disabledModels = computed(() => {
  return totalModels.value - enabledModels.value
})

// ========== 角色权限管理函数 ==========
// 加载所有角色
async function loadAllRoles() {
  try {
    loadingRoles.value = true
    const response = await getAllRoles()
    allRoles.value = response.data?.roles || []

    // 🔥 默认选择 Free 角色（role_id = 5）
    // 在首次加载时，如果 addModelSelectedRoleIds 为空，则默认选择 Free
    if (allRoles.value.length > 0 && addModelSelectedRoleIds.value.length === 0) {
      const freeRole = allRoles.value.find(r => r.role_name === 'Free' || r.role_id === 5)
      if (freeRole) {
        addModelSelectedRoleIds.value = [freeRole.role_id]
      }
    }
  }
  catch (error) {
    console.error('加载角色列表失败:', error)
    message.error('加载角色列表失败')
  }
  finally {
    loadingRoles.value = false
  }
}

// 处理编辑模型角色权限
function handleEditModelRoles(model: ModelItem) {
  currentModel.value = model
  roleDialogVisible.value = true
}

// 处理角色权限更新成功
function handleRoleUpdateSuccess() {
  // 刷新数据
  loadProviders()
  message.success('角色权限更新成功')
}

// ========== 供应商模型列表相关计算属性 ==========
// 获取选中的模型数量
const selectedModelsCount = computed(() => {
  return providerModelsList.value.filter(m => m.selected).length
})

// 是否全选
const isAllModelsSelected = computed(() => {
  return providerModelsList.value.length > 0 && providerModelsList.value.every(m => m.selected)
})

// 是否部分选中
const isIndeterminate = computed(() => {
  const selectedCount = selectedModelsCount.value
  return selectedCount > 0 && selectedCount < providerModelsList.value.length
})

// 全选/取消全选
function toggleAllModelsSelection(selected: boolean) {
  providerModelsList.value.forEach((model) => {
    model.selected = selected
  })
}

// 模型子表格列定义
const modelColumns: DataTableColumns<ModelItem> = [
  {
    title: '模型ID',
    key: 'modelId',
    ellipsis: { tooltip: true },
    width: 100, // 🔥 增加宽度：250 -> 300
    minWidth: 100, // 🔥 添加最小宽度
  },
  {
    title: '显示名称',
    key: 'displayName',
    ellipsis: { tooltip: true },
    width: 150, // 🔥 增加宽度：200 -> 280
    minWidth: 120, // 🔥 添加最小宽度
  },
  {
    title: '是否启用',
    key: 'enabled',
    width: 60,
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
    title: '访问权限',
    key: 'accessibleRoles',
    width: 60, // 🔥 增加宽度：200 -> 220
    render: (row) => {
      const roles = row.accessibleRoles || []
      if (roles.length === 0) {
        return h(NTag, { type: 'info', size: 'small' }, { default: () => '所有人' })
      }

      return h('div', { class: 'space-y-1' }, [
        h('div', { class: 'text-xs text-gray-600' }, `限制访问 (${roles.length}个角色)`),
        h('div', { class: 'flex flex-wrap gap-1' }, roles.slice(0, 2).map((role: any) => h(NTag, {
          size: 'small',
          type: 'success',
        }, { default: () => role.roleName }))),
        roles.length > 2 && h('div', { class: 'text-xs text-gray-500' }, `+${roles.length - 2} 更多`),
      ])
    },
  },
  {
    title: '操作',
    key: 'actions',
    width: 100, // 🔥 增加宽度：200 -> 220
    fixed: 'right', // 🔥 固定操作列到右侧
    render: (row) => {
      return h(NSpace, { size: 'small' }, {
        default: () => [
          h(NButton, {
            size: 'small',
            onClick: () => editModel(row),
          }, { default: () => '编辑' }),
          h(NButton, {
            size: 'small',
            type: 'info',
            onClick: () => handleEditModelRoles(row),
          }, { default: () => '权限' }),
          h(NPopconfirm, {
            onPositiveClick: () => handleDeleteModel(row.id, row.providerId),
          }, {
            trigger: () => h(NButton, {
              size: 'small',
              type: 'error',
            }, { default: () => '删除' }),
            default: () => '确定要删除这个模型吗？',
          }),
        ],
      })
    },
  },
]

// 供应商模型列表表格列定义（用于对话框中的模型列表）
const providerModelColumns: DataTableColumns<ProviderModelItem> = [
  {
    title: () => {
      return h(NCheckbox, {
        checked: isAllModelsSelected.value,
        indeterminate: isIndeterminate.value,
        onUpdateChecked: (checked: boolean) => {
          toggleAllModelsSelection(checked)
        },
      })
    },
    key: 'selected',
    width: 50,
    render: (_row: ProviderModelItem, index: number) => {
      return h(NCheckbox, {
        checked: providerModelsList.value[index]?.selected || false,
        onUpdateChecked: (checked: boolean) => {
          if (providerModelsList.value[index]) {
            providerModelsList.value[index].selected = checked
          }
        },
      })
    },
  },
  {
    title: '模型ID',
    key: 'id',
    ellipsis: { tooltip: true },
    width: 250,
    minWidth: 200,
  },
  {
    title: '显示名称',
    key: 'displayName',
    width: 300,
    minWidth: 200,
    render: (row, index) => {
      if (editingDisplayNameIndex.value === index) {
        return h('div', { class: 'flex items-center gap-2' }, [
          h(NInput, {
            'value': editingDisplayNameValue.value,
            'onUpdate:value': (val: string) => { editingDisplayNameValue.value = val },
            'onKeydown': (e: KeyboardEvent) => {
              if (e.key === 'Enter') {
                saveDisplayName(index)
              }
              else if (e.key === 'Escape') {
                cancelEditDisplayName()
              }
            },
            'autofocus': true,
            'size': 'small',
          }),
          h(NButton, {
            size: 'small',
            type: 'primary',
            onClick: () => saveDisplayName(index),
          }, { default: () => '保存' }),
          h(NButton, {
            size: 'small',
            onClick: () => cancelEditDisplayName(),
          }, { default: () => '取消' }),
        ])
      }
      return h('div', {
        class: 'cursor-pointer hover:text-blue-600',
        onClick: () => startEditDisplayName(index),
      }, row.displayName)
    },
  },
  {
    title: '提供商',
    key: 'owned_by',
    width: 150,
    ellipsis: { tooltip: true },
    render: row => row.owned_by || '-',
  },
  {
    title: '操作',
    key: 'actions',
    width: 180,
    fixed: 'right',
    render: (row, index) => {
      const isEdit = !!editProviderForm.value
      const form = isEdit ? editProviderForm.value : addProviderForm.value
      return h(NSpace, { size: 'small' }, {
        default: () => [
          h(NButton, {
            size: 'small',
            type: 'info',
            loading: testingProviderModelIndex.value === index,
            onClick: () => {
              if (form) {
                testProviderModelConnection(index, row.id, form.baseUrl, form.apiKey)
              }
            },
          }, { default: () => '测试连通' }),
          h(NPopconfirm, {
            onPositiveClick: () => removeProviderModel(index),
          }, {
            trigger: () => h(NButton, {
              size: 'small',
              type: 'error',
            }, { default: () => '删除' }),
            default: () => '确定要删除这个模型吗？',
          }),
        ],
      })
    },
  },
]

// 供应商表格列定义
const providerColumns: DataTableColumns<ProviderItem> = [
  {
    type: 'expand',
    width: 50, // 🔥 设置展开列宽度
    expandable: () => true, // 总是可展开，方便添加模型
    renderExpand: (row) => {
      return h('div', { class: 'p-4 bg-gray-50 dark:bg-gray-900/50' }, [
        h('div', { class: 'flex items-center justify-between mb-3' }, [
          h('span', { class: 'text-sm font-medium' }, `${row.name} 的模型列表`),
          h(NButton, {
            size: 'small',
            type: 'primary',
            onClick: () => openAddModel(row.id),
          }, {
            icon: () => h(SvgIcon, { icon: 'ri:add-line' }),
            default: () => '新增模型',
          }),
        ]),
        h(NDataTable, {
          columns: modelColumns,
          data: row.models,
          bordered: false,
          size: 'small',
          resizable: true, // 🔥 开启列宽拖动调节
          // 移除 scrollX，让表格自适应宽度
        }),
      ])
    },
  },
  {
    title: '供应商名称',
    key: 'name',
    ellipsis: { tooltip: true },
    width: 180, // 🔥 调整宽度：200 -> 180
    minWidth: 150, // 🔥 添加最小宽度
  },
  {
    title: 'Base URL',
    key: 'baseUrl',
    ellipsis: { tooltip: true },
    width: 350, // 🔥 增加宽度：300 -> 350
    minWidth: 250, // 🔥 添加最小宽度
  },
  {
    title: 'API Key',
    key: 'apiKey',
    width: 220, // 🔥 增加宽度：200 -> 220
    ellipsis: { tooltip: true }, // 🔥 添加省略号提示
    render: (row) => {
      const maskedKey = row.apiKey ? `${row.apiKey.substring(0, 8)}...${row.apiKey.substring(row.apiKey.length - 4)}` : '-'
      return h('span', { class: 'font-mono text-xs' }, maskedKey)
    },
  },
  {
    title: '模型数量',
    key: 'modelCount',
    width: 100,
    render: (row) => {
      return h(NTag, { size: 'small', type: 'info' }, { default: () => row.models.length })
    },
  },
  {
    title: '操作',
    key: 'actions',
    width: 180, // 🔥 调整宽度：200 -> 180
    fixed: 'right',
    render: (row) => {
      return h(NSpace, { size: 'small' }, {
        default: () => [
          h(NButton, {
            size: 'small',
            onClick: () => editProvider(row),
          }, { default: () => '编辑' }),
          h(NPopconfirm, {
            onPositiveClick: () => handleDeleteProvider(row.id),
          }, {
            trigger: () => h(NButton, {
              size: 'small',
              type: 'error',
            }, { default: () => '删除' }),
            default: () => '确定要删除这个供应商及其所有模型吗？',
          }),
        ],
      })
    },
  },
]

// ========== 数据加载 ==========
// 将下划线命名转换为驼峰命名
function snakeToCamel(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(item => snakeToCamel(item))
  }
  else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
      acc[camelKey] = snakeToCamel(obj[key])
      return acc
    }, {} as any)
  }
  return obj
}

// 从后端加载供应商和模型列表（支持强制刷新）
async function loadProviders(forceRefresh = false) {
  loading.value = true
  try {
    const response = await fetchProviders<ProviderItem[]>()
    if (response.status === 'Success' && response.data) {
      // 🔥 转换下划线命名为驼峰命名
      providersList.value = snakeToCamel(response.data)
      hasLoaded.value = true

      // 加载角色权限信息
      await loadModelRolesForAllModels()

      // 🔥 同步数据到 modelStore（重要：让整个应用都能访问最新的模型数据）
      try {
        // 强制刷新时，清除缓存并从后端重新获取
        await modelStore.loadModelsFromBackend(forceRefresh)

        if (forceRefresh) {
          message.success('数据已强制刷新，缓存已更新')
        }
        else {
          message.success('数据加载成功')
        }
      }
      catch (syncError) {
        console.warn('⚠️ [供应商配置] 同步到 modelStore 失败:', syncError)
        message.warning('数据加载成功，但同步到缓存失败')
      }
    }
    else {
      message.error(response.message || '加载供应商列表失败')
    }
  }
  catch (error: any) {
    console.error('加载供应商列表失败:', error)
    message.error(`加载失败: ${error.message || '未知错误'}`)
  }
  finally {
    loading.value = false
  }
}

// 为所有模型加载角色权限信息
async function loadModelRolesForAllModels() {
  try {
    // 获取所有模型及其角色权限
    const response = await getAllModelsWithRoles()
    if (response.status === 'Success' && response.data?.models) {
      const modelsWithRoles = response.data.models

      // 更新providersList中每个模型的角色权限信息
      providersList.value.forEach((provider) => {
        provider.models.forEach((model) => {
          const modelWithRoles = modelsWithRoles.find(m => m.id === model.id)
          if (modelWithRoles) {
            model.accessibleRoles = modelWithRoles.accessible_roles
          }
        })
      })
    }
  }
  catch (error) {
    console.error('加载模型角色权限失败1:', error)
  }
}

// ========== 供应商操作 ==========
// 打开新增供应商对话框
function openAddProvider() {
  addProviderForm.value = {
    name: '',
    baseUrl: '',
    apiKey: '',
  }
  providerModelsList.value = []
  editingDisplayNameIndex.value = null
  showAddProvider.value = true
}

// 提交新增供应商
async function handleAddProvider() {
  if (!addProviderForm.value.name || !addProviderForm.value.baseUrl || !addProviderForm.value.apiKey) {
    message.warning('请填写完整的供应商信息')
    return
  }

  try {
    // 先创建供应商
    const response = await addProvider(addProviderForm.value)

    if (response.status === 'Success') {
      // 获取 providerId，响应数据结构：{ status: 'Success', data: { id: '...', ... } }
      const providerId = response.data?.id

      // 如果有获取到的模型列表，批量添加模型
      if (providerModelsList.value.length > 0 && providerId) {
        const freeRole = allRoles.value.find(r => r.role_name === 'Free' || r.role_id === 5)
        const defaultRoleIds = freeRole ? [freeRole.role_id] : []

        // 只添加选中的模型
        const selectedModels = providerModelsList.value.filter(m => m.selected)

        if (selectedModels.length === 0) {
          message.warning('请至少选择一个模型')
          return
        }

        // 批量添加模型
        let successCount = 0
        let failCount = 0

        for (const model of selectedModels) {
          try {
            await addModel({
              modelId: model.id,
              displayName: model.displayName,
              enabled: true,
              providerId,
              roleIds: defaultRoleIds,
            })
            successCount++
          }
          catch (error: any) {
            console.error(`添加模型 ${model.id} 失败:`, error)
            failCount++
          }
        }

        if (successCount > 0) {
          message.success(`供应商添加成功，已添加 ${successCount} 个模型${failCount > 0 ? `，${failCount} 个失败` : ''}`)
        }
        else {
          message.warning('供应商添加成功，但批量添加模型失败')
        }
      }
      else {
        message.success('供应商添加成功')
      }

      showAddProvider.value = false
      // 🔥 强制刷新，确保聊天界面的模型列表同步更新
      await loadProviders(true)
    }
    else {
      message.error(response.message || '供应商添加失败')
    }
  }
  catch (error: any) {
    console.error('添加供应商失败:', error)
    message.error(error.response?.data?.message || error.message || '添加失败')
  }
}

// 编辑供应商
function editProvider(provider: ProviderItem) {
  editProviderForm.value = { ...provider }
  providerModelsList.value = []
  editingDisplayNameIndex.value = null
  showEditProvider.value = true
}

// 提交编辑供应商
async function handleEditProvider() {
  if (!editProviderForm.value)
    return

  if (!editProviderForm.value.name || !editProviderForm.value.baseUrl || !editProviderForm.value.apiKey) {
    message.warning('请填写完整的供应商信息')
    return
  }

  try {
    // 先更新供应商
    const response = await updateProvider(editProviderForm.value.id, {
      name: editProviderForm.value.name,
      baseUrl: editProviderForm.value.baseUrl,
      apiKey: editProviderForm.value.apiKey,
    })

    if (response.status === 'Success') {
      // 如果有获取到的模型列表，批量添加模型
      if (providerModelsList.value.length > 0) {
        const freeRole = allRoles.value.find(r => r.role_name === 'Free' || r.role_id === 5)
        const defaultRoleIds = freeRole ? [freeRole.role_id] : []

        // 只添加选中的模型
        const selectedModels = providerModelsList.value.filter(m => m.selected)

        if (selectedModels.length === 0) {
          message.warning('请至少选择一个模型')
          return
        }

        // 批量添加模型
        let successCount = 0
        let failCount = 0

        for (const model of selectedModels) {
          try {
            await addModel({
              modelId: model.id,
              displayName: model.displayName,
              enabled: true,
              providerId: editProviderForm.value.id,
              roleIds: defaultRoleIds,
            })
            successCount++
          }
          catch (error: any) {
            console.error(`添加模型 ${model.id} 失败:`, error)
            failCount++
          }
        }

        if (successCount > 0) {
          message.success(`供应商更新成功，已添加 ${successCount} 个模型${failCount > 0 ? `，${failCount} 个失败` : ''}`)
        }
        else {
          message.warning('供应商更新成功，但批量添加模型失败')
        }
      }
      else {
        message.success('供应商更新成功')
      }

      showEditProvider.value = false
      // 🔥 强制刷新，确保聊天界面的模型列表同步更新
      await loadProviders(true)
    }
    else {
      message.error(response.message || '供应商更新失败')
    }
  }
  catch (error: any) {
    console.error('更新供应商失败:', error)
    message.error(error.response?.data?.message || error.message || '更新失败')
  }
}

// 删除供应商
async function handleDeleteProvider(id: string) {
  try {
    const response = await deleteProvider(id)

    if (response.status === 'Success') {
      message.success('供应商删除成功')
      // 🔥 强制刷新，确保聊天界面的模型列表同步更新
      await loadProviders(true)
    }
    else {
      message.error(response.message || '供应商删除失败')
    }
  }
  catch (error: any) {
    console.error('删除供应商失败:', error)
    message.error(error.response?.data?.message || error.message || '删除失败')
  }
}

// ========== 供应商模型列表操作 ==========
// 获取供应商的可用模型列表
async function fetchProviderModelsList(isEdit: boolean = false) {
  const form = isEdit ? editProviderForm.value : addProviderForm.value
  if (!form || !form.baseUrl || !form.apiKey) {
    message.warning('请先填写 Base URL 和 API Key')
    return
  }

  loadingProviderModels.value = true
  try {
    const models = await fetchProviderModels(form.baseUrl, form.apiKey)
    const providerName = form.name || 'Unknown'

    // 转换为 ProviderModelItem 格式，默认显示名称为 "供应商名-模型ID"
    providerModelsList.value = models.map(model => ({
      id: model.id,
      displayName: `${providerName}-${model.id}`,
      selected: true, // 默认全部选中
      owned_by: model.owned_by,
      created: model.created,
      object: model.object,
    }))

    message.success(`成功获取 ${models.length} 个模型`)
  }
  catch (error: any) {
    console.error('获取供应商模型列表失败:', error)
    message.error(error.message || '获取模型列表失败')
    providerModelsList.value = []
  }
  finally {
    loadingProviderModels.value = false
  }
}

// 开始编辑显示名称
function startEditDisplayName(index: number) {
  editingDisplayNameIndex.value = index
  editingDisplayNameValue.value = providerModelsList.value[index].displayName
}

// 保存编辑的显示名称
function saveDisplayName(index: number) {
  if (editingDisplayNameValue.value.trim()) {
    providerModelsList.value[index].displayName = editingDisplayNameValue.value.trim()
  }
  editingDisplayNameIndex.value = null
  editingDisplayNameValue.value = ''
}

// 取消编辑显示名称
function cancelEditDisplayName() {
  editingDisplayNameIndex.value = null
  editingDisplayNameValue.value = ''
}

// 删除供应商模型列表中的模型
function removeProviderModel(index: number) {
  providerModelsList.value.splice(index, 1)
  if (editingDisplayNameIndex.value === index) {
    editingDisplayNameIndex.value = null
  }
  else if (editingDisplayNameIndex.value !== null && editingDisplayNameIndex.value > index) {
    editingDisplayNameIndex.value--
  }
}

// 测试供应商模型连通性
async function testProviderModelConnection(index: number, modelId: string, baseUrl: string, apiKey: string) {
  testingProviderModelIndex.value = index
  try {
    // 确保 baseUrl 以 /v1 结尾
    const normalizedBaseUrl = baseUrl.endsWith('/v1') ? baseUrl : baseUrl.endsWith('/') ? `${baseUrl}v1` : `${baseUrl}/v1`
    const testUrl = `${normalizedBaseUrl}/chat/completions`

    const axios = (await import('axios')).default
    const startTime = Date.now()

    await axios.post(testUrl, {
      model: modelId,
      messages: [{ role: 'user', content: 'Hello' }],
      max_tokens: 10,
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    })

    const responseTime = Date.now() - startTime
    message.success(`测试成功 (${responseTime}ms)`)
  }
  catch (error: any) {
    console.error('测试模型连接失败:', error)
    message.error(error.response?.data?.error?.message || error.message || '测试失败')
  }
  finally {
    testingProviderModelIndex.value = null
  }
}

// ========== 模型操作 ==========
// 打开新增模型对话框
function openAddModel(providerId: string) {
  addModelForm.value = {
    modelId: '',
    displayName: '',
    providerId,
  }
  oldModelId.value = ''

  // 🔥 默认选择 Free 角色（role_id = 5）
  const freeRole = allRoles.value.find(r => r.role_name === 'Free' || r.role_id === 5)
  if (freeRole) {
    addModelSelectedRoleIds.value = [freeRole.role_id]
  }
  else {
    addModelSelectedRoleIds.value = []
  }

  showAddModel.value = true
  // display_name 会通过 watch 自动生成为 "供应商名_模型ID" 格式
}

// 提交新增模型
async function handleAddModel() {
  if (!addModelForm.value.modelId || !addModelForm.value.displayName) {
    message.warning('请填写完整的模型信息')
    return
  }

  try {
    const response = await addModel({
      modelId: addModelForm.value.modelId,
      displayName: addModelForm.value.displayName,
      enabled: true,
      providerId: addModelForm.value.providerId,
      roleIds: addModelSelectedRoleIds.value, // 🔥 传递角色ID列表
    })

    if (response.status === 'Success') {
      message.success('模型添加成功')
      showAddModel.value = false
      // 🔥 强制刷新，确保聊天界面的模型列表同步更新
      await loadProviders(true)
    }
    else {
      message.error(response.message || '模型添加失败')
    }
  }
  catch (error: any) {
    console.error('添加模型失败:', error)
    message.error(error.response?.data?.message || error.message || '添加失败')
  }
}

// 编辑模型
function editModel(model: ModelItem) {
  editModelForm.value = { ...model }
  testResult.value = null // 清空测试结果
  showEditModel.value = true
}

// 提交编辑模型
async function handleEditModel() {
  if (!editModelForm.value)
    return

  if (!editModelForm.value.modelId || !editModelForm.value.displayName) {
    message.warning('请填写完整的模型信息')
    return
  }

  try {
    const response = await updateModel(editModelForm.value.id, {
      modelId: editModelForm.value.modelId,
      displayName: editModelForm.value.displayName,
    })

    if (response.status === 'Success') {
      message.success('模型更新成功')
      showEditModel.value = false
      // 🔥 强制刷新，确保聊天界面的模型列表同步更新
      await loadProviders(true)
    }
    else {
      message.error(response.message || '模型更新失败')
    }
  }
  catch (error: any) {
    console.error('更新模型失败:', error)
    message.error(error.response?.data?.message || error.message || '更新失败')
  }
}

// 切换模型启用状态
async function toggleModelEnabled(id: string, enabled: boolean) {
  try {
    const response = await apiToggleModelEnabled(id, enabled)

    if (response.status === 'Success') {
      // 本地更新状态
      for (const provider of providersList.value) {
        const model = provider.models.find(m => m.id === id)
        if (model) {
          model.enabled = enabled
          break
        }
      }

      message.success(enabled ? '模型已启用' : '模型已禁用')
      // 🔥 强制刷新，确保聊天界面的模型列表同步更新
      await modelStore.loadModelsFromBackend(true)
    }
    else {
      message.error(response.message || '操作失败')
    }
  }
  catch (error: any) {
    console.error('切换模型状态失败:', error)
    message.error(error.response?.data?.message || error.message || '操作失败')
  }
}

// 删除模型
async function handleDeleteModel(id: string, _providerId: string) {
  try {
    const response = await deleteModel(id)

    if (response.status === 'Success') {
      message.success('模型删除成功')
      // 🔥 强制刷新，确保聊天界面的模型列表同步更新
      await loadProviders(true)
    }
    else {
      message.error(response.message || '模型删除失败')
    }
  }
  catch (error: any) {
    console.error('删除模型失败:', error)
    message.error(error.response?.data?.message || error.message || '删除失败')
  }
}

// 测试模型连接
async function handleTestModel() {
  if (!editModelForm.value)
    return

  testingModel.value = true
  testResult.value = null

  try {
    const response = await testModelConnection(editModelForm.value.id)

    if (response.status === 'Success') {
      testResult.value = {
        success: true,
        message: response.message || '测试成功',
        responseTime: response.data?.responseTime,
      }
      message.success('测试成功，模型连接正常')
    }
    else {
      testResult.value = {
        success: false,
        message: response.message || '测试失败',
        responseTime: response.data?.responseTime,
      }
      message.error(response.message || '测试失败')
    }
  }
  catch (error: any) {
    console.error('测试模型失败:', error)
    testResult.value = {
      success: false,
      message: error.response?.data?.message || error.message || '测试失败',
      responseTime: error.response?.data?.data?.responseTime,
    }
    message.error(error.response?.data?.message || error.message || '测试失败')
  }
  finally {
    testingModel.value = false
  }
}

// 监听visible变化，只在第一次显示时加载数据
watch(() => props.visible, async (visible) => {
  if (visible && !hasLoaded.value) {
    // 先加载角色数据
    await loadAllRoles()
    // 再加载供应商数据
    loadProviders()
  }
}, { immediate: true })
</script>

<template>
  <div class="provider-config-container">
    <!-- 操作栏 -->
    <div class="flex items-center justify-end mb-4">
      <NSpace>
        <NButton
          type="primary"
          @click="openAddProvider"
        >
          <template #icon>
            <SvgIcon icon="ri:add-line" />
          </template>
          新增供应商
        </NButton>
        <NButton
          secondary
          :loading="loading"
          @click="() => loadProviders(true)"
        >
          <template #icon>
            <SvgIcon icon="ri:refresh-line" />
          </template>
          刷新
        </NButton>
      </NSpace>
    </div>

    <!-- 统计信息 -->
    <div class="flex gap-4 text-sm mb-4">
      <span class="text-neutral-600 dark:text-neutral-400">
        供应商: <span class="font-semibold text-neutral-900 dark:text-neutral-100">{{ providersList.length }}</span> 个
      </span>
      <span class="text-neutral-600 dark:text-neutral-400">
        总模型: <span class="font-semibold text-neutral-900 dark:text-neutral-100">{{ totalModels }}</span> 个
      </span>
      <span class="text-neutral-600 dark:text-neutral-400">
        已启用: <span class="font-semibold text-green-600">{{ enabledModels }}</span>
      </span>
      <span class="text-neutral-600 dark:text-neutral-400">
        已禁用: <span class="font-semibold text-orange-600">{{ disabledModels }}</span>
      </span>
    </div>

    <!-- 供应商列表表格 -->
    <div class="table-container">
      <NDataTable
        v-model:expanded-row-keys="expandedRowKeys"
        :columns="providerColumns"
        :data="providersList"
        :bordered="false"
        :single-line="false"
        size="small"
        :loading="loading"
        :row-key="(row: ProviderItem) => row.id"
        :scroll-x="1200"
        max-height="calc(100vh - 200px)"
        resizable
        striped
      />
    </div>

    <!-- 新增供应商对话框 -->
    <NModal
      v-model:show="showAddProvider"
      title="新增供应商"
      preset="card"
      style="width: 900px; max-width: 90vw;"
    >
      <NForm
        :model="addProviderForm"
        label-placement="left"
        label-width="100"
      >
        <NFormItem label="供应商名称" required>
          <NInput
            v-model:value="addProviderForm.name"
            placeholder="例如: OpenAI, Anthropic, DeepSeek"
          />
        </NFormItem>
        <NFormItem label="Base URL" required>
          <NInput
            v-model:value="addProviderForm.baseUrl"
            placeholder="例如: https://api.openai.com/v1"
          />
        </NFormItem>
        <NFormItem label="API Key" required>
          <NInput
            v-model:value="addProviderForm.apiKey"
            type="password"
            show-password-on="click"
            placeholder="输入API密钥"
          />
        </NFormItem>

        <!-- 获取可用模型 -->
        <NFormItem label="可用模型">
          <div class="space-y-3 w-full">
            <div class="flex items-center gap-3">
              <NButton
                type="primary"
                :loading="loadingProviderModels"
                @click="fetchProviderModelsList(false)"
              >
                <template #icon>
                  <SvgIcon icon="ri:download-line" />
                </template>
                获取可用模型
              </NButton>
              <div v-if="providerModelsList.length > 0" class="flex items-center gap-2">
                <NCheckbox
                  :checked="isAllModelsSelected"
                  :indeterminate="isIndeterminate"
                  @update:checked="toggleAllModelsSelection"
                >
                  全选
                </NCheckbox>
                <span class="text-sm text-gray-600 dark:text-gray-400">
                  已选择 {{ selectedModelsCount }} / {{ providerModelsList.length }} 个模型
                </span>
              </div>
            </div>
            <div v-if="providerModelsList.length > 0" class="text-sm text-gray-600 dark:text-gray-400">
              点击确认后将自动添加选中的模型到供应商
            </div>
          </div>
        </NFormItem>

        <!-- 模型列表表格 -->
        <NFormItem v-if="providerModelsList.length > 0" label="模型列表">
          <div class="w-full">
            <NDataTable
              :columns="providerModelColumns"
              :data="providerModelsList"
              :bordered="true"
              size="small"
              max-height="400"
              :scroll-x="800"
            />
          </div>
        </NFormItem>
      </NForm>

      <template #footer>
        <div class="flex justify-end gap-2">
          <NButton @click="showAddProvider = false">
            取消
          </NButton>
          <NButton type="primary" @click="handleAddProvider">
            确定
          </NButton>
        </div>
      </template>
    </NModal>

    <!-- 编辑供应商对话框 -->
    <NModal
      v-model:show="showEditProvider"
      title="编辑供应商"
      preset="card"
      style="width: 900px; max-width: 90vw;"
    >
      <NForm
        v-if="editProviderForm"
        :model="editProviderForm"
        label-placement="left"
        label-width="100"
      >
        <NFormItem label="供应商名称" required>
          <NInput
            v-model:value="editProviderForm.name"
            placeholder="例如: OpenAI, Anthropic, DeepSeek"
          />
        </NFormItem>
        <NFormItem label="Base URL" required>
          <NInput
            v-model:value="editProviderForm.baseUrl"
            placeholder="例如: https://api.openai.com/v1"
          />
        </NFormItem>
        <NFormItem label="API Key" required>
          <NInput
            v-model:value="editProviderForm.apiKey"
            type="password"
            show-password-on="click"
            placeholder="输入API密钥"
          />
        </NFormItem>

        <!-- 获取可用模型 -->
        <NFormItem label="可用模型">
          <div class="space-y-3 w-full">
            <div class="flex items-center gap-3">
              <NButton
                type="primary"
                :loading="loadingProviderModels"
                @click="fetchProviderModelsList(true)"
              >
                <template #icon>
                  <SvgIcon icon="ri:download-line" />
                </template>
                获取可用模型
              </NButton>
              <div v-if="providerModelsList.length > 0" class="flex items-center gap-2">
                <NCheckbox
                  :checked="isAllModelsSelected"
                  :indeterminate="isIndeterminate"
                  @update:checked="toggleAllModelsSelection"
                >
                  全选
                </NCheckbox>
                <span class="text-sm text-gray-600 dark:text-gray-400">
                  已选择 {{ selectedModelsCount }} / {{ providerModelsList.length }} 个模型
                </span>
              </div>
            </div>
            <div v-if="providerModelsList.length > 0" class="text-sm text-gray-600 dark:text-gray-400">
              点击确认后将自动添加选中的模型到供应商
            </div>
          </div>
        </NFormItem>

        <!-- 模型列表表格 -->
        <NFormItem v-if="providerModelsList.length > 0" label="模型列表">
          <div class="w-full">
            <NDataTable
              :columns="providerModelColumns"
              :data="providerModelsList"
              :bordered="true"
              size="small"
              max-height="400"
              :scroll-x="800"
            />
          </div>
        </NFormItem>
      </NForm>

      <template #footer>
        <div class="flex justify-end gap-2">
          <NButton @click="showEditProvider = false">
            取消
          </NButton>
          <NButton type="primary" @click="handleEditProvider">
            保存
          </NButton>
        </div>
      </template>
    </NModal>

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
            v-model:value="addModelForm.modelId"
            placeholder="例如: gpt-4o, claude-3-5-sonnet-20241022"
          />
        </NFormItem>
        <NFormItem label="显示名称" required>
          <NInput
            v-model:value="addModelForm.displayName"
            placeholder="会自动生成：供应商名_模型ID（全局唯一）"
          >
            <template #suffix>
              <span class="text-xs text-gray-400">全局唯一</span>
            </template>
          </NInput>
        </NFormItem>
        <div class="text-xs text-gray-500 -mt-2 mb-2">
          <span class="font-medium">💡 提示：</span>display_name 全局唯一，用于区分不同供应商的相同模型（如：OpenAI_gpt-4o 和 Mirror_gpt-4o）
        </div>

        <!-- 🔥 角色权限选择 -->
        <NFormItem label="访问权限">
          <div class="space-y-2">
            <div class="text-sm text-gray-600 dark:text-gray-400">
              选择可以访问此模型的角色。如果不选择任何角色，则所有人都可以访问。
            </div>
            <NCheckboxGroup
              v-model:value="addModelSelectedRoleIds"
              :disabled="loadingRoles"
            >
              <div class="grid grid-cols-2 gap-2">
                <NCheckbox
                  v-for="role in allRoles"
                  :key="role.role_id"
                  :value="role.role_id"
                  :label="role.role_name"
                >
                  <template #default>
                    <div class="flex flex-col">
                      <span class="font-medium">{{ role.role_name }}</span>
                      <span v-if="role.role_description" class="text-xs text-gray-500">
                        {{ role.role_description }}
                      </span>
                    </div>
                  </template>
                </NCheckbox>
              </div>
            </NCheckboxGroup>
            <div v-if="addModelSelectedRoleIds.length === 0" class="text-sm text-blue-600 dark:text-blue-400">
              ✓ 当前设置为对所有人开放
            </div>
            <div v-else class="text-sm text-green-600 dark:text-green-400">
              ✓ 已选择 {{ addModelSelectedRoleIds.length }} 个角色
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
        <NFormItem label="模型ID" required>
          <NInput
            v-model:value="editModelForm.modelId"
            placeholder="例如: gpt-4o, claude-3-5-sonnet-20241022"
          />
        </NFormItem>
        <NFormItem label="显示名称" required>
          <NInput
            v-model:value="editModelForm.displayName"
            placeholder="格式：供应商名_模型ID（全局唯一）"
          >
            <template #suffix>
              <span class="text-xs text-gray-400">全局唯一</span>
            </template>
          </NInput>
        </NFormItem>
        <div class="text-xs text-orange-500 -mt-2 mb-2">
          <span class="font-medium">⚠️ 注意：</span>修改 display_name 会影响前端模型选择，请谨慎操作
        </div>

        <!-- 测试连接区域 -->
        <div class="mt-4 p-3 bg-gray-50 dark:bg-gray-900/50 rounded">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium">测试连接</span>
            <NButton
              size="small"
              :loading="testingModel"
              @click="handleTestModel"
            >
              <template #icon>
                <SvgIcon icon="ri:wireless-charging-line" />
              </template>
              {{ testingModel ? '测试中...' : '测试连接' }}
            </NButton>
          </div>
          <div v-if="testResult" class="text-xs mt-2">
            <div
              v-if="testResult.success"
              class="text-green-600 dark:text-green-400"
            >
              ✓ {{ testResult.message }}
              <span v-if="testResult.responseTime" class="ml-2 text-gray-500 dark:text-gray-400">
                ({{ testResult.responseTime }}ms)
              </span>
            </div>
            <div
              v-else
              class="text-red-600 dark:text-red-400"
            >
              ✗ {{ testResult.message }}
              <span v-if="testResult.responseTime" class="ml-2 text-gray-500 dark:text-gray-400">
                ({{ testResult.responseTime }}ms)
              </span>
            </div>
          </div>
        </div>
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

    <!-- 角色权限编辑对话框 -->
    <ModelRoleDialog
      v-model:visible="roleDialogVisible"
      :model="currentModel"
      :all-roles="allRoles"
      @success="handleRoleUpdateSuccess"
    />
  </div>
</template>

<style scoped>
.provider-config-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 0;
}

.table-container {
  flex: 1;
  overflow: visible; /* 让表格自己处理滚动 */
}

/* 固定表头 - Naive UI 会在设置 max-height 时自动处理 */
:deep(.n-data-table-thead th) {
  background-color: var(--n-th-color);
}

.dark :deep(.n-data-table-thead th) {
  background-color: var(--n-th-color);
}

/* 优化滚动条样式 */
:deep(.n-data-table-base-table-body)::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

:deep(.n-data-table-base-table-body)::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

:deep(.n-data-table-base-table-body)::-webkit-scrollbar-thumb:hover {
  background-color: rgba(0, 0, 0, 0.3);
}

.dark :deep(.n-data-table-base-table-body)::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.2);
}

.dark :deep(.n-data-table-base-table-body)::-webkit-scrollbar-thumb:hover {
  background-color: rgba(255, 255, 255, 0.3);
}
</style>
