<script setup lang='ts'>
import { NLayout, NLayoutContent } from 'naive-ui'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useBasicLayout } from '@/hooks/useBasicLayout'
import { useAppStore, useAuthStore, useChatStore } from '@/store'
import Permission from './Permission.vue'
import Sider from './sider/index.vue'

const router = useRouter()
const appStore = useAppStore()
const chatStore = useChatStore()
const authStore = useAuthStore()

// 🔥 只在有 active 会话时才导航，否则保持在 /chat
if (chatStore.active) {
  router.replace({ name: 'Chat', params: { uuid: chatStore.active } })
}

const { isMobile } = useBasicLayout()

const collapsed = computed(() => appStore.siderCollapsed)

const needPermission = computed(() => !!authStore.session?.auth && !authStore.token)

const getMobileClass = computed(() => {
  if (isMobile.value)
    return ['rounded-none', 'shadow-none']
  return ['border', 'rounded-md', 'shadow-md', 'dark:border-neutral-800']
})

const getContainerClass = computed(() => {
  return [
    'h-full',
    { 'pl-[260px]': !isMobile.value && !collapsed.value },
    { 'pl-[55px]': !isMobile.value && collapsed.value },
  ]
})
</script>

<template>
  <div class="h-full dark:bg-[#24272e] transition-all p-0">
    <div class="h-full overflow-hidden" :class="getMobileClass">
      <NLayout class="z-40 transition" :class="getContainerClass" has-sider>
        <Sider />
        <NLayoutContent class="h-full">
          <RouterView v-slot="{ Component }">
            <!-- 移除 :key，让 Vue Router 自己管理组件复用 -->
            <!-- 会话切换时组件会复用，watch 会触发，提升性能 -->
            <component :is="Component" />
          </RouterView>
        </NLayoutContent>
      </NLayout>
    </div>
    <Permission :visible="needPermission" />
  </div>
</template>
