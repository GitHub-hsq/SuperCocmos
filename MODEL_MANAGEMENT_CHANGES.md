# 模型管理功能重构说明

## 概述
本次重构将模型管理从前端 localStorage 存储改为后端管理，实现了更安全和可控的模型配置方式。

## 主要变更

### 1. 后端 API (service/src/index.ts)

新增了模型管理的 CRUD API：

- **GET /models** - 获取所有模型列表
- **POST /models/add** - 添加新模型（需要认证）
- **POST /models/update** - 更新模型信息（需要认证）
- **POST /models/delete** - 删除模型（需要认证）

模型数据结构：
```typescript
interface ModelInfo {
  id: string           // 模型ID，用于API调用
  provider: string     // 供应商名称
  displayName: string  // 显示名称
  enabled: boolean     // 是否启用
  createdAt: string    // 创建时间
  updatedAt: string    // 更新时间
}
```

默认包含两个模型：
- gpt-4o (OpenAI)
- gpt-4o-mini (OpenAI)

### 2. 前端 API 调用 (src/api/index.ts)

新增了模型管理的 API 调用函数：
- `fetchModels()` - 获取模型列表
- `addModel(data)` - 添加模型
- `updateModel(data)` - 更新模型
- `deleteModel(id)` - 删除模型

### 3. 模型配置界面 (src/components/common/Setting/ProviderConfig.vue)

完全重写，主要变更：

**移除的功能：**
- ❌ 调用 API 自动获取模型列表的"刷新"按钮
- ❌ 搜索组件（供应商和模型名称搜索）
- ❌ 按供应商分组的表格结构

**新增的功能：**
- ✅ "新增模型"按钮和对话框
- ✅ 单一模型列表表格
- ✅ 编辑模型功能
- ✅ 删除模型功能（带确认）
- ✅ 启用/禁用模型开关

**表格字段：**
1. 模型ID - 用于向LLM发送请求时的model参数
2. 供应商 - 模型提供商（带颜色标签）
3. 显示名称 - 前端展示的名称
4. 启用状态 - 开关按钮
5. 创建时间 - 格式化显示
6. 操作 - 编辑和删除按钮

### 4. Model Store (src/store/modules/model/)

**index.ts 主要变更：**
- ✅ 新增 `loadModelsFromBackend()` 方法从后端API加载模型
- ✅ 移除模型数据的 localStorage 存储
- ✅ 保留工作流配置的本地存储
- ✅ 自动将后端数据转换为前端需要的格式（按供应商分组）

**helper.ts 主要变更：**
- ✅ 移除默认供应商和模型配置
- ✅ 改为从后端动态获取
- ✅ 只保存工作流配置到 localStorage

### 5. 工作流模型配置 (src/components/common/Setting/WorkflowModel.vue)

- ✅ 模型选项只显示已启用的模型（`enabled: true`）
- ✅ 从 ModelStore 获取模型列表

### 6. 聊天界面模型选择器 (src/components/common/ModelSelector/index.vue)

完全重写，主要变更：
- ❌ 移除从 localStorage 读取模型列表
- ✅ 从 ModelStore 获取已启用的模型
- ✅ 选择模型后保存到 ModelStore
- ✅ 自动按供应商分组展示

### 7. 应用初始化 (src/App.vue)

- ✅ 在 `onMounted` 时调用 `modelStore.loadModelsFromBackend()` 加载模型列表

### 8. 类型定义 (src/typings/model.d.ts)

- ✅ 在 `ModelInfo` 接口中添加 `enabled?: boolean` 字段

## 数据流程

1. **应用启动**
   - `App.vue` 挂载时调用 `modelStore.loadModelsFromBackend()`
   - 从后端 `/models` API 获取模型列表
   - 将数据转换为前端格式并存储在 Pinia Store 中

2. **模型选择**
   - 用户在聊天界面点击模型选择器
   - 从 ModelStore 获取已启用的模型列表
   - 用户选择模型后，更新 `modelStore.currentModelId`

3. **发送聊天消息**
   - 从 `modelStore.currentModel` 获取当前选中的模型
   - 将模型 ID 作为 `options.model` 参数发送到后端

4. **工作流配置**
   - 工作流配置界面只显示已启用的模型
   - 配置保存在本地 localStorage（与模型列表分离）

5. **模型管理**
   - 管理员在设置界面添加/编辑/删除模型
   - 所有操作直接调用后端 API
   - 操作成功后重新加载模型列表

## 安全性改进

1. **后端验证**
   - 所有模型管理操作（添加、更新、删除）都需要通过 `auth` 中间件认证
   - 防止未授权用户修改模型配置

2. **数据不可篡改**
   - 模型列表存储在后端，前端无法直接修改
   - 用户无法通过浏览器开发工具篡改模型数据

3. **权限控制**
   - 后续可以根据管理员权限控制模型管理界面的显示
   - 普通用户只能查看和使用模型，不能修改配置

## 注意事项

1. **数据持久化**
   - 当前模型数据存储在服务器内存中，重启后会丢失
   - 建议后续改为数据库存储（如 SQLite、PostgreSQL）

2. **兼容性**
   - 旧的 localStorage 模型数据不会自动迁移
   - 首次使用时需要在设置中手动添加模型

3. **默认模型**
   - 系统默认提供 gpt-4o 和 gpt-4o-mini 两个模型
   - 建议根据实际需求修改默认模型列表

## 后续优化建议

1. **数据库集成**
   ```typescript
   // 建议使用 SQLite 或 PostgreSQL
   // 表结构：
   // CREATE TABLE models (
   //   id VARCHAR(100) PRIMARY KEY,
   //   provider VARCHAR(50) NOT NULL,
   //   display_name VARCHAR(100) NOT NULL,
   //   enabled BOOLEAN DEFAULT TRUE,
   //   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   //   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   // );
   ```

2. **批量操作**
   - 添加批量启用/禁用功能
   - 添加批量删除功能

3. **模型导入/导出**
   - 支持从文件导入模型配置
   - 支持导出模型配置为 JSON

4. **权限管理**
   - 添加用户角色系统
   - 只有管理员才能看到"模型配置"标签页

5. **模型验证**
   - 添加模型ID格式验证
   - 添加供应商名称验证
   - 检查模型是否真实可用

## 测试建议

1. **功能测试**
   - 测试添加、编辑、删除模型
   - 测试启用/禁用模型
   - 测试聊天时使用不同模型

2. **边界测试**
   - 测试添加重复的模型ID
   - 测试删除正在使用的模型
   - 测试禁用所有模型的情况

3. **安全测试**
   - 测试未认证用户是否能访问管理API
   - 测试前端是否能篡改模型数据

