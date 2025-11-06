<script setup lang='ts'>
import { NButton, NSpin, useMessage } from 'naive-ui'
import { computed, onMounted, ref } from 'vue'
import { fetchAPIUsage } from '@/api'
import { SvgIcon } from '@/components/common'
import { createLocalStorage } from '@/utils/storage'
import pkg from '../../../../package.json'

interface UsageData {
  model_limits_enabled?: boolean
  total_available?: number
  total_granted?: number
  total_used?: number
  [key: string]: any
}

const STORAGE_KEY = 'api_usage_data'

const message = useMessage()
const ss = createLocalStorage({ expire: 60 * 60 * 24 }) // 24小时过期

const loadingUsage = ref(false)
const usageData = ref<UsageData>()

// 从 localStorage 加载缓存的使用量数据
function loadCachedUsage() {
  try {
    const cached = ss.get(STORAGE_KEY)
    if (cached) {
      usageData.value = cached
      return true
    }
  }
  catch (error) {
    console.warn('⚠️ [Usage] 加载缓存失败:', error)
  }
  return false
}

// 保存使用量数据到 localStorage
function saveUsageToCache(data: UsageData) {
  try {
    ss.set(STORAGE_KEY, data)
  }
  catch (error) {
    console.warn('⚠️ [Usage] 保存缓存失败:', error)
  }
}

// 千分位格式化（添加单位）
function formatNumber(num: number | undefined): string {
  if (num === undefined || num === null)
    return '-'
  return `${num.toLocaleString('en-US')} Tokens`
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

    // 🔐 apiClient 拦截器会自动添加认证 token，无需手动处理
    const response = await fetchAPIUsage<any>()

    if (response.status === 'Success' && response.data) {
      // response.data 结构: { code: true, data: {...}, message: 'ok' }
      const apiData = response.data
      const finalData = apiData.data || apiData

      usageData.value = finalData
      // 保存到缓存
      saveUsageToCache(finalData)

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

// 更新使用量（从外部调用，例如聊天响应后）
function updateUsage(newTotalUsed: number) {
  if (usageData.value) {
    usageData.value.total_used = newTotalUsed
    saveUsageToCache(usageData.value)
  }
}

// 组件挂载时从缓存加载
onMounted(() => {
  if (loadCachedUsage()) {
    // 缓存存在，后台刷新最新数据
    fetchUsage().catch(() => {
      // 静默失败，使用缓存数据
    })
  }
  else {
    // 缓存不存在，立即获取
    fetchUsage()
  }
})

// 暴露方法给父组件调用
defineExpose({
  fetchUsage,
  updateUsage,
})
</script>

<template>
  <div class="p-4 space-y-4">
    <!-- 版本信息 -->
    <h2 class="text-xl font-bold">
      Version - {{ pkg.version }}
    </h2>

    <!-- API 使用量信息 -->
    <div class="space-y-4">
      <NSpin :show="loadingUsage">
        <div v-if="usageData" class="p-4 space-y-3 rounded-md bg-neutral-100 dark:bg-neutral-700">
          <!-- 标题和刷新按钮 -->
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-lg font-semibold text-neutral-700 dark:text-neutral-200">
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
            </NButton>
          </div>

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
  </div>
</template>
