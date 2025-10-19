-- ================================================
-- 设置管理员角色
-- ================================================
-- 
-- 说明：
-- 1. 如果 admin 角色不存在，则创建
-- 2. 为指定用户分配 admin 角色
-- 3. 使用前请将 'YOUR_USER_EMAIL' 替换为实际的管理员邮箱
--
-- ================================================

-- 步骤 1: 确保 admin 角色存在
INSERT INTO public.roles (role_name, role_description)
VALUES ('admin', '管理员，拥有所有权限')
ON CONFLICT (role_name) DO NOTHING;

-- 步骤 2: 查看当前所有角色
SELECT role_id, role_name, role_description 
FROM public.roles 
ORDER BY role_id;

-- 步骤 3: 查看当前所有用户
SELECT user_id, username, email, clerk_id
FROM public.users
ORDER BY created_at;

-- 步骤 4: 为管理员用户分配 admin 角色
-- ⚠️ 请将 'YOUR_USER_EMAIL' 替换为实际的管理员邮箱
-- 方法 1: 根据邮箱分配
INSERT INTO public.user_roles (user_id, role_id)
SELECT u.user_id, r.role_id
FROM public.users u
CROSS JOIN public.roles r
WHERE u.email = 'YOUR_USER_EMAIL'  -- ⚠️ 替换为实际邮箱
  AND r.role_name = 'admin'
ON CONFLICT (user_id, role_id) DO NOTHING;

-- 方法 2: 根据 user_id 分配（如果你已知用户的 UUID）
-- INSERT INTO public.user_roles (user_id, role_id)
-- SELECT 'YOUR_USER_UUID', r.role_id
-- FROM public.roles r
-- WHERE r.role_name = 'admin'
-- ON CONFLICT (user_id, role_id) DO NOTHING;

-- 步骤 5: 验证角色分配
-- 查看用户及其角色
SELECT * FROM public.v_users_with_roles;

-- 步骤 6: 检查特定用户的角色
-- ⚠️ 替换为实际邮箱
SELECT 
  u.user_id,
  u.username,
  u.email,
  array_agg(r.role_name) as roles
FROM public.users u
LEFT JOIN public.user_roles ur ON u.user_id = ur.user_id
LEFT JOIN public.roles r ON ur.role_id = r.role_id
WHERE u.email = 'YOUR_USER_EMAIL'  -- ⚠️ 替换为实际邮箱
GROUP BY u.user_id, u.username, u.email;

