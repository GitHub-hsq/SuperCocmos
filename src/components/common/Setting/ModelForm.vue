<script setup lang="ts">
import type { Role } from '@/api/services/roleService'
import { NButton, NCheckbox, NCheckboxGroup, NForm, NFormItem, NInput, NSpace, NSwitch } from 'naive-ui'
import { onMounted, ref, watch } from 'vue'
import { getAllRoles, getModelRoles, setModelRoles } from '@/api/services/roleService'

interface Model {
  id?: string
  modelId: string
  displayName: string
  enabled: boolean
  providerId?: string
  accessibleRoles?: number[] // 可访问的角色ID列表
}

interface Props {
  model?: Model | null
  providerId?: string
  loading?: boolean
}

interface Emit {
  (e: 'submit', model: Omit<Model, 'id'>): void
  (e: 'cancel'): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
})

const emit = defineEmits<Emit>()

const formData = ref<Model>({
  modelId: '',
  displayName: '',
  enabled: true,
  providerId: props.providerId || '',
  accessibleRoles: [],
})

// 角色相关状态
const allRoles = ref<Role[]>([])
const selectedRoleIds = ref<number[]>([])
const loadingRoles = ref(false)

// 监听传入的model数据，用于编辑模式
watch(() => props.model, async (newModel) => {
  if (newModel) {
    formData.value = { ...newModel }
    // 如果是编辑模式，加载模型的角色权限
    if (newModel.id) {
      await loadModelRoles(newModel.id)
    }
  }
  else {
    resetForm()
  }
}, { immediate: true })

// 监听providerId变化
watch(() => props.providerId, (newProviderId) => {
  if (newProviderId) {
    formData.value.providerId = newProviderId
  }
})

// 组件挂载时加载所有角色
onMounted(async () => {
  await loadAllRoles()
})

// 加载所有角色
async function loadAllRoles() {
  try {
    loadingRoles.value = true
    const response = await getAllRoles()
    allRoles.value = response?.data?.roles || []
  }
  catch (error) {
    console.error('加载角色列表失败:', error)
  }
  finally {
    loadingRoles.value = false
  }
}

// 加载模型的角色权限
async function loadModelRoles(modelId: string) {
  try {
    const response = await getModelRoles(modelId)
    selectedRoleIds.value = response?.data?.roleIds || []
  }
  catch (error) {
    console.error('加载模型角色权限失败3:', error)
    selectedRoleIds.value = []
  }
}

function resetForm() {
  formData.value = {
    modelId: '',
    displayName: '',
    enabled: true,
    providerId: props.providerId || '',
    accessibleRoles: [],
  }
  selectedRoleIds.value = []
}

async function handleSubmit() {
  try {
    // 如果是编辑模式且有模型ID，需要更新角色权限
    if (props.model?.id) {
      await setModelRoles(props.model.id, selectedRoleIds.value)
    }

    // 提取需要提交的数据，排除id字段
    // eslint-disable-next-line unused-imports/no-unused-vars
    const { id, ...submitData } = formData.value
    submitData.accessibleRoles = selectedRoleIds.value
    emit('submit', submitData)
  }
  catch (error) {
    console.error('提交失败:', error)
  }
}

function handleCancel() {
  resetForm()
  emit('cancel')
}
</script>

<template>
  <NForm>
    <NFormItem label="模型ID" required>
      <NInput
        v-model:value="formData.modelId"
        placeholder="例如：gpt-4"
        :disabled="loading"
      />
    </NFormItem>

    <NFormItem label="显示名称" required>
      <NInput
        v-model:value="formData.displayName"
        placeholder="例如：GPT-4"
        :disabled="loading"
      />
    </NFormItem>

    <NFormItem label="启用状态">
      <NSwitch
        v-model:value="formData.enabled"
        :disabled="loading"
      />
    </NFormItem>

    <NFormItem label="访问权限">
      <div class="space-y-2">
        <div class="text-sm text-gray-600 dark:text-gray-400">
          选择可以访问此模型的角色。如果不选择任何角色，则所有人都可以访问。
        </div>
        <NCheckboxGroup
          v-model:value="selectedRoleIds"
          :disabled="loading || loadingRoles"
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
        <div v-if="selectedRoleIds.length === 0" class="text-sm text-blue-600 dark:text-blue-400">
          ✓ 当前设置为对所有人开放
        </div>
        <div v-else class="text-sm text-green-600 dark:text-green-400">
          ✓ 已选择 {{ selectedRoleIds.length }} 个角色
        </div>
      </div>
    </NFormItem>

    <NSpace justify="end">
      <NButton :disabled="loading" @click="handleCancel">
        取消
      </NButton>
      <NButton type="primary" :loading="loading" @click="handleSubmit">
        {{ props.model?.id ? '更新' : '添加' }}
      </NButton>
    </NSpace>
  </NForm>
</template>
