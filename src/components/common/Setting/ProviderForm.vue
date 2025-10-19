<script setup lang="ts">
import { NButton, NForm, NFormItem, NInput, NSpace } from 'naive-ui'
import { ref, watch } from 'vue'

interface Provider {
  id?: string
  name: string
  baseUrl: string
  apiKey: string
}

interface Props {
  provider?: Provider | null
  loading?: boolean
}

interface Emit {
  (e: 'submit', provider: Omit<Provider, 'id'>): void
  (e: 'cancel'): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
})

const emit = defineEmits<Emit>()

const formData = ref<Provider>({
  name: '',
  baseUrl: '',
  apiKey: '',
})

// 监听传入的provider数据，用于编辑模式
watch(() => props.provider, (newProvider) => {
  if (newProvider) {
    formData.value = { ...newProvider }
  }
  else {
    resetForm()
  }
}, { immediate: true })

function resetForm() {
  formData.value = {
    name: '',
    baseUrl: '',
    apiKey: '',
  }
}

function handleSubmit() {
  // 提取需要提交的数据，排除id字段
  // eslint-disable-next-line unused-imports/no-unused-vars
  const { id, ...submitData } = formData.value
  emit('submit', submitData)
}

function handleCancel() {
  resetForm()
  emit('cancel')
}
</script>

<template>
  <NForm>
    <NFormItem label="供应商名称" required>
      <NInput
        v-model:value="formData.name"
        placeholder="例如：OpenAI"
        :disabled="loading"
      />
    </NFormItem>

    <NFormItem label="API地址" required>
      <NInput
        v-model:value="formData.baseUrl"
        placeholder="例如：https://api.openai.com"
        :disabled="loading"
      />
    </NFormItem>

    <NFormItem label="API Key" required>
      <NInput
        v-model:value="formData.apiKey"
        type="password"
        placeholder="请输入API Key"
        show-password-on="click"
        :disabled="loading"
      />
    </NFormItem>

    <NSpace justify="end">
      <NButton :disabled="loading" @click="handleCancel">
        取消
      </NButton>
      <NButton type="primary" :loading="loading" @click="handleSubmit">
        {{ props.provider?.id ? '更新' : '添加' }}
      </NButton>
    </NSpace>
  </NForm>
</template>
