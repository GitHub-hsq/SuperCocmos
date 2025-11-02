<script lang="ts" setup>
import { useMessage } from 'naive-ui'
import { computed, nextTick, ref } from 'vue'
import { HoverButton } from '@/components/common'
import MenuIcon from '@/components/common/MenuIcon.vue'
import ModelSelector from '@/components/common/ModelSelector/index.vue'
import { useAppStore, useChatStore, useModelStore } from '@/store'

interface Props {
  usingContext: boolean
}

defineProps<Props>()

const appStore = useAppStore()
const chatStore = useChatStore()
const modelStore = useModelStore()
const ms = useMessage()

const collapsed = computed(() => appStore.siderCollapsed)
const currentChatHistory = computed(() => chatStore.getChatHistoryByCurrentActive)

const showModelSelector = ref(false)

function handleUpdateCollapsed() {
  appStore.setSiderCollapsed(!collapsed.value)
}

function onScrollToTop() {
  const scrollRef = document.querySelector('#scrollRef')
  if (scrollRef)
    nextTick(() => scrollRef.scrollTop = 0)
}

function openModelSelector() {
  showModelSelector.value = true
}

// 🔥 处理模型选择（移动端）
function handleModelSelect(modelId: string, _provider: string) {
  // 从 enabledModels 中找到完整的模型信息
  const model = modelStore.enabledModels.find((m: any) => m.id === modelId)
  if (model) {
    // 更新 ModelStore（已由 ModelSelector 组件内部处理，这里只是确保同步）
    // ModelSelector 已经调用了 modelStore.setCurrentModel(model.id)

    // 触发页面刷新，让 chat/index.vue 重新加载模型
    // 由于 ModelStore 已经更新，chat/index.vue 的 loadCurrentModel 会在下次访问时自动加载
    ms.success(`已切换到模型: ${model.displayName || model.name}`)

    if (import.meta.env.DEV) {
      console.warn('✅ [Header] 移动端模型选择:', {
        modelId: model.id,
        modelId_value: model.modelId,
        providerId: model.providerId || model.provider,
        displayName: model.displayName,
      })
    }
  }
}
</script>

<template>
  <header
    class="sticky top-0 left-0 right-0 z-30 border-b dark:border-neutral-800 bg-white/80 dark:bg-black/20 backdrop-blur"
    style="height: 35px; padding-left: 8px; padding-right: 8px;"
  >
    <div class="relative flex items-center justify-between min-w-0 overflow-hidden" style="height: 100%;">
      <div class="flex items-center">
        <button
          class="flex items-center justify-center w-11 h-11"
          @click="handleUpdateCollapsed"
        >
          <MenuIcon :size="20" class="text-[#4f555e] dark:text-white" />
        </button>
      </div>
      <h1
        class="flex-1 px-4 pr-6 overflow-hidden cursor-pointer select-none text-ellipsis whitespace-nowrap"
        @dblclick="onScrollToTop"
      >
        {{ currentChatHistory?.title ?? '' }}
      </h1>
      <div class="flex items-center space-x-2">
        <HoverButton @click="openModelSelector">
          <span class="text-xl text-[#4f555e] dark:text-white">
            <img src="/favicon.svg" alt="Logo" style="width: 20px; height: 20px; display: block;">
          </span>
        </HoverButton>
      </div>
    </div>

    <!-- 模型选择器弹窗 -->
    <ModelSelector v-model:visible="showModelSelector" @select="handleModelSelect" />
  </header>
</template>
