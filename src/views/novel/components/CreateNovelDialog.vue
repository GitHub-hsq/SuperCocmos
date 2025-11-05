<script setup lang="ts">
import { NForm, NFormItem, NInput, NModal, NSelect, useMessage } from 'naive-ui'
import { ref } from 'vue'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
}>()

const message = useMessage()

const formRef = ref()
const formData = ref({
  title: '',
  genre: null as string | null,
  theme: '',
  introduction: '',
  idea: '',
})

const genreOptions = [
  { label: '玄幻', value: '玄幻' },
  { label: '言情', value: '言情' },
  { label: '科幻', value: '科幻' },
  { label: '武侠', value: '武侠' },
  { label: '悬疑', value: '悬疑' },
  { label: '都市', value: '都市' },
  { label: '历史', value: '历史' },
  { label: '其他', value: '其他' },
]

const rules = {
  title: [
    { required: true, message: '请输入小说标题', trigger: 'blur' },
    { min: 2, max: 50, message: '标题长度在 2 到 50 个字符', trigger: 'blur' },
  ],
}

function handleClose() {
  emit('update:show', false)
  resetForm()
}

function resetForm() {
  formData.value = {
    title: '',
    genre: null,
    theme: '',
    introduction: '',
    idea: '',
  }
}

async function handleSubmit() {
  try {
    await formRef.value?.validate()

    // TODO: 调用 API 创建小说

    message.success('小说创建成功！')
    handleClose()
  }
  catch (error) {
    console.error('表单验证失败:', error)
  }
}
</script>

<template>
  <NModal
    :show="props.show"
    preset="dialog"
    title="开启新篇章"
    positive-text="创建"
    negative-text="取消"
    :on-positive-click="handleSubmit"
    :on-negative-click="handleClose"
    :on-close="handleClose"
    style="width: 600px;"
  >
    <NForm
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-placement="left"
      label-width="80"
      require-mark-placement="right-hanging"
    >
      <NFormItem label="书名" path="title">
        <NInput
          v-model:value="formData.title"
          placeholder="请输入小说标题"
          maxlength="50"
          show-count
        />
      </NFormItem>

      <NFormItem label="类型" path="genre">
        <NSelect
          v-model:value="formData.genre"
          :options="genreOptions"
          placeholder="选择小说类型"
          clearable
        />
      </NFormItem>

      <NFormItem label="主题" path="theme">
        <NInput
          v-model:value="formData.theme"
          placeholder="例如：成长与牺牲"
          maxlength="50"
        />
      </NFormItem>

      <NFormItem label="简介" path="introduction">
        <NInput
          v-model:value="formData.introduction"
          type="textarea"
          placeholder="简要描述小说内容..."
          :autosize="{ minRows: 3, maxRows: 6 }"
          maxlength="500"
          show-count
        />
      </NFormItem>

      <NFormItem label="初始想法" path="idea">
        <NInput
          v-model:value="formData.idea"
          type="textarea"
          placeholder="记录你最初的创作灵感..."
          :autosize="{ minRows: 3, maxRows: 6 }"
          maxlength="1000"
          show-count
        />
      </NFormItem>
    </NForm>
  </NModal>
</template>
