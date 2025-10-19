# 表格列宽调节指南

## ✅ 问题已解决

### 问题1: 底部滚动条一直显示
**原因**: 设置了固定的 `scrollX` 值（1150px），但实际列宽总和小于这个值

**解决方案**:
```typescript
// ❌ 之前（强制滚动）
h(NDataTable, {
  scrollX: 1150, // 固定宽度导致强制滚动
})

// ✅ 现在（自适应）
h(NDataTable, {
  resizable: true, // 自适应宽度，无多余滚动条
})
```

### 问题2: 无法用鼠标拖动调节列宽
**解决方案**: 已开启 `resizable` 属性

---

## 🎯 如何使用列宽拖动

### 1️⃣ 鼠标拖动调节
- 将鼠标移到列头分隔线上
- 鼠标变成双向箭头 ↔️
- 按住左键拖动即可调整宽度

![列宽拖动示意](https://naiveui.com/assets/resize.gif)

### 2️⃣ 配置说明

**主表格**（第 686-696 行）:
```html
<NDataTable
  :columns="providerColumns"
  resizable    <!-- ✅ 开启列宽拖动 -->
/>
```

**子表格**（第 252-259 行）:
```typescript
h(NDataTable, {
  columns: modelColumns,
  resizable: true, // ✅ 开启列宽拖动
})
```

---

## 🔧 列宽配置策略

### 策略1: 使用 width（推荐）
```typescript
{
  title: '模型ID',
  width: 100,        // 初始宽度
  minWidth: 80,      // 最小宽度（防止拖得太小）
  resizable: true,   // 可拖动调节（继承自表格配置）
}
```

### 策略2: 使用 flex（适合自适应）
```typescript
{
  title: '显示名称',
  // 不设置 width，让列自动填充剩余空间
  minWidth: 120,     // 仅设置最小宽度
}
```

### 策略3: 固定列（操作列）
```typescript
{
  title: '操作',
  width: 100,
  fixed: 'right',    // 固定在右侧
  // 固定列也可以调节宽度
}
```

---

## 📐 宽度计算建议

### 当前配置（用户调整后）

**模型子表格**:
```
模型ID(100) + 显示名称(150) + 启用(60) + 权限(60) + 操作(100)
= 470px
```

**供应商主表格**:
```
展开(50) + 名称(180) + URL(350) + Key(220) + 数量(100) + 操作(180)
= 1080px
```

### 优化建议

如果内容显示不全，建议：

1. **不要设置过小的 width**
   - 模型ID: 建议至少 150px
   - 显示名称: 建议至少 180px
   - 访问权限: 建议至少 120px（显示角色标签）

2. **使用 ellipsis 省略号**
   ```typescript
   {
     title: '模型ID',
     width: 100,
     ellipsis: { tooltip: true },  // ✅ 超长显示提示
   }
   ```

3. **仅在需要时设置 scrollX**
   ```typescript
   // 仅当列宽总和确实超过容器时才设置
   :scroll-x="1500"

   // 或者不设置，让表格自适应
   // :scroll-x 不设置
   ```

---

## 🎨 推荐配置

### 方案A: 紧凑模式（当前配置）
```typescript
// 适合内容简短的场景
const modelColumns = [
  { title: '模型ID', width: 100, minWidth: 80 },
  { title: '显示名称', width: 150, minWidth: 120 },
  { title: '是否启用', width: 60 },
  { title: '访问权限', width: 60 },
  { title: '操作', width: 100, fixed: 'right' },
]
```

### 方案B: 舒适模式（推荐）
```typescript
// 适合大部分场景，内容显示完整
const modelColumns = [
  { title: '模型ID', width: 200, minWidth: 150 },
  { title: '显示名称', width: 220, minWidth: 180 },
  { title: '是否启用', width: 100 },
  { title: '访问权限', width: 150, minWidth: 120 },
  { title: '操作', width: 150, fixed: 'right' },
]
```

### 方案C: 宽松模式
```typescript
// 适合大屏显示，充分利用空间
const modelColumns = [
  { title: '模型ID', width: 300, minWidth: 200 },
  { title: '显示名称', width: 280, minWidth: 220 },
  { title: '是否启用', width: 100 },
  { title: '访问权限', width: 200, minWidth: 150 },
  { title: '操作', width: 180, fixed: 'right' },
]
```

---

## 💡 最佳实践

### 1. minWidth 保护内容
```typescript
{
  title: '访问权限',
  width: 60,        // 当前宽度（用户可能调整）
  minWidth: 120,    // ✅ 最小宽度（防止角色标签被压扁）
}
```

### 2. ellipsis 处理超长内容
```typescript
{
  title: '模型ID',
  width: 100,
  ellipsis: { tooltip: true },  // ✅ 鼠标悬停显示完整内容
}
```

### 3. 固定重要列
```typescript
{
  title: '操作',
  width: 100,
  fixed: 'right',    // ✅ 始终可见
}
```

### 4. 自适应布局
```typescript
// 不要在所有列都设置固定宽度
// 让某些列自适应填充剩余空间
{
  title: '显示名称',
  // 不设置 width，自动填充
  minWidth: 150,
}
```

---

## 🐛 常见问题

### Q1: 为什么拖动列宽不生效？
**A**: 检查是否添加了 `resizable` 属性：
```html
<NDataTable resizable :columns="..." />
```

### Q2: 拖动后宽度没有保存？
**A**: Naive UI 的 `resizable` 不会自动保存宽度。如需保存，可以监听列宽变化并存储到 localStorage：
```typescript
const savedWidths = ref(JSON.parse(localStorage.getItem('columnWidths') || '{}'))

// 在列配置中使用保存的宽度
const modelColumns = computed(() => [
  {
    title: '模型ID',
    width: savedWidths.value.modelId || 100,
  },
])
```

### Q3: 为什么有些列无法拖动？
**A**: 固定列（`fixed: 'left'` 或 `fixed: 'right'`）也可以拖动，但展开列（`type: 'expand'`）通常不支持拖动。

### Q4: 表格宽度超出容器怎么办？
**A**:
1. 方案1: 添加横向滚动
   ```html
   <div style="overflow-x: auto">
     <NDataTable />
   </div>```

2. 方案2: 减小列宽或使用自适应
   ```typescript
   // 不设置所有列的固定宽度
   { title: '显示名称' } // 自动填充
   ```

### Q5: 列太窄，内容被截断？
**A**:
1. 设置合理的 `minWidth`
2. 添加 `ellipsis: { tooltip: true }`
3. 或者增加 `width` 初始值

---

## 📝 修改记录

| 日期 | 修改内容 | 说明 |
|------|----------|------|
| 2025-10-19 | 开启列宽拖动 | 添加 `resizable` 属性 |
| 2025-10-19 | 移除固定 scrollX | 解决滚动条问题 |
| 2025-10-19 | 优化列宽配置 | 支持用户自定义调节 |

---

## 🎯 快速修改位置

### 主表格 resizable（第 695 行）
```html
<NDataTable
  resizable    <!-- 🔧 这里控制主表格拖动 -->
/>
```

### 子表格 resizable（第 257 行）
```typescript
h(NDataTable, {
  resizable: true, // 🔧 这里控制子表格拖动
})
```

### 列宽配置（第 154-231 行）
```typescript
const modelColumns: DataTableColumns<ModelItem> = [
  {
    width: 100, // 🔧 这里调整初始宽度
    minWidth: 80, // 🔧 这里调整最小宽度
  },
]
```
