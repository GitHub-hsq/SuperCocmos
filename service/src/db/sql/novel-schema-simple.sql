-- ============================================================
-- 小说工作流数据库表结构（简化版 - 无外键约束）
-- ============================================================
-- 说明：此版本不使用外键约束，避免依赖问题
-- 应用层需要保证数据一致性

-- ============================================================
-- 1. 小说项目表
-- ============================================================
CREATE TABLE IF NOT EXISTS novels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  genre VARCHAR(100),                    -- 玄幻、言情、科幻等
  theme TEXT,                             -- 主题：如"成长与牺牲"
  idea TEXT,                              -- 初始 idea
  status VARCHAR(50) DEFAULT 'planning',  -- planning, writing, completed
  current_volume INT DEFAULT 1,
  total_volumes INT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 2. 卷(Volume)表
-- ============================================================
CREATE TABLE IF NOT EXISTS novel_volumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  novel_id UUID NOT NULL,
  volume_number INT NOT NULL,

  -- 工作流产出物
  outline TEXT,                           -- 10章大纲 (Markdown)
  style_config JSONB,                     -- 风格配置 {perspective, rhythm, tone}
  breakdown JSONB,                        -- 章节拆解表
  tasks JSONB,                            -- 任务面板 JSON

  -- 状态管理
  status VARCHAR(50) DEFAULT 'outlining', -- outlining, styling, tasking, writing, completed, archived
  locked BOOLEAN DEFAULT false,           -- 封存后无法修改

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(novel_id, volume_number)
);

-- ============================================================
-- 3. 章节表
-- ============================================================
CREATE TABLE IF NOT EXISTS novel_chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  volume_id UUID NOT NULL,
  chapter_number INT NOT NULL,
  title VARCHAR(255),
  content TEXT,                           -- 章节正文 (~3000字)
  burst_point TEXT,                       -- 爆点描述
  score INT DEFAULT 0,                    -- 审查评分 (0-100)
  status VARCHAR(50) DEFAULT 'pending',   -- pending, generating, reviewing, completed
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(volume_id, chapter_number)
);

-- ============================================================
-- 4. 工作流执行记录表
-- ============================================================
CREATE TABLE IF NOT EXISTS novel_workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  volume_id UUID NOT NULL,
  workflow_type INT NOT NULL,             -- 1, 2, 3, 4
  status VARCHAR(50) DEFAULT 'running',   -- running, completed, failed, stopped
  input JSONB,                            -- 工作流输入
  output JSONB,                           -- 工作流输出
  error TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- ============================================================
-- 5. 聊天历史表(用于用户与 AI 角色的对话)
-- ============================================================
CREATE TABLE IF NOT EXISTS novel_chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  volume_id UUID NOT NULL,
  workflow_type INT NOT NULL,             -- 1=编剧, 2=导演, 3=任务, 4=章节
  ai_role VARCHAR(50) NOT NULL,           -- screenwriter, director, task, chapter
  messages JSONB NOT NULL DEFAULT '[]',   -- [{role, content, timestamp}]
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(volume_id, workflow_type, ai_role)
);

-- ============================================================
-- 索引优化
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_novels_user_id ON novels(user_id);
CREATE INDEX IF NOT EXISTS idx_novels_status ON novels(status);
CREATE INDEX IF NOT EXISTS idx_novel_volumes_novel_id ON novel_volumes(novel_id);
CREATE INDEX IF NOT EXISTS idx_novel_volumes_status ON novel_volumes(status);
CREATE INDEX IF NOT EXISTS idx_novel_chapters_volume_id ON novel_chapters(volume_id);
CREATE INDEX IF NOT EXISTS idx_novel_chapters_status ON novel_chapters(status);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_volume_id ON novel_workflow_executions(volume_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON novel_workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_volume_id ON novel_chat_sessions(volume_id);

-- ============================================================
-- 触发器：自动更新 updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 删除旧的触发器(如果存在)
DROP TRIGGER IF EXISTS update_novels_updated_at ON novels;
DROP TRIGGER IF EXISTS update_novel_volumes_updated_at ON novel_volumes;
DROP TRIGGER IF EXISTS update_novel_chapters_updated_at ON novel_chapters;
DROP TRIGGER IF EXISTS update_novel_chat_sessions_updated_at ON novel_chat_sessions;

-- 创建触发器
CREATE TRIGGER update_novels_updated_at BEFORE UPDATE ON novels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_novel_volumes_updated_at BEFORE UPDATE ON novel_volumes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_novel_chapters_updated_at BEFORE UPDATE ON novel_chapters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_novel_chat_sessions_updated_at BEFORE UPDATE ON novel_chat_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 完成！
-- ============================================================
-- 使用说明：
-- 1. 在 Supabase SQL Editor 中执行此脚本
-- 2. 所有表都使用 IF NOT EXISTS，可以安全重复执行
-- 3. 没有外键约束，不依赖其他表的存在
-- 4. 索引已优化，适合查询性能
