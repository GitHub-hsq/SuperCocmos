<script setup lang="ts">
import { NButton, NForm, NFormItem, NInput, NSelect, useMessage } from 'naive-ui'
import { ref } from 'vue'
import { SvgIcon } from '@/components/common'
import { useNovelStore } from '@/store'

const novelStore = useNovelStore()
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

function handleBack() {
  novelStore.hideCreateNovelForm()
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
    handleBack()
  }
  catch (error) {
    console.error('表单验证失败:', error)
  }
}
</script>

<template>
  <div class="create-novel-view">
    <!-- 顶部工具栏 -->
    <div class="detail-header">
      <NButton text class="back-button" @click="handleBack">
        <template #icon>
          <SvgIcon icon="ri:arrow-left-line" class="text-lg" />
        </template>
        <span class="back-text">返回</span>
      </NButton>
    </div>

    <!-- 表单内容 -->
    <div class="form-container">
      <div class="form-wrapper">
        <h1 class="form-title">
          📖 开启新篇章
        </h1>

        <NForm
          ref="formRef"
          :model="formData"
          :rules="rules"
          label-placement="top"
          require-mark-placement="right-hanging"
          :label-width="80"
        >
          <NFormItem label="书名" path="title">
            <NInput
              v-model:value="formData.title"
              placeholder="请输入小说标题"
              maxlength="50"
              show-count
              size="large"
            />
          </NFormItem>

          <NFormItem label="类型" path="genre">
            <NSelect
              v-model:value="formData.genre"
              :options="genreOptions"
              placeholder="选择小说类型"
              clearable
              size="large"
            />
          </NFormItem>

          <NFormItem label="主题" path="theme">
            <NInput
              v-model:value="formData.theme"
              placeholder="例如：成长与牺牲"
              maxlength="50"
              size="large"
            />
          </NFormItem>

          <NFormItem label="简介" path="introduction">
            <NInput
              v-model:value="formData.introduction"
              type="textarea"
              placeholder="简要描述小说内容..."
              :autosize="{ minRows: 4, maxRows: 8 }"
              maxlength="500"
              show-count
            />
          </NFormItem>

          <NFormItem label="初始想法" path="idea">
            <NInput
              v-model:value="formData.idea"
              type="textarea"
              placeholder="记录你最初的创作灵感..."
              :autosize="{ minRows: 4, maxRows: 8 }"
              maxlength="1000"
              show-count
            />
          </NFormItem>

          <!-- 操作按钮 -->
          <div class="form-actions">
            <NButton size="large" @click="handleBack">
              取消
            </NButton>
            <NButton type="primary" size="large" @click="handleSubmit">
              创建
            </NButton>
          </div>
        </NForm>
      </div>
    </div>
  </div>
</template>

<style scoped>
.create-novel-view {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--body-color);
}

/* 顶部工具栏 */
.detail-header {
  flex-shrink: 0;
  padding: 16px 24px;
  border-bottom: 1px solid var(--divider-color);
  background: var(--card-bg);
  display: flex;
  justify-content: flex-end;
}

.back-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  transition: all 0.2s;
  color: var(--text-color);
}

.back-button:hover {
  background: var(--hover-bg);
}

.back-text {
  font-size: 14px;
  font-weight: 500;
}

/* 表单容器 */
.form-container {
  flex: 1;
  overflow-y: auto;
  padding: 40px 24px;
  display: flex;
  justify-content: center;
}

.form-wrapper {
  width: 100%;
  max-width: 700px;
}

.form-title {
  font-size: 32px;
  font-weight: 700;
  margin: 0 0 40px 0;
  text-align: center;
  color: var(--text-color);
}

/* 操作按钮 */
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid var(--divider-color);
}

/* 暗色模式 */
:deep(.dark) .detail-header {
  background: #2c2c2c;
  border-bottom-color: #3a3a3c;
}

:deep(.dark) .back-button {
  color: #c9d1d9;
}

:deep(.dark) .back-button:hover {
  background: rgba(255, 255, 255, 0.05);
}

:deep(.dark) .create-novel-view {
  background: #1a1a1c;
}

/* 响应式：移动端 */
@media (max-width: 768px) {
  .form-container {
    padding: 24px 16px;
  }

  .form-title {
    font-size: 24px;
    margin-bottom: 24px;
  }

  .form-actions {
    flex-direction: column-reverse;
  }

  .form-actions button {
    width: 100%;
  }
}
</style>
