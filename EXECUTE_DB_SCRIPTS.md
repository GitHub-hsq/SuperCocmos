# 数据库脚本执行指南

## ✅ 所有问题已修复

以下问题已全部修复：
1. ✅ `role_id` 类型不匹配 (UUID → BIGINT)
2. ✅ `role_code` 字段不存在 (改用 `role_name`)
3. ✅ 所有 TypeScript 类型定义已更新
4. ✅ Linter 检查通过

## 🚀 在 Supabase SQL Editor 中执行

### 步骤 1：清理旧表（如果之前创建过）

```sql
-- 删除视图
DROP VIEW IF EXISTS models_with_roles CASCADE;

-- 删除函数
DROP FUNCTION IF EXISTS user_can_access_model(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS get_user_accessible_models(UUID) CASCADE;

-- 删除表
DROP TABLE IF EXISTS model_role_access CASCADE;
```

### 步骤 2：创建新表

**复制粘贴 `service/src/db/model-role-access-schema.sql` 的全部内容到 Supabase SQL Editor**

或者选择性执行以下核心部分：

```sql
-- ============================================
-- 1. 创建表
-- ============================================

CREATE TABLE IF NOT EXISTS model_role_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL,
  role_id BIGINT NOT NULL,  -- ✅ BIGINT 类型
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT model_role_access_model_fk
    FOREIGN KEY (model_id)
    REFERENCES models(id)
    ON DELETE CASCADE,

  CONSTRAINT model_role_access_role_fk
    FOREIGN KEY (role_id)
    REFERENCES roles(role_id)
    ON DELETE CASCADE,

  CONSTRAINT model_role_access_unique UNIQUE(model_id, role_id)
);

-- ============================================
-- 2. 创建索引
-- ============================================

CREATE INDEX IF NOT EXISTS idx_model_role_access_model_id ON model_role_access(model_id);
CREATE INDEX IF NOT EXISTS idx_model_role_access_role_id ON model_role_access(role_id);

-- ============================================
-- 3. 创建视图
-- ============================================

CREATE OR REPLACE VIEW models_with_roles AS
SELECT
  m.id AS model_id,
  m.model_id AS model_identifier,
  m.display_name,
  m.enabled,
  m.provider_id,
  m.created_at,
  m.updated_at,
  COALESCE(
    json_agg(
      json_build_object(
        'roleId', r.role_id,
        'roleName', r.role_name,
        'roleDescription', r.role_description
      )
      ORDER BY r.role_name
    ) FILTER (WHERE r.role_id IS NOT NULL),
    '[]'::json
  ) AS accessible_roles
FROM models m
LEFT JOIN model_role_access mra ON m.id = mra.model_id
LEFT JOIN roles r ON mra.role_id = r.role_id
WHERE m.deleted_at IS NULL
GROUP BY m.id, m.model_id, m.display_name, m.enabled, m.provider_id, m.created_at, m.updated_at;

-- ============================================
-- 4. 创建函数
-- ============================================

-- 检查用户是否可以访问模型
CREATE OR REPLACE FUNCTION user_can_access_model(
  p_user_id UUID,
  p_model_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  user_roles BIGINT[];  -- ✅ BIGINT 数组
  model_allowed_roles BIGINT[];  -- ✅ BIGINT 数组
  has_permission BOOLEAN;
BEGIN
  SELECT ARRAY_AGG(role_id) INTO user_roles
  FROM user_roles
  WHERE user_id = p_user_id;

  IF user_roles IS NULL OR array_length(user_roles, 1) = 0 THEN
    RETURN FALSE;
  END IF;

  SELECT ARRAY_AGG(role_id) INTO model_allowed_roles
  FROM model_role_access
  WHERE model_id = p_model_id;

  IF model_allowed_roles IS NULL OR array_length(model_allowed_roles, 1) = 0 THEN
    RETURN TRUE;
  END IF;

  SELECT user_roles && model_allowed_roles INTO has_permission;

  RETURN COALESCE(has_permission, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 获取用户可访问的所有模型
CREATE OR REPLACE FUNCTION get_user_accessible_models(p_user_id UUID)
RETURNS TABLE (
  model_id UUID,
  model_identifier VARCHAR(200),
  display_name VARCHAR(200),
  enabled BOOLEAN,
  provider_id UUID,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    m.id,
    m.model_id,
    m.display_name,
    m.enabled,
    m.provider_id,
    m.created_at,
    m.updated_at
  FROM models m
  LEFT JOIN model_role_access mra ON m.id = mra.model_id
  WHERE m.deleted_at IS NULL
    AND m.enabled = TRUE
    AND (
      NOT EXISTS (SELECT 1 FROM model_role_access WHERE model_id = m.id)
      OR
      mra.role_id IN (
        SELECT role_id FROM user_roles WHERE user_id = p_user_id
      )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. 启用 RLS
-- ============================================

ALTER TABLE model_role_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read model role access"
  ON model_role_access FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow admins to manage model role access"
  ON model_role_access FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.role_id
      JOIN users u ON ur.user_id = u.user_id
      WHERE u.clerk_id = auth.uid()::text
        AND r.role_name IN ('admin', '管理员')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.role_id
      JOIN users u ON ur.user_id = u.user_id
      WHERE u.clerk_id = auth.uid()::text
        AND r.role_name IN ('admin', '管理员')
    )
  );
```

### 步骤 3：创建示例角色（可选）

```sql
INSERT INTO roles (role_name, role_description) VALUES
  ('vip', 'VIP会员可以访问高级模型'),
  ('premium', '高级会员可以访问部分高级模型'),
  ('free', '免费用户只能访问基础模型')
ON CONFLICT (role_name) DO NOTHING;
```

### 步骤 4：设置模型权限（可选）

```sql
-- GPT-4o 仅限 admin 和 vip
INSERT INTO model_role_access (model_id, role_id)
SELECT m.id, r.role_id
FROM models m, roles r
WHERE m.display_name = 'OpenAI_gpt-4o'
  AND r.role_name IN ('admin', 'vip')
ON CONFLICT (model_id, role_id) DO NOTHING;

-- GPT-4o-mini 允许 admin, vip, premium
INSERT INTO model_role_access (model_id, role_id)
SELECT m.id, r.role_id
FROM models m, roles r
WHERE m.display_name = 'OpenAI_gpt-4o-mini'
  AND r.role_name IN ('admin', 'vip', 'premium')
ON CONFLICT (model_id, role_id) DO NOTHING;

-- GPT-3.5-turbo 对所有人开放（不插入任何记录）
```

### 步骤 5：验证

```sql
-- 1. 检查表是否创建成功
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'model_role_access';

-- 应该看到：
-- model_role_access | id         | uuid
-- model_role_access | model_id   | uuid
-- model_role_access | role_id    | bigint  ✅
-- model_role_access | created_at | timestamp with time zone

-- 2. 检查视图是否可用
SELECT * FROM models_with_roles LIMIT 3;

-- 3. 测试函数
SELECT user_can_access_model(
  (SELECT user_id FROM users LIMIT 1),
  (SELECT id FROM models LIMIT 1)
);

-- 4. 查看已设置的权限
SELECT
  m.display_name,
  r.role_name,
  mra.created_at
FROM model_role_access mra
JOIN models m ON mra.model_id = m.id
JOIN roles r ON mra.role_id = r.role_id
ORDER BY m.display_name, r.role_name;
```

## 🎯 关键修复点

### 修复 1：role_id 类型

```sql
-- ❌ 错误
role_id UUID NOT NULL

-- ✅ 正确
role_id BIGINT NOT NULL
```

### 修复 2：role_code 字段

```sql
-- ❌ 错误（roles 表中没有 role_code）
WHERE r.role_code IN ('admin', 'vip')

-- ✅ 正确（使用 role_name）
WHERE r.role_name IN ('admin', 'vip')
```

### 修复 3：TypeScript 类型

```typescript
// ❌ 错误
role_id: string
roleIds: string[]

// ✅ 正确
role_id: number  // BIGINT → number
roleIds: number[]
```

## 📋 检查清单

执行完成后，请验证：

- [ ] 表 `model_role_access` 创建成功
- [ ] 外键约束无报错
- [ ] 视图 `models_with_roles` 可以查询
- [ ] 函数 `user_can_access_model` 返回结果
- [ ] 函数 `get_user_accessible_models` 返回结果
- [ ] 可以插入测试数据
- [ ] 查询示例正常运行

## 💡 快速验证命令

```sql
-- 一键验证所有功能
DO $$
DECLARE
  test_user_id UUID;
  test_model_id UUID;
  can_access BOOLEAN;
BEGIN
  -- 获取测试数据
  SELECT user_id INTO test_user_id FROM users LIMIT 1;
  SELECT id INTO test_model_id FROM models LIMIT 1;

  -- 测试权限函数
  SELECT user_can_access_model(test_user_id, test_model_id) INTO can_access;

  RAISE NOTICE '✅ 表创建成功';
  RAISE NOTICE '✅ 函数正常工作';
  RAISE NOTICE '✅ 用户权限检查结果: %', can_access;
END $$;
```

## 🆘 如果还有问题

### 问题：外键约束仍然失败

**检查 roles 表结构**:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'roles';
```

**确认 role_id 是 BIGINT**:
```sql
\d roles
```

应该显示：
```
role_id | bigint | not null
```

### 问题：函数创建失败

**删除所有旧函数**:
```sql
DROP FUNCTION IF EXISTS user_can_access_model CASCADE;
DROP FUNCTION IF EXISTS get_user_accessible_models CASCADE;
```

然后重新创建。

---

**状态**: ✅ 所有问题已修复
**下一步**: 执行清理脚本 → 执行创建脚本 → 测试验证
**预计时间**: 2-3 分钟
