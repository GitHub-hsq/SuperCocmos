<script setup lang='ts'>
import type { CSSProperties } from 'vue'
import { computed, ref, watch } from 'vue'
import { NButton, NLayoutSider, useDialog } from 'naive-ui'
import List from './List.vue'
import Footer from './Footer.vue'
import { useAppStore, useChatStore } from '@/store'
import { useBasicLayout } from '@/hooks/useBasicLayout'
import { PromptStore, SvgIcon } from '@/components/common'
import { t } from '@/locales'

const appStore = useAppStore()
const chatStore = useChatStore()

const dialog = useDialog()

const { isMobile } = useBasicLayout()
const show = ref(false)

const collapsed = computed(() => appStore.siderCollapsed)

function handleAdd() {
  const previousUuid = chatStore.active
  if (previousUuid) {
    const prevMessages = chatStore.getChatByUuid(previousUuid as number)
    if (!prevMessages || prevMessages.length === 0) {
      const prevIndex = chatStore.history.findIndex(item => item.uuid === previousUuid)
      if (prevIndex !== -1)
        chatStore.deleteHistory(prevIndex)
    }
  }

  chatStore.addHistory({ title: t('chat.newChatTitle'), uuid: Date.now(), isEdit: false, mode: 'normal' })
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
    const prevMessages = chatStore.getChatByUuid(previousUuid as number)
    if (!prevMessages || prevMessages.length === 0) {
      const prevIndex = chatStore.history.findIndex(item => item.uuid === previousUuid)
      if (prevIndex !== -1)
        chatStore.deleteHistory(prevIndex)
    }
  }

  // 创建目标模式的新对话
  chatStore.addHistory({
    title: mode === 'noteToQuestion' ? t('chat.modeNoteToQuestion') : t('chat.modeNoteToStory'),
    uuid: Date.now(),
    isEdit: false,
    mode,
  })
  if (isMobile.value)
    appStore.setSiderCollapsed(true)
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
    @update-collapsed="handleUpdateCollapsed"
  >
    <div class="flex flex-col h-full" :style="mobileSafeArea">
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
      <Footer />
    </div>
  </NLayoutSider>
  <template v-if="isMobile">
    <div v-show="!collapsed" class="fixed inset-0 z-40 w-full h-full bg-black/40" @click="handleUpdateCollapsed" />
  </template>
  <PromptStore v-model:visible="show" />
</template>
