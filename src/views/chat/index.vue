<script setup lang='ts'>
import type { Ref } from 'vue'
import { computed, h, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import type { UploadFileInfo } from 'naive-ui'
import { NAutoComplete, NButton, NDropdown, NInput, NText, NUpload, NUploadDragger, useDialog, useMessage } from 'naive-ui'
import { toPng } from 'html-to-image'
import { Message } from './components'
import { useScroll } from './hooks/useScroll'
import { useChat } from './hooks/useChat'
import { useUsingContext } from './hooks/useUsingContext'
import HeaderComponent from './components/Header/index.vue'
import { HoverButton, SvgIcon } from '@/components/common'
import { useBasicLayout } from '@/hooks/useBasicLayout'
import { useChatStore, usePromptStore } from '@/store'
import { fetchChatAPIProcess } from '@/api'
import { t } from '@/locales'

let controller = new AbortController()

const openLongReply = import.meta.env.VITE_GLOB_OPEN_LONG_REPLY === 'true'

const route = useRoute()
const dialog = useDialog()
const ms = useMessage()

const chatStore = useChatStore()

const { isMobile } = useBasicLayout()
const { addChat, updateChat, updateChatSome, getChatByUuidAndIndex } = useChat()
const { scrollRef, scrollToBottom, scrollToBottomIfAtBottom } = useScroll()
const { usingContext, toggleUsingContext } = useUsingContext()

const { uuid } = route.params as { uuid: string }

const dataSources = computed(() => chatStore.getChatByUuid(+uuid))
const conversationList = computed(() => dataSources.value.filter(item => (!item.inversion && !!item.conversationOptions)))

const prompt = ref<string>('')
const loading = ref<boolean>(false)
const inputRef = ref<Ref | null>(null)

// 添加PromptStore
const promptStore = usePromptStore()

// 使用storeToRefs，保证store修改后，联想部分能够重新渲染
const { promptList: promptTemplate } = storeToRefs<any>(promptStore)

// 下拉菜单选项
const dropdownOptions = [
  {
    label: t('common.newChat'),
    key: 'newChat',
    icon: () => h(SvgIcon, { icon: 'ri:openai-fill' }),
  },
  {
    label: t('common.settings'),
    key: 'settings',
    icon: () => h(SvgIcon, { icon: 'ri:settings-line' }),
  },
  {
    label: t('common.promptStore'),
    key: 'promptStore',
    icon: () => h(SvgIcon, { icon: 'ri:book-open-line' }),
  },
  {
    type: 'divider',
  },
  {
    label: t('common.export'),
    key: 'export',
    icon: () => h(SvgIcon, { icon: 'ri:download-line' }),
  },
  {
    label: t('common.clear'),
    key: 'clear',
    icon: () => h(SvgIcon, { icon: 'ri:delete-bin-line' }),
  },
]

// 下拉菜单选择处理
function handleDropdownSelect(key: string | { key: string; [key: string]: any }) {
  // 处理不同的事件参数结构
  let selectedKey: string
  if (typeof key === 'string') {
    selectedKey = key
  }
  else if (key && typeof key === 'object' && key.key) {
    selectedKey = key.key
  }
  else {
    console.error('Invalid dropdown select parameter:', key)
    return
  }

  switch (selectedKey) {
    case 'newChat':
      // 新建对话逻辑
      ms.info(t('common.newChat'))
      break
    case 'settings':
      // 打开设置面板逻辑
      ms.info(t('common.settings'))
      break
    case 'promptStore':
      // 打开提示词商店逻辑
      ms.info(t('common.promptStore'))
      break
    case 'export':
      handleExport()
      break
    case 'clear':
      handleClear()
      break
  }
}

// 未知原因刷新页面，loading 状态不会重置，手动重置
dataSources.value.forEach((item, index) => {
  if (item.loading)
    updateChatSome(+uuid, index, { loading: false })
})

function handleSubmit() {
  onConversation()
}

async function onConversation() {
  let message = prompt.value

  if (loading.value)
    return

  if (!message || message.trim() === '')
    return

  controller = new AbortController()

  addChat(
    +uuid,
    {
      dateTime: new Date().toLocaleString(),
      text: message,
      inversion: true,
      error: false,
      conversationOptions: null,
      requestOptions: { prompt: message, options: null },
    },
  )
  scrollToBottom()

  loading.value = true
  prompt.value = ''

  let options: Chat.ConversationRequest = {}
  const lastContext = conversationList.value[conversationList.value.length - 1]?.conversationOptions

  if (lastContext && usingContext.value)
    options = { ...lastContext }

  addChat(
    +uuid,
    {
      dateTime: new Date().toLocaleString(),
      text: t('chat.thinking'),
      loading: true,
      inversion: false,
      error: false,
      conversationOptions: null,
      requestOptions: { prompt: message, options: { ...options } },
    },
  )
  scrollToBottom()

  try {
    let lastText = ''
    const fetchChatAPIOnce = async () => {
      await fetchChatAPIProcess<Chat.ConversationResponse>({
        prompt: message,
        options,
        signal: controller.signal,
        onDownloadProgress: ({ event }) => {
          const xhr = event.target
          const { responseText } = xhr
          // Always process the final line
          const lastIndex = responseText.lastIndexOf('\n', responseText.length - 2)
          let chunk = responseText
          if (lastIndex !== -1)
            chunk = responseText.substring(lastIndex)
          try {
            const data = JSON.parse(chunk)
            updateChat(
              +uuid,
              dataSources.value.length - 1,
              {
                dateTime: new Date().toLocaleString(),
                text: lastText + (data.text ?? ''),
                inversion: false,
                error: false,
                loading: true,
                conversationOptions: { conversationId: data.conversationId, parentMessageId: data.id },
                requestOptions: { prompt: message, options: { ...options } },
              },
            )

            if (openLongReply && data.detail.choices[0].finish_reason === 'length') {
              options.parentMessageId = data.id
              lastText = data.text
              message = ''
              return fetchChatAPIOnce()
            }

            scrollToBottomIfAtBottom()
          }
          catch (error) {
            //
          }
        },
      })
      updateChatSome(+uuid, dataSources.value.length - 1, { loading: false })
    }

    await fetchChatAPIOnce()
  }
  catch (error: any) {
    const errorMessage = error?.message ?? t('common.wrong')

    if (error.message === 'canceled') {
      updateChatSome(
        +uuid,
        dataSources.value.length - 1,
        {
          loading: false,
        },
      )
      scrollToBottomIfAtBottom()
      return
    }

    const currentChat = getChatByUuidAndIndex(+uuid, dataSources.value.length - 1)

    if (currentChat?.text && currentChat.text !== '') {
      updateChatSome(
        +uuid,
        dataSources.value.length - 1,
        {
          text: `${currentChat.text}\n[${errorMessage}]`,
          error: false,
          loading: false,
        },
      )
      return
    }

    updateChat(
      +uuid,
      dataSources.value.length - 1,
      {
        dateTime: new Date().toLocaleString(),
        text: errorMessage,
        inversion: false,
        error: true,
        loading: false,
        conversationOptions: null,
        requestOptions: { prompt: message, options: { ...options } },
      },
    )
    scrollToBottomIfAtBottom()
  }
  finally {
    loading.value = false
  }
}

async function onRegenerate(index: number) {
  if (loading.value)
    return

  controller = new AbortController()

  const { requestOptions } = dataSources.value[index]

  let message = requestOptions?.prompt ?? ''

  let options: Chat.ConversationRequest = {}

  if (requestOptions.options)
    options = { ...requestOptions.options }

  loading.value = true

  updateChat(
    +uuid,
    index,
    {
      dateTime: new Date().toLocaleString(),
      text: '',
      inversion: false,
      error: false,
      loading: true,
      conversationOptions: null,
      requestOptions: { prompt: message, options: { ...options } },
    },
  )

  try {
    let lastText = ''
    const fetchChatAPIOnce = async () => {
      await fetchChatAPIProcess<Chat.ConversationResponse>({
        prompt: message,
        options,
        signal: controller.signal,
        onDownloadProgress: ({ event }) => {
          const xhr = event.target
          const { responseText } = xhr
          // Always process the final line
          const lastIndex = responseText.lastIndexOf('\n', responseText.length - 2)
          let chunk = responseText
          if (lastIndex !== -1)
            chunk = responseText.substring(lastIndex)
          try {
            const data = JSON.parse(chunk)
            updateChat(
              +uuid,
              index,
              {
                dateTime: new Date().toLocaleString(),
                text: lastText + (data.text ?? ''),
                inversion: false,
                error: false,
                loading: true,
                conversationOptions: { conversationId: data.conversationId, parentMessageId: data.id },
                requestOptions: { prompt: message, options: { ...options } },
              },
            )

            if (openLongReply && data.detail.choices[0].finish_reason === 'length') {
              options.parentMessageId = data.id
              lastText = data.text
              message = ''
              return fetchChatAPIOnce()
            }
          }
          catch (error) {
            //
          }
        },
      })
      updateChatSome(+uuid, index, { loading: false })
    }
    await fetchChatAPIOnce()
  }
  catch (error: any) {
    if (error.message === 'canceled') {
      updateChatSome(
        +uuid,
        index,
        {
          loading: false,
        },
      )
      return
    }

    const errorMessage = error?.message ?? t('common.wrong')

    updateChat(
      +uuid,
      index,
      {
        dateTime: new Date().toLocaleString(),
        text: errorMessage,
        inversion: false,
        error: true,
        loading: false,
        conversationOptions: null,
        requestOptions: { prompt: message, options: { ...options } },
      },
    )
  }
  finally {
    loading.value = false
  }
}

function handleExport() {
  if (loading.value)
    return

  const d = dialog.warning({
    title: t('chat.exportImage'),
    content: t('chat.exportImageConfirm'),
    positiveText: t('common.yes'),
    negativeText: t('common.no'),
    onPositiveClick: async () => {
      try {
        d.loading = true
        const ele = document.getElementById('image-wrapper')
        const imgUrl = await toPng(ele as HTMLDivElement)
        const tempLink = document.createElement('a')
        tempLink.style.display = 'none'
        tempLink.href = imgUrl
        tempLink.setAttribute('download', 'chat-shot.png')
        if (typeof tempLink.download === 'undefined')
          tempLink.setAttribute('target', '_blank')
        document.body.appendChild(tempLink)
        tempLink.click()
        document.body.removeChild(tempLink)
        window.URL.revokeObjectURL(imgUrl)
        d.loading = false
        ms.success(t('chat.exportSuccess'))
        Promise.resolve()
      }
      catch (error: any) {
        ms.error(t('chat.exportFailed'))
      }
      finally {
        d.loading = false
      }
    },
  })
}

function handleDelete(index: number) {
  if (loading.value)
    return

  dialog.warning({
    title: t('chat.deleteMessage'),
    content: t('chat.deleteMessageConfirm'),
    positiveText: t('common.yes'),
    negativeText: t('common.no'),
    onPositiveClick: () => {
      chatStore.deleteChatByUuid(+uuid, index)
    },
  })
}

function handleClear() {
  if (loading.value)
    return

  dialog.warning({
    title: t('chat.clearChat'),
    content: t('chat.clearChatConfirm'),
    positiveText: t('common.yes'),
    negativeText: t('common.no'),
    onPositiveClick: () => {
      chatStore.clearChatByUuid(+uuid)
    },
  })
}

function handleEnter(event: KeyboardEvent) {
  if (!isMobile.value) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSubmit()
    }
  }
  else {
    if (event.key === 'Enter' && event.ctrlKey) {
      event.preventDefault()
      handleSubmit()
    }
  }
}

function handleStop() {
  if (loading.value) {
    controller.abort()
    loading.value = false
  }
}

// 可优化部分
// 搜索选项计算，这里使用value作为索引项，所以当出现重复value时渲染异常(多项同时出现选中效果)
// 理想状态下其实应该是key作为索引项,但官方的renderOption会出现问题，所以就需要value反renderLabel实现
const searchOptions = computed(() => {
  if (prompt.value.startsWith('/')) {
    return promptTemplate.value.filter((item: { key: string }) => item.key.toLowerCase().includes(prompt.value.substring(1).toLowerCase())).map((obj: { value: any }) => {
      return {
        label: obj.value,
        value: obj.value,
      }
    })
  }
  else {
    return []
  }
})

// value反渲染key
const renderOption = (option: { label: string }) => {
  for (const i of promptTemplate.value) {
    if (i.value === option.label)
      return [i.key]
  }
  return []
}

const placeholder = computed(() => {
  if (isMobile.value)
    return t('chat.placeholderMobile')
  return t('chat.placeholder')
})

const buttonDisabled = computed(() => {
  return loading.value || !prompt.value || prompt.value.trim() === ''
})

const footerClass = computed(() => {
  let classes = ['p-4']
  if (isMobile.value)
    classes = ['sticky', 'left-0', 'bottom-0', 'right-0', 'p-2', 'pr-3', 'overflow-hidden']
  return classes
})

onMounted(() => {
  scrollToBottom()
  if (inputRef.value && !isMobile.value)
    inputRef.value?.focus()
})

onUnmounted(() => {
  if (loading.value)
    controller.abort()
})

// 文件上传（拖拽）
const uploadFileList = ref<UploadFileInfo[]>([])

function handleUploadChange(options: { fileList: UploadFileInfo[] }) {
  uploadFileList.value = options.fileList
}
// 文件上传时的回调，判断是否上传
async function handleBeforeUpload(data: { file: UploadFileInfo; fileList: UploadFileInfo[] }) {
  const { file: fileInfo } = data

  const rawFile = fileInfo.file as File | null

  if (!rawFile) {
    ms.warning(t('common.wrong'))
    return false
  }

  const fileName = rawFile.name
  const fileType = rawFile.type // MIME 类型
  const fileSize = rawFile.size // 字节

  // 1. 获取文件扩展名（转小写，兼容大小写）
  const extension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase()

  // 2. 定义允许的扩展名
  const allowedExtensions = ['.doc', '.docx', '.pdf', '.md', '.txt']
  if (!allowedExtensions.includes(extension)) {
    ms.warning(t('不支持的文件类型'))
    return false
  }

  // 3. 定义 Word/PDF 的扩展名（需要限制 10MB）
  const wordOrPdfExtensions = ['.doc', '.docx', '.pdf']
  const isWordOrPdf = wordOrPdfExtensions.includes(extension)
  const maxSize = 10 * 1024 * 1024 // 10MB

  if (isWordOrPdf && fileSize > maxSize) {
    ms.warning(t('文件不能超过 10MB', { size: '10MB' }))
    return false
  }

  // 对 .md / .txt 也限制（5MB）
  const otherMaxSize = 5 * 1024 * 1024
  if (!isWordOrPdf && fileSize > otherMaxSize) {
    ms.warning('文本文件不能超过 5MB')
    return false
  }
  return true
}
</script>

<template>
  <div class="flex flex-col w-full h-full">
    <HeaderComponent
      v-if="isMobile"
      :using-context="usingContext"
      @export="handleExport"
      @handle-clear="handleClear"
    />

    <!-- Web端Header -->
    <header v-if="!isMobile" class="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#101014]">
      <div class="flex items-center space-x-4">
        <NDropdown
          trigger="click"
          :options="dropdownOptions"
          @select="handleDropdownSelect"
        >
          <NButton quaternary>
            <template #icon>
              <SvgIcon icon="ri:menu-line" />
            </template>
            {{ t('common.menu') }}
          </NButton>
        </NDropdown>
      </div>
      <div class="flex items-center space-x-2">
        <HoverButton
          tooltip="导出对话"
          @click="handleExport"
        >
          <SvgIcon icon="ri:download-line" />
        </HoverButton>
        <HoverButton
          tooltip="清空对话"
          @click="handleClear"
        >
          <SvgIcon icon="ri:delete-bin-line" />
        </HoverButton>
      </div>
    </header>

    <main class="flex-1 overflow-hidden flex">
      <!-- 主聊天区域 -->
      <article class="flex-1 overflow-hidden" :class="{ 'mr-80': (chatStore.chatMode === 'noteToQuestion' || chatStore.chatMode === 'noteToStory') && !isMobile }">
        <div class="flex-1 overflow-hidden" :class="{ 'mr-80': (chatStore.chatMode === 'noteToQuestion' || chatStore.chatMode === 'noteToStory') && !isMobile }">
          <div id="scrollRef" ref="scrollRef" class="h-full overflow-hidden overflow-y-auto">
            <div
              class="w-full max-w-screen-xl m-auto dark:bg-[#101014]"
              :class="[isMobile ? 'p-2' : 'p-4']"
            >
              <div id="image-wrapper" class="relative">
                <template v-if="!dataSources.length">
                  <div class="flex items-center justify-center mt-4 text-center text-neutral-300">
                    <SvgIcon icon="ri:bubble-chart-fill" class="mr-2 text-3xl" />
                    <span>{{ t('chat.newChatTitle') }}</span>
                  </div>
                </template>
                <template v-else>
                  <div>
                    <Message
                      v-for="(item, index) of dataSources"
                      :key="index"
                      :date-time="item.dateTime"
                      :text="item.text"
                      :inversion="item.inversion"
                      :error="item.error"
                      :loading="item.loading"
                      @regenerate="onRegenerate(index)"
                      @delete="handleDelete(index)"
                    />
                    <div class="sticky bottom-0 left-0 flex justify-center">
                      <NButton v-if="loading" type="warning" @click="handleStop">
                        <template #icon>
                          <SvgIcon icon="ri:stop-circle-line" />
                        </template>
                        {{ t('common.stopResponding') }}
                      </NButton>
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>
      </article>
      <aside
        v-if="(chatStore.chatMode === 'noteToStory' || chatStore.chatMode === 'noteToQuestion') && !isMobile"
        class="w-80 border-l border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#101014] flex flex-col"
      >
        <!-- 右侧抽屉窗口 - 笔记转题目 -->
        <div
          v-if="chatStore.chatMode === 'noteToQuestion' && !isMobile"
          class="w-80 border-l border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#101014] flex flex-col"
        >
          <div class="flex-1 p-4">
            <NUpload
              directory-dnd
              :show-file-list="true"
              :default-upload="true"
              action="/api/upload"
              :max="1"
              :on-before-upload="handleBeforeUpload"
              :on-change="handleUploadChange"
            >
              <NUploadDragger>
                <div style="margin-bottom: 12px;">
                  <SvgIcon icon="ri:upload-2-line" class="mx-auto text-3xl" />
                </div>
                <NText depth="3">
                  将文件拖拽到此处，或点击选择文件
                </NText>
                <div style="margin-top: 8px;" class="text-xs text-neutral-500">
                  支持文本、Markdown、CSV 等纯文本文件，读取后会填入输入框
                </div>
              </NUploadDragger>
            </NUpload>

            <div class="text-center text-neutral-500 dark:text-neutral-400">
              <SvgIcon icon="ri:file-text-line" class="mx-auto mb-2 text-4xl" />
              <p>
                笔记转题目功能
              </p>
              <p class="text-sm mt-1">
                此功能正在开发中...
              </p>
            </div>
          </div>
        </div>

        <!-- 右侧抽屉窗口 - 笔记转故事 -->
        <div
          v-if="chatStore.chatMode === 'noteToStory' && !isMobile"
          class="w-80 border-l border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#101014] flex flex-col"
        >
          <div class="flex-1 p-4">
            <div class="text-center text-neutral-500 dark:text-neutral-400">
              <SvgIcon icon="ri:book-open-line" class="mx-auto mb-2 text-4xl" />
              <p>
                笔记转故事功能
              </p>
              <p class="text-sm mt-1">
                此功能正在开发中...
              </p>
            </div>
          </div>
        </div>
      </aside>
    </main>
    <footer :class="footerClass">
      <div class="w-full max-w-screen-xl m-auto">
        <div class="flex items-center justify-between space-x-2">
          <HoverButton v-if="!isMobile" @click="handleClear">
            <span class="text-xl text-[#4f555e] dark:text-white">
              <SvgIcon icon="ri:delete-bin-line" />
            </span>
          </HoverButton>
          <HoverButton v-if="!isMobile" @click="handleExport">
            <span class="text-xl text-[#4f555e] dark:text-white">
              <SvgIcon icon="ri:download-2-line" />
            </span>
          </HoverButton>
          <HoverButton @click="toggleUsingContext">
            <span class="text-xl" :class="{ 'text-[#4b9e5f]': usingContext, 'text-[#a8071a]': !usingContext }">
              <SvgIcon icon="ri:chat-history-line" />
            </span>
          </HoverButton>
          <NAutoComplete v-model:value="prompt" :options="searchOptions" :render-label="renderOption">
            <template #default="{ handleInput, handleBlur, handleFocus }">
              <NInput
                ref="inputRef"
                v-model:value="prompt"
                type="textarea"
                :placeholder="placeholder"
                :autosize="{ minRows: 1, maxRows: isMobile ? 4 : 8 }"
                @input="handleInput"
                @focus="handleFocus"
                @blur="handleBlur"
                @keypress="handleEnter"
              />
            </template>
          </NAutoComplete>
          <NButton type="primary" :disabled="buttonDisabled" @click="handleSubmit">
            <template #icon>
              <span class="dark:text-black">
                <SvgIcon icon="ri:send-plane-fill" />
              </span>
            </template>
          </NButton>
        </div>
      </div>
    </footer>
  </div>
</template>
