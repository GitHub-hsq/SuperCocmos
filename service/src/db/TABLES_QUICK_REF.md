# 数据库表结构参考

> 📅 最后验证：已通过 ✅
> 📊 表：8 个 | 视图：5 个 | 触发器：7 个

## 📋 表关系

```
users (1:1) user_configs
  ├─ default_model_id → models
  └─ default_provider_id → providers

users (1:N) conversations
  ├─ model_id → models
  ├─ provider_id → providers
  └─ (1:N) messages

users (N:N) roles (通过 user_roles)

providers (1:N) models
```

---

## 1️⃣ users - 用户表

| 字段 | 类型 | 说明 | 约束 |
|------|------|------|------|
| user_id | VARCHAR(50) | 用户唯一标识 | PRIMARY KEY |
| username | VARCHAR(50) | 用户名 | NOT NULL, UNIQUE |
| password | VARCHAR(255) | 密码（加密） | NOT NULL |
| email | VARCHAR(100) | 电子邮箱 | UNIQUE |
| phone | VARCHAR(20) | 手机号码 | - |
| status | INTEGER | 账户状态(0/1) | DEFAULT 1 |
| login_method | VARCHAR(20) | 登录方式 | DEFAULT 'email' |
| clerk_id | VARCHAR(255) | Clerk ID | UNIQUE |
| avatar_url | VARCHAR(500) | 头像URL | - |
| provider | VARCHAR(50) | 认证提供商 | - |
| created_at | TIMESTAMPTZ | 创建时间 | DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | 更新时间 | DEFAULT NOW() |
| last_login_at | TIMESTAMPTZ | 最后登录 | - |
| department_id | VARCHAR(50) | 部门ID | - |

**索引：** email, username, status, clerk_id

---

## 2️⃣ providers - 供应商表

| 字段 | 类型 | 说明 | 约束 |
|------|------|------|------|
| id | UUID | 供应商ID | PRIMARY KEY |
| name | VARCHAR(100) | 供应商名称 | NOT NULL, UNIQUE |
| base_url | VARCHAR(500) | API基础URL | NOT NULL |
| api_key | TEXT | API密钥 | NOT NULL |
| created_at | TIMESTAMPTZ | 创建时间 | DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | 更新时间 | DEFAULT NOW() |
| deleted_at | TIMESTAMPTZ | 软删除时间 | - |

**索引：** name, deleted_at

**删除方式：** 软删除

---

## 3️⃣ models - 模型表

| 字段 | 类型 | 说明 | 约束 |
|------|------|------|------|
| id | UUID | 模型ID | PRIMARY KEY |
| model_id | VARCHAR(200) | 模型标识符 | NOT NULL |
| display_name | VARCHAR(200) | 显示名称 | NOT NULL, UNIQUE |
| enabled | BOOLEAN | 是否启用 | DEFAULT true |
| provider_id | UUID | 所属供应商 | FK → providers.id |
| created_at | TIMESTAMPTZ | 创建时间 | DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | 更新时间 | DEFAULT NOW() |
| deleted_at | TIMESTAMPTZ | 软删除时间 | - |

**索引：** provider_id, enabled, model_id, deleted_at

**唯一约束：** (provider_id, model_id), display_name

**删除方式：** 软删除

---

## 4️⃣ roles - 角色表

| 字段 | 类型 | 说明 | 约束 |
|------|------|------|------|
| role_id | BIGSERIAL | 角色ID | PRIMARY KEY |
| role_name | VARCHAR(50) | 角色名称 | NOT NULL, UNIQUE |
| role_description | TEXT | 角色描述 | - |
| created_at | TIMESTAMPTZ | 创建时间 | DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | 更新时间 | DEFAULT NOW() |

**默认值：** 'admin', 'user'

---

## 5️⃣ user_roles - 用户角色关联表

| 字段 | 类型 | 说明 | 约束 |
|------|------|------|------|
| user_role_id | BIGSERIAL | 关联ID | PRIMARY KEY |
| user_id | VARCHAR(50) | 用户ID | FK → users.user_id |
| role_id | BIGINT | 角色ID | FK → roles.role_id |
| created_at | TIMESTAMPTZ | 创建时间 | DEFAULT NOW() |

**索引：** user_id, role_id

**唯一约束：** (user_id, role_id)

---

## 6️⃣ user_configs - 用户配置表

| 字段 | 类型 | 说明 | 约束 |
|------|------|------|------|
| id | UUID | 配置ID | PRIMARY KEY |
| user_id | VARCHAR(50) | 用户ID | FK → users.user_id, UNIQUE |
| default_model_id | UUID | 默认模型 | FK → models.id |
| default_provider_id | UUID | 默认供应商 | FK → providers.id |
| temperature | DECIMAL(3,2) | 温度参数 | DEFAULT 0.70, CHECK(0-2) |
| top_p | DECIMAL(3,2) | Top-P参数 | DEFAULT 1.00, CHECK(0-1) |
| max_tokens | INTEGER | 最大token | DEFAULT 2048, >0 |
| system_prompt | TEXT | 系统提示词 | DEFAULT '你是...' |
| stream_enabled | BOOLEAN | 流式输出 | DEFAULT true |
| created_at | TIMESTAMPTZ | 创建时间 | DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | 更新时间 | DEFAULT NOW() |

**索引：** user_id, default_model_id, default_provider_id

**关系：** 一个用户一个配置（1:1）

---

## 7️⃣ conversations - 对话会话表

| 字段 | 类型 | 说明 | 约束 |
|------|------|------|------|
| id | UUID | 对话ID | PRIMARY KEY |
| user_id | VARCHAR(50) | 用户ID | FK → users.user_id |
| title | VARCHAR(500) | 对话标题 | DEFAULT '新对话' |
| model_id | UUID | 使用的模型 | FK → models.id |
| provider_id | UUID | 使用的供应商 | FK → providers.id |
| temperature | DECIMAL(3,2) | 温度参数 | DEFAULT 0.70, CHECK(0-2) |
| top_p | DECIMAL(3,2) | Top-P参数 | DEFAULT 1.00, CHECK(0-1) |
| max_tokens | INTEGER | 最大token | DEFAULT 2048, >0 |
| system_prompt | TEXT | 系统提示词 | - |
| total_tokens | INTEGER | 累计token | DEFAULT 0 |
| message_count | INTEGER | 消息总数 | DEFAULT 0 |
| created_at | TIMESTAMPTZ | 创建时间 | DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | 更新时间 | DEFAULT NOW() |

**索引：** user_id, model_id, provider_id, updated_at(DESC)

**删除方式：** 硬删除（级联删除 messages）

---

## 8️⃣ messages - 聊天消息表

| 字段 | 类型 | 说明 | 约束 |
|------|------|------|------|
| id | UUID | 消息ID | PRIMARY KEY |
| conversation_id | UUID | 所属对话 | FK → conversations.id |
| role | VARCHAR(20) | 角色 | NOT NULL, CHECK(user/assistant/system) |
| content | TEXT | 消息内容 | NOT NULL |
| tokens | INTEGER | token数量 | DEFAULT 0 |
| model_info | JSONB | 模型元数据 | - |
| created_at | TIMESTAMPTZ | 创建时间 | DEFAULT NOW() |

**索引：** conversation_id, created_at, role

**删除方式：** 硬删除

---

## 🔍 常用查询

```sql
-- 获取用户对话列表
SELECT * FROM user_conversations_view WHERE user_id = 'xxx';

-- 获取对话详情
SELECT * FROM conversation_details_view WHERE conversation_id = 'xxx';

-- 获取用户配置
SELECT * FROM user_configs WHERE user_id = 'xxx';

-- 获取供应商及模型
SELECT * FROM providers_with_models;

-- 获取用户角色
SELECT * FROM v_users_with_roles WHERE user_id = 'xxx';
```

---

## 🔐 权限说明

| 表 | 普通用户 | 管理员 |
|----|---------|--------|
| **providers** | 只读 | 全部 |
| **models** | 只读 | 全部 |
| **user_configs** | 仅自己 | - |
| **conversations** | 仅自己 | - |
| **messages** | 仅自己的对话 | - |

---

## ⚠️ 重要说明

- ✅ **user_id 自动生成：** 使用 UUID 类型，创建用户时自动生成
- ✅ **自动分配角色：** 新用户自动获得 'user' 角色
- 📝 **软删除：** providers 和 models 有 `deleted_at` 字段
- 🗑️ **硬删除：** users、conversations、messages 直接删除
- ⚡ **级联删除：** 删除用户会自动删除其配置、对话和消息

---

**验证状态：** ✅ 已通过
**最后更新：** 2025-10-16
