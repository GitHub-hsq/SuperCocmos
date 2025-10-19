# API 重构总结 - 从环境变量到数据库配置

## 📋 重构目标

1. ✅ 移除硬编码的 API Key 和 Base URL（从环境变量迁移到数据库）
2. ✅ 实现基于角色的权限控制（管理员可见敏感信息，普通用户只能看到模型列表）
3. ✅ 支持多供应商相同模型（通过 `display_name` 区分）
4. ✅ 前端传递模型标识，后端从数据库查询配置

## 🔄 核心改动

### 1. 数据库配置（已存在，无需迁移）

**表结构**（service/src/db/provider-model-schema.sql）:
- `providers` 表：存储供应商信息（name, base_url, api_key）
- `models` 表：存储模型信息（model_id, display_name, enabled, provider_id）

**关键字段**:
- `display_name`：全局唯一，用于区分不同供应商的同一模型
  - 格式：`供应商名_模型ID`（如：`OpenAI_gpt-4o`, `Mirror_gpt-4o`）
- `model_id`：实际的模型 ID（可重复，不同供应商可以有相同的 model_id）

### 2. 新增查询函数

**文件**: `service/src/db/providerService.ts`

```typescript
// 根据 display_name 查询模型及其 Provider 信息
export async function getModelWithProviderByDisplayName(displayName: string): Promise<ModelWithProvider | null>

// 根据 model_id 查询所有匹配的模型（返回多个结果）
export async function getModelsWithProviderByModelId(modelId: string): Promise<ModelWithProvider[]>
```

**返回类型**:
```typescript
interface ModelWithProvider extends Model {
  provider: Provider // 包含 base_url 和 api_key
}
```

### 3. `/chat-process` 接口重构

**文件**: `service/src/index.ts`

**旧流程**:
```
前端 → 传递 model_id → 后端读取环境变量 → 调用 API
```

**新流程**:
```
前端 → 传递 display_name → 后端查询数据库 → 获取 Provider 配置 → 调用 API
```

**代码变更**:
```typescript
// 前端传递的 model 现在是 display_name
const { model } = req.body // 如：OpenAI_gpt-4o

// 从数据库查询配置
const modelConfig = await getModelWithProviderByDisplayName(model)

// 获取 Provider 信息
const baseURL = modelConfig.provider.base_url
const apiKey = modelConfig.provider.api_key
const actualModelId = modelConfig.model_id

// 传递给 ChatGPT API
await chatReplyProcess({
  model: actualModelId,
  baseURL,
  apiKey,
  // ...
})
```

### 4. `/models` 接口权限控制

**文件**: `service/src/index.ts`

**管理员**:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "OpenAI",
      "base_url": "https://api.openai.com/v1",
      "api_key": "sk-xxx",
      "models": [...]
    }
  ]
}
```

**普通用户**:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "OpenAI",
      "models": [
        {
          "id": "uuid",
          "model_id": "gpt-4o",
          "display_name": "OpenAI_gpt-4o",
          "enabled": true
        }
      ]
    }
  ]
}
```

**关键逻辑**:
```typescript
router.get('/models', clerkAuth, requireAuth, async (req, res) => {
  const isAdmin = await userHasRole(user.user_id, 'admin')

  if (isAdmin) {
    // 返回完整信息（包括 API Key 和 Base URL）
    res.send({ data: providersWithModels })
  }
  else {
    // 隐藏敏感信息
    const sanitizedData = providersWithModels.map(provider => ({
      id: provider.id,
      name: provider.name,
      models: provider.models,
      // 不返回 base_url 和 api_key
    }))
    res.send({ data: sanitizedData })
  }
})
```

### 5. ChatGPT API 支持直接传递配置

**文件**: `service/src/chatgpt/types.ts` 和 `service/src/chatgpt/index.ts`

**新增参数**:
```typescript
interface RequestOptions {
  // ...
  baseURL?: string // 直接传递 API Base URL
  apiKey?: string // 直接传递 API Key
}
```

**优先级**:
1. **直接传递** (`baseURL` + `apiKey`)
2. 通过 `providerId` 查询数据库（兼容旧方式）
3. 使用环境变量（降级）

## 🗑️ 已移除的代码

### 1. 环境变量依赖
- ❌ `process.env.OPENAI_API_KEY`
- ❌ `process.env.OPENAI_API_BASE_URL`
- ❌ `process.env.OPENAI_API_MODEL`
- ❌ `process.env.KRIORA_API_KEY`
- ❌ `process.env.KRIORA_API_URL`

### 2. 旧接口
- ❌ `POST /models/list` - 获取模型列表（从环境变量）
- ❌ `POST /usage` - 获取 API 使用量（从环境变量）
- ❌ `POST /models/add` - 添加模型（内存存储）
- ❌ `POST /models/update` - 更新模型（内存存储）
- ❌ `POST /models/delete` - 删除模型（内存存储）
- ❌ `POST /models/test` - 测试模型（从环境变量）

### 3. 内存存储
- ❌ `modelsData` 数组（内存中的模型数据）
- ❌ `getModelConfig()` 函数（从内存查询）

## 📦 新接口（通过 `/api` 路由）

现在所有模型和供应商管理都通过 Supabase：

**供应商管理**:
- `GET /api/providers` - 获取所有供应商
- `POST /api/providers` - 创建供应商（需要管理员权限）
- `PUT /api/providers/:id` - 更新供应商（需要管理员权限）
- `DELETE /api/providers/:id` - 删除供应商（需要管理员权限）

**模型管理**:
- `POST /api/models` - 创建模型（需要管理员权限）
- `PUT /api/models/:id` - 更新模型（需要管理员权限）
- `DELETE /api/models/:id` - 删除模型（需要管理员权限）
- `PATCH /api/models/:id/toggle` - 切换模型启用状态（需要管理员权限）

**详见**: `service/src/api/routes.ts` 和 `service/src/api/providerController.ts`

## 🔐 安全性提升

1. **API Key 隔离**
   - 普通用户无法看到 API Key
   - 只有管理员可以查看和管理

2. **基于角色的访问控制**
   - 使用 Clerk + Supabase 用户角色系统
   - RLS（Row Level Security）策略保护数据

3. **日志脱敏**
   - API Key 在日志中只显示后4位

## 🎯 使用示例

### 前端发送聊天请求

```typescript
// 前端
const response = await fetch('/api/chat-process', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${clerkToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prompt: 'Hello!',
    model: 'OpenAI_gpt-4o', // 使用 display_name
    temperature: 0.7,
    maxTokens: 2000
  })
})
```

### 后端处理流程

```typescript
// 后端 (service/src/index.ts)
router.post('/chat-process', clerkAuth, requireAuth, async (req, res) => {
  const { model } = req.body // 'OpenAI_gpt-4o'

  // 1. 查询数据库
  const modelConfig = await getModelWithProviderByDisplayName(model)
  // modelConfig.model_id = 'gpt-4o'
  // modelConfig.provider.base_url = 'https://api.openai.com/v1'
  // modelConfig.provider.api_key = 'sk-xxx'

  // 2. 调用 ChatGPT API
  await chatReplyProcess({
    model: modelConfig.model_id,
    baseURL: modelConfig.provider.base_url,
    apiKey: modelConfig.provider.api_key,
    // ...
  })
})
```

## ✅ 验证清单

- [x] `/chat-process` 接口从数据库读取配置
- [x] `/models` 接口根据角色返回不同数据
- [x] 移除所有硬编码的环境变量依赖
- [x] 创建数据库查询辅助函数
- [x] 支持通过 `display_name` 区分相同模型
- [x] 日志中脱敏敏感信息

## 🚀 下一步

1. **前端更新**
   - 修改模型选择组件，使用 `display_name`
   - 更新设置页面，支持管理员管理供应商和模型

2. **数据迁移**
   - 将现有的模型配置导入到 Supabase
   - 参考 `provider-model-schema.sql` 中的示例数据

3. **测试**
   - 测试管理员和普通用户的不同权限
   - 测试多供应商相同模型的场景
   - 测试聊天功能是否正常

## 📝 注意事项

1. **环境变量保留**
   - `service/.env` 中的 OpenAI 相关配置已移除
   - 保留了 Supabase, Clerk, Redis 配置

2. **向后兼容**
   - `chatReplyProcess` 仍支持 `providerId` 参数（旧方式）
   - 优先使用新的 `baseURL` + `apiKey` 方式

3. **性能优化**
   - 数据库查询会增加轻微延迟
   - 考虑添加 Redis 缓存（未来优化）

---

**重构完成日期**: 2025-01-20
**影响范围**: 聊天功能、模型管理、权限控制
**状态**: ✅ 完成
