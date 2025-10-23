<script setup lang='ts'>
import type { CSSProperties } from 'vue'
import { NButton, NLayoutSider, NTag, useDialog } from 'naive-ui'
import { nanoid } from 'nanoid'
import { computed, ref, watch } from 'vue'
import { PromptStore, SvgIcon } from '@/components/common'
import { useBasicLayout } from '@/hooks/useBasicLayout'
import { t } from '@/locales'
import { useAppStore, useAuthStore, useChatStore } from '@/store'
import List from './List.vue'

const appStore = useAppStore()
const chatStore = useChatStore()
const authStore = useAuthStore()

const dialog = useDialog()

const { isMobile } = useBasicLayout()
const show = ref(false)

const isChatGPTAPI = computed<boolean>(() => !!authStore.isChatGPTAPI)

// 获取用户角色（优先使用 roles 数组，兼容单个 role 字段）
const userRoles = computed(() => {
  const roles = authStore.userInfo?.roles || []
  const singleRole = authStore.userInfo?.role

  // 如果 roles 数组为空，使用单个 role 字段
  if (roles.length === 0 && singleRole) {
    return [singleRole]
  }

  return roles
})

// 获取主要显示的角色（优先级：Admin > Ultra > Pro > Free）
const primaryRole = computed(() => {
  const roles = userRoles.value

  // 检查是否为管理员（不区分大小写）
  if (roles.some(r => r.toLowerCase() === 'admin')) {
    return 'Admin'
  }

  // 按会员等级优先级排序
  if (roles.includes('Ultra'))
    return 'Ultra'
  if (roles.includes('Pro'))
    return 'Pro'
  if (roles.includes('free') || roles.includes('Free'))
    return 'Free'

  // 默认返回免费用户（兼容旧数据）
  return 'Free'
})

// 用户角色显示文本
const roleText = computed(() => {
  const roleMap: Record<string, string> = {
    Admin: '超级管理员',
    Ultra: 'Ultra会员',
    Pro: 'Pro会员',
    Free: '免费用户',
  }

  return roleMap[primaryRole.value] || '免费用户'
})

// 角色标签类型
const roleTagType = computed(() => {
  const typeMap: Record<string, 'error' | 'warning' | 'success' | 'info'> = {
    Admin: 'error', // 红色 - 管理员
    Ultra: 'warning', // 橙色 - Ultra会员
    Pro: 'success', // 绿色 - Pro会员
    Free: 'info', // 蓝色 - 免费用户
  }

  return typeMap[primaryRole.value] || 'info'
})

// 计算属性：从 store 获取设置页面状态
const showSettingsPage = computed(() => appStore.showSettingsPage)
const activeSettingTab = computed(() => appStore.activeSettingTab)

// 判断是否为管理员
const isAdmin = computed(() => {
  return primaryRole.value === 'Admin'
})

// 设置导航项列表
const settingItems = computed(() => {
  const items = [
    { key: 'General', label: t('modelsSetting.general'), icon: 'ri:file-user-line' },
    { key: 'ChatConfig', label: '聊天配置', icon: 'ri:chat-settings-line' },
    { key: 'Config', label: t('modelsSetting.config'), icon: 'ri:list-settings-line' },
    { key: 'WorkflowModel', label: t('modelsSetting.workflowModel'), icon: 'ri:git-branch-line' },
  ]

  // 如果是 ChatGPT API，添加高级设置
  if (isChatGPTAPI.value) {
    items.splice(2, 0, { key: 'Advanced', label: t('modelsSetting.advanced'), icon: 'ri:equalizer-line' })
  }

  // 只有管理员才能看到供应商管理
  if (isAdmin.value) {
    items.push({ key: 'ProviderConfig', label: t('modelsSetting.providerConfig'), icon: 'ri:settings-3-line' })
  }

  return items
})

const collapsed = computed(() => appStore.siderCollapsed)

function handleAdd() {
  const previousUuid = chatStore.active
  if (previousUuid) {
    const prevMessages = chatStore.getChatByUuid(previousUuid)
    if (!prevMessages || prevMessages.length === 0) {
      const prevIndex = chatStore.history.findIndex(item => item.uuid === previousUuid)
      if (prevIndex !== -1)
        chatStore.deleteHistory(prevIndex)
    }
  }

  chatStore.addHistory({ title: t('chat.newChatTitle'), uuid: nanoid(), isEdit: false, mode: 'normal' })
  if (isMobile.value)
    appStore.setSiderCollapsed(true)
}

function handleUpdateCollapsed() {
  appStore.setSiderCollapsed(!collapsed.value)
}

function handleClearAll() {
  dialog.warning({
    title: t('chat.deleteMessage'),
    content: t('chat.clearHistoryConfirm'),
    positiveText: t('common.yes'),
    negativeText: t('common.no'),
    onPositiveClick: () => {
      chatStore.clearHistory()
      if (isMobile.value)
        appStore.setSiderCollapsed(true)
    },
  })
}

function handleModeChange(mode: 'noteToQuestion' | 'noteToStory') {
  // 离开当前对话：若无消息则删除
  const previousUuid = chatStore.active
  if (previousUuid) {
    const prevMessages = chatStore.getChatByUuid(previousUuid)
    if (!prevMessages || prevMessages.length === 0) {
      const prevIndex = chatStore.history.findIndex(item => item.uuid === previousUuid)
      if (prevIndex !== -1)
        chatStore.deleteHistory(prevIndex)
    }
  }

  // 创建目标模式的新对话
  chatStore.addHistory({
    title: mode === 'noteToQuestion' ? t('chat.modeNoteToQuestion') : t('chat.modeNoteToStory'),
    uuid: nanoid(),
    isEdit: false,
    mode,
  })
  if (isMobile.value)
    appStore.setSiderCollapsed(true)
}

// 切换到设置页面
function handleShowSettings() {
  appStore.setShowSettingsPage(true)
  appStore.setActiveSettingTab('General')
}

// 返回菜单
function handleBackToMenu() {
  appStore.setShowSettingsPage(false)
}

// 选择设置项
function handleSelectSettingItem(key: string) {
  appStore.setActiveSettingTab(key)
}

const getMobileClass = computed<CSSProperties>(() => {
  if (isMobile.value) {
    return {
      position: 'fixed',
      zIndex: 50,
    }
  }
  return {}
})

// 🔥 Sider 内容样式（支持暗黑模式）
const siderContentStyle = computed<CSSProperties>(() => {
  return {
    backgroundColor: 'var(--n-color)',
  }
})

const mobileSafeArea = computed(() => {
  if (isMobile.value) {
    return {
      paddingBottom: 'env(safe-area-inset-bottom)',
    }
  }
  return {}
})

watch(
  isMobile,
  (val) => {
    appStore.setSiderCollapsed(val)
  },
  {
    immediate: true,
    flush: 'post',
  },
)
</script>

<template>
  <NLayoutSider
    :collapsed="collapsed"
    :collapsed-width="0"
    :width="260"
    :show-trigger="isMobile ? false : 'arrow-circle'"
    collapse-mode="transform"
    position="absolute"
    bordered
    :style="getMobileClass"
    :content-style="siderContentStyle"
    @update-collapsed="handleUpdateCollapsed"
  >
    <div class="flex flex-col h-full overflow-hidden" :style="mobileSafeArea">
      <!-- 双层容器实现滑动切换 -->
      <div class="relative flex-1 overflow-hidden">
        <!-- 菜单面板 -->
        <div
          class="absolute inset-0 flex flex-col sider-panel-transition"
          :class="showSettingsPage ? '-translate-x-full' : 'translate-x-0'"
        >
          <main class="flex flex-col flex-1 min-h-0">
            <!-- 聊天模式切换组件 -->
            <div class="p-4 border-b border-neutral-200 dark:border-neutral-700">
              <div class="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">
                {{ $t('chat.mode') }}
              </div>
              <div class="flex flex-col space-y-2">
                <NButton
                  :type="chatStore.chatMode === 'noteToQuestion' ? 'primary' : 'default'"
                  block
                  @click="handleModeChange('noteToQuestion')"
                >
                  <template #icon>
                    <SvgIcon icon="ri:file-text-line" />
                  </template>
                  {{ $t('chat.modeNoteToQuestion') }}
                </NButton>
                <NButton
                  :type="chatStore.chatMode === 'noteToStory' ? 'primary' : 'default'"
                  block
                  @click="handleModeChange('noteToStory')"
                >
                  <template #icon>
                    <SvgIcon icon="ri:book-open-line" />
                  </template>
                  {{ $t('chat.modeNoteToStory') }}
                </NButton>
              </div>
            </div>
            <div class="p-4">
              <NButton dashed block @click="handleAdd">
                {{ $t('chat.newChatButton') }}
              </NButton>
            </div>
            <div class="flex-1 min-h-0 pb-4 overflow-hidden">
              <List />
            </div>
            <div class="flex items-center p-4 space-x-4">
              <div class="flex-1">
                <NButton block @click="show = true">
                  {{ $t('store.siderButton') }}
                </NButton>
              </div>
              <NButton @click="handleClearAll">
                <SvgIcon icon="ri:close-circle-line" />
              </NButton>
            </div>
          </main>
        </div>

        <!-- 设置导航面板 -->
        <div
          class="absolute inset-0 flex flex-col sider-panel-transition bg-white dark:bg-[#18181c]"
          :class="showSettingsPage ? 'translate-x-0' : 'translate-x-full'"
        >
          <!-- 设置导航列表 -->
          <main class="flex-1 overflow-y-auto p-2">
            <div class="space-y-1">
              <div
                v-for="item in settingItems"
                :key="item.key"
                class="setting-nav-item"
                :class="{ active: activeSettingTab === item.key }"
                @click="handleSelectSettingItem(item.key)"
              >
                <SvgIcon :icon="item.icon" class="text-lg" />
                <span class="ml-3">{{ item.label }}</span>
              </div>
            </div>
          </main>
        </div>
      </div>

      <!-- Footer - 独立于面板切换，根据状态显示不同图标 -->
      <footer class="flex items-center justify-between min-w-0 p-4 overflow-hidden border-t dark:border-neutral-800">
        <div class="flex items-center space-x-2 flex-1 min-w-0">
          <!-- TODO: 添加 Auth0 用户按钮 -->
          <!-- 用户角色标签 -->
          <NTag :type="roleTagType" size="small" round>
            {{ roleText }}
          </NTag>
        </div>
        <NButton quaternary circle @click="showSettingsPage ? handleBackToMenu() : handleShowSettings()">
          <template #icon>
            <span class="text-xl text-[#4f555e] dark:text-white">
              <SvgIcon :icon="showSettingsPage ? 'ri:arrow-left-line' : 'ri:settings-4-line'" />
            </span>
          </template>
        </NButton>
      </footer>
    </div>
  </NLayoutSider>
  <template v-if="isMobile">
    <div v-show="!collapsed" class="fixed inset-0 z-40 w-full h-full bg-black/40" @click="handleUpdateCollapsed" />
  </template>
  <PromptStore v-model:visible="show" />
</template>

<style scoped>
/* 侧边栏面板滑动过渡效果 - 使用流畅的缓动函数 */
.sider-panel-transition {
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 设置导航项样式 */
.setting-nav-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  margin: 4px 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.1s ease;
  color: #666;
}

.setting-nav-item:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

:deep(.dark) .setting-nav-item {
  color: #999;
}

:deep(.dark) .setting-nav-item:hover {
  background-color: rgba(255, 255, 255, 0.05);
}

.setting-nav-item.active {
  background-color: rgba(0, 0, 0, 0.08);
  color: #333;
  font-weight: 500;
}

:deep(.dark) .setting-nav-item.active {
  background-color: rgba(255, 255, 255, 0.1);
  color: #fff;
}
</style>
