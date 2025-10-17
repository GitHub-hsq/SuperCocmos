-- ============================================
-- 用户配置表 V2 - 简化版（直接在 Supabase 执行）
-- ============================================
--
-- ⚠️ 执行前提条件：
-- 1. users 表已存在（执行过 00-init-users.sql）
-- 2. providers 和 models 表已存在（执行过 provider-model-schema.sql）
-- 3. update_updated_at_column() 函数已存在（在 00-init-users.sql 中定义）
--
-- ⚠️ 如果已有旧的 user_configs 表，请先删除：
-- DROP TABLE IF EXISTS user_configs CASCADE;
--
-- ============================================

-- ============================================
-- 1. 创建用户配置表
-- ============================================
CREATE TABLE IF NOT EXISTS user_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  
  -- 用户设置（个人信息 + 界面偏好）
  user_settings JSONB DEFAULT '{
    "avatar": "",
    "name": "",
    "theme": "auto",
    "language": "zh-CN"
  }'::jsonb,
  
  -- 聊天配置（默认模型 + 模型参数 + 系统提示词）
  chat_config JSONB DEFAULT '{
    "defaultModel": null,
    "parameters": {
      "temperature": 0.7,
      "topP": 0.9,
      "maxTokens": 4096
    },
    "systemPrompt": "你是一个有帮助的AI助手。",
    "streamEnabled": true
  }'::jsonb,
  
  -- 工作流配置（题目工作流的节点配置）
  workflow_config JSONB DEFAULT '{
    "classify": {
      "displayName": "题目分类",
      "description": "识别题目所属学科",
      "modelId": null,
      "parameters": {
        "temperature": 0.3,
        "topP": 0.8,
        "maxTokens": 2048
      },
      "systemPrompt": null
    },
    "parse_questions": {
      "displayName": "题目解析",
      "description": "提取题目关键信息",
      "modelId": null,
      "parameters": {
        "temperature": 0.5,
        "topP": 0.9,
        "maxTokens": 4096
      },
      "systemPrompt": null,
      "subjectSpecific": {}
    },
    "generate_questions": {
      "displayName": "题目生成",
      "description": "生成新的练习题",
      "modelId": null,
      "parameters": {
        "temperature": 0.8,
        "topP": 0.95,
        "maxTokens": 8192
      },
      "systemPrompt": null,
      "subjectSpecific": {}
    },
    "revise": {
      "displayName": "结果审核",
      "description": "检查题目质量",
      "modelId": null,
      "parameters": {
        "temperature": 0.3,
        "topP": 0.8,
        "maxTokens": 4096
      },
      "systemPrompt": null
    }
  }'::jsonb,
  
  -- 其他扩展配置（预留）
  additional_config JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- 外键约束
  CONSTRAINT user_configs_user_fk 
    FOREIGN KEY (user_id) 
    REFERENCES users(user_id) 
    ON DELETE CASCADE
);

-- ============================================
-- 2. 创建索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_user_configs_user_id ON user_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_configs_user_settings ON user_configs USING gin(user_settings);
CREATE INDEX IF NOT EXISTS idx_user_configs_chat_config ON user_configs USING gin(chat_config);
CREATE INDEX IF NOT EXISTS idx_user_configs_workflow_config ON user_configs USING gin(workflow_config);

-- ============================================
-- 3. 添加表和列注释
-- ============================================
COMMENT ON TABLE user_configs IS '用户配置表 V2（用户设置 + 聊天配置 + 工作流配置）';
COMMENT ON COLUMN user_configs.id IS '配置唯一标识';
COMMENT ON COLUMN user_configs.user_id IS '关联的用户ID（唯一）';
COMMENT ON COLUMN user_configs.user_settings IS '用户个人设置（头像、昵称、主题、语言）';
COMMENT ON COLUMN user_configs.chat_config IS '聊天配置（默认模型、参数、系统提示词、流式输出）';
COMMENT ON COLUMN user_configs.workflow_config IS '工作流配置（题目工作流的4个节点配置）';
COMMENT ON COLUMN user_configs.additional_config IS '额外配置（预留扩展字段）';
COMMENT ON COLUMN user_configs.created_at IS '创建时间';
COMMENT ON COLUMN user_configs.updated_at IS '更新时间';

-- ============================================
-- 4. 创建更新时间触发器
-- ============================================
CREATE TRIGGER user_configs_updated_at
  BEFORE UPDATE ON user_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. 启用 Row Level Security (RLS)
-- ============================================
ALTER TABLE user_configs ENABLE ROW LEVEL SECURITY;

-- 用户只能查看自己的配置
CREATE POLICY "Users can view own config"
  ON user_configs FOR SELECT
  USING (auth.uid()::text = user_id::text);

-- 用户只能插入自己的配置
CREATE POLICY "Users can insert own config"
  ON user_configs FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

-- 用户只能更新自己的配置
CREATE POLICY "Users can update own config"
  ON user_configs FOR UPDATE
  USING (auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid()::text = user_id::text);

-- 用户只能删除自己的配置
CREATE POLICY "Users can delete own config"
  ON user_configs FOR DELETE
  USING (auth.uid()::text = user_id::text);

-- ============================================
-- 6. 为现有用户初始化默认配置（可选）
-- ============================================
-- 执行完上面的 SQL 后，运行这个来为所有已存在的用户创建配置：
-- INSERT INTO user_configs (user_id)
-- SELECT user_id FROM users
-- ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- 完成！
-- ============================================
-- 现在你可以通过 Supabase 客户端或 API 访问和修改配置了

