-- ============================================
-- 模型-角色访问控制表
-- 实现不同会员等级访问不同模型
-- ============================================

-- 1. 创建模型-角色关联表（多对多关系）
CREATE TABLE IF NOT EXISTS model_role_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL,
  role_id BIGINT NOT NULL,  -- ✅ 修改为 BIGINT，匹配 roles 表
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- 外键约束
  CONSTRAINT model_role_access_model_fk 
    FOREIGN KEY (model_id) 
    REFERENCES models(id) 
    ON DELETE CASCADE,
  
  CONSTRAINT model_role_access_role_fk 
    FOREIGN KEY (role_id) 
    REFERENCES roles(role_id) 
    ON DELETE CASCADE,
  
  -- 唯一约束：同一个模型和角色的组合只能存在一次
  CONSTRAINT model_role_access_unique UNIQUE(model_id, role_id)
);

-- 添加注释
COMMENT ON TABLE model_role_access IS '模型-角色访问权限关联表（多对多）';
COMMENT ON COLUMN model_role_access.model_id IS '模型ID';
COMMENT ON COLUMN model_role_access.role_id IS '角色ID';

-- 2. 创建索引（提升查询性能）
CREATE INDEX IF NOT EXISTS idx_model_role_access_model_id ON model_role_access(model_id);
CREATE INDEX IF NOT EXISTS idx_model_role_access_role_id ON model_role_access(role_id);

-- 3. 创建视图：查询模型及其可访问的角色列表
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

COMMENT ON VIEW models_with_roles IS '模型及其可访问的角色列表视图';

-- 4. 创建函数：检查用户是否有权限访问模型
CREATE OR REPLACE FUNCTION user_can_access_model(
  p_user_id UUID,
  p_model_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  user_roles UUID[];
  model_allowed_roles UUID[];
  has_permission BOOLEAN;
BEGIN
  -- 获取用户的所有角色ID
  SELECT ARRAY_AGG(role_id) INTO user_roles
  FROM user_roles
  WHERE user_id = p_user_id;
  
  -- 如果用户没有角色，返回 false
  IF user_roles IS NULL OR array_length(user_roles, 1) = 0 THEN
    RETURN FALSE;
  END IF;
  
  -- 获取模型允许的角色ID
  SELECT ARRAY_AGG(role_id) INTO model_allowed_roles
  FROM model_role_access
  WHERE model_id = p_model_id;
  
  -- 如果模型没有设置角色限制，所有人都可以访问
  IF model_allowed_roles IS NULL OR array_length(model_allowed_roles, 1) = 0 THEN
    RETURN TRUE;
  END IF;
  
  -- 检查用户角色是否与模型允许的角色有交集
  SELECT user_roles && model_allowed_roles INTO has_permission;
  
  RETURN COALESCE(has_permission, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION user_can_access_model IS '检查用户是否有权限访问指定模型';

-- 5. 创建函数：获取用户可访问的所有模型
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
      -- 模型没有角色限制（对所有人开放）
      NOT EXISTS (SELECT 1 FROM model_role_access WHERE model_id = m.id)
      OR
      -- 或用户拥有允许的角色
      mra.role_id IN (
        SELECT role_id FROM user_roles WHERE user_id = p_user_id
      )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_user_accessible_models IS '获取用户有权限访问的所有模型';

-- 6. Row Level Security (RLS) 策略
ALTER TABLE model_role_access ENABLE ROW LEVEL SECURITY;

-- 所有认证用户可以读取模型-角色关联
CREATE POLICY "Allow authenticated users to read model role access"
  ON model_role_access FOR SELECT
  TO authenticated
  USING (true);

-- 只有管理员可以管理模型-角色关联
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

-- ============================================
-- 示例数据
-- ============================================

-- 假设已有以下角色：
-- - admin: 管理员（可以访问所有模型）
-- - vip: VIP 会员
-- - premium: 高级会员
-- - free: 免费用户

-- 7. 插入示例角色（如果不存在）
-- 注意：roles 表只有 role_name 和 role_description，没有 role_code
INSERT INTO roles (role_name, role_description) VALUES
  ('vip', 'VIP会员可以访问高级模型'),
  ('premium', '高级会员可以访问部分高级模型'),
  ('free', '免费用户只能访问基础模型')
ON CONFLICT (role_name) DO NOTHING;

-- 8. 设置模型访问权限示例
-- 假设：
-- - GPT-4o: admin, vip 可以访问
-- - GPT-4o-mini: admin, vip, premium 可以访问
-- - GPT-3.5-turbo: 所有人都可以访问（不设置限制）

-- 为 GPT-4o 设置权限（仅 admin 和 vip）
INSERT INTO model_role_access (model_id, role_id)
SELECT 
  m.id,
  r.role_id
FROM models m
CROSS JOIN roles r
WHERE m.display_name = 'OpenAI_gpt-4o'
  AND r.role_name IN ('admin', 'vip')
ON CONFLICT (model_id, role_id) DO NOTHING;

-- 为 GPT-4o-mini 设置权限（admin, vip, premium）
INSERT INTO model_role_access (model_id, role_id)
SELECT 
  m.id,
  r.role_id
FROM models m
CROSS JOIN roles r
WHERE m.display_name = 'OpenAI_gpt-4o-mini'
  AND r.role_name IN ('admin', 'vip', 'premium')
ON CONFLICT (model_id, role_id) DO NOTHING;

-- GPT-3.5-turbo 不设置限制（所有人都可以访问）

-- ============================================
-- 查询示例
-- ============================================

-- 1. 查询某个模型允许哪些角色访问
-- SELECT 
--   m.display_name,
--   r.role_name,
--   r.role_code
-- FROM models m
-- JOIN model_role_access mra ON m.id = mra.model_id
-- JOIN roles r ON mra.role_id = r.role_id
-- WHERE m.display_name = 'OpenAI_gpt-4o';

-- 2. 查询某个用户可以访问哪些模型
-- SELECT * FROM get_user_accessible_models('user-uuid-here');

-- 3. 检查用户是否可以访问某个模型
-- SELECT user_can_access_model('user-uuid', 'model-uuid');

-- 4. 查询所有模型及其访问角色（使用视图）
-- SELECT * FROM models_with_roles;

-- 5. 查询没有角色限制的模型（对所有人开放）
-- SELECT m.* 
-- FROM models m
-- WHERE m.deleted_at IS NULL
--   AND NOT EXISTS (
--     SELECT 1 FROM model_role_access WHERE model_id = m.id
--   );

-- 6. 为某个模型添加角色权限
-- INSERT INTO model_role_access (model_id, role_id)
-- VALUES ('model-uuid', 'role-uuid');

-- 7. 移除某个模型的角色权限
-- DELETE FROM model_role_access
-- WHERE model_id = 'model-uuid' AND role_id = 'role-uuid';

-- 8. 清空某个模型的所有权限（对所有人开放）
-- DELETE FROM model_role_access WHERE model_id = 'model-uuid';

