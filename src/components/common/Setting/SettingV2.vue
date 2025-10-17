<script setup lang='ts'>
import { NDrawer, NDrawerContent, NMenu } from 'naive-ui'
import type { MenuOption } from 'naive-ui'
import { computed, h, ref, watch } from 'vue'
import { SvgIcon } from '@/components/common'
import { useAuthStore } from '@/store'
import UserSettingsPanel from './panels/UserSettingsPanel.vue'
import ChatConfigPanel from './panels/ChatConfigPanel.vue'
import WorkflowConfigPanel from './panels/WorkflowConfigPanel.vue'
import ProviderConfigPanel from './panels/ProviderConfigPanel.vue'

interface Props {
  visible: boolean
}

interface Emit {
  (e: 'update:visible', visible: boolean): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emit>()

const authStore = useAuthStore()

// 判断是否为管理员（假设角色信息存储在 authStore 中）
const isAdmin = computed<boolean>(() => {
  // 根据你的实际角色系统调整
  // 例如：return authStore.userInfo?.role === 'admin'
  return authStore.userInfo?.role === 'admin' || false
})

const show = computed({
  get() {
    return props.visible
  },
  set(visible: boolean) {
    emit('update:visible', visible)
  },
})

// 当前激活的面板
const activePanel = ref('user-settings')

// 菜单选项
const menuOptions = computed<MenuOption[]>(() => {
  const baseOptions: MenuOption[] = [
    {
      label: '个人设置',
      key: 'user-settings',
      icon: renderIcon('ri:user-settings-line'),
    },
    {
      label: '聊天配置',
      key: 'chat-config',
      icon: renderIcon('ri:chat-settings-line'),
    },
    {
      label: '工作流配置',
      key: 'workflow-config',
      icon: renderIcon('ri:git-branch-line'),
    },
  ]

  // 只有管理员才能看到供应商配置
  if (isAdmin.value) {
    baseOptions.push({
      label: '供应商管理',
      key: 'provider-config',
      icon: renderIcon('ri:settings-3-line'),
    })
  }

  return baseOptions
})

// 渲染菜单图标
function renderIcon(icon: string) {
  return () => h(SvgIcon, { icon, class: 'text-lg' })
}

// 监听菜单选择
function handleMenuSelect(key: string) {
  activePanel.value = key
}

// 监听抽屉打开，重置为第一个面板
watch(() => props.visible, (visible) => {
  if (visible)
    activePanel.value = 'user-settings'
})
</script>

<template>
  <NDrawer
    v-model:show="show"
    :width="'80vw'"
    :height="'100vh'"
    placement="right"
    :auto-focus="false"
  >
    <NDrawerContent :native-scrollbar="false" closable>
      <template #header>
        <div class="flex items-center gap-2">
          <SvgIcon icon="ri:settings-4-line" class="text-2xl" />
          <span class="text-xl font-semibold">设置</span>
        </div>
      </template>

      <div class="flex h-full">
        <!-- 左侧菜单 -->
        <div class="w-[200px] border-r border-gray-200 dark:border-gray-700 pr-4">
          <NMenu
            v-model:value="activePanel"
            :options="menuOptions"
            @update:value="handleMenuSelect"
          />
        </div>

        <!-- 右侧内容区 -->
        <div class="flex-1 pl-6 overflow-y-auto">
          <UserSettingsPanel v-if="activePanel === 'user-settings'" />
          <ChatConfigPanel v-else-if="activePanel === 'chat-config'" />
          <WorkflowConfigPanel v-else-if="activePanel === 'workflow-config'" />
          <ProviderConfigPanel v-else-if="activePanel === 'provider-config'" />
        </div>
      </div>
    </NDrawerContent>
  </NDrawer>
</template>

<style scoped>
/* 自定义样式 */
</style>

