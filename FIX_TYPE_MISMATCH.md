# 修复 role_id 类型不匹配问题

## 🐛 问题描述

```
ERROR: 42804: foreign key constraint "model_role_access_role_fk" cannot be implemented
DETAIL: Key columns "role_id" and "role_id" are of incompatible types: uuid and bigint.
```

**原因**:
- `roles` 表的 `role_id` 是 `BIGINT` 类型
- `model_role_access` 表的 `role_id` 错误地使用了 `UUID` 类型
- 外键类型必须完全匹配

## ✅ 解决方案（推荐）

### 方案 1：删除并重建表（如果表是新建的，没有重要数据）

**步骤 1**: 在 Supabase SQL Editor 中执行清理脚本

```sql
-- 删除视图
DROP VIEW IF EXISTS models_with_roles CASCADE;

-- 删除函数
DROP FUNCTION IF EXISTS user_can_access_model(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS get_user_accessible_models(UUID) CASCADE;

-- 删除表
DROP TABLE IF EXISTS model_role_access CASCADE;
```

**或者直接执行**:
```bash
# 在 Supabase SQL Editor 中运行
\i service/src/db/cleanup-model-role-access.sql
```

**步骤 2**: 重新创建表（已修复类型）

```bash
# 在 Supabase SQL Editor 中运行
\i service/src/db/model-role-access-schema.sql
```

### 方案 2：如果已有重要数据，需要迁移

**步骤 1**: 创建临时表保存数据
```sql
-- 备份现有数据（如果有）
CREATE TEMP TABLE model_role_access_backup AS
SELECT * FROM model_role_access;
```

**步骤 2**: 删除旧表并重建
```sql
-- 执行清理脚本
DROP TABLE IF EXISTS model_role_access CASCADE;

-- 重新创建表（正确的类型）
-- 执行 model-role-access-schema.sql
```

**步骤 3**: 恢复数据
```sql
-- 从备份恢复数据
INSERT INTO model_role_access (model_id, role_id)
SELECT model_id, role_id::bigint
FROM model_role_access_backup;
```

## 📋 完整操作步骤（推荐）

### 在 Supabase SQL Editor 中依次执行：

```sql
-- ============================================
-- 步骤 1：清理旧表
-- ============================================

DROP VIEW IF EXISTS models_with_roles CASCADE;
DROP FUNCTION IF EXISTS user_can_access_model(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS get_user_accessible_models(UUID) CASCADE;
DROP TABLE IF EXISTS model_role_access CASCADE;

-- ============================================
-- 步骤 2：现在可以执行 model-role-access-schema.sql
-- ============================================
-- 在 Supabase SQL Editor 中复制粘贴 model-role-access-schema.sql 的内容

-- ============================================
-- 步骤 3：验证表创建成功
-- ============================================

-- 查看表结构
\d model_role_access

-- 应该看到：
-- role_id | bigint | not null

-- ============================================
-- 步骤 4：插入测试数据
-- ============================================

-- 创建测试角色（如果还没有）
INSERT INTO roles (role_name, role_code, description) VALUES
  ('VIP会员', 'vip', 'VIP会员可以访问高级模型'),
  ('高级会员', 'premium', '高级会员可以访问部分高级模型')
ON CONFLICT (role_code) DO NOTHING;

-- 设置测试权限
INSERT INTO model_role_access (model_id, role_id)
SELECT
  m.id,
  r.role_id
FROM models m, roles r
WHERE m.display_name LIKE '%gpt-4o%'
  AND r.role_code IN ('vip', 'admin')
ON CONFLICT (model_id, role_id) DO NOTHING;

-- 验证数据
SELECT
  m.display_name,
  r.role_name,
  mra.created_at
FROM model_role_access mra
JOIN models m ON mra.model_id = m.id
JOIN roles r ON mra.role_id = r.role_id;
```

## ✅ 已修复的文件

1. **`service/src/db/model-role-access-schema.sql`**
   - ✅ `role_id UUID` → `role_id BIGINT`

2. **`service/src/db/modelRoleAccessService.ts`**
   - ✅ `role_id: string` → `role_id: number`
   - ✅ `roleId: string` → `roleId: number`
   - ✅ `roleIds: string[]` → `roleIds: number[]`

3. **`service/src/api/modelRoleController.ts`**
   - ✅ 所有 API 接口的类型定义已更新

## 🔍 验证清单

执行完成后，请验证：

- [ ] 表创建成功（无报错）
- [ ] 外键约束正常工作
- [ ] 可以插入测试数据
- [ ] 函数 `user_can_access_model` 正常工作
- [ ] 视图 `models_with_roles` 可以查询

```sql
-- 测试函数
SELECT user_can_access_model(
  (SELECT user_id FROM users LIMIT 1),
  (SELECT id FROM models LIMIT 1)
);

-- 测试视图
SELECT * FROM models_with_roles LIMIT 5;
```

## 🎯 现在的类型匹配

| 表 | 字段 | 类型 |
|---|---|---|
| roles | role_id | **BIGINT** ✅ |
| user_roles | role_id | **BIGINT** ✅ |
| model_role_access | role_id | **BIGINT** ✅ |

**前端/TypeScript**:
```typescript
interface ModelRoleAccess {
  role_id: number  // BIGINT → number
}

// API 请求
POST /api/model-roles/set
{
  "modelId": "uuid-string",
  "roleIds": [1, 2, 3]  // number 数组
}
```

## 💡 为什么不能直接修改类型？

Supabase/PostgreSQL 不允许直接修改外键关联字段的类型，因为：
1. 可能影响数据完整性
2. 外键约束依赖于类型匹配
3. 可能有触发器或索引依赖

**唯一安全的方式**：删除表并重建。

---

**问题**: role_id 类型不匹配
**解决**: 已修改为 BIGINT
**状态**: ✅ 已修复
**下一步**: 执行清理脚本 + 重新创建表
