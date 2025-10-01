# 组件库文档

本文档介绍了 ChatGPT Web 项目中 `src/components` 目录下的所有通用组件，包括它们的功能、用法和示例。

## 目录结构

```
src/components/
├── common/           # 通用组件
│   ├── HoverButton/  # 悬停按钮组件
│   ├── NaiveProvider/ # Naive UI 提供者组件
│   ├── PromptStore/  # 提示词商店组件
│   ├── Setting/      # 设置组件
│   ├── SvgIcon/      # SVG 图标组件
│   └── UserAvatar/   # 用户头像组件
└── custom/           # 自定义组件
    └── GithubSite/   # GitHub 链接组件
```

## 通用组件 (common/)

### 1. HoverButton - 悬停按钮组件

**功能**: 提供带悬停效果的圆形按钮，支持工具提示。

**文件位置**: `src/components/common/HoverButton/`

**组件结构**:
- `index.vue` - 主组件，包含工具提示逻辑
- `Button.vue` - 基础按钮组件

**Props**:
```typescript
interface Props {
  tooltip?: string        // 工具提示文本
  placement?: PopoverPlacement  // 工具提示位置，默认 'bottom'
}
```

**Events**:
```typescript
interface Emit {
  (e: 'click'): void     // 点击事件
}
```

**用法示例**:
```vue
<template>
  <!-- 带工具提示的按钮 -->
  <HoverButton
    tooltip="删除消息"
    placement="top"
    @click="handleDelete"
  >
    <SvgIcon icon="ri:delete-bin-line" />
  </HoverButton>

  <!-- 不带工具提示的按钮 -->
  <HoverButton @click="handleClick">
    <SvgIcon icon="ri:add-line" />
  </HoverButton>
</template>
```

**特点**:
- 圆形按钮设计，悬停时有背景色变化
- 支持暗色主题
- 可选的工具提示功能
- 响应式设计

---

### 2. NaiveProvider - Naive UI 提供者组件

**功能**: 为整个应用提供 Naive UI 的全局功能支持，包括对话框、消息、通知、加载条等。

**文件位置**: `src/components/common/NaiveProvider/index.vue`

**功能特性**:
- 提供全局的 `$dialog`、`$message`、`$notification`、`$loadingBar` 实例
- 自动注册到 `window` 对象，可在任何地方使用
- 嵌套的 Provider 结构确保功能完整

**用法示例**:
```vue
<script setup>
// 在组件中使用全局方法
const handleClick = () => {
  window.$message.success('操作成功')
  window.$dialog.warning({
    title: '确认',
    content: '确定要删除吗？',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: () => {
      // 删除逻辑
    }
  })
}
</script>

<template>
  <NaiveProvider>
    <!-- 你的应用内容 -->
    <App />
  </NaiveProvider>
</template>
```

**全局方法**:
- `window.$dialog` - 对话框
- `window.$message` - 消息提示
- `window.$notification` - 通知
- `window.$loadingBar` - 加载条

---

### 3. SvgIcon - SVG 图标组件

**功能**: 基于 Iconify 的 SVG 图标组件，支持动态图标切换。

**文件位置**: `src/components/common/SvgIcon/index.vue`

**Props**:
```typescript
interface Props {
  icon?: string  // 图标名称，如 'ri:home-line'
}
```

**用法示例**:
```vue
<script setup>
import { ref } from 'vue'

const currentIcon = ref('ri:home-line')

// 动态切换图标
const toggleIcon = () => {
  currentIcon.value = currentIcon.value === 'ri:home-line'
    ? 'ri:settings-line'
    : 'ri:home-line'
}
</script>

<template>
  <!-- 基础用法 -->
  <SvgIcon icon="ri:home-line" />

  <!-- 带样式 -->
  <SvgIcon
    icon="ri:settings-line"
    class="text-blue-500 text-xl"
    style="color: red;"
  />

  <!-- 动态图标 -->
  <SvgIcon :icon="currentIcon" />
</template>
```

**特点**:
- 支持 Iconify 图标库的所有图标
- 自动继承父元素的样式
- 支持动态图标切换
- 轻量级，按需加载

---

### 4. UserAvatar - 用户头像组件

**功能**: 显示用户头像、姓名和描述信息的组件。

**文件位置**: `src/components/common/UserAvatar/index.vue`

**功能特性**:
- 显示用户头像（支持自定义头像和默认头像）
- 显示用户姓名和描述
- 响应式设计，支持移动端
- 自动从用户状态管理中获取数据

**用法示例**:
```vue
<template>
  <!-- 在侧边栏中使用 -->
  <div class="sidebar">
    <UserAvatar />
  </div>
</template>
```

**数据来源**:
组件自动从 `useUserStore()` 获取用户信息：
```typescript
interface UserInfo {
  name?: string        // 用户姓名
  avatar?: string      // 头像 URL
  description?: string // 用户描述
}
```

**特点**:
- 自动处理头像加载失败的情况
- 支持 HTML 格式的描述文本
- 文本溢出时显示省略号
- 默认用户名为 "ChenZhaoYu"

---

### 5. Setting - 设置组件

**功能**: 应用设置面板，包含通用设置、高级设置和关于页面。

**文件位置**: `src/components/common/Setting/`

**组件结构**:
- `index.vue` - 主设置组件，包含标签页切换
- `General.vue` - 通用设置（主题、语言、用户信息）
- `Advanced.vue` - 高级设置（系统消息、温度、top_p）
- `About.vue` - 关于页面（版本信息、配置信息）

**Props**:
```typescript
interface Props {
  visible: boolean  // 控制设置面板显示/隐藏
}
```

**Events**:
```typescript
interface Emit {
  (e: 'update:visible', visible: boolean): void  // 更新显示状态
}
```

**用法示例**:
```vue
<script setup>
import { ref } from 'vue'

const showSettings = ref(false)
</script>

<template>
  <div>
    <!-- 触发按钮 -->
    <HoverButton
      tooltip="设置"
      @click="showSettings = true"
    >
      <SvgIcon icon="ri:settings-line" />
    </HoverButton>

    <!-- 设置面板 -->
    <Setting
      v-model:visible="showSettings"
    />
  </div>
</template>
```

**设置内容**:

1. **通用设置 (General)**:
   - 主题切换（自动/浅色/深色）
   - 语言切换
   - 用户信息编辑（头像、姓名、描述）

2. **高级设置 (Advanced)**:
   - 系统消息设置
   - 温度参数调整 (0-2)
   - top_p 参数调整 (0-1)
   - 设置重置功能

3. **关于页面 (About)**:
   - 版本信息
   - 开源协议信息
   - 当前配置信息（API 模型、代理等）

**特点**:
- 响应式设计，支持移动端
- 设置自动保存到本地存储
- 支持国际化
- 根据 API 类型显示不同的设置选项

---

### 6. PromptStore - 提示词商店组件

**功能**: 管理提示词模板的组件，支持添加、编辑、删除、导入、导出提示词。

**文件位置**: `src/components/common/PromptStore/index.vue`

**Props**:
```typescript
interface Props {
  visible: boolean  // 控制提示词商店显示/隐藏
}
```

**Events**:
```typescript
interface Emit {
  (e: 'update:visible', visible: boolean): void  // 更新显示状态
}
```

**用法示例**:
```vue
<template>
  <div>
    <!-- 触发按钮 -->
    <HoverButton
      tooltip="提示词商店"
      @click="showPromptStore = true"
    >
      <SvgIcon icon="ri:book-open-line" />
    </HoverButton>

    <!-- 提示词商店 -->
    <PromptStore
      v-model:visible="showPromptStore"
    />
  </div>
</template>
```

**功能特性**:

1. **本地管理**:
   - 添加新的提示词模板
   - 编辑现有提示词
   - 删除提示词
   - 搜索和筛选
   - 批量导入/导出

2. **在线导入**:
   - 从 URL 导入提示词模板
   - 推荐模板列表
   - 支持多种格式（key-value 和 act-prompt）

3. **数据格式**:
   ```typescript
   interface PromptTemplate {
     key: string    // 提示词标题
     value: string  // 提示词内容
   }
   ```

4. **响应式设计**:
   - 桌面端使用表格显示
   - 移动端使用列表显示
   - 自适应分页

**特点**:
- 支持 JSON 格式的导入导出
- 自动检测重复的标题和内容
- 支持在线模板推荐
- 数据持久化存储
- 完整的错误处理和用户提示

---

## 自定义组件 (custom/)

### 1. GithubSite - GitHub 链接组件

**功能**: 显示 GitHub 项目链接的简单组件。

**文件位置**: `src/components/custom/GithubSite.vue`

**用法示例**:
```vue
<template>
  <div class="footer">
    <GithubSite />
  </div>
</template>
```

**特点**:
- 简单的文本链接
- 支持暗色主题
- 新窗口打开链接
- 链接到项目的 GitHub 仓库

---

## 组件使用最佳实践

### 1. 导入组件
```typescript
// 从 common 组件库导入
import { HoverButton, SvgIcon, UserAvatar } from '@/components/common'

// 从 custom 组件库导入
import { GithubSite } from '@/components/custom'
```

### 2. 组件组合
```vue
<template>
  <div class="header">
    <UserAvatar />
    <div class="actions">
      <HoverButton
        tooltip="设置"
        @click="showSettings = true"
      >
        <SvgIcon icon="ri:settings-line" />
      </HoverButton>
      <HoverButton
        tooltip="提示词"
        @click="showPrompts = true"
      >
        <SvgIcon icon="ri:book-open-line" />
      </HoverButton>
    </div>
  </div>

  <Setting v-model:visible="showSettings" />
  <PromptStore v-model:visible="showPrompts" />
</template>
```

### 3. 样式定制
```vue
<template>
  <!-- 使用 Tailwind CSS 类名 -->
  <HoverButton class="text-blue-500 hover:text-blue-700">
    <SvgIcon icon="ri:home-line" class="text-xl" />
  </HoverButton>

  <!-- 使用内联样式 -->
  <SvgIcon
    icon="ri:star-line"
    style="color: gold; font-size: 24px;"
  />
</template>
```

### 4. 事件处理
```vue
<script setup>
const handleDelete = () => {
  window.$dialog.warning({
    title: '确认删除',
    content: '确定要删除这个项目吗？',
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: () => {
      // 执行删除逻辑
      window.$message.success('删除成功')
    }
  })
}
</script>

<template>
  <HoverButton
    tooltip="删除"
    @click="handleDelete"
  >
    <SvgIcon icon="ri:delete-bin-line" />
  </HoverButton>
</template>
```

## 注意事项

1. **组件依赖**: 确保在使用组件前已正确安装相关依赖
2. **状态管理**: 某些组件依赖 Pinia store，确保 store 已正确初始化
3. **国际化**: 组件支持多语言，确保已配置 i18n
4. **主题**: 组件支持暗色主题，确保主题切换功能正常
5. **响应式**: 组件已适配移动端，测试时注意不同屏幕尺寸
6. **性能**: 大量使用 SvgIcon 时注意图标加载性能

## 扩展组件

如需添加新的通用组件：

1. 在 `src/components/common/` 下创建组件目录
2. 实现组件功能
3. 在 `src/components/common/index.ts` 中导出
4. 更新本文档

如需添加自定义组件：

1. 在 `src/components/custom/` 下创建组件文件
2. 在 `src/components/custom/index.ts` 中导出
3. 更新本文档
