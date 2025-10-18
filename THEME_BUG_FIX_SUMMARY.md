# 主题切换 Bug 修复说明

## 问题描述
设置界面中切换主题时，主题没有正确改变。

## 根本原因分析

应用程序使用了两个不同的 store 来管理配置：

1. **appStore** (`src/store/modules/app`) - 管理 UI 状态，包括主题和语言，存储在本地 localStorage
2. **configStore** (`src/store/modules/config`) - 管理用户配置，包括主题和语言，存储在数据库

Bug 产生的原因：
- 设置面板（UserSettingsPanel.vue）仅更新 `configStore`
- `useTheme()` hook 读取的是 `appStore.theme`
- 因此用户更改主题后，数据保存到了数据库，但 UI 没有更新（因为 `appStore` 没有被同步更新）

## 修复方案

### 1. 更新 UserSettingsPanel.vue

**文件路径**: `src/components/common/Setting/panels/UserSettingsPanel.vue`

**修改内容**:
- 添加 `useAppStore` 的导入
- 修改 `handleSave()` 函数，在保存到 `configStore` 后立即同步更新 `appStore`
- 修改 `loadData()` 函数，如果 `configStore` 没有数据则从 `appStore` 加载

```typescript
// 同步更新 appStore，使主题和语言立即生效
appStore.setTheme(formData.theme as 'auto' | 'light' | 'dark')
appStore.setLanguage(formData.language as 'zh-CN' | 'en-US')
```

### 2. 更新 config/index.ts

**文件路径**: `src/store/modules/config/index.ts`

**修改内容**:
- 修改 `loadAllConfig()` action，在从数据库加载配置后，将用户设置（主题和语言）同步到 `appStore`

```typescript
// 同步用户设置到 appStore，使主题和语言立即生效
if (this.userSettings) {
  const { useAppStore } = await import('@/store')
  const appStore = useAppStore()
  if (this.userSettings.theme)
    appStore.setTheme(this.userSettings.theme)
  if (this.userSettings.language)
    appStore.setLanguage(this.userSettings.language)
}
```

## 修复效果

修复后确保：
1. ✅ 在设置界面切换主题后，UI 能够立即正确地反映所选主题
2. ✅ 主题选择能够持久化保存到数据库
3. ✅ 主题同时保存到 localStorage (通过 appStore)
4. ✅ 页面刷新后主题设置保持不变（从数据库加载并同步到 appStore）

## 测试建议

1. 打开设置页面
2. 切换主题（自动/浅色/深色）
3. 点击"保存更改"
4. 验证 UI 立即反映了主题变化
5. 刷新页面
6. 验证主题设置保持不变

## 技术细节

- 使用动态导入 `await import('@/store')` 避免循环依赖
- 保持向后兼容，不改变现有的存储机制
- 同时支持数据库持久化和本地存储
- 确保主题和语言设置在 appStore 和 configStore 之间保持同步
