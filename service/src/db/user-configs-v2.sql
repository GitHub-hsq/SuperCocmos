

-- ============================================
-- 2. 创建新版本的用户配置表
-- ============================================
CREATE TABLE IF NOT EXISTS user_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  
  -- 🔹 1. 用户设置（个人信息 + 界面偏好）
  user_settings JSONB DEFAULT '{
    "avatar": "",
    "name": "",
    "theme": "auto",
    "language": "zh-CN"
  }'::jsonb,
  
  -- 🔹 2. 聊天配置（默认模型 + 模型参数 + 系统提示词）
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
  
  -- 🔹 3. 工作流配置（题目工作流的节点配置）
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
  
  -- 🔹 4. 其他扩展配置（预留）
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
-- 3. 创建索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_user_configs_user_id ON user_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_configs_user_settings ON user_configs USING gin(user_settings);
CREATE INDEX IF NOT EXISTS idx_user_configs_chat_config ON user_configs USING gin(chat_config);
CREATE INDEX IF NOT EXISTS idx_user_configs_workflow_config ON user_configs USING gin(workflow_config);

-- ============================================
-- 4. 添加注释
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
-- 5. 创建更新时间触发器
-- ============================================
-- 注意：这里假设 update_updated_at_column() 函数已经存在
-- 如果不存在，请先创建该函数
CREATE TRIGGER user_configs_updated_at
  BEFORE UPDATE ON user_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. Row Level Security (RLS) 策略
-- ============================================
-- 启用 RLS
ALTER TABLE user_configs ENABLE ROW LEVEL SECURITY;

-- 用户只能访问自己的配置
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

CREATE POLICY "Users can delete own config"
  ON user_configs FOR DELETE
  TO authenticated
  USING (user_id::text = current_setting('request.jwt.claims', true)::json->>'user_id');

-- ============================================
-- 7. 初始化现有用户的默认配置（可选）
-- ============================================
-- 为所有已存在的用户创建默认配置
-- 取消注释下面的语句来执行初始化
/*
INSERT INTO user_configs (user_id)
SELECT user_id FROM users
WHERE NOT EXISTS (
  SELECT 1 FROM user_configs WHERE user_configs.user_id = users.user_id
);
*/

-- ============================================
-- 9. 有用的查询示例
-- ============================================

-- 查询某个用户的完整配置
-- SELECT * FROM user_configs WHERE user_id = 'your-user-id';

-- 查询某个用户的聊天配置
-- SELECT chat_config FROM user_configs WHERE user_id = 'your-user-id';

-- 更新用户的主题设置
-- UPDATE user_configs 
-- SET user_settings = jsonb_set(user_settings, '{theme}', '"dark"')
-- WHERE user_id = 'your-user-id';

-- 查询使用特定模型的用户数量
-- SELECT 
--   chat_config->'defaultModel'->>'modelId' as model_id,
--   COUNT(*) as user_count
-- FROM user_configs
-- WHERE chat_config->'defaultModel'->>'modelId' IS NOT NULL
-- GROUP BY model_id;

