<script setup lang="ts">
import { NButton, NCard, NDivider, NForm, NFormItem, NInput, NSpace, useLoadingBar, useMessage } from 'naive-ui'
import { computed, onMounted, reactive, watch } from 'vue'
import { SvgIcon } from '@/components/common'
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

    // ✅ 日志已移至 watch 中，避免重复输出
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
  // ✅ 配置已在 AppInitStore 中加载，无需重复加载
  // 如果未加载（异常情况），等待加载完成
  if (configStore.loading) {
    console.warn('⏳ [UserSettings] 等待配置加载完成...')
  }
})

// 主题选项
const themeOptions = [
  { label: '跟随系统', labelEn: 'System', value: 'auto', icon: 'ri:contrast-2-line' },
  { label: '浅色模式', labelEn: 'Light', value: 'light', icon: 'ri:sun-line' },
  { label: '深色模式', labelEn: 'Dark', value: 'dark', icon: 'ri:moon-line' },
]

// 语言选项
const languageOptions = [
  { label: '简体中文', labelEn: 'Chinese', value: 'zh-CN', icon: 'ri:translate' },
  { label: 'English', labelEn: 'English', value: 'en-US', icon: 'ri:earth-line' },
]

// 根据当前语言获取显示文本
function getDisplayLabel(option: { label: string, labelEn: string }) {
  return formData.language === 'zh-CN' ? option.label : option.labelEn
}

// 点击主题卡片 - 立即切换
function handleThemeChange(value: 'auto' | 'light' | 'dark') {
  formData.theme = value
  // 立即切换主题（不等待保存）
  appStore.setTheme(value)
  // 异步保存到后端
  saveSingleSetting('theme', value)
}

// 点击语言卡片 - 立即切换
function handleLanguageChange(value: 'zh-CN' | 'en-US') {
  formData.language = value
  // 立即切换语言（不等待保存）
  appStore.setLanguage(value)
  // 异步保存到后端
  saveSingleSetting('language', value)
}

// 异步保存单个设置
async function saveSingleSetting(key: 'theme' | 'language', value: string) {
  try {
    await (configStore as any).updateUserSettings({
      avatar: formData.avatar,
      name: formData.name,
      theme: formData.theme as 'auto' | 'light' | 'dark',
      language: formData.language as 'zh-CN' | 'en-US',
    })
    if (import.meta.env.DEV) {
      console.log(`✅ [UserSettings] ${key} 已同步到后端:`, value)
    }
  }
  catch (error: any) {
    console.error(`❌ [UserSettings] ${key} 同步失败:`, error)
  }
}

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

    // ✅ 保存成功的日志（只在开发环境输出）
    if (import.meta.env.DEV) {
      console.log('✅ [UserSettings] 保存成功:', {
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
    <NCard title="个人设置" :bordered="false" class="transparent-card">
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
          <div class="theme-cards-container">
            <div
              v-for="option in themeOptions"
              :key="option.value"
              class="theme-card"
              :class="{ active: formData.theme === option.value }"
              @click="handleThemeChange(option.value as 'auto' | 'light' | 'dark')"
            >
              <SvgIcon :icon="option.icon" class="theme-card-icon" />
              <div class="theme-card-label">{{ getDisplayLabel(option) }}</div>
            </div>
          </div>
        </NFormItem>

        <NFormItem label="界面语言" path="language">
          <div class="language-cards-container">
            <div
              v-for="option in languageOptions"
              :key="option.value"
              class="language-card"
              :class="{ active: formData.language === option.value }"
              @click="handleLanguageChange(option.value as 'zh-CN' | 'en-US')"
            >
              <SvgIcon :icon="option.icon" class="language-card-icon" />
              <div class="language-card-label">{{ getDisplayLabel(option) }}</div>
            </div>
          </div>
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

/* 🔥 让 NCard 背景透明 */
.transparent-card {
  --n-color: transparent !important;
  background-color: transparent !important;
}

/* 主题卡片容器 */
.theme-cards-container,
.language-cards-container {
  display: flex;
  gap: 12px;
  width: 100%;
}

/* 主题卡片 */
.theme-card,
.language-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px 16px;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: transparent;
}

.dark .theme-card,
.dark .language-card {
  border-color: rgba(255, 255, 255, 0.1);
}

.theme-card:hover,
.language-card:hover {
  border-color: rgba(0, 0, 0, 0.2);
  background: rgba(0, 0, 0, 0.02);
}

.dark .theme-card:hover,
.dark .language-card:hover {
  border-color: rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.05);
}

/* 激活状态 */
.theme-card.active,
.language-card.active {
  border-color: #080808;
  background: rgba(8, 8, 8, 0.05);
}

.dark .theme-card.active,
.dark .language-card.active {
  border-color: #ffffff;
  background: rgba(255, 255, 255, 0.1);
}

/* 图标 */
.theme-card-icon,
.language-card-icon {
  font-size: 32px;
  margin-bottom: 12px;
  color: #333;
}

.dark .theme-card-icon,
.dark .language-card-icon {
  color: #fff;
}

/* 标签 */
.theme-card-label,
.language-card-label {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.dark .theme-card-label,
.dark .language-card-label {
  color: #fff;
}
</style>
