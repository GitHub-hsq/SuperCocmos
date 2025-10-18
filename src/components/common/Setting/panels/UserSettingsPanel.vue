<script setup lang="ts">
import { NButton, NCard, NDivider, NForm, NFormItem, NInput, NSelect, NSpace, useMessage } from 'naive-ui'
import { computed, reactive } from 'vue'
import { useAppStore, useConfigStore } from '@/store'

const configStore = useConfigStore()
const appStore = useAppStore()
const ms = useMessage()

// 表单数据
const formData = reactive({
  avatar: '',
  name: '',
  theme: 'auto',
  language: 'zh-CN',
})

// 从 store 加载数据
function loadData() {
  const userSettings = configStore.userSettings

  // 🔥 优先从 configStore 加载，如果没有则从 appStore 加载（保证数据一致性）
  if (userSettings) {
    formData.avatar = userSettings.avatar || ''
    formData.name = userSettings.name || ''
    formData.theme = userSettings.theme || appStore.theme
    formData.language = userSettings.language || appStore.language
  }
  else {
    // 如果 configStore 中没有数据，则从 appStore 加载
    formData.theme = appStore.theme
    formData.language = appStore.language
  }
}

loadData()

// 主题选项
const themeOptions = [
  { label: '跟随系统', value: 'auto' },
  { label: '浅色', value: 'light' },
  { label: '深色', value: 'dark' },
]

// 语言选项
const languageOptions = [
  { label: '简体中文', value: 'zh-CN' },
  { label: 'English', value: 'en-US' },
]

// 保存状态
const saving = computed(() => configStore.loading)

// 保存设置
async function handleSave() {
  try {
    // 直接调用 action
    await (configStore as any).updateUserSettings({
      avatar: formData.avatar,
      name: formData.name,
      theme: formData.theme as 'auto' | 'light' | 'dark',
      language: formData.language as 'zh-CN' | 'en-US',
    })

    // 🔥 同步更新 appStore，使主题和语言立即生效
    appStore.setTheme(formData.theme as 'auto' | 'light' | 'dark')
    appStore.setLanguage(formData.language as 'zh-CN' | 'en-US')

    ms.success('用户设置已保存')
  }
  catch (error: any) {
    ms.error(`保存失败: ${error?.message || '未知错误'}`)
  }
}

// 重置为默认值
function handleReset() {
  formData.avatar = ''
  formData.name = ''
  formData.theme = 'auto'
  formData.language = 'zh-CN'
  ms.info('已重置为默认值')
}
</script>

<template>
  <div class="user-settings-panel">
    <NCard title="个人设置" :bordered="false">
      <template #header-extra>
        <NSpace>
          <NButton secondary @click="handleReset">
            恢复默认
          </NButton>
          <NButton type="primary" :loading="saving" @click="handleSave">
            保存更改
          </NButton>
        </NSpace>
      </template>

      <NForm label-placement="left" label-width="120" :model="formData">
        <!-- 个人信息 -->
        <NDivider title-placement="left">
          个人信息
        </NDivider>

        <NFormItem label="头像" path="avatar">
          <NInput
            v-model:value="formData.avatar"
            placeholder="请输入图片链接 (如: https://example.com/avatar.jpg)"
            clearable
          />
        </NFormItem>

        <NFormItem label="昵称" path="name">
          <NInput
            v-model:value="formData.name"
            placeholder="在聊天中显示的名称"
            clearable
          />
        </NFormItem>

        <!-- 界面设置 -->
        <NDivider title-placement="left">
          界面设置
        </NDivider>

        <NFormItem label="主题模式" path="theme">
          <NSelect
            v-model:value="formData.theme"
            :options="themeOptions"
            placeholder="选择主题模式"
          />
        </NFormItem>

        <NFormItem label="界面语言" path="language">
          <NSelect
            v-model:value="formData.language"
            :options="languageOptions"
            placeholder="选择界面语言"
          />
        </NFormItem>
      </NForm>
    </NCard>
  </div>
</template>

<style scoped>
.user-settings-panel {
  max-width: 800px;
  margin: 0 auto;
}
</style>
