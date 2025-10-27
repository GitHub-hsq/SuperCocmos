-- ============================================
-- 删除用户及相关数据（简化版 - 利用 CASCADE）
-- ============================================
-- 说明：删除除指定用户外的所有用户
-- 保留用户ID: 8b1c2198-f76b-443f-b8bc-4c71f999f691
-- 
-- 由于外键设置了 ON DELETE CASCADE，删除用户会自动删除：
-- - user_configs
-- - conversations
-- - messages（通过 conversations 级联）
-- - user_roles
--
-- ⚠️ 警告：此操作不可逆！请在执行前：
-- 1. 备份数据库
-- 2. 确认要保留的用户ID正确
-- 3. 在测试环境验证
-- ============================================

BEGIN;

-- 显示删除前统计
DO $$
DECLARE
  keep_user_id UUID := '8b1c2198-f76b-443f-b8bc-4c71f999f691';
  users_count INTEGER;
  conversations_count INTEGER;
  messages_count INTEGER;
BEGIN
  -- 统计将要删除的数据
  SELECT COUNT(*) INTO users_count FROM public.users WHERE user_id != keep_user_id;
  SELECT COUNT(*) INTO conversations_count FROM public.conversations WHERE user_id != keep_user_id;
  SELECT COUNT(*) INTO messages_count FROM public.messages m
  WHERE EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = m.conversation_id AND c.user_id != keep_user_id);
  
  RAISE NOTICE '============================================';
  RAISE NOTICE '⚠️  即将删除';
  RAISE NOTICE '============================================';
  RAISE NOTICE '用户: % 个', users_count;
  RAISE NOTICE '对话: % 个', conversations_count;
  RAISE NOTICE '消息: % 条', messages_count;
  RAISE NOTICE '保留用户ID: %', keep_user_id;
  RAISE NOTICE '';
END $$;

-- 执行删除（CASCADE 会自动删除相关数据）
DELETE FROM public.users 
WHERE user_id != '8b1c2198-f76b-443f-b8bc-4c71f999f691';

-- 显示删除后统计
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ 删除完成';
  RAISE NOTICE '============================================';
  RAISE NOTICE '剩余用户: %', (SELECT COUNT(*) FROM public.users);
  RAISE NOTICE '剩余对话: %', (SELECT COUNT(*) FROM public.conversations);
  RAISE NOTICE '剩余消息: %', (SELECT COUNT(*) FROM public.messages);
  RAISE NOTICE '剩余配置: %', (SELECT COUNT(*) FROM public.user_configs);
  RAISE NOTICE '剩余角色关联: %', (SELECT COUNT(*) FROM public.user_roles);
  RAISE NOTICE '';
  RAISE NOTICE '保留的用户信息:';
END $$;

-- 显示保留的用户信息
SELECT 
  user_id,
  username,
  email,
  status,
  created_at,
  last_login_at
FROM public.users
WHERE user_id = '8b1c2198-f76b-443f-b8bc-4c71f999f691';

COMMIT;

-- ============================================
-- 如果执行后想回滚，在 COMMIT 之前运行：
-- ROLLBACK;
-- ============================================

