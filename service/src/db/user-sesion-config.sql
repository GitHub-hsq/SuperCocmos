-- ============================================
-- 用户聊天系统数据库表结构
-- 关系链: Users (1) -> (1) UserConfigs
--        Users (1) -> (N) Conversations
--        Conversations (1) -> (N) Messages
-- ============================================
--
-- ⚠️ 执行顺序警告 ⚠️
-- 此文件依赖以下表，请确保先执行：
-- 1. 00-init-users.sql (创建 users 表)
-- 2. provider-model-schema.sql (创建 providers 和 models 表)
-- 3. schema.sql (创建 roles 和 user_roles 表)
-- 然后再执行本文件
--
-- ============================================

-- 1. 优化用户表（添加注释和索引）
-- 如果需要修改现有表，可以只执行 COMMENT 部分
COMMENT ON TABLE users IS '用户基础信息表';
COMMENT ON COLUMN users.user_id IS '用户唯一标识';
COMMENT ON COLUMN users.username IS '用户名';
COMMENT ON COLUMN users.password IS '密码（建议加密存储）';
COMMENT ON COLUMN users.email IS '电子邮箱';
COMMENT ON COLUMN users.phone IS '手机号码';
COMMENT ON COLUMN users.status IS '账户状态（0-禁用，1-启用）';
COMMENT ON COLUMN users.login_method IS '登录方式（email/phone/oauth）';
COMMENT ON COLUMN users.created_at IS '创建时间';
COMMENT ON COLUMN users.updated_at IS '更新时间';
COMMENT ON COLUMN users.last_login_at IS '最后登录时间';
COMMENT ON COLUMN users.department_id IS '所属部门ID';

-- 为用户表添加索引（如果还没有）
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- ============================================
-- 2. 创建用户配置表（存储用户的默认设置）
-- ============================================
CREATE TABLE IF NOT EXISTS user_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  default_model_id UUID, -- 默认选择的模型
  default_provider_id UUID, -- 默认选择的供应商
  temperature DECIMAL(3,2) DEFAULT 0.70 CHECK (temperature >= 0 AND temperature <= 2),
  top_p DECIMAL(3,2) DEFAULT 1.00 CHECK (top_p >= 0 AND top_p <= 1),
  max_tokens INTEGER DEFAULT 2048 CHECK (max_tokens > 0),
  system_prompt TEXT DEFAULT '你是一个有帮助的AI助手。',
  stream_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- 外键约束
  CONSTRAINT user_configs_user_fk 
    FOREIGN KEY (user_id) 
    REFERENCES users(user_id) 
    ON DELETE CASCADE,
  
  CONSTRAINT user_configs_model_fk 
    FOREIGN KEY (default_model_id) 
    REFERENCES models(id) 
    ON DELETE SET NULL,
  
  CONSTRAINT user_configs_provider_fk 
    FOREIGN KEY (default_provider_id) 
    REFERENCES providers(id) 
    ON DELETE SET NULL,
  
  -- 唯一约束：一个用户只有一条配置记录
  CONSTRAINT user_configs_user_unique UNIQUE(user_id)
);

-- 添加注释
COMMENT ON TABLE user_configs IS '用户配置表（存储用户的默认聊天设置）';
COMMENT ON COLUMN user_configs.id IS '配置唯一标识';
COMMENT ON COLUMN user_configs.user_id IS '关联的用户ID';
COMMENT ON COLUMN user_configs.default_model_id IS '默认使用的模型ID';
COMMENT ON COLUMN user_configs.default_provider_id IS '默认使用的供应商ID';
COMMENT ON COLUMN user_configs.temperature IS '温度参数（0-2），控制输出随机性';
COMMENT ON COLUMN user_configs.top_p IS 'Top-P 参数（0-1），核采样阈值';
COMMENT ON COLUMN user_configs.max_tokens IS '最大生成 token 数量';
COMMENT ON COLUMN user_configs.system_prompt IS '系统提示词';
COMMENT ON COLUMN user_configs.stream_enabled IS '是否启用流式输出';
COMMENT ON COLUMN user_configs.created_at IS '创建时间';
COMMENT ON COLUMN user_configs.updated_at IS '更新时间';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_configs_user_id ON user_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_configs_model_id ON user_configs(default_model_id);
CREATE INDEX IF NOT EXISTS idx_user_configs_provider_id ON user_configs(default_provider_id);

-- ============================================
-- 3. 创建对话会话表（每个对话的元信息）
-- ============================================
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title VARCHAR(500) DEFAULT '新对话',
  model_id UUID NOT NULL,
  provider_id UUID NOT NULL,
  temperature DECIMAL(3,2) DEFAULT 0.70 CHECK (temperature >= 0 AND temperature <= 2),
  top_p DECIMAL(3,2) DEFAULT 1.00 CHECK (top_p >= 0 AND top_p <= 1),
  max_tokens INTEGER DEFAULT 2048 CHECK (max_tokens > 0),
  system_prompt TEXT,
  total_tokens INTEGER DEFAULT 0,
  message_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- 外键约束
  CONSTRAINT conversations_user_fk 
    FOREIGN KEY (user_id) 
    REFERENCES users(user_id) 
    ON DELETE CASCADE,
  
  CONSTRAINT conversations_model_fk 
    FOREIGN KEY (model_id) 
    REFERENCES models(id) 
    ON DELETE RESTRICT, -- 防止删除正在使用的模型
  
  CONSTRAINT conversations_provider_fk 
    FOREIGN KEY (provider_id) 
    REFERENCES providers(id) 
    ON DELETE RESTRICT -- 防止删除正在使用的供应商
);

-- 添加注释
COMMENT ON TABLE conversations IS '对话会话表（存储每个对话的基本信息和配置）';
COMMENT ON COLUMN conversations.id IS '对话唯一标识';
COMMENT ON COLUMN conversations.user_id IS '所属用户ID';
COMMENT ON COLUMN conversations.title IS '对话标题（可自动生成或用户自定义）';
COMMENT ON COLUMN conversations.model_id IS '本对话使用的模型ID';
COMMENT ON COLUMN conversations.provider_id IS '本对话使用的供应商ID';
COMMENT ON COLUMN conversations.temperature IS '本对话的温度参数';
COMMENT ON COLUMN conversations.top_p IS '本对话的 Top-P 参数';
COMMENT ON COLUMN conversations.max_tokens IS '本对话的最大 token 数';
COMMENT ON COLUMN conversations.system_prompt IS '本对话的系统提示词';
COMMENT ON COLUMN conversations.total_tokens IS '对话累计使用的 token 数';
COMMENT ON COLUMN conversations.message_count IS '对话消息总数';
COMMENT ON COLUMN conversations.created_at IS '创建时间';
COMMENT ON COLUMN conversations.updated_at IS '最后更新时间';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_model_id ON conversations(model_id);
CREATE INDEX IF NOT EXISTS idx_conversations_provider_id ON conversations(provider_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);

-- ============================================
-- 4. 创建聊天消息表（存储具体的聊天内容）
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  tokens INTEGER DEFAULT 0,
  model_info JSONB, -- 存储模型响应的额外信息（如 finish_reason 等）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- 外键约束
  CONSTRAINT messages_conversation_fk 
    FOREIGN KEY (conversation_id) 
    REFERENCES conversations(id) 
    ON DELETE CASCADE -- 删除对话时级联删除所有消息
);

-- 添加注释
COMMENT ON TABLE messages IS '聊天消息表（存储对话中的所有消息）';
COMMENT ON COLUMN messages.id IS '消息唯一标识';
COMMENT ON COLUMN messages.conversation_id IS '所属对话ID';
COMMENT ON COLUMN messages.role IS '消息角色（user-用户，assistant-AI助手，system-系统）';
COMMENT ON COLUMN messages.content IS '消息内容';
COMMENT ON COLUMN messages.tokens IS '消息使用的 token 数量';
COMMENT ON COLUMN messages.model_info IS '模型响应的元数据（JSON格式）';
COMMENT ON COLUMN messages.created_at IS '消息创建时间';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_role ON messages(role);

-- ============================================
-- 5. 创建自动更新触发器
-- ============================================

-- 为 user_configs 表添加更新触发器
CREATE TRIGGER user_configs_updated_at
  BEFORE UPDATE ON user_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 为 conversations 表添加更新触发器
CREATE TRIGGER conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. 创建有用的视图
-- ============================================

-- 用户对话列表视图（含最新消息预览）
CREATE OR REPLACE VIEW user_conversations_view AS
SELECT 
  c.id AS conversation_id,
  c.user_id,
  c.title,
  c.message_count,
  c.total_tokens,
  c.created_at,
  c.updated_at,
  m.display_name AS model_name,
  p.name AS provider_name,
  (
    SELECT content 
    FROM messages 
    WHERE conversation_id = c.id 
    ORDER BY created_at DESC 
    LIMIT 1
  ) AS last_message,
  (
    SELECT created_at 
    FROM messages 
    WHERE conversation_id = c.id 
    ORDER BY created_at DESC 
    LIMIT 1
  ) AS last_message_time
FROM conversations c
LEFT JOIN models m ON c.model_id = m.id
LEFT JOIN providers p ON c.provider_id = p.id
ORDER BY c.updated_at DESC;

COMMENT ON VIEW user_conversations_view IS '用户对话列表视图（包含最新消息预览）';

-- 对话详情视图（含所有消息）
CREATE OR REPLACE VIEW conversation_details_view AS
SELECT 
  c.id AS conversation_id,
  c.user_id,
  c.title,
  c.temperature,
  c.top_p,
  c.max_tokens,
  c.system_prompt,
  c.total_tokens,
  c.message_count,
  c.created_at AS conversation_created_at,
  m.display_name AS model_name,
  m.model_id,
  p.name AS provider_name,
  p.base_url AS provider_url,
  json_agg(
    json_build_object(
      'id', msg.id,
      'role', msg.role,
      'content', msg.content,
      'tokens', msg.tokens,
      'createdAt', msg.created_at
    ) ORDER BY msg.created_at ASC
  ) FILTER (WHERE msg.id IS NOT NULL) AS messages
FROM conversations c
LEFT JOIN models m ON c.model_id = m.id
LEFT JOIN providers p ON c.provider_id = p.id
LEFT JOIN messages msg ON c.id = msg.conversation_id
GROUP BY c.id, c.user_id, c.title, c.temperature, c.top_p, c.max_tokens, 
         c.system_prompt, c.total_tokens, c.message_count, c.created_at,
         m.display_name, m.model_id, p.name, p.base_url;

COMMENT ON VIEW conversation_details_view IS '对话详情视图（包含完整消息列表）';

-- ============================================
-- 7. Row Level Security (RLS) 策略
-- ============================================

-- 启用 RLS
ALTER TABLE user_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- user_configs 表策略（用户只能访问自己的配置）
CREATE POLICY "Users can view own config"
  ON user_configs FOR SELECT
  TO authenticated
  USING (user_id::text = current_setting('request.jwt.claims', true)::json->>'user_id');

CREATE POLICY "Users can insert own config"
  ON user_configs FOR INSERT
  TO authenticated
  WITH CHECK (user_id::text = current_setting('request.jwt.claims', true)::json->>'user_id');

CREATE POLICY "Users can update own config"
  ON user_configs FOR UPDATE
  TO authenticated
  USING (user_id::text = current_setting('request.jwt.claims', true)::json->>'user_id')
  WITH CHECK (user_id::text = current_setting('request.jwt.claims', true)::json->>'user_id');

-- conversations 表策略（用户只能访问自己的对话）
CREATE POLICY "Users can view own conversations"
  ON conversations FOR SELECT
  TO authenticated
  USING (user_id::text = current_setting('request.jwt.claims', true)::json->>'user_id');

CREATE POLICY "Users can insert own conversations"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (user_id::text = current_setting('request.jwt.claims', true)::json->>'user_id');

CREATE POLICY "Users can update own conversations"
  ON conversations FOR UPDATE
  TO authenticated
  USING (user_id::text = current_setting('request.jwt.claims', true)::json->>'user_id')
  WITH CHECK (user_id::text = current_setting('request.jwt.claims', true)::json->>'user_id');

CREATE POLICY "Users can delete own conversations"
  ON conversations FOR DELETE
  TO authenticated
  USING (user_id::text = current_setting('request.jwt.claims', true)::json->>'user_id');

-- messages 表策略（用户只能访问自己对话中的消息）
CREATE POLICY "Users can view own messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = messages.conversation_id 
        AND conversations.user_id::text = current_setting('request.jwt.claims', true)::json->>'user_id'
    )
  );

CREATE POLICY "Users can insert messages to own conversations"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = messages.conversation_id 
        AND conversations.user_id::text = current_setting('request.jwt.claims', true)::json->>'user_id'
    )
  );

CREATE POLICY "Users can update own messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = messages.conversation_id 
        AND conversations.user_id::text = current_setting('request.jwt.claims', true)::json->>'user_id'
    )
  );

CREATE POLICY "Users can delete own messages"
  ON messages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations 
      WHERE conversations.id = messages.conversation_id 
        AND conversations.user_id::text = current_setting('request.jwt.claims', true)::json->>'user_id'
    )
  );

-- ============================================
-- 8. 初始化示例：为现有用户创建默认配置
-- ============================================
-- 取消下面的注释来为已有用户创建默认配置
/*
INSERT INTO user_configs (user_id)
SELECT user_id FROM users
ON CONFLICT (user_id) DO NOTHING;
*/