<script setup lang="ts">
import { NButton, NCard, NDivider, NForm, NFormItem, NInput, NSelect, NSpace, useLoadingBar, useMessage } from 'naive-ui'
import { computed, onMounted, reactive, watch } from 'vue'
import { useAppStore, useConfigStore } from '@/store'

const appStore = useAppStore()
const configStore = useConfigStore()
const ms = useMessage()
const loadingBar = useLoadingBar()

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
  if (userSettings) {
    formData.avatar = userSettings.avatar || ''
    formData.name = userSettings.name || ''
    formData.theme = userSettings.theme || 'auto'
    formData.language = userSettings.language || 'zh-CN'

    // 🔥 同步到 appStore（确保前端主题状态和后端一致）
    if (userSettings.theme) {
      appStore.setTheme(userSettings.theme)
    }
    if (userSettings.language) {
      appStore.setLanguage(userSettings.language)
    }

    if (import.meta.env.DEV) {
      console.log('✅ [UserSettings] 已从后端加载配置并同步到 appStore:', {
        theme: userSettings.theme,
        language: userSettings.language,
      })
    }
  }
  else {
    console.warn('⚠️ [UserSettings] userSettings 为空，使用默认值')
  }
}

// 🔥 监听配置变化，配置加载完成后自动更新表单
watch(() => configStore.userSettings, (newSettings) => {
  if (newSettings) {
    loadData()
  }
}, { immediate: true })

// 🔥 组件挂载时确保配置已加载
onMounted(async () => {
  if (!configStore.loaded && !configStore.loading) {
    await (configStore as any).loadAllConfig()
  }
})

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
  loadingBar.start()
  try {
    // 直接调用 action
    await (configStore as any).updateUserSettings({
      avatar: formData.avatar,
      name: formData.name,
      theme: formData.theme as 'auto' | 'light' | 'dark',
      language: formData.language as 'zh-CN' | 'en-US',
    })

    // 🔥 同步更新 appStore 的主题和语言设置
    appStore.setTheme(formData.theme as 'auto' | 'light' | 'dark')
    appStore.setLanguage(formData.language as 'zh-CN' | 'en-US')

    loadingBar.finish()
    ms.success('用户设置已保存')

    if (import.meta.env.DEV) {
      console.log('✅ [UserSettings] 保存成功，已同步更新 appStore:', {
        theme: formData.theme,
        language: formData.language,
      })
    }
  }
  catch (error: any) {
    loadingBar.error()
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
