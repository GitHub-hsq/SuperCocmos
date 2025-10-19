<script setup lang="ts">
import type { DataTableColumns } from 'naive-ui'
import { h, NButton, NDataTable, NPopconfirm, NSpace, NSwitch, NTag, NBadge } from 'naive-ui'
import { ref, onMounted } from 'vue'
import { SvgIcon } from '@/components/common'
import { getAllRoles, getModelRoles, setModelRoles } from '@/api/services/roleService'
import type { Role } from '@/api/services/roleService'
import ModelRoleDialog from './ModelRoleDialog.vue'

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

interface ProviderItem {
  id: string
  name: string
  baseUrl: string
  apiKey: string
  models: ModelItem[]
  createdAt?: string
  updatedAt?: string
}

interface Props {
  providers: ProviderItem[]
  loading?: boolean
}

interface Emit {
  (e: 'editProvider', provider: ProviderItem): void
  (e: 'deleteProvider', providerId: string): void
  (e: 'editModel', model: ModelItem): void
  (e: 'deleteModel', modelId: string): void
  (e: 'toggleModel', modelId: string, enabled: boolean): void
  (e: 'addModel', providerId: string): void
  (e: 'updateModelRoles', modelId: string, roleIds: number[]): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
})

const emit = defineEmits<Emit>()

// 展开的行keys
const expandedRowKeys = ref<string[]>([])

// 角色相关状态
const allRoles = ref<Role[]>([])
const loadingRoles = ref(false)

// 角色权限对话框状态
const roleDialogVisible = ref(false)
const currentModel = ref<ModelItem | null>(null)

// 组件挂载时加载所有角色
onMounted(async () => {
  await loadAllRoles()
})

// 加载所有角色
async function loadAllRoles() {
  try {
    loadingRoles.value = true
    const response = await getAllRoles()
    allRoles.value = response.data.roles || []
  }
  catch (error) {
    console.error('加载角色列表失败:', error)
  }
  finally {
    loadingRoles.value = false
  }
}

// 处理供应商操作
function handleEditProvider(provider: ProviderItem) {
  emit('editProvider', provider)
}

function handleDeleteProvider(providerId: string) {
  emit('deleteProvider', providerId)
}

// 处理模型操作
function handleEditModel(model: ModelItem) {
  emit('editModel', model)
}

function handleDeleteModel(modelId: string) {
  emit('deleteModel', modelId)
}

function handleToggleModel(model: ModelItem) {
  emit('toggleModel', model.id, !model.enabled)
}

function handleAddModel(providerId: string) {
  emit('addModel', providerId)
}

// 处理模型角色权限更新
async function handleUpdateModelRoles(modelId: string, roleIds: number[]) {
  try {
    await setModelRoles(modelId, roleIds)
    emit('updateModelRoles', modelId, roleIds)
  }
  catch (error) {
    console.error('更新模型角色权限失败:', error)
  }
}

// 处理编辑模型角色权限
function handleEditModelRoles(model: ModelItem) {
  currentModel.value = model
  roleDialogVisible.value = true
}

// 处理角色权限更新成功
function handleRoleUpdateSuccess() {
  // 刷新数据或更新本地状态
  emit('updateModelRoles', currentModel.value!.id, [])
}

// 供应商表格列配置
const providerColumns: DataTableColumns<ProviderItem> = [
  {
    title: '供应商名称',
    key: 'name',
    width: 200,
    render: (row) => {
      return h('div', { class: 'font-medium' }, row.name)
    },
  },
  {
    title: 'API地址',
    key: 'baseUrl',
    ellipsis: {
      tooltip: true,
    },
  },
  {
    title: '模型数量',
    key: 'modelCount',
    width: 120,
    render: (row) => {
      return h(NTag, { type: 'info' }, { default: () => `${row.models.length}` })
    },
  },
  {
    title: '创建时间',
    key: 'createdAt',
    width: 180,
    render: (row) => {
      return row.createdAt ? new Date(row.createdAt).toLocaleString() : '-'
    },
  },
  {
    title: '操作',
    key: 'actions',
    width: 200,
    render: (row) => {
      return h(NSpace, { size: 8 }, {
        default: () => [
          h(NButton, {
            size: 'small',
            type: 'primary',
            ghost: true,
            onClick: () => handleEditProvider(row),
          }, { default: () => '编辑' }),
          h(NButton, {
            size: 'small',
            type: 'info',
            ghost: true,
            onClick: () => handleAddModel(row.id),
          }, { default: () => '添加模型' }),
          h(NPopconfirm, {
            onPositiveClick: () => handleDeleteProvider(row.id),
          }, {
            default: () => '确定删除此供应商吗？',
            trigger: () => h(NButton, {
              size: 'small',
              type: 'error',
              ghost: true,
            }, { default: () => '删除' }),
          }),
        ],
      })
    },
  },
]

// 模型表格列配置
const modelColumns: DataTableColumns<ModelItem> = [
  {
    title: '模型ID',
    key: 'modelId',
    width: 200,
    render: (row) => {
      return h('div', { class: 'font-mono text-sm' }, row.modelId)
    },
  },
  {
    title: '显示名称',
    key: 'displayName',
    width: 180,
  },
  {
    title: '状态',
    key: 'enabled',
    width: 100,
    render: (row) => {
      return h(NSwitch, {
        value: row.enabled,
        onUpdateValue: (value: boolean) => handleToggleModel({ ...row, enabled: value }),
      })
    },
  },
  {
    title: '访问权限',
    key: 'accessibleRoles',
    width: 200,
    render: (row) => {
      const roles = row.accessibleRoles || []
      if (roles.length === 0) {
        return h(NBadge, { value: '公开', type: 'info' }, {
          default: () => h('span', { class: 'text-xs text-blue-600' }, '所有人')
        })
      }
      
      return h('div', { class: 'space-y-1' }, [
        h('div', { class: 'text-xs text-gray-600' }, `限制访问 (${roles.length}个角色)`),
        h('div', { class: 'flex flex-wrap gap-1' }, 
          roles.slice(0, 2).map((role: any) => 
            h(NTag, { 
              size: 'small', 
              type: 'success' 
            }, { default: () => role.roleName })
          )
        ),
        roles.length > 2 && h('div', { class: 'text-xs text-gray-500' }, `+${roles.length - 2} 更多`)
      ])
    },
  },
  {
    title: '创建时间',
    key: 'createdAt',
    width: 180,
    render: (row) => {
      return row.createdAt ? new Date(row.createdAt).toLocaleString() : '-'
    },
  },
  {
    title: '操作',
    key: 'actions',
    width: 200,
    render: (row) => {
      return h(NSpace, { size: 8 }, {
        default: () => [
          h(NButton, {
            size: 'small',
            type: 'primary',
            ghost: true,
            onClick: () => handleEditModel(row),
          }, { default: () => '编辑' }),
          h(NButton, {
            size: 'small',
            type: 'info',
            ghost: true,
            onClick: () => handleEditModelRoles(row),
          }, { default: () => '权限' }),
          h(NPopconfirm, {
            onPositiveClick: () => handleDeleteModel(row.id),
          }, {
            default: () => '确定删除此模型吗？',
            trigger: () => h(NButton, {
              size: 'small',
              type: 'error',
              ghost: true,
            }, { default: () => '删除' }),
          }),
        ],
      })
    },
  },
]

// 处理行展开
function handleExpandedRowKeys(keys: string[]) {
  expandedRowKeys.value = keys
}
</script>

<template>
  <NDataTable
    :columns="providerColumns"
    :data="props.providers"
    :loading="props.loading"
    :expanded-row-keys="expandedRowKeys"
    :row-key="(row: ProviderItem) => row.id"
    :expandable="() => true"
    @update:expanded-row-keys="handleExpandedRowKeys"
  >
    <template #expand="{ row }">
      <div class="px-4 py-3 bg-gray-50 dark:bg-gray-800">
        <div class="flex items-center justify-between mb-3">
          <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100">
            模型列表 ({{ row.models.length }})
          </h4>
          <NButton
            size="small"
            type="primary"
            @click="handleAddModel(row.id)"
          >
            <template #icon>
              <SvgIcon icon="ri:add-line" />
            </template>
            添加模型
          </NButton>
        </div>

        <NDataTable
          :columns="modelColumns"
          :data="row.models"
          :pagination="{ pageSize: 5 }"
          size="small"
          virtual-scroll
        />
      </div>
    </template>
  </NDataTable>

  <!-- 角色权限编辑对话框 -->
  <ModelRoleDialog
    v-model:visible="roleDialogVisible"
    :model="currentModel"
    :all-roles="allRoles"
    @success="handleRoleUpdateSuccess"
  />
</template>
