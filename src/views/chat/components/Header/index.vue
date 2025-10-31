<script lang="ts" setup>
import { computed, nextTick, ref } from 'vue'
import { HoverButton } from '@/components/common'
import MenuIcon from '@/components/common/MenuIcon.vue'
import ModelSelector from '@/components/common/ModelSelector/index.vue'
import { useAppStore, useChatStore } from '@/store'

interface Props {
  usingContext: boolean
}

defineProps<Props>()

const appStore = useAppStore()
const chatStore = useChatStore()

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

function handleModelSelect(modelId: string, provider: string) {
  // eslint-disable-next-line no-console
  console.log('选择的模型:', modelId, provider)
  // 这里可以保存到 store 或直接使用
  // modelStore.setCurrentModel(modelId, provider)
}
</script>

<template>
  <header
    class="sticky top-0 left-0 right-0 z-30 border-b dark:border-neutral-800 bg-white/80 dark:bg-black/20 backdrop-blur"
    style="height: 52px; padding-left: 8px; padding-right: 8px;"
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
