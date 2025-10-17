-- ============================================
-- 基础用户表创建脚本
-- 必须首先执行此文件，其他表依赖于此表
-- ============================================

-- 创建自动更新 updated_at 的触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建用户表（核心表）
CREATE TABLE IF NOT EXISTS users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255),
  email VARCHAR(100),
  phone VARCHAR(20),
  status INTEGER DEFAULT 1 CHECK (status IN (0, 1)),
  login_method VARCHAR(20) DEFAULT 'email',
  clerk_id VARCHAR(255),
  avatar_url VARCHAR(500),
  provider VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP WITH TIME ZONE,
  department_id VARCHAR(50)
);

-- 添加注释
COMMENT ON TABLE users IS '用户基础信息表';
COMMENT ON COLUMN users.user_id IS '用户唯一标识';
COMMENT ON COLUMN users.username IS '用户名';
COMMENT ON COLUMN users.password IS '密码（建议加密存储，OAuth 用户可为 NULL）';
COMMENT ON COLUMN users.email IS '电子邮箱';
COMMENT ON COLUMN users.phone IS '手机号码';
COMMENT ON COLUMN users.status IS '账户状态（0-禁用，1-启用）';
COMMENT ON COLUMN users.login_method IS '登录方式（email/phone/oauth）';
COMMENT ON COLUMN users.clerk_id IS 'Clerk 认证 ID';
COMMENT ON COLUMN users.avatar_url IS '用户头像 URL';
COMMENT ON COLUMN users.provider IS '认证提供商';
COMMENT ON COLUMN users.created_at IS '创建时间';
COMMENT ON COLUMN users.updated_at IS '更新时间';
COMMENT ON COLUMN users.last_login_at IS '最后登录时间';
COMMENT ON COLUMN users.department_id IS '所属部门ID';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id) WHERE clerk_id IS NOT NULL;

-- 创建部分唯一索引（允许 NULL 值，但非 NULL 值必须唯一）
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users(email) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_clerk_id_unique ON users(clerk_id) WHERE clerk_id IS NOT NULL;

-- 创建更新触发器
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 插入测试用户（可选，生产环境请删除）
-- INSERT INTO users (user_id, username, password, email, status) VALUES
--   ('admin', 'admin', '$2b$10$...', 'admin@example.com', 1),
--   ('test_user', 'testuser', '$2b$10$...', 'test@example.com', 1)
-- ON CONFLICT (user_id) DO NOTHING;

