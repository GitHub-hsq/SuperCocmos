# 供应商配置表格调整指南

## 📋 文件位置
`src/components/common/Setting/ProviderConfig.vue`

---

## 🎨 已优化的配置

### 1. 模型子表格列宽（第 155-231 行）

| 列名 | 原宽度 | 新宽度 | 最小宽度 | 说明 |
|------|--------|--------|----------|------|
| 模型ID | 250px | **300px** ✨ | 200px | 显示完整模型ID |
| 显示名称 | 200px | **280px** ✨ | 200px | 显示完整名称 |
| 是否启用 | 100px | 100px | - | 开关按钮 |
| 访问权限 | 200px | **220px** ✨ | - | 角色标签 |
| 操作 | 200px | **220px** ✨ | - | 固定右侧 |

**子表格总宽度**: 1150px

```typescript
// 第 155 行开始
const modelColumns: DataTableColumns<ModelItem> = [
  {
    title: '模型ID',
    width: 300,        // 🔧 在这里调整
    minWidth: 200,     // 🔧 最小宽度
  },
  // ...
]
```

---

### 2. 供应商主表格列宽（第 234-317 行）

| 列名 | 原宽度 | 新宽度 | 最小宽度 | 说明 |
|------|--------|--------|----------|------|
| 展开按钮 | - | **50px** ✨ | - | 展开/收起 |
| 供应商名称 | 200px | **180px** | 150px | 供应商名称 |
| Base URL | 300px | **350px** ✨ | 250px | API地址 |
| API Key | 200px | **220px** ✨ | - | 脱敏显示 |
| 模型数量 | 100px | 100px | - | 数量标签 |
| 操作 | 200px | **180px** | - | 固定右侧 |

**主表格总宽度**: 1130px

```typescript
// 第 234 行开始
const providerColumns: DataTableColumns<ProviderItem> = [
  {
    type: 'expand',
    width: 50,         // 🔧 展开列宽度
  },
  {
    title: 'Base URL',
    width: 350,        // 🔧 在这里调整
    minWidth: 250,     // 🔧 最小宽度
  },
  // ...
]
```

---

### 3. 表格容器高度（第 684 行）

**原配置**:
```html
<div style="max-height: 60vh;">
```

**新配置** ✨:
```html
<div style="height: calc(100vh - 280px); min-height: 500px;">
```

| 参数 | 值 | 说明 |
|------|-----|------|
| 高度计算 | `100vh - 280px` | 视口高度减去头部/统计栏 |
| 最小高度 | `500px` | 防止太小 |
| 滚动宽度 | `1130px` | 主表格横向滚动 |

```html
<!-- 第 684 行 -->
<div class="overflow-auto" style="height: calc(100vh - 280px); min-height: 500px;">
  <NDataTable
    :scroll-x="1130"    <!-- 🔧 横向滚动宽度 -->
    <!-- ... -->
  />
</div>
```

---

## 🛠️ 快速调整方法

### 调整列宽
1. 打开 `ProviderConfig.vue`
2. 搜索要修改的列名（如 `Base URL`）
3. 修改 `width` 值
4. 如果总宽度变化，同步更新 `scroll-x`

**示例**：
```typescript
{
  title: 'Base URL',
  width: 400,        // 改大一点
  minWidth: 250,
}

// 同时更新滚动宽度（第 692 行）
:scroll-x="1180"     // 1130 + 50 = 1180
```

### 调整表格高度
```html
<!-- 第 684 行 -->
<div style="height: calc(100vh - 280px); min-height: 500px;">
                              ^^^                ^^^
                              减去的高度          最小高度
```

**常见调整**：
- 显示更多内容：减小 `280px` → `250px`
- 显示更少内容：增大 `280px` → `320px`
- 调整最小高度：`500px` → `600px`

### 调整子表格宽度
```typescript
// 第 252-258 行
h(NDataTable, {
  columns: modelColumns,
  scrollX: 1150,    // 🔧 修改这里
})
```

---

## 📐 宽度计算公式

### 主表格总宽度计算
```
展开列(50) + 名称(180) + URL(350) + Key(220) + 数量(100) + 操作(180) 
= 1080px

加上边距和内边距 ≈ 1130px
```

### 子表格总宽度计算
```
模型ID(300) + 名称(280) + 启用(100) + 权限(220) + 操作(220)
= 1120px

加上边距和内边距 ≈ 1150px
```

---

## 💡 优化建议

### 1. 固定重要列
```typescript
{
  title: '操作',
  width: 180,
  fixed: 'right',    // ✅ 固定到右侧
}
```

### 2. 添加省略号提示
```typescript
{
  title: 'Base URL',
  ellipsis: { tooltip: true },    // ✅ 超长内容显示提示
}
```

### 3. 设置最小宽度
```typescript
{
  title: '供应商名称',
  width: 180,
  minWidth: 150,    // ✅ 防止太窄
}
```

---

## 🎯 推荐配置方案

### 方案A：宽屏优化（适合 1920px+ 屏幕）
```typescript
// Base URL 增加到 400px
// 模型ID 增加到 350px
// scroll-x 调整为 1250px
```

### 方案B：紧凑模式（适合 1366px 屏幕）
```typescript
// Base URL 减少到 300px
// 模型ID 减少到 250px
// scroll-x 调整为 1050px
```

### 方案C：超高密度（数据很多时）
```typescript
// 高度改为 calc(100vh - 200px)
// 最小高度改为 600px
// 更多空间显示数据
```

---

## 🐛 常见问题

### Q: 表格横向滚动条不显示？
**A**: 检查 `scroll-x` 是否大于容器宽度，确保超出才会滚动。

### Q: 列内容被截断？
**A**: 增加对应列的 `width` 值，或添加 `ellipsis: { tooltip: true }`。

### Q: 表格高度不对？
**A**: 检查 `calc(100vh - 280px)` 中的减数，可能需要根据实际布局调整。

### Q: 操作列位置不对？
**A**: 确保设置了 `fixed: 'right'` 属性。

---

## 📝 修改记录

| 日期 | 修改内容 | 说明 |
|------|----------|------|
| 2025-10-19 | 优化列宽和高度 | 提升显示效果 |
| 2025-10-19 | 添加最小宽度 | 防止太窄 |
| 2025-10-19 | 固定操作列 | 改善用户体验 |

