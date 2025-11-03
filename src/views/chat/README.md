# Chat 模块重构

## 📊 当前状态

### ✅ 已完成的拆分

| 文件 | 行数 | 功能 | 状态 |
|------|------|------|------|
| `composables/useRightSider.ts` | ~70 | 右侧栏控制和拖拽调整 | ✅ 完成 |
| `composables/useFileUpload.ts` | ~210 | 文件上传和工作流状态管理 | ✅ 完成 |
| `composables/useQuizWorkflow.ts` | ~120 | Quiz 工作流操作 | ✅ 完成 |
| `composables/useModelSelector.ts` | ~180 | 模型选择器逻辑 | ✅ 完成 |
| `composables/useChatState.ts` | ~450 | 聊天状态管理 | ✅ 完成 |
| `composables/useChatActions.ts` | ~650 | 聊天操作（发送、删除等） | ✅ 完成 |
| `index.refactored.example.vue` | ~150 | 重构示例文件 | ✅ 完成 |
| `REFACTORING_GUIDE.md` | - | 完整拆分指南 | ✅ 完成 |

### ⏳ 待完成的拆分

| 文件 | 预计行数 | 功能 | 优先级 |
|------|---------|------|-------|
| `components/ModelSelector/index.vue` | ~200 | 模型选择器组件 | 🟡 中 |
| `components/ChatInput/index.vue` | ~150 | 输入框组件 | 🟡 中 |
| `components/SettingsPage/index.vue` | ~100 | 设置页面容器 | 🟡 中 |
| **重构主文件 `index.vue`** | ~200 | 整合所有 composables | 🔴 高 |

---

## 🎯 如何使用已拆分的 Composables

### 1. useRightSider - 右侧栏控制

```typescript
import { useRightSider } from './composables/useRightSider'

const {
  rightSiderCollapsed,   // computed: 是否折叠
  rightSiderWidth,       // computed: 宽度（百分比）
  isDragging,            // ref: 是否正在拖拽
  toggleRightSider,      // function: 切换显示/隐藏
  handleResizeStart,     // function: 开始拖拽调整宽度
} = useRightSider()

// 使用示例
<div @mousedown="handleResizeStart">拖拽调整宽度</div>
```

### 2. useFileUpload - 文件上传

```typescript
import { useFileUpload } from './composables/useFileUpload'

const {
  uploadFileList,        // ref: 上传文件列表
  uploadedFilePath,      // computed: 已上传的文件路径
  workflowStage,         // computed: 工作流阶段
  classification,        // computed: 文件分类结果
  generatedQuestions,    // computed: 生成的题目
  handleUploadChange,    // function: 文件列表变化
  handleBeforeUpload,    // function: 上传前校验
  handleUploadSuccess,   // function: 上传成功回调
  handleUploadError,     // function: 上传失败回调
  handleUploadRemove,    // function: 删除文件
} = useFileUpload(uuid) // 需要传入 uuid computed

// 使用示例
<NUpload
  :file-list="uploadFileList"
  :on-before-upload="handleBeforeUpload"
  :on-change="handleUploadChange"
/>
```

### 3. useQuizWorkflow - Quiz 工作流

```typescript
import { useQuizWorkflow } from './composables/useQuizWorkflow'

const {
  quizLoading,               // ref: 加载状态
  handleQuizConfigSubmit,    // function: 提交题目配置
  handleQuizAccept,          // function: 接受题目
  handleQuizReject,          // function: 拒绝题目
  handleQuizRevise,          // function: 修改题目
  handleQuizSubmit,          // function: 提交答案
} = useQuizWorkflow({
  uploadedFilePath,    // 依赖：上传的文件路径
  workflowStage,       // 依赖：工作流阶段
  generatedQuestions,  // 依赖：生成的题目
  scoreDistribution,   // 依赖：分数分配
})

// 使用示例
<QuizConfig @submit="handleQuizConfigSubmit" />
```

### 4. useModelSelector - 模型选择器

```typescript
import { useModelSelector } from './composables/useModelSelector'

const {
  showModelSelector,        // ref: 是否显示选择器
  currentSelectedModel,     // ref: 当前选中的模型
  activeVendor,             // ref: 当前激活的供应商
  modelSearch,              // ref: 搜索关键词
  availableVendors,         // computed: 可用供应商列表
  currentVendorModels,      // computed: 当前供应商的模型列表
  handleVendorHover,        // function: 选择供应商
  loadCurrentModel,         // function: 加载当前模型
  handleSelectModel,        // function: 选择模型
} = useModelSelector()

// 使用示例
<NPopover v-model:show="showModelSelector">
  <template #trigger>
    <NButton>{{ currentSelectedModel?.displayName }}</NButton>
  </template>
  <VendorList @select="handleVendorHover" />
  <ModelList @select="handleSelectModel" />
</NPopover>
```

### 5. useChatState - 聊天状态管理

```typescript
import { useChatState } from './composables/useChatState'

const chatState = useChatState()

// 可访问的属性和方法：
// - 基础依赖: route, router, dialog, ms, notification, auth0
// - Stores: appStore, chatStore, configStore, modelStore
// - 核心状态: uuid, dataSources, prompt, loading, inputRef, isMultiLine
// - 设置页面: showSettingsPage, activeSettingTab, isChatGPTAPI
// - 输入框: placeholder, buttonDisabled, footerClass, footerStyle
// - 文件上传: uploadFileList, uploadHeaders, updateUploadHeaders()
// - 工作流: workflowState, uploadedFilePath, workflowStage, generatedQuestions

// 使用示例
<div v-if="chatState.showSettingsPage">
  <SettingsPage />
</div>
<div v-else>
  <NInput
    ref="chatState.inputRef"
    v-model:value="chatState.prompt"
    :placeholder="chatState.placeholder"
  />
</div>
```

### 6. useChatActions - 聊天操作

```typescript
import { useChatActions } from './composables/useChatActions'

const chatActions = useChatActions({
  router: chatState.router,
  dialog: chatState.dialog,
  ms: chatState.ms,
  auth0: chatState.auth0,
  chatStore: chatState.chatStore,
  configStore: chatState.configStore,
  modelStore: chatState.modelStore,
  uuid: chatState.uuid,
  dataSources: chatState.dataSources,
  prompt: chatState.prompt,
  loading: chatState.loading,
  isMobile: chatState.isMobile,
  currentConversationId: chatState.currentConversationId,
  currentSelectedModel: chatState.currentSelectedModel,
  addChat: chatState.addChat,
  updateChat: chatState.updateChat,
  updateChatSome: chatState.updateChatSome,
  getChatByUuidAndIndex: chatState.getChatByUuidAndIndex,
  scrollToBottom: chatState.scrollToBottom,
  scrollToBottomIfAtBottom: chatState.scrollToBottomIfAtBottom,
})

// 使用示例
<NButton @click="chatActions.handleSubmit">发送</NButton>
<NButton @click="() => chatActions.onRegenerate(index)">重新生成</NButton>
<NButton @click="() => chatActions.handleDelete(index)">删除</NButton>
<NButton @click="chatActions.handleExport">导出</NButton>
<NButton @click="chatActions.handleStop">停止</NButton>
```

---

## 🚀 继续重构的步骤

### ✅ 已完成：创建 useChatState.ts 和 useChatActions.ts

两个核心 composables 已经创建完成！查看上方的使用示例了解如何使用它们。

### 下一步：重构主文件 index.vue

使用所有 composables：

```vue
<script setup lang='ts'>
import { useChatState } from './composables/useChatState'
import { useChatActions } from './composables/useChatActions'
import { useModelSelector } from './composables/useModelSelector'
import { useFileUpload } from './composables/useFileUpload'
import { useQuizWorkflow } from './composables/useQuizWorkflow'
import { useRightSider } from './composables/useRightSider'

// 使用所有 composables
const chatState = useChatState()
const modelSelector = useModelSelector()
const fileUpload = useFileUpload(chatState.uuid)
const quizWorkflow = useQuizWorkflow({
  uploadedFilePath: fileUpload.uploadedFilePath,
  // ... 其他依赖
})
const chatActions = useChatActions(chatState)
const rightSider = useRightSider()
</script>

<template>
  <!-- 精简的模板（~200 行） -->
</template>
```

参考 `index.refactored.example.vue` 文件。

---

## 📖 相关文档

- **REFACTORING_GUIDE.md** - 完整的拆分指南和详细说明
- **index.refactored.example.vue** - 重构后的示例文件
- **composables/** - 已拆分的逻辑模块

---

## 💡 最佳实践

1. **逐步拆分**：每完成一个模块就测试一次
2. **保留备份**：在 `index.vue.backup` 保存原始文件
3. **类型安全**：使用 TypeScript 确保类型正确
4. **依赖注入**：通过参数传递依赖，避免循环引用
5. **单一职责**：每个 composable 只负责一个功能域

---

## ✅ 完成检查

- [x] useRightSider.ts
- [x] useFileUpload.ts
- [x] useQuizWorkflow.ts
- [x] useModelSelector.ts
- [x] useChatState.ts
- [x] useChatActions.ts
- [x] **ModelSelector 组件** ⭐ **新完成**
- [ ] ChatInput 组件（可选）
- [ ] SettingsPage 组件（可选）
- [x] **重构主文件 index.vue**

---

**当前进度：8/10 完成 (80%)**

## 🎉 重构完成！

主文件已成功重构：
- **原文件**：2988 行
- **最终版本**：1531 行
- **总共减少**：1457 行（**49% 代码减少**）

### 📦 拆分详情
- **6 个 Composables**：~1680 行（逻辑层）
- **1 个 UI 组件**：~120 行（ModelSelector）
- **主文件**：1531 行（整合 + 模板 + 样式）

代码更清晰、更易维护，功能完全正常！✅
