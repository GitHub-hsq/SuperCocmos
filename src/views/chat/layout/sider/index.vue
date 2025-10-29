<script setup lang='ts'>
import type { CSSProperties } from 'vue'
import { NButton, NLayoutSider, NPopover } from 'naive-ui'
import { nanoid } from 'nanoid'
import { computed, ref, watch } from 'vue'
import { SvgIcon } from '@/components/common'
import { useBasicLayout } from '@/hooks/useBasicLayout'
import { useTheme } from '@/hooks/useTheme'
import { t } from '@/locales'
import { useAppStore, useAuthStore, useChatStore } from '@/store'
import Profile from '@/views/chat/components/User/Profile.vue'
import List from './List.vue'

const appStore = useAppStore()
const chatStore = useChatStore()
const authStore = useAuthStore()
const { theme } = useTheme()

const { isMobile } = useBasicLayout()

const isChatGPTAPI = computed<boolean>(() => !!authStore.isChatGPTAPI)

// 计算属性：从 store 获取设置页面状态
const showSettingsPage = computed(() => appStore.showSettingsPage)
const activeSettingTab = computed(() => appStore.activeSettingTab)

// 判断是否为管理员
const isAdmin = computed(() => {
  const roles = authStore.userInfo?.roles || []
  const singleRole = authStore.userInfo?.role

  // 检查 roles 数组
  if (roles.some((r: string) => r.toLowerCase() === 'admin')) {
    return true
  }

  // 兼容单个 role 字段
  if (singleRole && singleRole.toLowerCase() === 'admin') {
    return true
  }

  return false
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

// 判断是否为深色模式
const isDark = computed(() => !!theme.value)

// 历史记录展开状态
const historyExpanded = ref(true)

// 当前语言
const currentLanguage = computed(() => appStore.language)

// 设置标题（根据语言）
const settingsTitle = computed(() => currentLanguage.value === 'zh-CN' ? '设置' : 'Settings')

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
  // 如果侧边栏是收起的，先展开
  if (collapsed.value) {
    appStore.setSiderCollapsed(false)
  }
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
    backgroundColor: isDark.value ? 'var(--n-color)' : 'var(--nav-bg-light)',
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
    :collapsed-width="55"
    :width="260"
    :show-trigger="false"
    collapse-mode="width"
    position="absolute"
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
            <!-- Logo 和展开/收起按钮 -->
            <div class="sider-header nav-bg" :class="{ collapsed }">
              <!-- 展开状态 -->
              <template v-if="!collapsed">
                <div class="sider-logo-wrapper">
                  <img
                    src="/favicon.svg"
                    alt="Logo"
                    class="sider-logo-icon"
                  />
                  <span class="sider-logo-text">SuperCocmos</span>
                </div>
                <button
                  class="sider-toggle-btn"
                  @click="handleUpdateCollapsed"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" class="icon">
                    <path d="M6.83496 3.99992C6.38353 4.00411 6.01421 4.0122 5.69824 4.03801C5.31232 4.06954 5.03904 4.12266 4.82227 4.20012L4.62207 4.28606C4.18264 4.50996 3.81498 4.85035 3.55859 5.26848L3.45605 5.45207C3.33013 5.69922 3.25006 6.01354 3.20801 6.52824C3.16533 7.05065 3.16504 7.71885 3.16504 8.66301V11.3271C3.16504 12.2712 3.16533 12.9394 3.20801 13.4618C3.25006 13.9766 3.33013 14.2909 3.45605 14.538L3.55859 14.7216C3.81498 15.1397 4.18266 15.4801 4.62207 15.704L4.82227 15.79C5.03904 15.8674 5.31234 15.9205 5.69824 15.9521C6.01398 15.9779 6.383 15.986 6.83398 15.9902L6.83496 3.99992ZM18.165 11.3271C18.165 12.2493 18.1653 12.9811 18.1172 13.5702C18.0745 14.0924 17.9916 14.5472 17.8125 14.9648L17.7295 15.1415C17.394 15.8 16.8834 16.3511 16.2568 16.7353L15.9814 16.8896C15.5157 17.1268 15.0069 17.2285 14.4102 17.2773C13.821 17.3254 13.0893 17.3251 12.167 17.3251H7.83301C6.91071 17.3251 6.17898 17.3254 5.58984 17.2773C5.06757 17.2346 4.61294 17.1508 4.19531 16.9716L4.01855 16.8896C3.36014 16.5541 2.80898 16.0434 2.4248 15.4169L2.27051 15.1415C2.03328 14.6758 1.93158 14.167 1.88281 13.5702C1.83468 12.9811 1.83496 12.2493 1.83496 11.3271V8.66301C1.83496 7.74072 1.83468 7.00898 1.88281 6.41985C1.93157 5.82309 2.03329 5.31432 2.27051 4.84856L2.4248 4.57317C2.80898 3.94666 3.36012 3.436 4.01855 3.10051L4.19531 3.0175C4.61285 2.83843 5.06771 2.75548 5.58984 2.71281C6.17898 2.66468 6.91071 2.66496 7.83301 2.66496H12.167C13.0893 2.66496 13.821 2.66468 14.4102 2.71281C15.0069 2.76157 15.5157 2.86329 15.9814 3.10051L16.2568 3.25481C16.8833 3.63898 17.394 4.19012 17.7295 4.84856L17.8125 5.02531C17.9916 5.44285 18.0745 5.89771 18.1172 6.41985C18.1653 7.00898 18.165 7.74072 18.165 8.66301V11.3271ZM8.16406 15.995H12.167C13.1112 15.995 13.7794 15.9947 14.3018 15.9521C14.8164 15.91 15.1308 15.8299 15.3779 15.704L15.5615 15.6015C15.9797 15.3451 16.32 14.9774 16.5439 14.538L16.6299 14.3378C16.7074 14.121 16.7605 13.8478 16.792 13.4618C16.8347 12.9394 16.835 12.2712 16.835 11.3271V8.66301C16.835 7.71885 16.8347 7.05065 16.792 6.52824C16.7605 6.14232 16.7073 5.86904 16.6299 5.65227L16.5439 5.45207C16.32 5.01264 15.9796 4.64498 15.5615 4.3886L15.3779 4.28606C15.1308 4.16013 14.8165 4.08006 14.3018 4.03801C13.7794 3.99533 13.1112 3.99504 12.167 3.99504H8.16406C8.16407 3.99667 8.16504 3.99829 8.16504 3.99992L8.16406 15.995Z"></path>
                  </svg>
                </button>
              </template>

              <!-- 收起状态：logo占满，悬停时显示展开按钮 -->
              <template v-else>
                <div class="sider-collapsed-logo-wrapper" @click="handleUpdateCollapsed">
                  <img
                    src="/favicon.svg"
                    alt="Logo"
                    class="sider-collapsed-logo-icon"
                  />
                  <div class="sider-collapsed-expand-btn">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg" class="icon" style="transform: scaleX(-1)">
                      <path d="M6.83496 3.99992C6.38353 4.00411 6.01421 4.0122 5.69824 4.03801C5.31232 4.06954 5.03904 4.12266 4.82227 4.20012L4.62207 4.28606C4.18264 4.50996 3.81498 4.85035 3.55859 5.26848L3.45605 5.45207C3.33013 5.69922 3.25006 6.01354 3.20801 6.52824C3.16533 7.05065 3.16504 7.71885 3.16504 8.66301V11.3271C3.16504 12.2712 3.16533 12.9394 3.20801 13.4618C3.25006 13.9766 3.33013 14.2909 3.45605 14.538L3.55859 14.7216C3.81498 15.1397 4.18266 15.4801 4.62207 15.704L4.82227 15.79C5.03904 15.8674 5.31234 15.9205 5.69824 15.9521C6.01398 15.9779 6.383 15.986 6.83398 15.9902L6.83496 3.99992ZM18.165 11.3271C18.165 12.2493 18.1653 12.9811 18.1172 13.5702C18.0745 14.0924 17.9916 14.5472 17.8125 14.9648L17.7295 15.1415C17.394 15.8 16.8834 16.3511 16.2568 16.7353L15.9814 16.8896C15.5157 17.1268 15.0069 17.2285 14.4102 17.2773C13.821 17.3254 13.0893 17.3251 12.167 17.3251H7.83301C6.91071 17.3251 6.17898 17.3254 5.58984 17.2773C5.06757 17.2346 4.61294 17.1508 4.19531 16.9716L4.01855 16.8896C3.36014 16.5541 2.80898 16.0434 2.4248 15.4169L2.27051 15.1415C2.03328 14.6758 1.93158 14.167 1.88281 13.5702C1.83468 12.9811 1.83496 12.2493 1.83496 11.3271V8.66301C1.83496 7.74072 1.83468 7.00898 1.88281 6.41985C1.93157 5.82309 2.03329 5.31432 2.27051 4.84856L2.4248 4.57317C2.80898 3.94666 3.36012 3.436 4.01855 3.10051L4.19531 3.0175C4.61285 2.83843 5.06771 2.75548 5.58984 2.71281C6.17898 2.66468 6.91071 2.66496 7.83301 2.66496H12.167C13.0893 2.66496 13.821 2.66468 14.4102 2.71281C15.0069 2.76157 15.5157 2.86329 15.9814 3.10051L16.2568 3.25481C16.8833 3.63898 17.394 4.19012 17.7295 4.84856L17.8125 5.02531C17.9916 5.44285 18.0745 5.89771 18.1172 6.41985C18.1653 7.00898 18.165 7.74072 18.165 8.66301V11.3271ZM8.16406 15.995H12.167C13.1112 15.995 13.7794 15.9947 14.3018 15.9521C14.8164 15.91 15.1308 15.8299 15.3779 15.704L15.5615 15.6015C15.9797 15.3451 16.32 14.9774 16.5439 14.538L16.6299 14.3378C16.7074 14.121 16.7605 13.8478 16.792 13.4618C16.8347 12.9394 16.835 12.2712 16.835 11.3271V8.66301C16.835 7.71885 16.8347 7.05065 16.792 6.52824C16.7605 6.14232 16.7073 5.86904 16.6299 5.65227L16.5439 5.45207C16.32 5.01264 15.9796 4.64498 15.5615 4.3886L15.3779 4.28606C15.1308 4.16013 14.8165 4.08006 14.3018 4.03801C13.7794 3.99533 13.1112 3.99504 12.167 3.99504H8.16406C8.16407 3.99667 8.16504 3.99829 8.16504 3.99992L8.16406 15.995Z"></path>
                    </svg>
                  </div>
                </div>
              </template>
            </div>

            <!-- 导航列表（展开状态） -->
            <div v-show="!collapsed" class="nav-bg flex-1 min-h-0 overflow-hidden">
              <div class="px-4 py-2">
                <!-- 新建聊天 -->
                <div class="nav-item" @click="handleAdd">
                  <span class="nav-item-icon">
                    <SvgIcon icon="ri:add-line" />
                  </span>
                  <span class="nav-item-text">{{ $t('chat.newChatButton') }}</span>
                </div>

                <!-- 笔记转题目 -->
                <div
                  class="nav-item"
                  :class="{ 'nav-item-active': chatStore.chatMode === 'noteToQuestion' }"
                  @click="handleModeChange('noteToQuestion')"
                >
                  <span class="nav-item-icon">
                    <SvgIcon icon="ri:file-text-line" />
                  </span>
                  <span class="nav-item-text">{{ $t('chat.modeNoteToQuestion') }}</span>
                </div>

                <!-- 笔记转故事 -->
                <div
                  class="nav-item"
                  :class="{ 'nav-item-active': chatStore.chatMode === 'noteToStory' }"
                  @click="handleModeChange('noteToStory')"
                >
                  <span class="nav-item-icon">
                    <SvgIcon icon="ri:book-open-line" />
                  </span>
                  <span class="nav-item-text">{{ $t('chat.modeNoteToStory') }}</span>
                </div>

                <!-- 历史记录 -->
                <div class="nav-item nav-item-expandable" @click="historyExpanded = !historyExpanded">
                  <span class="nav-item-icon">
                    <SvgIcon icon="ri:history-line" />
                  </span>
                  <span class="nav-item-text">历史记录</span>
                  <span class="nav-item-arrow" :class="{ 'nav-item-arrow-expanded': historyExpanded }">
                    <SvgIcon icon="ri:arrow-down-s-line" />
                  </span>
                </div>
              </div>

              <!-- 会话列表 -->
              <div v-show="historyExpanded" class="flex-1 min-h-0 overflow-hidden">
                <List />
              </div>
            </div>

            <!-- 收起状态 -->
            <div v-show="collapsed" class="flex justify-center py-4">
              <NPopover
                trigger="hover"
                placement="right"
                :show-arrow="false"
                :width="200"
              >
                <template #trigger>
                  <button class="sider-icon-btn">
                    <SvgIcon
                      :icon="chatStore.chatMode === 'noteToQuestion' ? 'ri:file-text-line' : chatStore.chatMode === 'noteToStory' ? 'ri:book-open-line' : 'ri:chat-3-line'"
                    />
                  </button>
                </template>
                <div class="flex flex-col space-y-2 p-2">
                  <NButton
                    :type="chatStore.chatMode === 'noteToQuestion' ? 'primary' : 'default'"
                    block
                    size="small"
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
                    size="small"
                    @click="handleModeChange('noteToStory')"
                  >
                    <template #icon>
                      <SvgIcon icon="ri:book-open-line" />
                    </template>
                    {{ $t('chat.modeNoteToStory') }}
                  </NButton>
                </div>
              </NPopover>
            </div>
            <!-- 收起状态：会话图标 + 悬停弹窗 -->
            <div v-show="collapsed" class="flex-1 flex justify-center">
              <NPopover
                trigger="hover"
                placement="right"
                :show-arrow="true"
                :width="240"
              >
                <template #trigger>
                  <button class="sider-icon-btn">
                    <SvgIcon icon="ri:chat-history-line" />
                  </button>
                </template>
                <div class="max-h-96 overflow-y-auto">
                  <List />
                </div>
              </NPopover>
            </div>
          </main>
        </div>

        <!-- 设置导航面板 -->
        <div
          class="absolute inset-0 flex flex-col sider-panel-transition settings-panel dark:bg-[#18181c]"
          :class="showSettingsPage ? 'translate-x-0' : 'translate-x-full'"
        >
          <!-- 设置标题 -->
          <div class="settings-header">
            <h2 class="settings-title" :style="{ color: isDark ? '#fff' : '#161618' }">
              {{ settingsTitle }}
            </h2>
          </div>

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

      <!-- Footer - 用户信息和设置按钮 -->
      <footer class="sider-footer nav-bg" :class="{ collapsed }">
        <!-- 展开状态 -->
        <template v-if="!collapsed">
          <Profile />
          <NButton quaternary circle @click="showSettingsPage ? handleBackToMenu() : handleShowSettings()">
            <template #icon>
              <span class="text-xl text-[#4f555e] dark:text-white">
                <SvgIcon :icon="showSettingsPage ? 'ri:arrow-left-line' : 'ri:settings-4-line'" />
              </span>
            </template>
          </NButton>
        </template>

        <!-- 收起状态 -->
        <template v-else>
          <div class="flex flex-col items-center gap-2">
            <NPopover
              trigger="hover"
              placement="right"
              :show-arrow="false"
            >
              <template #trigger>
                <button class="sider-icon-btn">
                  <SvgIcon icon="ri:user-line" />
                </button>
              </template>
              <Profile />
            </NPopover>

            <button
              class="sider-icon-btn"
              @click="showSettingsPage ? handleBackToMenu() : handleShowSettings()"
            >
              <SvgIcon :icon="showSettingsPage ? 'ri:arrow-left-line' : 'ri:settings-4-line'" />
            </button>
          </div>
        </template>
      </footer>
    </div>
  </NLayoutSider>
  <template v-if="isMobile">
    <div v-show="!collapsed" class="fixed inset-0 z-40 w-full h-full bg-black/40" @click="handleUpdateCollapsed" />
  </template>
</template>

<style scoped>
/* 🎨 导航区域背景色类 */
.nav-bg {
  background-color: var(--nav-bg-light);
}

:deep(.dark) .nav-bg {
  background-color: transparent;
}

/* 🍎 导航列表项样式 */
.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  margin-bottom: 4px;
  border-radius: 10px;
  cursor: pointer;
  transition: background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  background-color: transparent;
  color: #333;
}

.nav-item:hover {
  background-color: var(--nav-hover-light);
}

:deep(.dark) .nav-item {
  color: #aeaeb2;
}

:deep(.dark) .nav-item:hover {
  background-color: var(--nav-hover-dark);
}

/* 激活状态 */
.nav-item-active {
  background-color: var(--nav-active-light) !important;
  color: #333 !important;
  font-weight: 500;
}

:deep(.dark) .nav-item-active {
  background-color: var(--nav-active-dark) !important;
  color: #fff !important;
}

/* 导航项图标 */
.nav-item-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

/* 导航项文字 */
.nav-item-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
}

/* 可展开项箭头 */
.nav-item-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
  transform: rotate(-90deg); /* 默认向右 */
}

.nav-item-arrow-expanded {
  transform: rotate(0deg); /* 展开时向下 */
}

/* 侧边栏面板滑动过渡效果 - 使用流畅的缓动函数 */
.sider-panel-transition {
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  background-color: var(--nav-bg-light);
}

:deep(.dark) .sider-panel-transition {
  background-color: transparent;
}

/* Logo 头部区域 */
.sider-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  min-height: 64px;
}

.sider-header.collapsed {
  justify-content: center;
  padding: 0;
}

/* 展开状态的 logo */
.sider-logo-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sider-logo-icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  object-fit: contain;
}

.sider-logo-text {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  white-space: nowrap;
}

:deep(.dark) .sider-logo-text {
  color: #fff;
}

/* 收起状态的 logo 容器 */
.sider-collapsed-logo-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 55px;
  height: 64px;
  cursor: pointer;
}

.sider-collapsed-logo-icon {
  width: 28px;
  height: 28px;
  object-fit: contain;
  transition: opacity 0.2s;
}

.sider-collapsed-expand-btn {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #666;
  opacity: 0;
  transition: opacity 0.2s;
}

.sider-collapsed-expand-btn svg {
  color: #666;
}

:deep(.dark) .sider-collapsed-expand-btn {
  color: #fff;
}

:deep(.dark) .sider-collapsed-expand-btn svg {
  color: #fff;
}

/* 悬停效果：隐藏 logo，显示展开按钮 */
.sider-collapsed-logo-wrapper:hover .sider-collapsed-logo-icon {
  opacity: 0;
}

.sider-collapsed-logo-wrapper:hover .sider-collapsed-expand-btn {
  opacity: 1;
}

.sider-collapsed-logo-wrapper:hover {
  background: rgba(0, 0, 0, 0.05);
}

:deep(.dark) .sider-collapsed-logo-wrapper:hover {
  background: rgba(255, 255, 255, 0.05);
}

/* 展开/收起按钮 */
.sider-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.sider-toggle-btn svg {
  color: #666;
}

.sider-toggle-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  color: #333;
}

.sider-toggle-btn:hover svg {
  color: #333;
}

:deep(.dark) .sider-toggle-btn {
  color: #fff;
}

:deep(.dark) .sider-toggle-btn svg {
  color: #fff;
}

:deep(.dark) .sider-toggle-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
}

:deep(.dark) .sider-toggle-btn:hover svg {
  color: #fff;
}

/* 收起状态的图标按钮 */
.sider-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 20px;
}

.sider-icon-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  color: #333;
}

:deep(.dark) .sider-icon-btn {
  color: #fff;
}

:deep(.dark) .sider-icon-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
}

/* 设置面板 */
.settings-panel {
  background-color: var(--nav-bg-light);
}

/* Footer 区域 */
.sider-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
  padding: 16px;
  overflow: hidden;
}

/* footer背景色已通过nav-bg类处理 */

.sider-footer.collapsed {
  justify-content: center;
  padding: 16px 8px;
}

/* 设置标题 */
.settings-header {
  padding: 20px 16px 16px;
  text-align: center;
}

.settings-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
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

/* 深色模式下的未激活状态 - 暗一点 */
:deep(.dark) .setting-nav-item {
  color: #999;
}

:deep(.dark) .setting-nav-item:hover {
  background-color: rgba(255, 255, 255, 0.05);
}

/* 激活状态 */
.setting-nav-item.active {
  background-color: rgba(0, 0, 0, 0.08);
  color: #333;
  font-weight: 500;
}

/* 深色模式下的激活状态 - 亮白色 */
:deep(.dark) .setting-nav-item.active {
  background-color: rgba(255, 255, 255, 0.1);
  color: #fff;
}

/* 🍎 优化按钮的iOS风格 */
:deep(.n-button) {
  border-radius: 10px;
  transition: background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 隐藏按钮的边框元素 */
:deep(.n-button__state-border),
:deep(.n-button__border) {
  display: none !important;
}

:deep(.n-button:not(.n-button--dashed-type)) {
  border: none !important;
}

/* 按钮内容左对齐 */
:deep(.n-button__content) {
  justify-content: flex-start;
  gap: 8px;
}

/* 浅色模式按钮 */
:deep(.n-button--default-type) {
  background-color: transparent;
  color: #333;
}

:deep(.n-button--default-type:hover) {
  background-color: var(--nav-hover-light);
}

:deep(.n-button--primary-type) {
  background-color: var(--nav-active-light);
  color: #333;
}

:deep(.n-button--primary-type:hover) {
  background-color: #e8e8e8;
}

/* 深色模式下的按钮样式 */
:deep(.dark .n-button--default-type) {
  background-color: transparent;
  color: #ffffff;
}

:deep(.dark .n-button--default-type:hover) {
  background-color: rgba(255, 255, 255, 0.05);
}

:deep(.dark .n-button--primary-type) {
  background-color: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

:deep(.dark .n-button--primary-type:hover) {
  background-color: rgba(255, 255, 255, 0.15);
}

/* 虚线按钮样式 */
:deep(.n-button--dashed-type) {
  border: 1px dashed #d9d9d9 !important;
  background-color: transparent;
}

:deep(.n-button--dashed-type:hover) {
  border-color: #d9d9d9 !important;
  background-color: var(--nav-hover-light);
}

:deep(.n-button--dashed-type:active) {
  background-color: var(--nav-active-light);
}

:deep(.dark .n-button--dashed-type) {
  border-color: #48484a !important;
  color: #aeaeb2;
  background-color: transparent;
}

:deep(.dark .n-button--dashed-type:hover) {
  border-color: #5e5e60 !important;
  background-color: rgba(255, 255, 255, 0.05);
}
</style>
