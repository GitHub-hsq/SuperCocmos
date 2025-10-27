-- ============================================
-- 删除用户及相关数据（保留指定用户）
-- ============================================
-- 说明：删除除指定用户外的所有用户及其相关数据
-- 保留用户ID: 8b1c2198-f76b-443f-b8bc-4c71f999f691
-- 
-- ⚠️ 警告：此操作不可逆！请在执行前确认：
-- 1. 已备份数据库
-- 2. 确认要保留的用户ID正确
-- 3. 在测试环境验证过此脚本
-- ============================================

BEGIN;

-- 设置保留的用户ID（便于修改）
DO $$
DECLARE
  keep_user_id UUID := '8b1c2198-f76b-443f-b8bc-4c71f999f691';
  deleted_users_count INTEGER;
  deleted_conversations_count INTEGER;
  deleted_messages_count INTEGER;
  deleted_configs_count INTEGER;
  deleted_user_roles_count INTEGER;
BEGIN
  
  -- ============================================
  -- 步骤 1: 显示删除前的统计信息
  -- ============================================
  RAISE NOTICE '============================================';
  RAISE NOTICE '📊 删除前数据统计';
  RAISE NOTICE '============================================';
  
  -- 用户统计
  SELECT COUNT(*) INTO deleted_users_count 
  FROM public.users 
  WHERE user_id != keep_user_id;
  
  RAISE NOTICE '🔹 总用户数: %', (SELECT COUNT(*) FROM public.users);
  RAISE NOTICE '🔹 保留用户数: 1';
  RAISE NOTICE '🔹 将删除用户数: %', deleted_users_count;
  
  -- 对话统计
  SELECT COUNT(*) INTO deleted_conversations_count 
  FROM public.conversations 
  WHERE user_id != keep_user_id;
  
  RAISE NOTICE '🔹 将删除对话数: %', deleted_conversations_count;
  
  -- 消息统计
  SELECT COUNT(*) INTO deleted_messages_count 
  FROM public.messages m
  WHERE EXISTS (
    SELECT 1 FROM public.conversations c 
    WHERE c.id = m.conversation_id 
    AND c.user_id != keep_user_id
  );
  
  RAISE NOTICE '🔹 将删除消息数: %', deleted_messages_count;
  
  -- 配置统计
  SELECT COUNT(*) INTO deleted_configs_count 
  FROM public.user_configs 
  WHERE user_id != keep_user_id;
  
  RAISE NOTICE '🔹 将删除配置数: %', deleted_configs_count;
  
  -- 用户角色统计
  SELECT COUNT(*) INTO deleted_user_roles_count 
  FROM public.user_roles 
  WHERE user_id != keep_user_id;
  
  RAISE NOTICE '🔹 将删除用户角色关联数: %', deleted_user_roles_count;
  RAISE NOTICE '';
  
  -- ============================================
  -- 步骤 2: 执行删除（按依赖关系逆序）
  -- ============================================
  RAISE NOTICE '============================================';
  RAISE NOTICE '🗑️  开始删除数据...';
  RAISE NOTICE '============================================';
  
  -- 2.1 删除消息（messages 依赖 conversations）
  RAISE NOTICE '正在删除消息...';
  DELETE FROM public.messages
  WHERE conversation_id IN (
    SELECT id FROM public.conversations 
    WHERE user_id != keep_user_id
  );
  RAISE NOTICE '✅ 已删除 % 条消息', deleted_messages_count;
  
  -- 2.2 删除对话（conversations 依赖 users）
  RAISE NOTICE '正在删除对话...';
  DELETE FROM public.conversations
  WHERE user_id != keep_user_id;
  RAISE NOTICE '✅ 已删除 % 个对话', deleted_conversations_count;
  
  -- 2.3 删除用户配置（user_configs 依赖 users）
  RAISE NOTICE '正在删除用户配置...';
  DELETE FROM public.user_configs
  WHERE user_id != keep_user_id;
  RAISE NOTICE '✅ 已删除 % 条用户配置', deleted_configs_count;
  
  -- 2.4 删除用户角色关联（user_roles 依赖 users）
  RAISE NOTICE '正在删除用户角色关联...';
  DELETE FROM public.user_roles
  WHERE user_id != keep_user_id;
  RAISE NOTICE '✅ 已删除 % 条用户角色关联', deleted_user_roles_count;
  
  -- 2.5 删除用户（主表）
  RAISE NOTICE '正在删除用户...';
  DELETE FROM public.users
  WHERE user_id != keep_user_id;
  RAISE NOTICE '✅ 已删除 % 个用户', deleted_users_count;
  
  -- ============================================
  -- 步骤 3: 显示删除后的统计信息
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '📊 删除后数据统计';
  RAISE NOTICE '============================================';
  
  RAISE NOTICE '🔹 剩余用户数: %', (SELECT COUNT(*) FROM public.users);
  RAISE NOTICE '🔹 剩余对话数: %', (SELECT COUNT(*) FROM public.conversations);
  RAISE NOTICE '🔹 剩余消息数: %', (SELECT COUNT(*) FROM public.messages);
  RAISE NOTICE '🔹 剩余配置数: %', (SELECT COUNT(*) FROM public.user_configs);
  RAISE NOTICE '🔹 剩余用户角色数: %', (SELECT COUNT(*) FROM public.user_roles);
  RAISE NOTICE '';
  
  -- ============================================
  -- 步骤 4: 验证保留的用户
  -- ============================================
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ 保留的用户信息';
  RAISE NOTICE '============================================';
  
  -- 显示保留用户的信息
  PERFORM user_id, username, email FROM public.users WHERE user_id = keep_user_id;
  
  IF FOUND THEN
    RAISE NOTICE '用户ID: %', keep_user_id;
    RAISE NOTICE '查看详细信息: SELECT * FROM public.users WHERE user_id = ''%'';', keep_user_id;
  ELSE
    RAISE WARNING '⚠️  警告：未找到要保留的用户！';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ 数据清理完成！';
  RAISE NOTICE '============================================';
  
END $$;

COMMIT;

-- ============================================
-- 验证查询（执行后可运行这些查询来验证结果）
-- ============================================

-- 查看剩余用户
-- SELECT user_id, username, email, created_at FROM public.users;

-- 查看剩余对话
-- SELECT c.id, c.user_id, c.title, u.username 
-- FROM public.conversations c
-- JOIN public.users u ON c.user_id = u.user_id;

-- 查看剩余消息统计
-- SELECT c.user_id, u.username, COUNT(m.id) AS message_count
-- FROM public.conversations c
-- JOIN public.users u ON c.user_id = u.user_id
-- LEFT JOIN public.messages m ON m.conversation_id = c.id
-- GROUP BY c.user_id, u.username;

-- 查看剩余用户配置
-- SELECT uc.user_id, u.username, uc.default_model_id
-- FROM public.user_configs uc
-- JOIN public.users u ON uc.user_id = u.user_id;

-- 查看剩余用户角色
-- SELECT u.user_id, u.username, r.role_name
-- FROM public.users u
-- LEFT JOIN public.user_roles ur ON u.user_id = ur.user_id
-- LEFT JOIN public.roles r ON ur.role_id = r.role_id;

