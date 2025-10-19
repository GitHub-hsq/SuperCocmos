# 模型-角色访问控制使用指南

## 📋 概述

实现了基于角色的模型访问控制系统，不同会员等级可以访问不同的模型。

### 核心特性

1. ✅ **多对多关系**：一个模型可以被多个角色访问，一个角色可以访问多个模型
2. ✅ **灵活权限**：模型可以对所有人开放，也可以限定特定角色
3. ✅ **自动过滤**：普通用户只能看到和使用有权限的模型
4. ✅ **管理员全权**：管理员可以访问所有模型
5. ✅ **安全隔离**：API Key 永远不传递给前端

## 🗂️ 数据库设计

### 新增表：`model_role_access`

```sql
CREATE TABLE model_role_access (
  id UUID PRIMARY KEY,
  model_id UUID REFERENCES models(id),
  role_id UUID REFERENCES roles(role_id),
  created_at TIMESTAMP,
  UNIQUE(model_id, role_id)
);
```

**字段说明**:
- `model_id`: 模型ID（外键关联 models 表）
- `role_id`: 角色ID（外键关联 roles 表）
- 组合唯一：同一个模型和角色的组合只能存在一次

### 相关视图和函数

1. **`models_with_roles`** 视图：查询模型及其可访问角色
2. **`user_can_access_model(user_id, model_id)`** 函数：检查用户是否可访问模型
3. **`get_user_accessible_models(user_id)`** 函数：获取用户可访问的所有模型

## 🚀 快速开始

### 1. 执行数据库脚本

```bash
# 在 Supabase SQL Editor 中执行
psql -f service/src/db/model-role-access-schema.sql
```

### 2. 创建会员角色

```sql
INSERT INTO roles (role_name, role_code, description) VALUES
  ('VIP会员', 'vip', 'VIP会员可以访问高级模型'),
  ('高级会员', 'premium', '高级会员可以访问部分高级模型'),
  ('免费用户', 'free', '免费用户只能访问基础模型');
```

### 3. 设置模型权限

**方式一：通过 SQL**
```sql
-- GPT-4o 仅限 VIP 和管理员
INSERT INTO model_role_access (model_id, role_id)
SELECT
  m.id,
  r.role_id
FROM models m
CROSS JOIN roles r
WHERE m.display_name = 'OpenAI_gpt-4o'
  AND r.role_code IN ('admin', 'vip');

-- GPT-4o-mini 允许 VIP、Premium 和管理员
INSERT INTO model_role_access (model_id, role_id)
SELECT
  m.id,
  r.role_id
FROM models m
CROSS JOIN roles r
WHERE m.display_name = 'OpenAI_gpt-4o-mini'
  AND r.role_code IN ('admin', 'vip', 'premium');

-- GPT-3.5-turbo 对所有人开放（不插入任何记录）
```

**方式二：通过 API**
```typescript
// 设置模型的访问角色（覆盖现有设置）
POST /api/model-roles/set
{
  "modelId": "model-uuid",
  "roleIds": ["role-uuid-1", "role-uuid-2"]
}

// 对所有人开放（清空权限）
POST /api/model-roles/set
{
  "modelId": "model-uuid",
  "roleIds": []
}
```

## 📡 API 接口

### 管理员接口（需要 admin 角色）

#### 1. 获取所有模型及其角色
```
GET /api/model-roles/all
```

**响应**:
```json
{
  "status": "Success",
  "data": {
    "models": [
      {
        "id": "uuid",
        "model_id": "gpt-4o",
        "display_name": "OpenAI_gpt-4o",
        "enabled": true,
        "accessible_roles": [
          {
            "roleId": "uuid",
            "roleName": "管理员",
            "roleCode": "admin"
          },
          {
            "roleId": "uuid",
            "roleName": "VIP会员",
            "roleCode": "vip"
          }
        ]
      }
    ]
  }
}
```

#### 2. 获取指定模型的角色
```
GET /api/model-roles/:modelId
```

**响应**:
```json
{
  "status": "Success",
  "data": {
    "modelId": "uuid",
    "roleIds": ["role-uuid-1", "role-uuid-2"],
    "isPublic": false
  }
}
```

#### 3. 为模型分配角色
```
POST /api/model-roles/assign
Content-Type: application/json

{
  "modelId": "model-uuid",
  "roleId": "role-uuid"
}
```

#### 4. 移除模型的角色
```
POST /api/model-roles/remove
Content-Type: application/json

{
  "modelId": "model-uuid",
  "roleId": "role-uuid"
}
```

#### 5. 批量设置模型角色
```
POST /api/model-roles/set
Content-Type: application/json

{
  "modelId": "model-uuid",
  "roleIds": ["role-uuid-1", "role-uuid-2"]
}
```

### 用户接口

#### 获取模型列表（自动过滤）
```
GET /models
```

**管理员返回**（所有模型 + 完整配置）:
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

**普通用户返回**（仅可访问的模型 + 无敏感信息）:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "OpenAI",
      "models": [
        {
          "id": "uuid",
          "model_id": "gpt-4o-mini",
          "display_name": "OpenAI_gpt-4o-mini",
          "enabled": true
        }
      ]
    }
  ]
}
```

## 🔐 权限检查流程

### 1. 用户请求模型列表

```
用户登录 → 查询用户角色 → 获取角色可访问的模型 → 返回过滤后的列表
```

### 2. 用户发送聊天请求

```
用户发送请求 → 查询模型配置 → 检查用户权限 → 允许/拒绝
```

**权限检查逻辑**:
```typescript
// 1. 查询模型配置
const modelConfig = await getModelWithProviderByDisplayName(displayName)

// 2. 检查用户权限
const hasAccess = await userCanAccessModel(user.user_id, modelConfig.id)

// 3. 拒绝无权限的请求
if (!hasAccess) {
  return { error: '您没有权限使用该模型，请升级会员' }
}
```

## 🎯 使用场景

### 场景 1：创建 VIP 专属模型

1. **创建模型**（如：OpenAI_gpt-4o）
2. **设置权限**：
   ```sql
   INSERT INTO model_role_access (model_id, role_id)
   VALUES ('model-uuid', (SELECT role_id FROM roles WHERE role_code = 'vip'));
   ```
3. **结果**：
   - VIP 用户可以看到并使用该模型
   - 免费用户无法看到该模型
   - 管理员可以访问所有模型

### 场景 2：免费试用模型

1. **创建模型**（如：OpenAI_gpt-3.5-turbo）
2. **不设置权限**（不插入任何记录到 `model_role_access`）
3. **结果**：所有用户都可以访问

### 场景 3：分级会员制度

**假设会员等级**:
- 免费用户：只能用 GPT-3.5-turbo
- 普通会员：GPT-3.5-turbo + GPT-4o-mini
- VIP 会员：所有模型

**配置**:
```sql
-- GPT-3.5-turbo：对所有人开放（不插入记录）

-- GPT-4o-mini：普通会员以上
INSERT INTO model_role_access (model_id, role_id)
SELECT m.id, r.role_id
FROM models m, roles r
WHERE m.display_name = 'OpenAI_gpt-4o-mini'
  AND r.role_code IN ('premium', 'vip', 'admin');

-- GPT-4o：仅 VIP
INSERT INTO model_role_access (model_id, role_id)
SELECT m.id, r.role_id
FROM models m, roles r
WHERE m.display_name = 'OpenAI_gpt-4o'
  AND r.role_code IN ('vip', 'admin');
```

## 📊 查询示例

### 1. 查询用户可访问的模型
```sql
SELECT * FROM get_user_accessible_models('user-uuid');
```

### 2. 检查用户是否可以访问模型
```sql
SELECT user_can_access_model('user-uuid', 'model-uuid');
```

### 3. 查询模型的访问角色
```sql
SELECT
  m.display_name,
  r.role_name,
  r.role_code
FROM models m
JOIN model_role_access mra ON m.id = mra.model_id
JOIN roles r ON mra.role_id = r.role_id
WHERE m.id = 'model-uuid';
```

### 4. 查询没有权限限制的模型（公开模型）
```sql
SELECT m.*
FROM models m
WHERE m.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM model_role_access WHERE model_id = m.id
  );
```

### 5. 查询某个角色可以访问的模型
```sql
SELECT
  m.display_name,
  m.model_id,
  m.enabled
FROM models m
LEFT JOIN model_role_access mra ON m.id = mra.model_id
WHERE m.deleted_at IS NULL
  AND m.enabled = TRUE
  AND (
    -- 没有权限限制（公开）
    NOT EXISTS (SELECT 1 FROM model_role_access WHERE model_id = m.id)
    OR
    -- 或该角色有权限
    mra.role_id = 'role-uuid'
  );
```

## 🔧 前端集成

### 1. 获取模型列表
```typescript
// 前端代码
const response = await fetch('/models', {
  headers: {
    Authorization: `Bearer ${clerkToken}`
  }
})

const { data } = await response.json()
// data 自动包含用户有权限访问的模型
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
    prompt: 'Hello!',
    model: 'OpenAI_gpt-4o', // display_name
    temperature: 0.7
  })
})

// 如果用户无权限，会返回错误
// { error: { message: '您没有权限使用该模型，请升级会员' } }
```

### 3. 管理模型权限（管理员）
```typescript
// 设置模型为 VIP 专属
await fetch('/api/model-roles/set', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    modelId: 'model-uuid',
    roleIds: [vipRoleId, adminRoleId]
  })
})
```

## 🛡️ 安全性

### API Key 保护

1. ✅ **前端隔离**：普通用户无法看到 `base_url` 和 `api_key`
2. ✅ **管理员可见**：管理员可以看到完整配置
3. ✅ **日志脱敏**：日志中只显示 API Key 后4位

### 权限验证

1. ✅ **双重验证**：
   - 获取模型列表时过滤
   - 聊天请求时再次验证
2. ✅ **数据库级别 RLS**：Supabase Row Level Security 保护
3. ✅ **函数级权限**：使用 `SECURITY DEFINER` 确保权限一致

## 📝 注意事项

### 1. 不设置权限 = 公开模型
如果一个模型在 `model_role_access` 表中没有任何记录，表示该模型对所有人开放。

### 2. 管理员总是有权限
管理员可以访问所有模型，无论是否在 `model_role_access` 中设置。

### 3. 用户可以有多个角色
一个用户可以同时拥有多个角色（如：user + premium），只要有任意一个角色有权限即可访问。

### 4. 供应商信息不受影响
供应商（providers）表不需要修改，权限控制只在模型层面。

### 5. 删除角色会级联删除权限
如果删除一个角色，该角色在 `model_role_access` 中的所有记录会被级联删除（ON DELETE CASCADE）。

## 🚀 扩展建议

### 1. 使用额度限制
可以在 `model_role_access` 表中增加字段：
```sql
ALTER TABLE model_role_access ADD COLUMN usage_limit INTEGER;
ALTER TABLE model_role_access ADD COLUMN daily_limit INTEGER;
```

### 2. 时间限制
```sql
ALTER TABLE model_role_access ADD COLUMN expires_at TIMESTAMP;
```

### 3. 优先级
```sql
ALTER TABLE model_role_access ADD COLUMN priority INTEGER DEFAULT 0;
```

## 🔍 故障排查

### 问题 1：用户看不到任何模型
**原因**：用户没有角色或所有模型都设置了权限
**解决**：
```sql
-- 检查用户角色
SELECT * FROM user_roles WHERE user_id = 'user-uuid';

-- 检查是否有公开模型
SELECT * FROM models m
WHERE NOT EXISTS (SELECT 1 FROM model_role_access WHERE model_id = m.id);
```

### 问题 2：权限设置后不生效
**原因**：缓存或前端未刷新
**解决**：
1. 清除前端缓存
2. 重新登录获取最新权限
3. 检查数据库中的记录是否正确

### 问题 3：管理员也无法访问某些模型
**原因**：管理员判断逻辑错误
**解决**：
```sql
-- 检查用户是否真的是管理员
SELECT u.email, r.role_name
FROM users u
JOIN user_roles ur ON u.user_id = ur.user_id
JOIN roles r ON ur.role_id = r.role_id
WHERE u.user_id = 'user-uuid';
```

---

**文档版本**: 1.0
**最后更新**: 2025-01-20
**相关文档**: API_REFACTOR_SUMMARY.md, LOGIN_FLOW.md
