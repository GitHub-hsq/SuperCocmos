<script setup lang='ts'>
import { NInput, NPopover, NScrollbar } from 'naive-ui'
import { computed, ref } from 'vue'
import { SvgIcon } from '@/components/common'
import { useBasicLayout } from '@/hooks/useBasicLayout'
import { useAppStore, useChatStore } from '@/store'

const { isMobile } = useBasicLayout()

const appStore = useAppStore()
const chatStore = useChatStore()

const dataSources = computed(() => chatStore.history)

// 🔥 Loading状态：记录正在加载的会话UUID
const loadingUuid = ref<string | null>(null)

// 🔥 Deleting状态：记录正在删除的会话UUID
const deletingUuid = ref<string | null>(null)

async function handleSelect({ uuid }: Chat.History) {
  if (isActive(uuid))
    return

  // 🔥 设置 Loading 状态
  loadingUuid.value = uuid

  try {
    // 🔥 如果离开当前会话且本地消息为空，检查数据库后再决定是否删除
    const previousUuid = chatStore.active
    if (previousUuid) {
      const prevMessages = chatStore.getChatByUuid(previousUuid)
      if (!prevMessages || prevMessages.length === 0) {
        // 🔥 异步检查数据库是否也为空（不阻塞切换）
        chatStore.isConversationReallyEmpty(previousUuid).then((isEmpty) => {
          if (isEmpty) {
            const prevIndex = chatStore.history.findIndex(item => item.uuid === previousUuid)
            if (prevIndex !== -1) {
              chatStore.deleteHistory(prevIndex)
            }
          }
        })
      }
    }

    if (chatStore.active)
      chatStore.updateHistory(chatStore.active, { isEdit: false })

    // 🔥 等待消息加载完成（包括接口请求）
    await chatStore.setActive(uuid)

    if (isMobile.value)
      appStore.setSiderCollapsed(true)
  }
  finally {
    // 🔥 无论成功失败，都清除 Loading 状态
    loadingUuid.value = null
  }
}

function handleEdit({ uuid }: Chat.History, isEdit: boolean, event?: MouseEvent) {
  event?.stopPropagation()
  chatStore.updateHistory(uuid, { isEdit })
}

async function handleDelete(index: number, event?: MouseEvent | TouchEvent) {
  event?.stopPropagation()

  // 🔥 获取要删除的会话信息
  const historyToDelete = chatStore.history[index]
  if (!historyToDelete) {
    return
  }

  // 🔥 设置删除 Loading 状态
  deletingUuid.value = historyToDelete.uuid

  try {
    await chatStore.deleteHistory(index)
    if (isMobile.value)
      appStore.setSiderCollapsed(true)
  }
  finally {
    // 🔥 无论成功失败，都清除删除 Loading 状态
    deletingUuid.value = null
  }
}

function handleEnter({ uuid }: Chat.History, isEdit: boolean, event: KeyboardEvent) {
  event?.stopPropagation()
  if (event.key === 'Enter')
    chatStore.updateHistory(uuid, { isEdit })
}

function isActive(uuid: string) {
  return chatStore.active === uuid
}

// 悬停状态
const hoveredUuid = ref<string | null>(null)

// Popover打开状态（关键：即使鼠标移出会话，只要Popover打开就保持三个点显示）
const popoverOpenUuid = ref<string | null>(null)

// 处理Popover显示状态变化
function handlePopoverUpdateShow(show: boolean, uuid: string) {
  if (show) {
    popoverOpenUuid.value = uuid
  }
  else {
    popoverOpenUuid.value = null
  }
}
</script>

<template>
  <NScrollbar class="px-4" style="height: 100%;">
    <div class="flex flex-col gap-2 text-sm py-2">
      <template v-if="!dataSources.length">
        <div class="flex flex-col items-center mt-4 text-center text-neutral-300">
          <SvgIcon icon="ri:inbox-line" class="mb-2 text-3xl" />
          <span>{{ $t('common.noData') }}</span>
        </div>
      </template>
      <template v-else>
        <div
          v-for="(item, index) of dataSources"
          id="session-chat-item"
          :key="index"
          @mouseenter="hoveredUuid = item.uuid"
          @mouseleave="hoveredUuid = null"
        >
          <a
            class="session-item"
            :class="{ 'session-item-active': isActive(item.uuid) }"
            @click="handleSelect(item)"
          >
            <span class="session-icon">
              <SvgIcon icon="ri:message-3-line" />
            </span>
            <div class="session-title">
              <NInput
                v-if="item.isEdit"
                v-model:value="item.title"
                size="tiny"
                @keypress="handleEnter(item, false, $event)"
              />
              <span v-else>{{ item.title }}</span>
            </div>

            <!-- 操作按钮区域 - 绝对定位避免抖动 -->
            <div class="session-actions-wrapper">
              <!-- 编辑状态：显示保存按钮 -->
              <div v-if="item.isEdit" class="session-actions">
                <button class="session-action-btn" @click="handleEdit(item, false, $event)">
                  <SvgIcon icon="ri:save-line" />
                </button>
              </div>

              <!-- 🔥 Loading状态：显示加载动画 -->
              <div v-else-if="loadingUuid === item.uuid" class="session-actions">
                <div class="session-loading">
                  <SvgIcon icon="ri:loader-4-line" class="animate-spin" />
                </div>
              </div>

              <!-- 🔥 Deleting状态：显示删除加载动画（灰色） -->
              <div v-else-if="deletingUuid === item.uuid" class="session-actions">
                <div class="session-deleting">
                  <SvgIcon icon="ri:loader-4-line" class="animate-spin" />
                </div>
              </div>

              <!-- 非编辑状态：悬停显示三个竖点（关键：Popover打开时也显示） -->
              <div v-else-if="hoveredUuid === item.uuid || popoverOpenUuid === item.uuid" class="session-actions">
                <NPopover
                  trigger="hover"
                  placement="right-start"
                  :show-arrow="false"
                  @update:show="(show) => handlePopoverUpdateShow(show, item.uuid)"
                >
                  <template #trigger>
                    <button class="session-action-btn" @click.stop>
                      <SvgIcon icon="ri:more-2-fill" />
                    </button>
                  </template>
                  <!-- 菜单内容 -->
                  <div class="session-menu">
                    <div class="session-menu-item" @click="handleEdit(item, true, $event)">
                      <SvgIcon icon="ri:edit-line" class="session-menu-icon" />
                      <span>重命名</span>
                    </div>
                    <div class="session-menu-item-delete" @click="handleDelete(index, $event)">
                      <SvgIcon icon="ri:delete-bin-line" class="session-menu-icon" />
                      <span>删除会话</span>
                    </div>
                  </div>
                </NPopover>
              </div>
            </div>
          </a>
        </div>
      </template>
    </div>
  </NScrollbar>
</template>

<style scoped>
/* 🍎 iOS 风格会话列表 */
.session-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  margin-bottom: 4px;
  border-radius: 10px;
  cursor: pointer;
  transition: background-color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  background-color: transparent;
  /* 浅色模式默认颜色 */
  color: var(--white-text-primary);
}

.session-item:hover {
  background-color: var(--session-hover-light);
}

/* 激活状态 */
.session-item-active {
  background-color: var(--session-active-light) !important;
  color: #333 !important;
  font-weight: 500;
}

/* 会话图标 */
.session-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

/* 会话标题 */
.session-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding-right: 40px; /* 为按钮预留更多空间 */
}

/* 操作按钮容器包裹层 - 绝对定位，扩大响应区域 */
.session-actions-wrapper {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 8px;
  padding-left: 20px; /* 扩大左侧响应区域，确保覆盖足够空间 */
  z-index: 1;
  pointer-events: none; /* 默认不拦截点击事件 */
}

/* 操作按钮容器 */
.session-actions {
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 4px;
  pointer-events: auto; /* 只有按钮本身响应点击 */
}

/* 操作按钮 */
.session-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  transition: background-color 0.2s;
  font-size: 16px;
}

.session-action-btn:hover {
  background-color: rgba(0, 0, 0, 0.1);
}

:deep(.dark) .session-action-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

/* 🔥 Loading 动画样式 */
.session-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  font-size: 16px;
  color: #666;
}

:deep(.dark) .session-loading {
  color: #999;
}

/* 🔥 Deleting 动画样式（灰色） */
.session-deleting {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  font-size: 16px;
  color: #999;
}

:deep(.dark) .session-deleting {
  color: #666;
}

/* 旋转动画 */
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 🍎 弹出菜单样式 */
.session-menu {
  z-index: 9999;
  background-color: #ffffff;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px;
  min-width: 120px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15) !important;
}

.session-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
  color: #333;
  font-size: 14px;
}
/* 删除按钮 - iOS风格 */
.session-menu-item-delete {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  color: #ff3b30; /* iOS红色 */
  font-size: 14px;
}

.session-menu-item-delete:hover {
  color: #ffffff;
  background-color: #ff3b30; /* iOS红色背景 */
}

:deep(.dark) .session-menu-item-delete {
  color: #ff453a; /* 暗黑模式iOS红色 */
}

:deep(.dark) .session-menu-item-delete:hover {
  color: #ffffff;
  background-color: #ff453a;
}

.session-menu-item:hover {
  background-color: var(--session-hover-light);
}

:deep(.dark) .session-menu-item {
  color: #ffffff;
}

:deep(.dark) .session-menu-item:hover {
  background-color: var(--session-hover-dark);
}

.session-menu-icon {
  font-size: 16px;
  flex-shrink: 0;
}

/* 🍎 Popover样式优化 */
:deep(.n-popover) {
  border-radius: 10px !important;
  padding: 0 !important;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15) !important;
}

:deep(.dark .n-popover) {
  background-color: #2c2c2e !important;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4) !important;
}

/* 输入框样式 */
:deep(.n-input) {
  border-radius: 6px;
}

:deep(.dark .n-input) {
  background-color: rgba(255, 255, 255, 0.05) !important;
  border-color: rgba(255, 255, 255, 0.1) !important;
  color: #ffffff !important;
}
</style>

<style lang="less">
/* 深色模式 */
.dark .session-item {
  color: var(--dark-text-primary);
}

.dark .session-item:hover {
  background-color: rgba(255, 255, 255, 0.05);
}
.dark .session-item-active {
  background-color: rgba(255, 255, 255, 0.1) !important;
  color: var(--dark-text-active) !important;
}
</style>
