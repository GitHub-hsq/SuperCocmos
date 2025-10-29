<script setup lang='ts'>
import { NDropdown, NInput, NPopconfirm, NScrollbar } from 'naive-ui'
import { computed, h, onMounted, onUnmounted, ref } from 'vue'
import { SvgIcon } from '@/components/common'
import { useBasicLayout } from '@/hooks/useBasicLayout'
import { useAppStore, useChatStore } from '@/store'
import { debounce } from '@/utils/functions/debounce'

const { isMobile } = useBasicLayout()

const appStore = useAppStore()
const chatStore = useChatStore()

const dataSources = computed(() => chatStore.history)

async function handleSelect({ uuid }: Chat.History) {
  if (isActive(uuid))
    return

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
            console.log('🗑️ [自动删除] 会话为空，已删除:', previousUuid)
            chatStore.deleteHistory(prevIndex)
          }
        }
        else {
          console.log('ℹ️ [自动删除] 会话在数据库中有消息，保留:', previousUuid)
        }
      })
    }
  }

  if (chatStore.active)
    chatStore.updateHistory(chatStore.active, { isEdit: false })

  // 🔥 等待消息加载完成
  await chatStore.setActive(uuid)

  if (isMobile.value)
    appStore.setSiderCollapsed(true)
}

function handleEdit({ uuid }: Chat.History, isEdit: boolean, event?: MouseEvent) {
  event?.stopPropagation()
  chatStore.updateHistory(uuid, { isEdit })
}

function handleDelete(index: number, event?: MouseEvent | TouchEvent) {
  event?.stopPropagation()
  chatStore.deleteHistory(index)
  if (isMobile.value)
    appStore.setSiderCollapsed(true)
}

const handleDeleteDebounce = debounce(handleDelete, 600)

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

// 点击显示菜单的会话
const showMenuUuid = ref<string | null>(null)

// 下拉菜单选项
function getDropdownOptions(item: Chat.History, index: number) {
  return [
    {
      label: '重命名',
      key: 'rename',
      icon: () => h(SvgIcon, { icon: 'ri:edit-line' }),
    },
    {
      label: '删除会话',
      key: 'delete',
      icon: () => h(SvgIcon, { icon: 'ri:delete-bin-line' }),
    },
  ]
}

// 处理下拉菜单选择
function handleDropdownSelect(key: string, item: Chat.History, index: number) {
  if (key === 'rename') {
    handleEdit(item, true)
  }
  else if (key === 'delete') {
    handleDelete(index)
  }
  showMenuUuid.value = null
}

// 切换菜单显示
function toggleMenu(uuid: string, event: MouseEvent) {
  event.stopPropagation()
  showMenuUuid.value = showMenuUuid.value === uuid ? null : uuid
}

// 关闭菜单
function handleDropdownUpdateShow(show: boolean, uuid: string) {
  if (!show) {
    showMenuUuid.value = null
  }
}

// 全局点击事件 - 点击外部关闭菜单
function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (!target.closest('.session-actions')) {
    showMenuUuid.value = null
  }
}

// 生命周期
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <NScrollbar class="px-4">
    <div class="flex flex-col gap-2 text-sm">
      <template v-if="!dataSources.length">
        <div class="flex flex-col items-center mt-4 text-center text-neutral-300">
          <SvgIcon icon="ri:inbox-line" class="mb-2 text-3xl" />
          <span>{{ $t('common.noData') }}</span>
        </div>
      </template>
      <template v-else>
        <div
          v-for="(item, index) of dataSources"
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

              <!-- 非编辑状态：悬停显示三个竖点 -->
              <div v-else-if="hoveredUuid === item.uuid" class="session-actions">
                <NDropdown
                  trigger="manual"
                  placement="top"
                  :show="showMenuUuid === item.uuid"
                  :options="getDropdownOptions(item, index)"
                  @select="(key) => handleDropdownSelect(key, item, index)"
                  @update:show="(show) => handleDropdownUpdateShow(show, item.uuid)"
                >
                  <button class="session-action-btn" @click="toggleMenu(item.uuid, $event)">
                    <SvgIcon icon="ri:more-2-fill" />
                  </button>
                </NDropdown>
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
  color: #333;
}

.session-item:hover {
  background-color: var(--session-hover-light);
}

/* 深色模式 */
:deep(.dark) .session-item {
  color: #aeaeb2;
}

:deep(.dark) .session-item:hover {
  background-color: var(--session-hover-dark);
}

/* 激活状态 */
.session-item-active {
  background-color: var(--session-active-light) !important;
  color: #333 !important;
  font-weight: 500;
}

:deep(.dark) .session-item-active {
  background-color: var(--session-active-dark) !important;
  color: #fff !important;
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
  padding-right: 36px; /* 为按钮预留空间 */
}

/* 操作按钮容器包裹层 - 绝对定位 */
.session-actions-wrapper {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  z-index: 1;
}

/* 操作按钮容器 */
.session-actions {
  display: flex;
  align-items: center;
  gap: 4px;
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

/* 🍎 下拉菜单样式优化 */
:deep(.n-dropdown-menu) {
  border-radius: 10px !important;
  padding: 6px !important;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15) !important;
}

:deep(.dark .n-dropdown-menu) {
  background-color: #2c2c2e !important;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4) !important;
}

:deep(.n-dropdown-option) {
  border-radius: 8px !important;
  margin: 2px 0 !important;
  padding: 8px 12px !important;
  transition: all 0.2s !important;
}

:deep(.dark .n-dropdown-option) {
  color: #ffffff !important;
}

:deep(.n-dropdown-option:hover) {
  background-color: rgba(0, 0, 0, 0.05) !important;
}

:deep(.dark .n-dropdown-option:hover) {
  background-color: rgba(255, 255, 255, 0.1) !important;
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
