<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const router = useRouter()
const { t } = useI18n()

function goBack() {
  router.back()
}

function goHome() {
  router.push('/')
}
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-screen bg-white dark:bg-gray-900">
    <div class="text-center">
      <!-- 403 图标 -->
      <div class="mb-8">
        <svg class="mx-auto h-24 w-24 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>

      <!-- 标题 -->
      <h1 class="text-6xl font-bold text-gray-900 dark:text-white mb-4">
        403
      </h1>

      <!-- 描述 -->
      <p class="text-xl text-gray-600 dark:text-gray-400 mb-2">
        {{ t('common.accessDenied') }}
      </p>
      <p class="text-base text-gray-500 dark:text-gray-500 mb-8">
        {{ t('common.noPermission') }}
      </p>

      <!-- 操作按钮 -->
      <div class="flex gap-4 justify-center">
        <button
          class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          @click="goBack"
        >
          {{ t('common.goBack') }}
        </button>
        <button
          class="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          @click="goHome"
        >
          {{ t('common.backToHome') }}
        </button>
      </div>
    </div>
  </div>
</template>
