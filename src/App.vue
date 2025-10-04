<script setup lang="ts">
import { onMounted } from 'vue'
import { NConfigProvider } from 'naive-ui'
import { NaiveProvider } from '@/components/common'
import { useTheme } from '@/hooks/useTheme'
import { useLanguage } from '@/hooks/useLanguage'
import { useModelStore } from '@/store'

const { theme, themeOverrides } = useTheme()
const { language } = useLanguage()
const modelStore = useModelStore()

// 应用启动时加载模型列表
onMounted(async () => {
  try {
    await modelStore.loadModelsFromBackend()
  }
  catch (error) {
    console.error('加载模型列表失败:', error)
  }
})
</script>

<template>
  <NConfigProvider
    class="h-full"
    :theme="theme"
    :theme-overrides="themeOverrides"
    :locale="language"
  >
    <NaiveProvider>
      <RouterView />
    </NaiveProvider>
  </NConfigProvider>
</template>
