<script setup lang='ts'>
import { defineAsyncComponent, ref } from 'vue'
import { HoverButton, SvgIcon, UserAvatar } from '@/components/common'

// 🔥 使用新的 SettingV2 组件（左右结构，支持权限控制）
const Setting = defineAsyncComponent(() => import('@/components/common/Setting/SettingV2.vue'))

// 💡 如果需要使用旧版本，取消注释下面这行：
// const Setting = defineAsyncComponent(() => import('@/components/common/Setting/index.vue'))

const show = ref(false)
</script>

<template>
  <footer class="flex items-center justify-between min-w-0 p-4 overflow-hidden border-t dark:border-neutral-800">
    <div class="flex-1 flex-shrink-0 overflow-hidden">
      <UserAvatar />
    </div>

    <HoverButton @click="show = true">
      <span class="text-xl text-[#4f555e] dark:text-white">
        <SvgIcon icon="ri:settings-4-line" />
      </span>
    </HoverButton>

    <Setting v-if="show" v-model:visible="show" />
  </footer>
</template>
