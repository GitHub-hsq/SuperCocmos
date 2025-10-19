# 🚀 快速配置：新用户默认 Free 角色

## 现状
- ❌ 当前数据库触发器：新用户默认分配 `user` 角色
- ✅ 期望配置：新用户默认分配 `free` 角色

## 快速执行（5分钟搞定）

### 第一步：登录 Supabase SQL Editor
访问你的 Supabase 项目 → SQL Editor

### 第二步：复制粘贴执行以下 SQL

```sql
-- 🔧 一键配置脚本：将默认角色改为 free

-- 1. 确保 free 角色存在
INSERT INTO public.roles (role_name, role_description)
VALUES ('free', '免费用户只能访问基础模型')
ON CONFLICT (role_name) DO NOTHING;

-- 2. 修改触发器函数（这是关键！）
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

-- 3. 迁移现有用户（可选）
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

-- 4. 验证配置
SELECT * FROM public.v_users_with_roles;
```

### 第三步：验证配置成功

执行以下 SQL 检查触发器：

```sql
-- 查看触发器函数定义
SELECT pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'assign_default_role';
```

应该看到 `WHERE role_name = 'free'`（而不是 'user'）。

## ✅ 完成后的效果

### 1. 新用户注册
- ✅ 自动分配 `free` 角色
- ✅ 前端显示"免费用户"蓝色标签

### 2. 现有用户
- ✅ 原来的 `user` 角色用户已迁移为 `free` 角色
- ✅ 管理员、Pro、Ultra 会员不受影响

### 3. 角色体系
| 角色 | 显示名称 | 标签颜色 | 如何获得 |
|------|---------|---------|---------|
| Admin | 超级管理员 | 🔴 红色 | 手动分配 |
| Ultra | Ultra会员 | 🟠 橙色 | 购买/升级 |
| Pro | Pro会员 | 🟢 绿色 | 购买/升级 |
| Free | 免费用户 | 🔵 蓝色 | **注册自动获得** |

## 测试新用户注册

### 1. 创建测试账号
通过前端正常注册一个新账号

### 2. 检查角色分配
```sql
SELECT 
  u.email,
  array_agg(r.role_name) as roles
FROM public.users u
LEFT JOIN public.user_roles ur ON u.user_id = ur.user_id
LEFT JOIN public.roles r ON ur.role_id = r.role_id
WHERE u.email = '测试账号的邮箱'
GROUP BY u.email;
```

### 3. 验证前端显示
登录测试账号，检查：
- ✅ 侧边栏底部显示"免费用户"蓝色标签
- ✅ 可以正常使用免费模型

## 给用户升级套餐

### 升级到 Pro
```sql
INSERT INTO public.user_roles (user_id, role_id)
SELECT 
  u.user_id, 
  r.role_id
FROM public.users u
CROSS JOIN public.roles r
WHERE u.email = 'user@example.com'
  AND r.role_name = 'Pro'
ON CONFLICT DO NOTHING;
```

### 升级到 Ultra
```sql
INSERT INTO public.user_roles (user_id, role_id)
SELECT 
  u.user_id, 
  r.role_id
FROM public.users u
CROSS JOIN public.roles r
WHERE u.email = 'user@example.com'
  AND r.role_name = 'Ultra'
ON CONFLICT DO NOTHING;
```

### 降级回 Free
```sql
-- 删除 Pro/Ultra 角色
DELETE FROM public.user_roles
WHERE user_id = (SELECT user_id FROM public.users WHERE email = 'user@example.com')
  AND role_id IN (
    SELECT role_id FROM public.roles WHERE role_name IN ('Pro', 'Ultra')
  );
```

## 常见问题

### Q: 执行脚本后，现有用户需要重新登录吗？
A: 不需要，但刷新页面后会看到新的角色标签。

### Q: 我可以删除 user 角色吗？
A: 可以，但建议先完成迁移并验证没有问题后再删除：
```sql
DELETE FROM public.roles WHERE role_name = 'user';
```

### Q: 如果我想让新用户默认有多个角色怎么办？
A: 修改触发器函数，添加多个 INSERT 语句，或使用 IN 条件：
```sql
CREATE OR REPLACE FUNCTION assign_default_role()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role_id)
  SELECT NEW.user_id, role_id
  FROM public.roles
  WHERE role_name IN ('free', 'user'); -- 多个角色
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## 相关文件
- ✅ `update-default-role-to-free.sql` - 完整更新脚本
- ✅ `DEFAULT_ROLE_CONFIG.md` - 详细配置文档
- ✅ `src/views/chat/layout/sider/index.vue` - 前端角色显示（已更新）
- ✅ `service/src/middleware/clerkAuth.ts` - 后端权限验证（已更新）

## 完成检查清单

- [ ] 执行 SQL 脚本修改触发器
- [ ] 验证触发器函数已更新
- [ ] 迁移现有 user 角色用户
- [ ] 测试新用户注册
- [ ] 前端显示正确的角色标签
- [ ] 删除不需要的 user 角色（可选）

---

**需要帮助？** 查看 `DEFAULT_ROLE_CONFIG.md` 获取更详细的说明。

