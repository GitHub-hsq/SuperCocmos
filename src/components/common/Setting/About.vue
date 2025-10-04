<script setup lang='ts'>
import { computed, ref } from 'vue'
import { NButton, NSpin, useMessage } from 'naive-ui'
import pkg from '../../../../package.json'
import { fetchAPIUsage } from '@/api'
import { useAuthStore } from '@/store'
import { SvgIcon } from '@/components/common'

interface UsageData {
  model_limits_enabled?: boolean
  total_available?: number
  total_granted?: number
  total_used?: number
  [key: string]: any
}

const authStore = useAuthStore()
const message = useMessage()

const loadingUsage = ref(false)
const usageData = ref<UsageData>()

const isChatGPTAPI = computed<boolean>(() => !!authStore.isChatGPTAPI)

// 千分位格式化
function formatNumber(num: number | undefined): string {
  if (num === undefined || num === null)
    return '-'
  return num.toLocaleString('en-US')
}

// 计算剩余量
const remaining = computed(() => {
  if (!usageData.value || usageData.value.total_available === undefined || usageData.value.total_used === undefined)
    return undefined
  return usageData.value.total_available - usageData.value.total_used
})

async function fetchUsage() {
  try {
    loadingUsage.value = true
    const response = await fetchAPIUsage<any>()
    // console.log('余额 API 返回数据:', response)

    if (response.status === 'Success' && response.data) {
      // response.data 结构: { code: true, data: {...}, message: 'ok' }
      const apiData = response.data
      if (apiData.data)
        usageData.value = apiData.data
      else
        usageData.value = apiData

      message.success('使用量刷新成功')
    }
  }
  catch (error: any) {
    console.error('获取使用量失败:', error)
    message.error(`获取使用量失败: ${error.message || '未知错误'}`)
  }
  finally {
    loadingUsage.value = false
  }
}

// 暴露方法给父组件调用
defineExpose({
  fetchUsage,
})
</script>

<template>
  <div class="p-4 space-y-4">
    <!-- 版本信息 -->
    <h2 class="text-xl font-bold">
      Version - {{ pkg.version }}
    </h2>

    <!-- API 使用量信息 -->
    <div v-if="isChatGPTAPI" class="space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold">
          API 使用量
        </h3>
        <NButton
          size="small"
          :loading="loadingUsage"
          @click="fetchUsage"
        >
          <template #icon>
            <SvgIcon icon="ri:refresh-line" />
          </template>
          {{ loadingUsage ? '刷新中...' : '刷新' }}
        </NButton>
      </div>

      <NSpin :show="loadingUsage">
        <div v-if="usageData" class="p-4 space-y-3 rounded-md bg-neutral-100 dark:bg-neutral-700">
          <!-- 模型限制状态 -->
          <div class="flex items-center justify-between">
            <span class="text-neutral-600 dark:text-neutral-300">模型限制：</span>
            <span :class="usageData.model_limits_enabled ? 'text-orange-500' : 'text-green-500'" class="font-semibold">
              {{ usageData.model_limits_enabled !== undefined ? (usageData.model_limits_enabled ? '已启用' : '未启用') : '-' }}
            </span>
          </div>

          <!-- 总量 -->
          <div class="flex items-center justify-between">
            <span class="text-neutral-600 dark:text-neutral-300">总量：</span>
            <span class="font-semibold">{{ formatNumber(usageData.total_available) }}</span>
          </div>

          <!-- 已使用 -->
          <div class="flex items-center justify-between">
            <span class="text-neutral-600 dark:text-neutral-300">已使用：</span>
            <span class="font-semibold text-red-500">{{ formatNumber(usageData.total_used) }}</span>
          </div>

          <!-- 已授权 -->
          <div class="flex items-center justify-between">
            <span class="text-neutral-600 dark:text-neutral-300">已授权：</span>
            <span class="font-semibold">{{ formatNumber(usageData.total_granted) }}</span>
          </div>

          <!-- 剩余量 -->
          <div class="flex items-center justify-between border-t pt-3 dark:border-neutral-600">
            <span class="text-neutral-600 dark:text-neutral-300 font-medium">剩余量：</span>
            <span class="font-bold text-green-500 text-lg">{{ formatNumber(remaining) }}</span>
          </div>
        </div>
        <div v-else class="p-4 text-center text-neutral-500">
          点击刷新按钮获取使用量信息
        </div>
      </NSpin>
    </div>

    <div v-else class="p-4 text-center text-neutral-500">
      当前使用的不是 ChatGPT API 模式
    </div>
  </div>
</template>
