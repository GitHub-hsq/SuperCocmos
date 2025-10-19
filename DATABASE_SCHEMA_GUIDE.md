# Supabase 数据库表结构和权限系统指南

## 📋 目录

1. [表结构总览](#表结构总览)
2. [核心表详解](#核心表详解)
3. [权限系统](#权限系统)
4. [SQL 脚本执行顺序](#sql-脚本执行顺序)
5. [API Key 安全性](#api-key-安全性)
6. [常见操作](#常见操作)

---

## 表结构总览

```
┌─────────────────────────────────────────────────────────┐
│                   数据库表关系图                          │
└─────────────────────────────────────────────────────────┘

┌──────────┐
│  users   │ (用户表)
└────┬─────┘
     │
     │ 1:N
     ├─────> ┌────────────┐
     │       │ user_roles │ (用户-角色关联)
     │       └─────┬──────┘
     │             │
     │             │ N:1
     │             v
     │       ┌───────────┐
     │       │  roles    │ (角色表)
     │       └─────┬─────┘
     │             │
     │             │ N:M
     │             v
     │       ┌────────────────────┐
     │       │ model_role_access  │ (模型-角色权限)
     │       └─────┬──────────────┘
     │             │
     │             │ N:1
     │             v
     │       ┌───────────┐
     │       │  models   │ (模型表)
     │       └─────┬─────┘
     │             │
     │             │ N:1
     │             v
     │       ┌────────────┐
     │       │ providers  │ (供应商表)
     │       └────────────┘
     │
     └─────> ┌──────────────┐
             │ user_configs │ (用户配置)
             └──────────────┘
```

---

## 核心表详解

### 1. `providers` - 供应商表

**作用**: 存储 AI 模型供应商的 API 配置

```sql
CREATE TABLE providers (
  id UUID PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,  -- 供应商名称（OpenAI, Anthropic等）
  base_url VARCHAR(500) NOT NULL,     -- API Base URL
  api_key TEXT NOT NULL,              -- API Key（敏感信息）
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  deleted_at TIMESTAMP                -- 软删除
);
```

**示例数据**:
```sql
INSERT INTO providers (name, base_url, api_key) VALUES
  ('OpenAI', 'https://api.openai.com/v1', 'sk-xxx'),
  ('Anthropic', 'https://api.anthropic.com/v1', 'sk-ant-xxx'),
  ('OpenAI_Mirror', 'https://api.mirror.com/v1', 'sk-mirror-xxx');
```

**关键点**:
- ✅ `name` 全局唯一
- ✅ `api_key` 永远不传递给前端（除非管理员）
- ✅ 支持软删除

### 2. `models` - 模型表

**作用**: 存储具体的 AI 模型配置

```sql
CREATE TABLE models (
  id UUID PRIMARY KEY,
  model_id VARCHAR(200) NOT NULL,      -- 实际的模型ID（gpt-4o）
  display_name VARCHAR(200) UNIQUE NOT NULL, -- 显示名称（OpenAI_gpt-4o）
  enabled BOOLEAN DEFAULT true,
  provider_id UUID REFERENCES providers(id),
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  deleted_at TIMESTAMP,
  UNIQUE(provider_id, model_id)        -- 同一供应商下模型ID唯一
);
```

**示例数据**:
```sql
INSERT INTO models (model_id, display_name, enabled, provider_id) VALUES
  -- OpenAI 官方
  ('gpt-4o', 'OpenAI_gpt-4o', true, 
   (SELECT id FROM providers WHERE name = 'OpenAI')),
  ('gpt-4o-mini', 'OpenAI_gpt-4o-mini', true,
   (SELECT id FROM providers WHERE name = 'OpenAI')),
  
  -- 镜像站（相同 model_id，不同 display_name）
  ('gpt-4o', 'Mirror_gpt-4o', true,
   (SELECT id FROM providers WHERE name = 'OpenAI_Mirror'));
```

**关键字段说明**:
- `model_id`: 实际调用 API 时使用的模型ID
- `display_name`: 前端显示和标识用，全局唯一
  - 格式：`供应商名_模型ID`
  - 用于区分不同供应商的相同模型
- `enabled`: 是否启用（false时用户无法看到）

**为什么需要 display_name？**
```
OpenAI_gpt-4o  → 官方 OpenAI API → https://api.openai.com/v1
Mirror_gpt-4o  → 镜像站 API → https://api.mirror.com/v1
↓                ↓                  ↓
都是 gpt-4o      不同的 Provider    不同的 API Key
```

### 3. `roles` - 角色表

**作用**: 定义系统中的角色类型

```sql
CREATE TABLE roles (
  role_id UUID PRIMARY KEY,
  role_name VARCHAR(50) NOT NULL,
  role_code VARCHAR(50) UNIQUE NOT NULL,  -- 角色代码（admin, vip, free）
  description TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**会员等级示例**:
```sql
INSERT INTO roles (role_name, role_code, description) VALUES
  ('管理员', 'admin', '系统管理员，拥有所有权限'),
  ('VIP会员', 'vip', '高级会员，可以访问高级模型'),
  ('高级会员', 'premium', '高级会员，可以访问部分高级模型'),
  ('免费用户', 'free', '免费用户，只能访问基础模型');
```

### 4. `user_roles` - 用户角色关联表

**作用**: 将用户和角色关联（多对多）

```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(user_id),
  role_id UUID REFERENCES roles(role_id),
  created_at TIMESTAMP,
  UNIQUE(user_id, role_id)
);
```

**示例**:
```sql
-- 给用户分配 VIP 角色
INSERT INTO user_roles (user_id, role_id)
VALUES (
  'user-uuid',
  (SELECT role_id FROM roles WHERE role_code = 'vip')
);
```

### 5. `model_role_access` - 模型角色权限表 🆕

**作用**: 控制哪些角色可以访问哪些模型（多对多）

```sql
CREATE TABLE model_role_access (
  id UUID PRIMARY KEY,
  model_id UUID REFERENCES models(id),
  role_id UUID REFERENCES roles(role_id),
  created_at TIMESTAMP,
  UNIQUE(model_id, role_id)
);
```

**权限逻辑**:
- ✅ **有记录** = 仅限指定角色访问
- ✅ **无记录** = 对所有人开放

**示例**:
```sql
-- GPT-4o 仅限 VIP 和管理员
INSERT INTO model_role_access (model_id, role_id)
SELECT m.id, r.role_id
FROM models m, roles r
WHERE m.display_name = 'OpenAI_gpt-4o'
  AND r.role_code IN ('admin', 'vip');

-- GPT-3.5-turbo 对所有人开放（不插入记录）
```

---

## 权限系统

### 权限检查流程

```
用户请求
    ↓
① 获取用户的所有角色
    ↓
② 查询模型的访问权限设置
    ↓
③ 判断逻辑：
    - 模型无权限限制 → 允许
    - 用户是管理员 → 允许
    - 用户角色在模型允许的角色列表中 → 允许
    - 否则 → 拒绝
```

### 数据库函数

#### 1. `user_can_access_model(user_id, model_id)` 

检查用户是否可以访问模型

```sql
SELECT user_can_access_model(
  'user-uuid',
  'model-uuid'
); -- 返回 true/false
```

**逻辑**:
1. 获取用户的所有角色ID
2. 获取模型允许的角色ID
3. 如果模型无限制 → `true`
4. 如果用户角色和模型角色有交集 → `true`
5. 否则 → `false`

#### 2. `get_user_accessible_models(user_id)`

获取用户可访问的所有模型

```sql
SELECT * FROM get_user_accessible_models('user-uuid');
```

**返回**:
```
model_id | model_identifier | display_name         | enabled
---------|------------------|---------------------|--------
uuid-1   | gpt-3.5-turbo    | OpenAI_gpt-3.5      | true
uuid-2   | gpt-4o-mini      | OpenAI_gpt-4o-mini  | true
```

### 视图

#### `models_with_roles`

查询模型及其可访问角色列表

```sql
SELECT * FROM models_with_roles;
```

**返回**:
```json
{
  "model_id": "uuid",
  "display_name": "OpenAI_gpt-4o",
  "accessible_roles": [
    { "roleId": "uuid", "roleName": "管理员", "roleCode": "admin" },
    { "roleId": "uuid", "roleName": "VIP会员", "roleCode": "vip" }
  ]
}
```

---

## SQL 脚本执行顺序

按照以下顺序执行 SQL 脚本：

```bash
# 1. 用户和角色基础表
service/src/db/00-init-users.sql

# 2. 供应商和模型表
service/src/db/provider-model-schema.sql

# 3. 模型-角色权限表 🆕
service/src/db/model-role-access-schema.sql

# 4. 用户配置表（可选）
service/src/db/user-sesion-config.sql
```

---

## API Key 安全性

### ✅ 安全措施

1. **前端隔离**
   ```typescript
   // 普通用户看到的数据（无 API Key）
   {
     "id": "uuid",
     "name": "OpenAI",
     "models": [...]
     // 没有 base_url 和 api_key
   }
   
   // 管理员看到的数据（有 API Key）
   {
     "id": "uuid",
     "name": "OpenAI",
     "base_url": "https://api.openai.com/v1",
     "api_key": "sk-xxx",
     "models": [...]
   }
   ```

2. **后端验证**
   ```typescript
   // 聊天时从数据库查询配置
   const modelConfig = await getModelWithProviderByDisplayName(displayName)
   
   // API Key 只在后端使用，不传递给前端
   await chatReplyProcess({
     baseURL: modelConfig.provider.base_url,
     apiKey: modelConfig.provider.api_key,
   })
   ```

3. **日志脱敏**
   ```typescript
   console.log({
     apiKey: '***' + apiKey.slice(-4)  // 只显示后4位
   })
   ```

4. **Supabase RLS**
   ```sql
   -- 只有管理员可以修改 providers 表
   CREATE POLICY "Allow admins to update providers"
     ON providers FOR UPDATE
     USING (user_is_admin());
   ```

### ❌ API Key 永远不传递给前端

**正确流程**:
```
前端 → display_name (OpenAI_gpt-4o)
       ↓
后端 → 查询数据库 → 获取 base_url + api_key
       ↓
后端 → 调用 OpenAI API
       ↓
前端 ← 返回响应（不包含 API Key）
```

**错误流程** ❌:
```
前端 ← base_url + api_key  // 永远不要这样做！
       ↓
前端 → 调用 OpenAI API
```

---

## 常见操作

### 1. 添加新的供应商和模型

```sql
-- 1. 添加供应商
INSERT INTO providers (name, base_url, api_key) VALUES
  ('DeepSeek', 'https://api.deepseek.com/v1', 'sk-your-key');

-- 2. 添加模型
INSERT INTO models (model_id, display_name, enabled, provider_id) VALUES
  ('deepseek-chat', 'DeepSeek_chat', true,
   (SELECT id FROM providers WHERE name = 'DeepSeek'));
```

### 2. 设置模型访问权限

**场景：GPT-4o 仅限 VIP 会员**
```sql
-- 方法 1：逐个插入
INSERT INTO model_role_access (model_id, role_id) VALUES
  ((SELECT id FROM models WHERE display_name = 'OpenAI_gpt-4o'),
   (SELECT role_id FROM roles WHERE role_code = 'vip'));

-- 方法 2：批量插入
INSERT INTO model_role_access (model_id, role_id)
SELECT m.id, r.role_id
FROM models m, roles r
WHERE m.display_name = 'OpenAI_gpt-4o'
  AND r.role_code IN ('admin', 'vip');
```

**场景：模型对所有人开放**
```sql
-- 删除所有权限记录即可
DELETE FROM model_role_access 
WHERE model_id = (SELECT id FROM models WHERE display_name = 'OpenAI_gpt-3.5');
```

### 3. 给用户分配角色

```sql
-- 给用户分配 VIP 角色
INSERT INTO user_roles (user_id, role_id) VALUES
  ('user-uuid', (SELECT role_id FROM roles WHERE role_code = 'vip'));

-- 移除用户的某个角色
DELETE FROM user_roles 
WHERE user_id = 'user-uuid' 
  AND role_id = (SELECT role_id FROM roles WHERE role_code = 'free');
```

### 4. 查询用户可访问的模型

```sql
-- 使用函数
SELECT * FROM get_user_accessible_models('user-uuid');

-- 或手动查询
SELECT DISTINCT m.*
FROM models m
LEFT JOIN model_role_access mra ON m.id = mra.model_id
WHERE m.deleted_at IS NULL
  AND m.enabled = TRUE
  AND (
    -- 模型无权限限制
    NOT EXISTS (SELECT 1 FROM model_role_access WHERE model_id = m.id)
    OR
    -- 或用户拥有权限
    mra.role_id IN (SELECT role_id FROM user_roles WHERE user_id = 'user-uuid')
  );
```

### 5. 检查模型是否公开

```sql
-- 公开模型（没有权限限制）
SELECT m.* 
FROM models m
WHERE NOT EXISTS (
  SELECT 1 FROM model_role_access WHERE model_id = m.id
);
```

---

## API 使用示例

### 管理员 API（仅 admin 角色）

#### 1. 获取所有模型及其访问角色
```
GET /api/model-roles/all
```

#### 2. 为模型设置访问角色
```
POST /api/model-roles/set
{
  "modelId": "model-uuid",
  "roleIds": ["vip-role-uuid", "premium-role-uuid"]
}
```

#### 3. 清空模型权限（对所有人开放）
```
POST /api/model-roles/set
{
  "modelId": "model-uuid",
  "roleIds": []
}
```

### 用户 API

#### 获取模型列表（自动过滤）
```
GET /models
```

**免费用户看到**:
```json
{
  "data": [
    {
      "name": "OpenAI",
      "models": [
        { "display_name": "OpenAI_gpt-3.5-turbo" }
      ]
    }
  ]
}
```

**VIP 用户看到**:
```json
{
  "data": [
    {
      "name": "OpenAI",
      "models": [
        { "display_name": "OpenAI_gpt-3.5-turbo" },
        { "display_name": "OpenAI_gpt-4o-mini" },
        { "display_name": "OpenAI_gpt-4o" }
      ]
    }
  ]
}
```

---

## 会员制度配置示例

### 方案 1：三级会员制

```sql
-- 1. 创建角色
INSERT INTO roles (role_name, role_code, description) VALUES
  ('免费用户', 'free', '基础模型'),
  ('高级会员', 'premium', '高级模型'),
  ('VIP会员', 'vip', '所有模型');

-- 2. 配置模型权限
-- GPT-3.5: 所有人（不设置）
-- GPT-4o-mini: Premium 以上
INSERT INTO model_role_access (model_id, role_id)
SELECT m.id, r.role_id FROM models m, roles r
WHERE m.display_name = 'OpenAI_gpt-4o-mini'
  AND r.role_code IN ('premium', 'vip', 'admin');

-- GPT-4o: 仅 VIP
INSERT INTO model_role_access (model_id, role_id)
SELECT m.id, r.role_id FROM models m, roles r
WHERE m.display_name = 'OpenAI_gpt-4o'
  AND r.role_code IN ('vip', 'admin');
```

**结果**:
| 模型 | Free | Premium | VIP | Admin |
|------|------|---------|-----|-------|
| GPT-3.5-turbo | ✅ | ✅ | ✅ | ✅ |
| GPT-4o-mini | ❌ | ✅ | ✅ | ✅ |
| GPT-4o | ❌ | ❌ | ✅ | ✅ |

### 方案 2：按供应商分级

```sql
-- 免费用户：只能用镜像站
-- VIP 用户：可以用官方 API

-- 镜像站模型对所有人开放
-- 官方模型仅限 VIP

INSERT INTO model_role_access (model_id, role_id)
SELECT m.id, r.role_id FROM models m, roles r
WHERE m.display_name LIKE 'OpenAI_%'  -- 官方
  AND r.role_code IN ('vip', 'admin');
  
-- Mirror_% 模型不设置权限（对所有人开放）
```

---

## 前端集成要点

### 1. 模型选择器

```vue
<script setup>
const models = ref([])

// 获取用户可访问的模型
async function loadModels() {
  const response = await fetch('/models', {
    headers: { 'Authorization': `Bearer ${clerkToken}` }
  })
  const { data } = await response.json()
  models.value = data
}

// 选择模型时使用 display_name
function selectModel(displayName) {
  selectedModel.value = displayName  // 如：'OpenAI_gpt-4o'
}
</script>

<template>
  <select v-model="selectedModel">
    <optgroup v-for="provider in models" :label="provider.name">
      <option 
        v-for="model in provider.models" 
        :value="model.display_name"
      >
        {{ model.display_name }}
      </option>
    </optgroup>
  </select>
</template>
```

### 2. 发送聊天请求

```typescript
const response = await fetch('/api/chat-process', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${clerkToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prompt: message,
    model: 'OpenAI_gpt-4o',  // 使用 display_name
    temperature: 0.7
  })
})

// 后端会自动：
// 1. 查询 display_name 对应的 model_id 和 provider
// 2. 检查用户权限
// 3. 使用正确的 base_url 和 api_key 调用 API
```

### 3. 处理权限错误

```typescript
const data = await response.json()

if (data.error?.message.includes('没有权限')) {
  // 提示用户升级会员
  showUpgradeDialog()
}
```

---

## 维护建议

### 1. 定期检查孤立数据

```sql
-- 查找没有 Provider 的模型（应该不存在）
SELECT * FROM models 
WHERE provider_id NOT IN (SELECT id FROM providers);

-- 查找没有用户的角色分配
SELECT * FROM user_roles 
WHERE user_id NOT IN (SELECT user_id FROM users);
```

### 2. 软删除清理

```sql
-- 永久删除超过30天的软删除记录
DELETE FROM providers 
WHERE deleted_at < NOW() - INTERVAL '30 days';

DELETE FROM models 
WHERE deleted_at < NOW() - INTERVAL '30 days';
```

### 3. 权限审计

```sql
-- 查询所有受限模型
SELECT 
  m.display_name,
  COUNT(mra.role_id) AS role_count,
  STRING_AGG(r.role_name, ', ') AS allowed_roles
FROM models m
JOIN model_role_access mra ON m.id = mra.model_id
JOIN roles r ON mra.role_id = r.role_id
GROUP BY m.id, m.display_name;
```

---

## 🆘 常见问题

### Q1: 为什么需要 display_name？
**答**: 允许多个供应商提供相同的模型（如 gpt-4o），通过 `display_name` 区分：
- `OpenAI_gpt-4o` → 官方 API
- `Mirror_gpt-4o` → 镜像站 API

### Q2: 供应商信息需要修改吗？
**答**: 不需要。供应商表只存储 API 配置，权限控制在模型层面。

### Q3: 如何让模型对所有人开放？
**答**: 不在 `model_role_access` 表中插入任何记录即可。

### Q4: 用户升级会员后需要重新登录吗？
**答**: 不需要。下次请求时会自动查询最新的角色权限。但如果前端有缓存，可能需要刷新页面。

### Q5: API Key 会传递给前端吗？
**答**: 绝对不会！只有管理员通过特定接口才能看到，普通用户永远无法获取。

---

**文档版本**: 1.0  
**最后更新**: 2025-01-20  
**相关文件**: 
- `service/src/db/model-role-access-schema.sql`
- `service/src/db/modelRoleAccessService.ts`
- `service/src/api/modelRoleController.ts`

