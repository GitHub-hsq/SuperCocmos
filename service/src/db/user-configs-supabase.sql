-- ============================================
-- 用户配置表 V2 - Supabase + Clerk 版本
-- ============================================
--
-- ✅ 适用于：Supabase 数据库 + Clerk 认证
-- ✅ 权限控制：通过后端 API 实现（不使用 RLS）
--
-- ⚠️ 执行前提条件：
-- 1. users 表已存在（执行过 00-init-users.sql）
-- 2. providers 和 models 表已存在（执行过 provider-model-schema.sql）
-- 3. update_updated_at_column() 函数已存在（在 00-init-users.sql 中定义）
--
-- ⚠️ 如果已有旧的 user_configs 表，请先在 Supabase 控制台删除：
--    1. 打开 Supabase 控制台 > Table Editor
--    2. 找到 user_configs 表
--    3. 点击右上角的三个点 > Delete table
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
-- 5. 不启用 RLS（通过后端 API 控制权限）
-- ============================================
-- 因为使用 Clerk 认证，不是 Supabase Auth，
-- 所以不启用 RLS，权限完全通过后端 API 来控制。
-- 
-- 你的后端 API 会：
-- 1. 使用 Clerk 验证用户身份
-- 2. 从 JWT 中获取 user_id
-- 3. 只允许用户访问自己的配置
--
-- 如果你以后想启用 RLS，可以使用 service role key，
-- 或者配置自定义的 JWT claims。

-- ============================================
-- 6. 为现有用户初始化默认配置
-- ============================================
-- 执行完上面的 SQL 后，可以运行这个为所有用户创建默认配置：
--
-- INSERT INTO user_configs (user_id)
-- SELECT user_id FROM users
-- ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- 验证安装
-- ============================================
-- 运行以下查询验证表已创建：
--
-- SELECT 
--   table_name, 
--   column_name, 
--   data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'user_configs'
-- ORDER BY ordinal_position;
--
-- 查看已有的配置数量：
--
-- SELECT COUNT(*) as config_count FROM user_configs;
--
-- 查看示例配置：
--
-- SELECT 
--   id,
--   user_id,
--   user_settings,
--   chat_config,
--   created_at
-- FROM user_configs
-- LIMIT 5;

-- ============================================
-- 完成！
-- ============================================
-- ✅ 表结构已创建
-- ✅ 索引已创建
-- ✅ 触发器已创建
-- ✅ 外键已关联到 users 表
--
-- 下一步：
-- 1. 在后端实现 config API
-- 2. 测试配置的读取和更新
-- 3. 在前端集成配置功能

