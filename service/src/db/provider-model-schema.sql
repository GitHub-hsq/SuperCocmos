-- ============================================
-- 供应商和模型管理数据库表结构
-- 关系: Providers (1) -> (N) Models
-- ============================================
--
-- ⚠️ 执行顺序：步骤 2
-- 请先执行 00-init-users.sql 创建 users 表
-- 然后再执行本文件
--
-- ============================================

-- 1. 创建供应商表（父表）
CREATE TABLE IF NOT EXISTS providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  base_url VARCHAR(500) NOT NULL,
  api_key TEXT NOT NULL, -- 建议使用 Supabase Vault 加密存储
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE, -- 软删除支持
  
  -- 约束
  CONSTRAINT providers_name_unique UNIQUE(name),
  CONSTRAINT providers_base_url_check CHECK (base_url ~* '^https?://.*')
);

-- 添加注释
COMMENT ON TABLE providers IS '模型供应商配置表';
COMMENT ON COLUMN providers.id IS '供应商唯一标识';
COMMENT ON COLUMN providers.name IS '供应商名称（如：OpenAI, Anthropic）';
COMMENT ON COLUMN providers.base_url IS 'API 基础 URL';
COMMENT ON COLUMN providers.api_key IS 'API 密钥（加密存储）';
COMMENT ON COLUMN providers.deleted_at IS '软删除时间戳';

-- 2. 创建模型表（子表）
CREATE TABLE IF NOT EXISTS models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id VARCHAR(200) NOT NULL,
  display_name VARCHAR(200) NOT NULL,
  enabled BOOLEAN DEFAULT true,
  provider_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE, -- 软删除支持
  
  -- 外键约束：关联到供应商表
  CONSTRAINT models_provider_fk 
    FOREIGN KEY (provider_id) 
    REFERENCES providers(id) 
    ON DELETE CASCADE, -- 删除供应商时级联删除其所有模型
  
  -- 唯一约束：同一供应商（同一URL）下模型ID不能重复
  CONSTRAINT models_provider_model_unique UNIQUE(provider_id, model_id),
  
  -- 唯一约束：display_name 全局唯一（用于区分不同供应商的相同模型）
  -- 例如：OpenAI_gpt-4o, Mirror_gpt-4o, Anthropic_claude-3.5
  CONSTRAINT models_display_name_unique UNIQUE(display_name)
);

-- 添加注释
COMMENT ON TABLE models IS '模型配置表';
COMMENT ON COLUMN models.id IS '模型唯一标识';
COMMENT ON COLUMN models.model_id IS '模型ID标识符（如：gpt-4o），不同供应商可以有相同的model_id';
COMMENT ON COLUMN models.display_name IS '模型显示名称（全局唯一），建议格式：供应商名_模型ID（如：OpenAI_gpt-4o）';
COMMENT ON COLUMN models.enabled IS '是否启用该模型';
COMMENT ON COLUMN models.provider_id IS '所属供应商ID（外键）';
COMMENT ON COLUMN models.deleted_at IS '软删除时间戳';

-- 3. 创建索引（提升查询性能）
CREATE INDEX IF NOT EXISTS idx_providers_name ON providers(name);
CREATE INDEX IF NOT EXISTS idx_providers_deleted_at ON providers(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_models_provider_id ON models(provider_id);
CREATE INDEX IF NOT EXISTS idx_models_enabled ON models(enabled);
CREATE INDEX IF NOT EXISTS idx_models_model_id ON models(model_id);
CREATE INDEX IF NOT EXISTS idx_models_deleted_at ON models(deleted_at) WHERE deleted_at IS NULL;

-- 4. 创建自动更新 updated_at 的触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. 为两个表添加更新触发器
CREATE TRIGGER providers_updated_at
  BEFORE UPDATE ON providers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER models_updated_at
  BEFORE UPDATE ON models
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6. 创建视图：方便查询供应商及其模型统计
CREATE OR REPLACE VIEW providers_with_stats AS
SELECT 
  p.id,
  p.name,
  p.base_url,
  p.created_at,
  p.updated_at,
  COUNT(m.id) AS total_models,
  COUNT(CASE WHEN m.enabled = true THEN 1 END) AS enabled_models,
  COUNT(CASE WHEN m.enabled = false THEN 1 END) AS disabled_models
FROM providers p
LEFT JOIN models m ON p.id = m.provider_id AND m.deleted_at IS NULL
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.name, p.base_url, p.created_at, p.updated_at;

COMMENT ON VIEW providers_with_stats IS '供应商统计视图（包含模型数量统计）';

-- 7. 创建视图：查询供应商及其所有模型（用于前端展示）
CREATE OR REPLACE VIEW providers_with_models AS
SELECT 
  p.id AS provider_id,
  p.name AS provider_name,
  p.base_url,
  p.api_key,
  p.created_at AS provider_created_at,
  p.updated_at AS provider_updated_at,
  json_agg(
    json_build_object(
      'id', m.id,
      'modelId', m.model_id,
      'displayName', m.display_name,
      'enabled', m.enabled,
      'providerId', m.provider_id,
      'createdAt', m.created_at,
      'updatedAt', m.updated_at
    ) ORDER BY m.created_at DESC
  ) FILTER (WHERE m.id IS NOT NULL) AS models
FROM providers p
LEFT JOIN models m ON p.id = m.provider_id AND m.deleted_at IS NULL
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.name, p.base_url, p.api_key, p.created_at, p.updated_at;

COMMENT ON VIEW providers_with_models IS '供应商及其模型列表视图（JSON聚合）';

-- ============================================
-- Row Level Security (RLS) 策略设置
-- ============================================

-- 8. 启用 RLS
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE models ENABLE ROW LEVEL SECURITY;

-- 9. 创建 RLS 策略（只有管理员可以管理，普通用户只能读取）

-- Providers 表策略
-- 所有认证用户可以读取供应商
CREATE POLICY "Allow authenticated users to read providers"
  ON providers FOR SELECT
  TO authenticated
  USING (true);

-- 只有管理员可以插入供应商
CREATE POLICY "Allow admins to insert providers"
  ON providers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.role_id
      JOIN users u ON ur.user_id = u.user_id
      WHERE u.clerk_id = auth.uid()::text 
        AND r.role_name = 'admin'
    )
  );

-- 只有管理员可以更新供应商
CREATE POLICY "Allow admins to update providers"
  ON providers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.role_id
      JOIN users u ON ur.user_id = u.user_id
      WHERE u.clerk_id = auth.uid()::text 
        AND r.role_name = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.role_id
      JOIN users u ON ur.user_id = u.user_id
      WHERE u.clerk_id = auth.uid()::text 
        AND r.role_name = 'admin'
    )
  );

-- 只有管理员可以删除供应商
CREATE POLICY "Allow admins to delete providers"
  ON providers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.role_id
      JOIN users u ON ur.user_id = u.user_id
      WHERE u.clerk_id = auth.uid()::text 
        AND r.role_name = 'admin'
    )
  );

-- Models 表策略
-- 所有认证用户可以读取模型
CREATE POLICY "Allow authenticated users to read models"
  ON models FOR SELECT
  TO authenticated
  USING (true);

-- 只有管理员可以插入模型
CREATE POLICY "Allow admins to insert models"
  ON models FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.role_id
      JOIN users u ON ur.user_id = u.user_id
      WHERE u.clerk_id = auth.uid()::text 
        AND r.role_name = 'admin'
    )
  );

-- 只有管理员可以更新模型
CREATE POLICY "Allow admins to update models"
  ON models FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.role_id
      JOIN users u ON ur.user_id = u.user_id
      WHERE u.clerk_id = auth.uid()::text 
        AND r.role_name = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.role_id
      JOIN users u ON ur.user_id = u.user_id
      WHERE u.clerk_id = auth.uid()::text 
        AND r.role_name = 'admin'
    )
  );

-- 只有管理员可以删除模型
CREATE POLICY "Allow admins to delete models"
  ON models FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON ur.role_id = r.role_id
      JOIN users u ON ur.user_id = u.user_id
      WHERE u.clerk_id = auth.uid()::text 
        AND r.role_name = 'admin'
    )
  );

-- ============================================
-- 初始化示例数据（可选）
-- ============================================

-- 10. 插入示例供应商数据
INSERT INTO providers (name, base_url, api_key) VALUES
  ('OpenAI', 'https://api.openai.com/v1', 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'),
  ('Anthropic', 'https://api.anthropic.com/v1', 'sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'),
  ('DeepSeek', 'https://api.deepseek.com/v1', 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx')
ON CONFLICT (name) DO NOTHING;

-- 11. 插入示例模型数据
-- 注意：display_name 采用 "供应商名_模型ID" 格式以保证全局唯一
INSERT INTO models (model_id, display_name, enabled, provider_id) VALUES
  -- OpenAI 官方模型
  ('gpt-4o', 'OpenAI_gpt-4o', true, (SELECT id FROM providers WHERE name = 'OpenAI')),
  ('gpt-4o-mini', 'OpenAI_gpt-4o-mini', true, (SELECT id FROM providers WHERE name = 'OpenAI')),
  ('gpt-4-turbo', 'OpenAI_gpt-4-turbo', true, (SELECT id FROM providers WHERE name = 'OpenAI')),
  ('gpt-3.5-turbo', 'OpenAI_gpt-3.5-turbo', true, (SELECT id FROM providers WHERE name = 'OpenAI')),
  
  -- Anthropic 模型
  ('claude-3-5-sonnet-20241022', 'Anthropic_claude-3.5-sonnet', true, (SELECT id FROM providers WHERE name = 'Anthropic')),
  ('claude-3-opus-20240229', 'Anthropic_claude-3-opus', true, (SELECT id FROM providers WHERE name = 'Anthropic')),
  ('claude-3-haiku-20240307', 'Anthropic_claude-3-haiku', true, (SELECT id FROM providers WHERE name = 'Anthropic')),
  
  -- DeepSeek 模型
  ('deepseek-chat', 'DeepSeek_chat', true, (SELECT id FROM providers WHERE name = 'DeepSeek')),
  ('deepseek-coder', 'DeepSeek_coder', true, (SELECT id FROM providers WHERE name = 'DeepSeek'))
ON CONFLICT (provider_id, model_id) DO NOTHING;

-- ============================================
-- 多供应商相同模型示例
-- ============================================
-- 假设你有一个镜像或第三方供应商也提供 OpenAI 兼容的 API
-- 可以这样插入相同的 model_id，但 display_name 不同：

-- 插入第三方供应商
-- INSERT INTO providers (name, base_url, api_key) VALUES
--   ('OpenAI_Mirror', 'https://api.openai-mirror.com/v1', 'sk-mirror-xxxxxxxxxxxx')
-- ON CONFLICT (name) DO NOTHING;

-- 插入相同的 model_id，但 display_name 不同
-- INSERT INTO models (model_id, display_name, enabled, provider_id) VALUES
--   ('gpt-4o', 'Mirror_gpt-4o', true, (SELECT id FROM providers WHERE name = 'OpenAI_Mirror')),
--   ('gpt-4o-mini', 'Mirror_gpt-4o-mini', true, (SELECT id FROM providers WHERE name = 'OpenAI_Mirror'))
-- ON CONFLICT (provider_id, model_id) DO NOTHING;

-- ============================================
-- 查询示例
-- ============================================

-- 查询所有供应商及统计信息
-- SELECT * FROM providers_with_stats;

-- 查询所有供应商及其模型（JSON格式）
-- SELECT * FROM providers_with_models;

-- 查询特定供应商的所有启用的模型
-- SELECT m.* 
-- FROM models m
-- JOIN providers p ON m.provider_id = p.id
-- WHERE p.name = 'OpenAI' 
--   AND m.enabled = true 
--   AND m.deleted_at IS NULL;

-- 查询所有提供 gpt-4o 的供应商
-- SELECT 
--   p.name AS provider_name,
--   p.base_url,
--   m.display_name,
--   m.enabled
-- FROM models m
-- JOIN providers p ON m.provider_id = p.id
-- WHERE m.model_id = 'gpt-4o'
--   AND m.deleted_at IS NULL
--   AND p.deleted_at IS NULL;

-- 通过 display_name 精确查找特定供应商的模型
-- SELECT * FROM models WHERE display_name = 'OpenAI_gpt-4o';

