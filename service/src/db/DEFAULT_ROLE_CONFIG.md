# 默认角色配置指南

## 当前问题
数据库中的触发器函数 `assign_default_role()` 当前配置为新用户默认分配 `user` 角色，但我们希望新用户默认获得 `free` 角色。

## 解决方案

### 方法 1: 执行更新脚本（推荐）

1. 登录 Supabase SQL Editor
2. 执行 `update-default-role-to-free.sql` 脚本

该脚本会：
- ✅ 确保 `free` 角色存在
- ✅ 修改触发器函数，新用户默认分配 `free` 角色
- ✅ 将现有 `user` 角色的用户迁移到 `free` 角色
- ✅ 删除所有用户的 `user` 角色分配

### 方法 2: 手动执行 SQL（分步骤）

#### 步骤 1: 确保 free 角色存在
```sql
INSERT INTO public.roles (role_name, role_description)
VALUES ('free', '免费用户只能访问基础模型')
ON CONFLICT (role_name) DO NOTHING;
```

#### 步骤 2: 修改触发器函数
```sql
CREATE OR REPLACE FUNCTION assign_default_role()
RETURNS TRIGGER AS $$
BEGIN
  -- 为新用户自动分配 'free' 角色
  INSERT INTO public.user_roles (user_id, role_id)
  SELECT NEW.user_id, role_id
  FROM public.roles
  WHERE role_name = 'free';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

#### 步骤 3: 迁移现有用户（可选）
如果你想将现有的 `user` 角色用户改为 `free`：

```sql
-- 为现有 user 角色用户添加 free 角色
INSERT INTO public.user_roles (user_id, role_id)
SELECT ur.user_id, r_free.role_id
FROM public.user_roles ur
JOIN public.roles r_user ON ur.role_id = r_user.role_id
CROSS JOIN public.roles r_free
WHERE r_user.role_name = 'user'
  AND r_free.role_name = 'free'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- 删除 user 角色分配
DELETE FROM public.user_roles
WHERE role_id = (SELECT role_id FROM public.roles WHERE role_name = 'user');
```

## 验证配置

### 1. 检查触发器函数
```sql
-- 查看触发器函数定义
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'assign_default_role';
```

应该看到函数中使用 `WHERE role_name = 'free'`。

### 2. 检查现有用户角色
```sql
SELECT * FROM public.v_users_with_roles;
```

应该看到用户的 `roles` 列包含 `{free}` 而不是 `{user}`。

### 3. 测试新用户注册
创建一个新用户（通过正常注册流程），然后检查：
```sql
SELECT 
  u.email,
  array_agg(r.role_name) as roles
FROM public.users u
LEFT JOIN public.user_roles ur ON u.user_id = ur.user_id
LEFT JOIN public.roles r ON ur.role_id = r.role_id
WHERE u.email = '新用户的邮箱'
GROUP BY u.email;
```

应该看到新用户自动分配了 `free` 角色。

## 角色体系设计

| 角色 | 说明 | 自动分配 |
|------|------|---------|
| Admin | 超级管理员，拥有所有权限 | ❌ 手动分配 |
| Ultra | 高级会员，20倍配额 | ❌ 升级获得 |
| Pro | 专业会员，高级模型访问 | ❌ 购买获得 |
| free | 免费用户，基础模型访问 | ✅ 注册自动分配 |
| ~~user~~ | ~~普通用户~~（已废弃） | ❌ 不再使用 |

## 后续工作

### 后端检查
检查后端代码中是否有硬编码 `user` 角色的地方：
```bash
grep -r "role_name.*user" service/src
```

### 前端更新
前端角色显示逻辑已更新，移除 `user` 角色的处理。

## 常见问题

### Q1: 如果我想保留 user 角色怎么办？
A: 不建议保留，但如果必须保留，可以修改触发器让新用户同时获得 `user` 和 `free` 两个角色。

### Q2: 已注册的用户会受影响吗？
A: 执行迁移脚本会将现有 `user` 角色用户改为 `free` 角色。如果不执行迁移，现有用户保持不变。

### Q3: 如何给用户升级套餐？
A: 使用 SQL 为用户添加对应角色：
```sql
-- 升级到 Pro
INSERT INTO public.user_roles (user_id, role_id)
SELECT user_id, (SELECT role_id FROM public.roles WHERE role_name = 'Pro')
FROM public.users WHERE email = 'user@example.com'
ON CONFLICT DO NOTHING;
```

## 相关文件
- `service/src/db/schema.sql` - 原始数据库结构（第60-79行）
- `service/src/db/update-default-role-to-free.sql` - 本更新脚本
- `src/views/chat/layout/sider/index.vue` - 前端角色显示逻辑

