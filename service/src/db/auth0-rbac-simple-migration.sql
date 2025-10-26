-- ============================================
-- Auth0 RBAC 系统数据库迁移（简化版）
-- 版本: v2.0 Simple
-- 说明: 只使用角色，不使用细粒度权限
-- ============================================

-- ⚠️ 执行前提示
-- 1. 请先备份数据库
-- 2. 确保已执行 schema.sql（创建基础 roles 和 user_roles 表）
-- 3. 本脚本只扩展 roles 表，不创建 permissions 表

BEGIN;

-- ============================================
-- 步骤 1: 扩展 roles 表
-- ============================================

-- 添加新字段
ALTER TABLE public.roles 
  ADD COLUMN IF NOT EXISTS auth0_role_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS metadata JSONB,
  ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT TRUE;

-- 创建唯一索引
CREATE UNIQUE INDEX IF NOT EXISTS roles_auth0_role_id_key 
  ON public.roles(auth0_role_id) WHERE auth0_role_id IS NOT NULL;

-- 创建等级索引
CREATE INDEX IF NOT EXISTS idx_roles_level ON public.roles(level DESC);

-- 添加注释
COMMENT ON COLUMN public.roles.auth0_role_id IS 'Auth0 角色 ID（用于同步）';
COMMENT ON COLUMN public.roles.level IS '角色等级（0-100，用于功能判断）';
COMMENT ON COLUMN public.roles.is_system IS '系统角色标记（Admin 等不可删除）';
COMMENT ON COLUMN public.roles.metadata IS '配额和功能配置（JSONB 格式）';
COMMENT ON COLUMN public.roles.enabled IS '是否启用此角色';

-- ============================================
-- 步骤 2: 更新 users 表
-- ============================================

-- 添加 Auth0 相关字段
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS auth0_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE;

-- 创建唯一索引
CREATE UNIQUE INDEX IF NOT EXISTS users_auth0_id_key 
  ON public.users(auth0_id) WHERE auth0_id IS NOT NULL;

-- 添加注释
COMMENT ON COLUMN public.users.auth0_id IS 'Auth0 用户唯一标识（sub 字段）';
COMMENT ON COLUMN public.users.clerk_id IS 'Auth0/Clerk 用户 ID（兼容字段）';
COMMENT ON COLUMN public.users.subscription_status IS '订阅状态（free/pro/plus/ultra）';
COMMENT ON COLUMN public.users.subscription_expires_at IS '订阅过期时间';

-- ============================================
-- 步骤 3: 插入/更新角色数据
-- ============================================

-- 更新或插入会员等级角色
INSERT INTO public.roles (role_name, role_description, level, is_system, enabled, metadata) VALUES

-- Free（免费用户）- 等级 0
('Free', '免费用户', 0, FALSE, TRUE, '{
  "max_conversations": 10,
  "max_messages_per_day": 50,
  "allowed_models": ["gpt-3.5-turbo"],
  "features": {
    "advanced_settings": false,
    "api_access": false,
    "export_unlimited": false,
    "file_upload": true,
    "voice_input": false,
    "priority_support": false,
    "beta_features": false,
    "admin_panel": false
  }
}'::jsonb),

-- Pro（专业版）- 等级 25
('Pro', '专业版用户', 25, FALSE, TRUE, '{
  "max_conversations": 100,
  "max_messages_per_day": 500,
  "allowed_models": ["gpt-3.5-turbo", "gpt-4"],
  "features": {
    "advanced_settings": true,
    "api_access": false,
    "export_unlimited": false,
    "file_upload": true,
    "voice_input": true,
    "priority_support": true,
    "beta_features": false,
    "admin_panel": false
  }
}'::jsonb),

-- Plus（增强版）- 等级 50
('Plus', '增强版用户', 50, FALSE, TRUE, '{
  "max_conversations": 500,
  "max_messages_per_day": 2000,
  "allowed_models": ["gpt-3.5-turbo", "gpt-4", "gpt-4-turbo", "claude-3-5-sonnet", "claude-3-opus"],
  "features": {
    "advanced_settings": true,
    "api_access": true,
    "export_unlimited": true,
    "file_upload": true,
    "voice_input": true,
    "priority_support": true,
    "custom_prompts": true,
    "beta_features": false,
    "admin_panel": false
  }
}'::jsonb),

-- Ultra（旗舰版）- 等级 75
('Ultra', '旗舰版用户', 75, FALSE, TRUE, '{
  "max_conversations": -1,
  "max_messages_per_day": -1,
  "allowed_models": ["all"],
  "features": {
    "advanced_settings": true,
    "api_access": true,
    "export_unlimited": true,
    "file_upload": true,
    "voice_input": true,
    "priority_support": true,
    "custom_prompts": true,
    "custom_models": true,
    "team_workspace": true,
    "beta_features": false,
    "admin_panel": false
  }
}'::jsonb),

-- Beta（内测用户）- 等级 80
('Beta', '内测用户', 80, FALSE, TRUE, '{
  "max_conversations": -1,
  "max_messages_per_day": -1,
  "allowed_models": ["all"],
  "features": {
    "advanced_settings": true,
    "api_access": true,
    "export_unlimited": true,
    "file_upload": true,
    "voice_input": true,
    "priority_support": true,
    "custom_prompts": true,
    "custom_models": true,
    "team_workspace": true,
    "beta_features": true,
    "admin_panel": false
  }
}'::jsonb),

-- Admin（管理员）- 等级 100
('Admin', '管理员', 100, TRUE, TRUE, '{
  "max_conversations": -1,
  "max_messages_per_day": -1,
  "allowed_models": ["all"],
  "features": {
    "advanced_settings": true,
    "api_access": true,
    "export_unlimited": true,
    "file_upload": true,
    "voice_input": true,
    "priority_support": true,
    "custom_prompts": true,
    "custom_models": true,
    "team_workspace": true,
    "beta_features": true,
    "admin_panel": true,
    "system_config": true,
    "user_management": true
  }
}'::jsonb)

ON CONFLICT (role_name) DO UPDATE SET
  level = EXCLUDED.level,
  is_system = EXCLUDED.is_system,
  metadata = EXCLUDED.metadata,
  role_description = EXCLUDED.role_description,
  updated_at = NOW();

-- ============================================
-- 步骤 4: 创建视图 - 用户角色信息
-- ============================================

CREATE OR REPLACE VIEW public.v_user_roles AS
SELECT 
  u.user_id,
  u.username,
  u.email,
  u.auth0_id,
  u.clerk_id,
  u.subscription_status,
  u.subscription_expires_at,
  u.status,
  array_agg(r.role_name ORDER BY r.level DESC) FILTER (WHERE r.role_name IS NOT NULL) AS roles,
  array_agg(r.role_id) FILTER (WHERE r.role_id IS NOT NULL) AS role_ids,
  MAX(r.level) AS highest_level,
  (array_agg(r.metadata ORDER BY r.level DESC) FILTER (WHERE r.metadata IS NOT NULL))[1] AS role_config
FROM public.users u
LEFT JOIN public.user_roles ur ON u.user_id = ur.user_id
LEFT JOIN public.roles r ON ur.role_id = r.role_id AND r.enabled = TRUE
GROUP BY u.user_id, u.username, u.email, u.auth0_id, u.clerk_id, u.subscription_status, u.subscription_expires_at, u.status;

COMMENT ON VIEW public.v_user_roles IS '用户角色信息视图（包含最高等级和配置）';

-- ============================================
-- 步骤 5: 创建辅助函数
-- ============================================

-- 获取用户最高等级
CREATE OR REPLACE FUNCTION get_user_level(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  user_level INTEGER;
BEGIN
  SELECT highest_level INTO user_level
  FROM public.v_user_roles
  WHERE user_id = p_user_id;
  
  RETURN COALESCE(user_level, 0);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_user_level IS '获取用户最高角色等级';

-- 检查用户是否有特定角色
CREATE OR REPLACE FUNCTION user_has_role(p_user_id UUID, p_role_name VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.v_user_roles
    WHERE user_id = p_user_id
    AND p_role_name = ANY(roles)
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION user_has_role IS '检查用户是否拥有特定角色';

-- 删除用户的非系统角色
CREATE OR REPLACE FUNCTION delete_user_non_system_roles(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  DELETE FROM public.user_roles
  WHERE user_id = p_user_id
  AND role_id NOT IN (SELECT role_id FROM public.roles WHERE is_system = TRUE);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION delete_user_non_system_roles IS '删除用户的所有非系统角色（用于角色同步）';

-- ============================================
-- 步骤 6: 为现有用户分配默认角色
-- ============================================

-- 为没有角色的用户分配 Free
INSERT INTO public.user_roles (user_id, role_id)
SELECT u.user_id, r.role_id
FROM public.users u
CROSS JOIN public.roles r
WHERE r.role_name = 'Free'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = u.user_id
  )
ON CONFLICT (user_id, role_id) DO NOTHING;

COMMIT;

-- ============================================
-- 验证脚本
-- ============================================

-- 1. 查看所有角色及配置
SELECT 
  role_name,
  level,
  is_system,
  enabled,
  metadata->'max_conversations' AS max_conversations,
  metadata->'allowed_models' AS allowed_models
FROM public.roles
ORDER BY level DESC;

-- 2. 查看用户角色分布
SELECT 
  r.role_name,
  COUNT(ur.user_id) AS user_count
FROM public.roles r
LEFT JOIN public.user_roles ur ON r.role_id = ur.role_id
GROUP BY r.role_name, r.level
ORDER BY r.level DESC;

-- 3. 查看视图是否正常
SELECT * FROM public.v_user_roles LIMIT 5;

-- 4. 测试辅助函数
-- SELECT get_user_level('your-user-id-here');
-- SELECT user_has_role('your-user-id-here', 'Pro');

-- ============================================
-- 完成提示
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Auth0 RBAC 系统迁移完成（简化版）！';
  RAISE NOTICE '📊 共创建 6 个角色：Free, Pro, Plus, Ultra, Beta, Admin';
  RAISE NOTICE '🔧 下一步：配置 Auth0 角色并测试';
  RAISE NOTICE '';
  RAISE NOTICE '💡 提示：';
  RAISE NOTICE '  - 通过 role.level 判断功能访问';
  RAISE NOTICE '  - 通过 role.metadata 获取配额';
  RAISE NOTICE '  - 不需要复杂的 permissions 表';
END $$;

