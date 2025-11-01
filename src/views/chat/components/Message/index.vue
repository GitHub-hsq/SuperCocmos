<script setup lang='ts'>
import { NTooltip, useMessage } from 'naive-ui'
import { ref } from 'vue'
import { SvgIcon } from '@/components/common'
import { t } from '@/locales'
import { copyToClip } from '@/utils/copy'
import TextComponent from './Text.vue'

interface Props {
  text?: string
  inversion?: boolean
  error?: boolean
  loading?: boolean
}

interface Emit {
  (ev: 'regenerate'): void
  (ev: 'delete'): void
}

const props = defineProps<Props>()

const emit = defineEmits<Emit>()

const message = useMessage()

const textRef = ref<HTMLElement>()

const asRawText = ref(props.inversion)

const messageRef = ref<HTMLElement>()
const isHovered = ref(false)

function handleToggleRenderType() {
  asRawText.value = !asRawText.value
}

function handleRegenerate() {
  messageRef.value?.scrollIntoView()
  emit('regenerate')
}

async function handleCopy() {
  try {
    await copyToClip(props.text || '')
    message.success(t('chat.copied'))
  }
  catch {
    message.error(t('chat.copyFailed'))
  }
}
</script>

<template>
  <div
    ref="messageRef"
    class="message-wrapper w-full"
    style="margin-bottom: 3.5rem;"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <div class="text-sm w-full" :class="[inversion ? 'items-end' : 'items-start']">
      <div
        class="flex"
        :class="[inversion ? 'flex-row-reverse' : 'flex-row']"
      >
        <TextComponent
          ref="textRef"
          :inversion="inversion"
          :error="error"
          :text="text"
          :loading="loading"
          :as-raw-text="asRawText"
        />
      </div>
      <!-- 操作按钮区域 -->
      <!-- LLM消息：只有在消息完成后（!loading && !error）才显示操作按钮 -->
      <!-- 用户消息：总是显示（用户消息不会 loading） -->
      <div
        v-if="inversion || (!loading && !error)"
        class="flex gap-2 mt-2 transition-opacity"
        :class="[
          inversion ? 'justify-end' : 'justify-start',
          (inversion && !isHovered) ? 'opacity-0' : 'opacity-100',
        ]"
      >
        <!-- LLM消息：重新生成、显示原文、复制、删除 -->
        <template v-if="!inversion">
          <NTooltip placement="bottom">
            <template #trigger>
              <button
                class="transition text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"
                @click="handleRegenerate"
              >
                <SvgIcon icon="ri:restart-line" class="w-4 h-4" />
              </button>
            </template>
            {{ t('chat.regenerate') }}
          </NTooltip>
          <NTooltip placement="bottom">
            <template #trigger>
              <button
                class="transition text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"
                @click="handleToggleRenderType"
              >
                <SvgIcon :icon="asRawText ? 'ic:outline-code-off' : 'ic:outline-code'" class="w-4 h-4" />
              </button>
            </template>
            {{ asRawText ? t('chat.preview') : t('chat.showRawText') }}
          </NTooltip>
          <NTooltip placement="bottom">
            <template #trigger>
              <button
                class="transition text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"
                @click="handleCopy"
              >
                <SvgIcon icon="ri:file-copy-2-line" class="w-4 h-4" />
              </button>
            </template>
            {{ t('chat.copy') }}
          </NTooltip>
          <NTooltip placement="bottom">
            <template #trigger>
              <button
                class="transition text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"
                @click="emit('delete')"
              >
                <SvgIcon icon="ri:delete-bin-line" class="w-4 h-4" />
              </button>
            </template>
            {{ t('common.delete') }}
          </NTooltip>
        </template>
        <!-- 用户消息：复制和删除 -->
        <template v-else>
          <NTooltip placement="bottom">
            <template #trigger>
              <button
                class="transition text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"
                @click="handleCopy"
              >
                <SvgIcon icon="ri:file-copy-2-line" class="w-4 h-4" />
              </button>
            </template>
            {{ t('chat.copy') }}
          </NTooltip>
          <NTooltip placement="bottom">
            <template #trigger>
              <button
                class="transition text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800"
                @click="emit('delete')"
              >
                <SvgIcon icon="ri:delete-bin-line" class="w-4 h-4" />
              </button>
            </template>
            {{ t('common.delete') }}
          </NTooltip>
        </template>
      </div>
    </div>
  </div>
</template>
