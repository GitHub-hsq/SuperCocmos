-- ============================================
-- 添加前端 UUID 字段到 conversations 表
-- 用于保存前端路由使用的 nanoid，实现跨浏览器映射
-- ============================================

-- 添加字段
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS frontend_uuid VARCHAR(50);

-- 添加注释
COMMENT ON COLUMN conversations.frontend_uuid IS '前端路由使用的 nanoid（用于跨浏览器映射）';

-- 创建索引（提升查询性能）
CREATE INDEX IF NOT EXISTS idx_conversations_frontend_uuid ON conversations(frontend_uuid);

-- 添加唯一约束（可选，确保 frontend_uuid 不重复）
-- ALTER TABLE conversations ADD CONSTRAINT unique_frontend_uuid UNIQUE (frontend_uuid);

-- 查看表结构
\d conversations;

