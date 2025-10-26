-- ============================================
-- Auth0 角色权限系统数据库迁移
-- 版本: v1.0
-- 说明: 扩展现有角色系统以支持 Auth0 集成和细粒度权限控制
-- ============================================

-- ⚠️ 执行前提示
-- 1. 请先备份数据库
-- 2. 确保已执行 schema.sql（创建基础 roles 和 user_roles 表）
-- 3. 在测试环境验证后再在生产环境执行

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

-- 添加注释
COMMENT ON COLUMN public.roles.auth0_role_id IS 'Auth0 角色 ID（用于同步）';
COMMENT ON COLUMN public.roles.level IS '角色等级（0-100，数字越大权限越高）';
COMMENT ON COLUMN public.roles.is_system IS '系统角色标记（Admin 等不可删除）';
COMMENT ON COLUMN public.roles.metadata IS '扩展元数据（配额、限制等）';
COMMENT ON COLUMN public.roles.enabled IS '是否启用此角色';

-- ============================================
-- 步骤 2: 创建 permissions 表
-- ============================================

CREATE TABLE IF NOT EXISTS public.permissions (
  permission_id BIGSERIAL PRIMARY KEY,
  permission_name VARCHAR(100) NOT NULL UNIQUE,
  permission_type VARCHAR(50) NOT NULL,
  description TEXT,
  resource VARCHAR(100),
  action VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT permission_type_check CHECK (
    permission_type IN ('model_access', 'feature_access', 'quota_limit', 'api_access', 'admin')
  )
);

COMMENT ON TABLE public.permissions IS '细粒度权限表';
COMMENT ON COLUMN public.permissions.permission_name IS '权限唯一标识符（如 model:gpt-4:use）';
COMMENT ON COLUMN public.permissions.permission_type IS '权限类型';
COMMENT ON COLUMN public.permissions.resource IS '资源标识符';
COMMENT ON COLUMN public.permissions.action IS '操作类型';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_permissions_type ON public.permissions(permission_type);
CREATE INDEX IF NOT EXISTS idx_permissions_resource ON public.permissions(resource);
CREATE INDEX IF NOT EXISTS idx_permissions_name ON public.permissions(permission_name);

-- 创建更新触发器
CREATE TRIGGER permissions_updated_at
  BEFORE UPDATE ON public.permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 步骤 3: 创建 role_permissions 关联表
-- ============================================

CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_permission_id BIGSERIAL PRIMARY KEY,
  role_id BIGINT NOT NULL,
  permission_id BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT role_permissions_role_fk 
    FOREIGN KEY (role_id) 
    REFERENCES public.roles(role_id) 
    ON DELETE CASCADE,
  
  CONSTRAINT role_permissions_permission_fk 
    FOREIGN KEY (permission_id) 
    REFERENCES public.permissions(permission_id) 
    ON DELETE CASCADE,
  
  CONSTRAINT role_permissions_unique UNIQUE(role_id, permission_id)
);

COMMENT ON TABLE public.role_permissions IS '角色-权限多对多关联表';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON public.role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON public.role_permissions(permission_id);

-- ============================================
-- 步骤 4: 更新 users 表
-- ============================================

-- 添加 Auth0 相关字段
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS auth0_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE;

-- 创建索引
CREATE UNIQUE INDEX IF NOT EXISTS users_auth0_id_key 
  ON public.users(auth0_id) WHERE auth0_id IS NOT NULL;

COMMENT ON COLUMN public.users.auth0_id IS 'Auth0 用户唯一标识（sub 字段）';
COMMENT ON COLUMN public.users.subscription_status IS '订阅状态（free/pro/plus/ultra/trial）';
COMMENT ON COLUMN public.users.subscription_expires_at IS '订阅过期时间';

-- ============================================
-- 步骤 5: 插入会员角色数据
-- ============================================

-- 更新现有 admin 角色
UPDATE public.roles 
SET 
  level = 100,
  is_system = TRUE,
  metadata = '{"max_conversations": -1, "models": ["all"], "daily_messages": -1, "admin_access": true}'::jsonb,
  role_description = '管理员，拥有所有权限'
WHERE role_name = 'admin';

-- 更新或插入会员等级角色
INSERT INTO public.roles (role_name, role_description, level, is_system, enabled, metadata) VALUES
  ('Free', '免费用户 - 基础功能', 0, FALSE, TRUE, '{
    "max_conversations": 10, 
    "models": ["gpt-3.5-turbo"], 
    "daily_messages": 50
  }'::jsonb),
  
  ('Pro', '专业版用户 - 增强功能', 25, FALSE, TRUE, '{
    "max_conversations": 100, 
    "models": ["gpt-3.5-turbo", "gpt-4"], 
    "daily_messages": 500,
    "priority_support": true
  }'::jsonb),
  
  ('Plus', '增强版用户 - 高级功能', 50, FALSE, TRUE, '{
    "max_conversations": 500, 
    "models": ["gpt-3.5-turbo", "gpt-4", "claude"], 
    "daily_messages": 2000,
    "priority_support": true,
    "api_access": true
  }'::jsonb),
  
  ('Ultra', '旗舰版用户 - 无限制', 75, FALSE, TRUE, '{
    "max_conversations": -1, 
    "models": ["all"], 
    "daily_messages": -1,
    "priority_support": true,
    "api_access": true,
    "custom_models": true
  }'::jsonb),
  
  ('Beta', '内测用户 - 测试新功能', 80, FALSE, TRUE, '{
    "max_conversations": -1, 
    "models": ["all"], 
    "daily_messages": -1,
    "beta_features": true,
    "priority_support": true
  }'::jsonb),
  
  ('Admin', '管理员 - 完全控制', 100, TRUE, TRUE, '{
    "max_conversations": -1, 
    "models": ["all"], 
    "daily_messages": -1,
    "admin_access": true,
    "system_config": true
  }'::jsonb)
ON CONFLICT (role_name) DO UPDATE SET
  level = EXCLUDED.level,
  is_system = EXCLUDED.is_system,
  metadata = EXCLUDED.metadata,
  role_description = EXCLUDED.role_description,
  updated_at = NOW();

-- ============================================
-- 步骤 6: 插入权限数据
-- ============================================

-- 模型访问权限
INSERT INTO public.permissions (permission_name, permission_type, description, resource, action) VALUES
  ('model:gpt-3.5-turbo:use', 'model_access', '使用 GPT-3.5 Turbo 模型', 'gpt-3.5-turbo', 'use'),
  ('model:gpt-4:use', 'model_access', '使用 GPT-4 模型', 'gpt-4', 'use'),
  ('model:gpt-4-turbo:use', 'model_access', '使用 GPT-4 Turbo 模型', 'gpt-4-turbo', 'use'),
  ('model:claude:use', 'model_access', '使用 Claude 模型', 'claude', 'use'),
  ('model:claude-3:use', 'model_access', '使用 Claude 3 系列模型', 'claude-3', 'use'),
  ('model:gemini:use', 'model_access', '使用 Gemini 模型', 'gemini', 'use'),
  ('model:all:use', 'model_access', '使用所有模型', 'all', 'use'),
  
  -- 功能访问权限
  ('feature:advanced-settings:access', 'feature_access', '访问高级设置', 'advanced-settings', 'access'),
  ('feature:api-keys:manage', 'feature_access', '管理个人 API 密钥', 'api-keys', 'manage'),
  ('feature:team:create', 'feature_access', '创建团队工作区', 'team', 'create'),
  ('feature:export:unlimited', 'feature_access', '无限导出对话记录', 'export', 'unlimited'),
  ('feature:beta:access', 'feature_access', '访问 Beta 测试功能', 'beta', 'access'),
  ('feature:custom-models:use', 'feature_access', '使用自定义模型', 'custom-models', 'use'),
  ('feature:priority-queue:access', 'feature_access', '优先队列处理', 'priority-queue', 'access'),
  ('feature:file-upload:access', 'feature_access', '上传文件功能', 'file-upload', 'access'),
  ('feature:voice-input:access', 'feature_access', '语音输入功能', 'voice-input', 'access'),
  
  -- 配额权限
  ('quota:conversations:basic', 'quota_limit', '基础会话配额（10个）', 'conversations', 'basic'),
  ('quota:conversations:pro', 'quota_limit', '专业会话配额（100个）', 'conversations', 'pro'),
  ('quota:conversations:plus', 'quota_limit', 'Plus 会话配额（500个）', 'conversations', 'plus'),
  ('quota:conversations:unlimited', 'quota_limit', '无限会话', 'conversations', 'unlimited'),
  ('quota:messages:basic', 'quota_limit', '基础消息配额（50条/天）', 'messages', 'basic'),
  ('quota:messages:pro', 'quota_limit', '专业消息配额（500条/天）', 'messages', 'pro'),
  ('quota:messages:plus', 'quota_limit', 'Plus 消息配额（2000条/天）', 'messages', 'plus'),
  ('quota:messages:unlimited', 'quota_limit', '无限消息', 'messages', 'unlimited'),
  
  -- API 访问权限
  ('api:rest:access', 'api_access', '访问 REST API', 'rest-api', 'access'),
  ('api:websocket:access', 'api_access', '访问 WebSocket API', 'websocket', 'access'),
  
  -- 管理员权限
  ('admin:users:read', 'admin', '查看用户列表', 'users', 'read'),
  ('admin:users:write', 'admin', '管理用户', 'users', 'write'),
  ('admin:roles:read', 'admin', '查看角色', 'roles', 'read'),
  ('admin:roles:write', 'admin', '管理角色', 'roles', 'write'),
  ('admin:permissions:read', 'admin', '查看权限', 'permissions', 'read'),
  ('admin:permissions:write', 'admin', '管理权限', 'permissions', 'write'),
  ('admin:system:config', 'admin', '系统配置', 'system', 'config'),
  ('admin:logs:read', 'admin', '查看系统日志', 'logs', 'read')
ON CONFLICT (permission_name) DO NOTHING;

-- ============================================
-- 步骤 7: 关联角色和权限
-- ============================================

-- Free 角色权限
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.role_name = 'Free'
  AND p.permission_name IN (
    'model:gpt-3.5-turbo:use',
    'quota:conversations:basic',
    'quota:messages:basic',
    'feature:file-upload:access'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Pro 角色权限
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.role_name = 'Pro'
  AND p.permission_name IN (
    'model:gpt-3.5-turbo:use',
    'model:gpt-4:use',
    'feature:advanced-settings:access',
    'feature:file-upload:access',
    'feature:voice-input:access',
    'feature:priority-queue:access',
    'quota:conversations:pro',
    'quota:messages:pro'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Plus 角色权限
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.role_name = 'Plus'
  AND p.permission_name IN (
    'model:gpt-3.5-turbo:use',
    'model:gpt-4:use',
    'model:gpt-4-turbo:use',
    'model:claude:use',
    'feature:advanced-settings:access',
    'feature:api-keys:manage',
    'feature:export:unlimited',
    'feature:file-upload:access',
    'feature:voice-input:access',
    'feature:priority-queue:access',
    'quota:conversations:plus',
    'quota:messages:plus',
    'api:rest:access'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Ultra 角色权限（几乎所有非管理员权限）
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.role_name = 'Ultra'
  AND (
    p.permission_type IN ('model_access', 'feature_access', 'api_access')
    OR p.permission_name LIKE 'quota:%unlimited'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Beta 角色权限（Ultra + Beta 功能）
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.role_name = 'Beta'
  AND (
    p.permission_type IN ('model_access', 'feature_access', 'api_access')
    OR p.permission_name LIKE 'quota:%unlimited'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Admin 角色权限（所有权限）
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.role_id, p.permission_id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.role_name IN ('Admin', 'admin')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================
-- 步骤 8: 创建视图
-- ============================================

-- 用户完整权限视图
CREATE OR REPLACE VIEW public.v_user_full_permissions AS
SELECT 
  u.user_id,
  u.username,
  u.email,
  u.auth0_id,
  u.clerk_id,
  u.subscription_status,
  u.subscription_expires_at,
  u.status,
  array_agg(DISTINCT r.role_name) FILTER (WHERE r.role_name IS NOT NULL) AS roles,
  array_agg(DISTINCT r.role_id) FILTER (WHERE r.role_id IS NOT NULL) AS role_ids,
  array_agg(DISTINCT r.level) FILTER (WHERE r.level IS NOT NULL) AS role_levels,
  MAX(r.level) AS highest_level,
  array_agg(DISTINCT p.permission_name) FILTER (WHERE p.permission_name IS NOT NULL) AS permissions,
  jsonb_agg(DISTINCT jsonb_build_object(
    'roleName', r.role_name,
    'level', r.level,
    'metadata', r.metadata
  )) FILTER (WHERE r.role_name IS NOT NULL) AS role_details
FROM public.users u
LEFT JOIN public.user_roles ur ON u.user_id = ur.user_id
LEFT JOIN public.roles r ON ur.role_id = r.role_id AND r.enabled = TRUE
LEFT JOIN public.role_permissions rp ON r.role_id = rp.role_id
LEFT JOIN public.permissions p ON rp.permission_id = p.permission_id
GROUP BY u.user_id, u.username, u.email, u.auth0_id, u.clerk_id, u.subscription_status, u.subscription_expires_at, u.status;

COMMENT ON VIEW public.v_user_full_permissions IS '用户完整权限视图（包含所有角色、权限和元数据）';

-- 角色权限详情视图
CREATE OR REPLACE VIEW public.v_role_permissions AS
SELECT 
  r.role_id,
  r.role_name,
  r.role_description,
  r.level,
  r.is_system,
  r.enabled,
  r.metadata,
  array_agg(DISTINCT p.permission_name) FILTER (WHERE p.permission_name IS NOT NULL) AS permissions,
  jsonb_agg(DISTINCT jsonb_build_object(
    'permissionName', p.permission_name,
    'permissionType', p.permission_type,
    'description', p.description,
    'resource', p.resource,
    'action', p.action
  )) FILTER (WHERE p.permission_name IS NOT NULL) AS permission_details
FROM public.roles r
LEFT JOIN public.role_permissions rp ON r.role_id = rp.role_id
LEFT JOIN public.permissions p ON rp.permission_id = p.permission_id
GROUP BY r.role_id, r.role_name, r.role_description, r.level, r.is_system, r.enabled, r.metadata;

COMMENT ON VIEW public.v_role_permissions IS '角色权限详情视图';

-- ============================================
-- 步骤 9: 创建辅助函数
-- ============================================

-- 检查用户是否有特定权限
CREATE OR REPLACE FUNCTION user_has_permission(
  p_user_id UUID,
  p_permission_name VARCHAR
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.v_user_full_permissions
    WHERE user_id = p_user_id
      AND p_permission_name = ANY(permissions)
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION user_has_permission IS '检查用户是否拥有特定权限';

-- 获取用户最高角色等级
CREATE OR REPLACE FUNCTION get_user_highest_level(
  p_user_id UUID
) RETURNS INTEGER AS $$
DECLARE
  max_level INTEGER;
BEGIN
  SELECT highest_level INTO max_level
  FROM public.v_user_full_permissions
  WHERE user_id = p_user_id;
  
  RETURN COALESCE(max_level, 0);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_user_highest_level IS '获取用户最高角色等级';

-- ============================================
-- 步骤 10: 数据迁移 - 为现有用户分配 Free 角色
-- ============================================

-- 为没有角色的现有用户分配 Free 角色
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

-- 查看所有角色及其权限数量
SELECT 
  r.role_name,
  r.level,
  r.is_system,
  r.enabled,
  COUNT(rp.permission_id) AS permission_count
FROM public.roles r
LEFT JOIN public.role_permissions rp ON r.role_id = rp.role_id
GROUP BY r.role_id, r.role_name, r.level, r.is_system, r.enabled
ORDER BY r.level DESC;

-- 查看所有权限及其类型
SELECT 
  permission_type,
  COUNT(*) AS count
FROM public.permissions
GROUP BY permission_type
ORDER BY count DESC;

-- 查看用户角色分布
SELECT 
  r.role_name,
  COUNT(ur.user_id) AS user_count
FROM public.roles r
LEFT JOIN public.user_roles ur ON r.role_id = ur.role_id
GROUP BY r.role_name
ORDER BY user_count DESC;

-- ============================================
-- 完成提示
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Auth0 角色权限系统迁移完成！';
  RAISE NOTICE '📊 请查看上方的验证结果';
  RAISE NOTICE '🔧 下一步：配置 Auth0 并同步角色数据';
END $$;

