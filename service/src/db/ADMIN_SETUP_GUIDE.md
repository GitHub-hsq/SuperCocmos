# 管理员权限配置指南

## 问题描述
当你看到以下错误时，说明管理员权限配置有问题：
```
加载模型角色权限失败: ReferenceError: getAllModelsWithRoles is not defined
需要管理员权限
```

## 原因分析
1. **前端问题（已修复）**：`ProviderConfig.vue` 中缺少 `getAllModelsWithRoles` 的导入
2. **后端权限问题**：系统需要 `admin` 角色，但你只创建了 `Pro`、`Ultra`、`free` 三个角色

## 解决方案

### 方案1：使用 SQL 脚本（推荐）

#### 步骤1：登录 Supabase SQL Editor
访问你的 Supabase 项目 → SQL Editor

#### 步骤2：创建 admin 角色
```sql
-- 创建 admin 角色（如果已存在则跳过）
INSERT INTO public.roles (role_name, role_description)
VALUES ('admin', '管理员，拥有所有权限')
ON CONFLICT (role_name) DO NOTHING;
```

#### 步骤3：查看当前用户
```sql
-- 查看所有用户，找到你的管理员账号
SELECT user_id, username, email, clerk_id
FROM public.users
ORDER BY created_at;
```

#### 步骤4：为管理员分配角色
**方法 A：根据邮箱分配（推荐）**
```sql
-- 将 'your-email@example.com' 替换为你的实际邮箱
INSERT INTO public.user_roles (user_id, role_id)
SELECT u.user_id, r.role_id
FROM public.users u
CROSS JOIN public.roles r
WHERE u.email = 'your-email@example.com'  -- ⚠️ 替换为实际邮箱
  AND r.role_name = 'admin'
ON CONFLICT (user_id, role_id) DO NOTHING;
```

**方法 B：根据 user_id 分配**
```sql
-- 将 'YOUR_USER_UUID' 替换为步骤3中找到的 user_id
INSERT INTO public.user_roles (user_id, role_id)
SELECT 'YOUR_USER_UUID', r.role_id
FROM public.roles r
WHERE r.role_name = 'admin'
ON CONFLICT (user_id, role_id) DO NOTHING;
```

#### 步骤5：验证配置
```sql
-- 查看所有用户及其角色
SELECT * FROM public.v_users_with_roles;

-- 或者查看特定用户的角色
SELECT 
  u.user_id,
  u.username,
  u.email,
  array_agg(r.role_name) as roles
FROM public.users u
LEFT JOIN public.user_roles ur ON u.user_id = ur.user_id
LEFT JOIN public.roles r ON ur.role_id = r.role_id
WHERE u.email = 'your-email@example.com'  -- ⚠️ 替换为实际邮箱
GROUP BY u.user_id, u.username, u.email;
```

### 方案2：一键执行脚本
```sql
-- 执行完整的 setup-admin-role.sql 脚本
-- 位置: service/src/db/setup-admin-role.sql
-- ⚠️ 记得先修改脚本中的 'YOUR_USER_EMAIL'
```

## 验证是否成功

### 1. 检查角色列表
```sql
SELECT * FROM public.roles ORDER BY role_id;
```
应该看到 `admin` 角色。

### 2. 检查用户角色
```sql
SELECT * FROM public.v_users_with_roles WHERE email = 'your-email@example.com';
```
应该看到 `roles` 列包含 `{admin}`。

### 3. 重新登录
退出登录，重新登录系统，测试管理员权限功能。

## 常见问题

### Q1: 我有多个管理员账号怎么办？
A: 对每个管理员账号重复步骤4即可。

### Q2: 我想移除某个用户的管理员权限？
```sql
DELETE FROM public.user_roles
WHERE user_id = (SELECT user_id FROM public.users WHERE email = 'user@example.com')
  AND role_id = (SELECT role_id FROM public.roles WHERE role_name = 'admin');
```

### Q3: 角色系统的设计原则？
- `admin`: 管理员，可以访问所有功能和配置
- `Pro` / `Ultra` / `free`: 会员等级，控制模型访问权限
- 一个用户可以同时拥有多个角色

### Q4: 我想让某个用户既是管理员又是 Pro 会员？
```sql
-- 同时分配多个角色
INSERT INTO public.user_roles (user_id, role_id)
SELECT u.user_id, r.role_id
FROM public.users u
CROSS JOIN public.roles r
WHERE u.email = 'user@example.com'
  AND r.role_name IN ('admin', 'Pro')
ON CONFLICT (user_id, role_id) DO NOTHING;
```

## 相关文件
- `service/src/middleware/clerkAuth.ts` - 权限验证逻辑
- `service/src/db/userRoleService.ts` - 用户角色服务
- `service/src/db/schema.sql` - 数据库结构
- `service/src/db/setup-admin-role.sql` - 本指南的 SQL 脚本版本

