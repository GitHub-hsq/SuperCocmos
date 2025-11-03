# Chat Index.vue 拆分指南

## 📊 当前进度

### ✅ 已完成
- ✅ **useRightSider.ts** - 右侧栏控制和拖拽调整
- ✅ **useFileUpload.ts** - 文件上传和工作流状态管理
- ✅ **useQuizWorkflow.ts** - Quiz 工作流操作
- ✅ **useModelSelector.ts** - 模型选择器
- ✅ **useChatState.ts** - 聊天状态管理 ⭐ **新完成**
- ✅ **useChatActions.ts** - 聊天操作（发送、重新生成、删除等） ⭐ **新完成**

### 🔄 待完成
- ⏳ **组件拆分** - 将大型模板拆分为独立组件
- ⏳ **重构主文件** - 整合所有 composables 到 index.vue

---

## 📝 useChatState.ts 拆分指南

### 需要提取的内容

从 `index.vue` 中提取以下内容到 `composables/useChatState.ts`:

```typescript
// 1. 基础依赖
const route = useRoute()
const router = useRouter()
const dialog = useDialog()
const ms = useMessage()
const notification = useNotification()
const auth0 = useAuth0()

// 2. Stores
const appStore = useAppStore()
const appInitStore = useAppInitStore()
const authStore = useAuthStore()
const chatStore = useChatStore()
const configStore = useConfigStore()
const modelStore = useModelStore()

// 3. Hooks
const { isMobile } = useBasicLayout()
const { addChat, updateChat, updateChatSome, getChatByUuidAndIndex } = useChat()
const { scrollRef, scrollToBottom, scrollToBottomIfAtBottom } = useScroll()
const { usingContext } = useUsingContext()

// 4. 基础状态
const uuid = computed(() => (route.params.uuid as string) || '')
const dataSources = computed(() => chatStore.getChatByUuid(uuid.value))
const prompt = ref<string>('')
const loading = ref<boolean>(false)
const inputRef = ref<Ref | null>(null)
const isMultiLine = ref<boolean>(false)
const isFooterElevated = ref(true)
const currentConversationId = ref<string>('')
const isDarkTheme = computed(() => { ... })

// 5. 设置页面相关
const showSettingsPage = computed(() => appStore.showSettingsPage)
const activeSettingTab = computed(() => appStore.activeSettingTab)
const isChatGPTAPI = computed<boolean>(() => !!authStore.isChatGPTAPI)
const aboutRef = ref<InstanceType<typeof About> | null>(null)
const hasLoadedUsage = ref(false)

// 6. 输入框相关
const placeholder = computed(() => { ... })
const buttonDisabled = computed(() => { ... })
const footerClass = computed(() => { ... })
const keyboardHeight = ref(0)
const footerStyle = computed(() => { ... })

// 7. Watch 监听
watch(() => route.params.uuid, async (newUuid) => { ... })
watch(() => prompt.value, async () => { ... })
watch(isMultiLine, async (newValue, oldValue) => { ... })
watch(showSettingsPage, (newValue, oldValue) => { ... })
```

### 文件结构

```typescript
// src/views/chat/composables/useChatState.ts
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDialog, useMessage, useNotification } from 'naive-ui'
import { useAuth0 } from '@auth0/auth0-vue'
// ... 其他导入

export function useChatState() {
  // ... 所有状态和 computed

  // ... 所有 watch

  return {
    // 基础
    route,
    router,
    dialog,
    ms,
    notification,
    auth0,

    // Stores
    appStore,
    chatStore,
    configStore,
    modelStore,

    // 状态
    uuid,
    dataSources,
    prompt,
    loading,
    inputRef,
    isMultiLine,
    // ...更多状态
  }
}
```

---

## 🎯 useChatActions.ts 拆分指南

### 需要提取的内容

这是最复杂的部分，包含约 600-700 行代码。

#### 核心函数列表

```typescript
// 1. 提交处理
function handleSubmit()

// 2. 发送消息 (最复杂，约 400 行)
async function onConversation()

// 3. 重新生成
async function onRegenerate(index: number)

// 4. 删除消息
function handleDelete(index: number)

// 5. 导出对话
function handleExport()

// 6. 停止生成
function handleStop()

// 7. Enter 键处理
function handleEnter(event: KeyboardEvent)
```

### 拆分策略

由于 `onConversation()` 函数非常大，建议进一步拆分：

```typescript
// src/views/chat/composables/useChatActions.ts

export function useChatActions(deps: {
  uuid: ComputedRef<string>
  dataSources: ComputedRef<any[]>
  prompt: Ref<string>
  loading: Ref<boolean>
  // ...其他依赖
}) {

  // 拆分：消息预处理
  function prepareMessage() { ... }

  // 拆分：创建请求选项
  function createRequestOptions() { ... }

  // 拆分：处理流式响应
  async function handleStreamResponse() { ... }

  // 拆分：错误处理
  function handleError() { ... }

  // 主函数：发送消息
  async function onConversation() {
    const message = prepareMessage()
    const options = createRequestOptions()
    await handleStreamResponse(options)
  }

  // 其他操作
  async function onRegenerate(index: number) { ... }
  function handleDelete(index: number) { ... }
  function handleExport() { ... }
  function handleStop() { ... }
  function handleEnter(event: KeyboardEvent) { ... }

  return {
    handleSubmit,
    onConversation,
    onRegenerate,
    handleDelete,
    handleExport,
    handleStop,
    handleEnter,
  }
}
```

---

## 🎨 组件拆分指南

### 1. **ModelSelector 组件**

创建 `components/ModelSelector/index.vue`:

```vue
<template>
  <NPopover
    v-model:show="showModelSelector"
    trigger="click"
    placement="bottom-start"
  >
    <template #trigger>
      <NButton quaternary round>
        {{ currentSelectedModel?.displayName || '请选择模型' }}
      </NButton>
    </template>

    <!-- 供应商和模型列表 -->
    <VendorList :vendors="availableVendors" @select="handleVendorHover" />
    <ModelList :models="currentVendorModels" @select="handleSelectModel" />
  </NPopover>
</template>

<script setup lang="ts">
import { useModelSelector } from '../../composables/useModelSelector'

const {
  showModelSelector,
  currentSelectedModel,
  availableVendors,
  currentVendorModels,
  handleVendorHover,
  handleSelectModel,
} = useModelSelector()
</script>
```

### 2. **ChatInput 组件**

创建 `components/ChatInput/index.vue`:

```vue
<template>
  <footer :class="footerClass" :style="footerStyle">
    <!-- 上传组件 -->
    <NUpload
      v-if="showUpload"
      :file-list="uploadFileList"
      @change="handleUploadChange"
    />

    <!-- 输入框 -->
    <NInput
      ref="inputRef"
      v-model:value="prompt"
      :placeholder="placeholder"
      @keypress="handleEnter"
    />

    <!-- 发送按钮 -->
    <NButton
      :disabled="buttonDisabled"
      @click="handleSubmit"
    >
      发送
    </NButton>
  </footer>
</template>

<script setup lang="ts">
// 接收 props 和 emits
const props = defineProps<{
  prompt: string
  loading: boolean
  uploadFileList: UploadFileInfo[]
}>()

const emit = defineEmits<{
  'update:prompt': [value: string]
  'submit': []
  'uploadChange': [options: any]
}>()
</script>
```

### 3. **SettingsPage 组件**

创建 `components/SettingsPage/index.vue`:

```vue
<template>
  <div class="settings-page">
    <transition name="fade-fast" mode="out-in">
      <UserSettingsPanel v-if="activeTab === 'General'" />
      <ChatConfigPanel v-else-if="activeTab === 'ChatConfig'" />
      <WorkflowConfigPanel v-else-if="activeTab === 'WorkflowModel'" />
      <!-- 其他面板 -->
    </transition>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  activeTab: string
}>()
</script>
```

---

## 🔧 重构主文件 index.vue

### 最终结构

```vue
<script setup lang='ts'>
// 1. Composables
import { useChatState } from './composables/useChatState'
import { useChatActions } from './composables/useChatActions'
import { useModelSelector } from './composables/useModelSelector'
import { useFileUpload } from './composables/useFileUpload'
import { useQuizWorkflow } from './composables/useQuizWorkflow'
import { useRightSider } from './composables/useRightSider'

// 2. Components
import ModelSelector from './components/ModelSelector/index.vue'
import ChatInput from './components/ChatInput/index.vue'
import SettingsPage from './components/SettingsPage/index.vue'
import { Message } from './components'

// 3. 使用 Composables
const chatState = useChatState()
const modelSelector = useModelSelector()
const fileUpload = useFileUpload(chatState.uuid)
const quizWorkflow = useQuizWorkflow({
  uploadedFilePath: fileUpload.uploadedFilePath,
  workflowStage: fileUpload.workflowStage,
  generatedQuestions: fileUpload.generatedQuestions,
  scoreDistribution: fileUpload.scoreDistribution,
})
const chatActions = useChatActions(chatState)
const rightSider = useRightSider()

// 4. onMounted 逻辑
onMounted(async () => {
  // 初始化逻辑
})
</script>

<template>
  <div class="chat-container">
    <transition name="fade" mode="out-in">
      <!-- 设置页面 -->
      <SettingsPage
        v-if="chatState.showSettingsPage"
        :active-tab="chatState.activeSettingTab"
      />

      <!-- 聊天页面 -->
      <div v-else class="chat-page">
        <!-- Header -->
        <header>
          <ModelSelector />
        </header>

        <!-- 消息列表 -->
        <main>
          <Message
            v-for="(item, index) in chatState.dataSources"
            :key="index"
            :data="item"
            @delete="() => chatActions.handleDelete(index)"
            @regenerate="() => chatActions.onRegenerate(index)"
          />
        </main>

        <!-- 输入框 -->
        <ChatInput
          v-model:prompt="chatState.prompt"
          :loading="chatState.loading"
          :upload-file-list="fileUpload.uploadFileList"
          @submit="chatActions.handleSubmit"
          @upload-change="fileUpload.handleUploadChange"
        />

        <!-- 右侧栏 -->
        <RightSider
          v-model:collapsed="rightSider.rightSiderCollapsed"
          :workflow-state="fileUpload.workflowState"
        />
      </div>
    </transition>
  </div>
</template>

<style scoped>
/* 样式 */
</style>
```

---

## 📦 文件大小对比

### 拆分前
- `index.vue`: **2957 行** ❌

### 拆分后
- `index.vue`: **~200 行** ✅
- `useChatState.ts`: **~150 行**
- `useChatActions.ts`: **~600 行**
- `useModelSelector.ts`: **~180 行**
- `useFileUpload.ts`: **~200 行**
- `useQuizWorkflow.ts`: **~120 行**
- `useRightSider.ts`: **~70 行**
- 组件文件: **~500 行**

**总计**: 约 **2020 行**，分散在 **10+ 个文件**中

---

## ✅ 完成检查清单

- [x] 创建 `composables/` 目录
- [x] 创建 `useRightSider.ts`
- [x] 创建 `useFileUpload.ts`
- [x] 创建 `useQuizWorkflow.ts`
- [x] 创建 `useModelSelector.ts`
- [x] 创建 `useChatState.ts` ⭐ **新完成**
- [x] 创建 `useChatActions.ts` ⭐ **新完成**
- [ ] 创建 `ModelSelector` 组件
- [ ] 创建 `ChatInput` 组件
- [ ] 创建 `SettingsPage` 组件
- [ ] 重构主文件 `index.vue`
- [ ] 测试所有功能
- [ ] 删除旧代码

**当前进度：7/13 完成 (54%)**

---

## 🚀 下一步行动

1. ✅ ~~按照本指南完成 `useChatState.ts` 的创建~~ **已完成**
2. ✅ ~~拆分 `useChatActions.ts`（最复杂的部分）~~ **已完成**
3. ⏳ 创建组件文件（ModelSelector, ChatInput, SettingsPage）
4. ⏳ 重构主文件 `index.vue`，整合所有 composables
5. ⏳ 全面测试所有功能

---

## 💡 提示

- 逐步拆分，每完成一个模块就测试一次
- 保留原始 `index.vue` 作为备份
- 使用 TypeScript 类型确保类型安全
- 注意 composable 之间的依赖关系

---

**Good Luck! 🎉**
