<script setup lang="ts">
import type { Role } from '@/api/services/roleService'
import { NButton, NCheckbox, NCheckboxGroup, NForm, NFormItem, NModal, NSpace } from 'naive-ui'
import { ref, watch } from 'vue'
import { getModelRoles, setModelRoles } from '@/api/services/roleService'

interface ModelItem {
  id: string
  modelId: string
  displayName: string
  enabled: boolean
  providerId: string
  accessibleRoles?: Array<{
    roleId: number
    roleName: string
    roleDescription: string | null
  }>
}

interface Props {
  visible: boolean
  model: ModelItem | null
  allRoles: Role[]
  loading?: boolean
}

interface Emit {
  (e: 'update:visible', visible: boolean): void
  (e: 'success'): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
})

const emit = defineEmits<Emit>()

const selectedRoleIds = ref<number[]>([])
const loading = ref(false)

// 监听model变化，加载当前权限
watch(() => props.model, async (newModel) => {
  if (newModel && props.visible) {
    await loadModelRoles(newModel.id)
  }
}, { immediate: true })

// 监听对话框显示状态
watch(() => props.visible, async (visible) => {
  if (visible && props.model) {
    await loadModelRoles(props.model.id)
  }
})

// 加载模型的角色权限
async function loadModelRoles(modelId: string) {
  try {
    loading.value = true
    const response = await getModelRoles(modelId)
    selectedRoleIds.value = response.data?.roleIds || []
  }
  catch (error) {
    console.error('加载模型角色权限失败2:', error)
    selectedRoleIds.value = []
  }
  finally {
    loading.value = false
  }
}

// 保存角色权限
async function handleSave() {
  if (!props.model)
    return

  try {
    loading.value = true
    await setModelRoles(props.model.id, selectedRoleIds.value)
    emit('success')
    emit('update:visible', false)
  }
  catch (error) {
    console.error('保存模型角色权限失败:', error)
  }
  finally {
    loading.value = false
  }
}

// 取消
function handleCancel() {
  emit('update:visible', false)
}
</script>

<template>
  <NModal
    :show="visible"
    preset="card"
    title="设置模型访问权限"
    style="width: 600px; max-width: 90vw;"
    :mask-closable="false"
    :closable="true"
    @update:show="(val: boolean) => emit('update:visible', val)"
  >
    <div v-if="model" class="space-y-4">
      <div class="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
        <div class="text-sm font-medium text-gray-900 dark:text-gray-100">
          {{ model.displayName }}
        </div>
        <div class="text-xs text-gray-500 font-mono">
          {{ model.modelId }}
        </div>
      </div>

      <NForm>
        <NFormItem label="访问权限">
          <div class="space-y-3 w-full">
            <div class="text-sm text-gray-600 dark:text-gray-400">
              选择可以访问此模型的角色。如果不选择任何角色，则所有人都可以访问。
            </div>

            <NCheckboxGroup
              v-model:value="selectedRoleIds"
              :disabled="loading"
            >
              <div class="grid grid-cols-1 gap-3">
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

            <div v-if="selectedRoleIds.length === 0" class="text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
              ✓ 当前设置为对所有人开放
            </div>
            <div v-else class="text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-2 rounded">
              ✓ 已选择 {{ selectedRoleIds.length }} 个角色
            </div>
          </div>
        </NFormItem>
      </NForm>
    </div>

    <template #footer>
      <NSpace justify="end">
        <NButton :disabled="loading" @click="handleCancel">
          取消
        </NButton>
        <NButton type="primary" :loading="loading" @click="handleSave">
          保存
        </NButton>
      </NSpace>
    </template>
  </NModal>
</template>
