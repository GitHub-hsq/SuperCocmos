<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { NConfigProvider } from 'naive-ui'
import { NaiveProvider, Loading } from '@/components/common'
import { useTheme } from '@/hooks/useTheme'
import { useLanguage } from '@/hooks/useLanguage'
import { useModelStore } from '@/store'

const { theme, themeOverrides } = useTheme()
const { language } = useLanguage()
const modelStore = useModelStore()

// 启动Loading状态
const isAppLoading = ref(true)

// 应用启动时加载模型列表
onMounted(async () => {
  try {
    await modelStore.loadModelsFromBackend()
  }
  catch (error) {
    console.error('加载模型列表失败:', error)
  }
  finally {
    // 确保至少显示Loading一段时间，提供更好的用户体验
    setTimeout(() => {
      isAppLoading.value = false
    }, 1000)
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
      <!-- 应用启动Loading -->
      <Loading v-if="isAppLoading" />
      <!-- 主应用内容 -->
      <RouterView v-else />
    </NaiveProvider>
  </NConfigProvider>
</template>
