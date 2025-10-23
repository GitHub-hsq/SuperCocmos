import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// 加载环境变量
dotenv.config()

// Supabase 客户端配置
const supabaseUrl = process.env.SUPABASE_URL!
// 服务端优先使用 SERVICE_ROLE_KEY，它有更高的权限并可以绕过 RLS 策略
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('❌ [数据库] 缺少 Supabase 环境变量: SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY (或 SUPABASE_ANON_KEY)')
}

// 创建 Supabase 客户端（使用 SERVICE_ROLE_KEY 绕过 RLS）
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false, // 服务端不需要持久化 session
  },
})

// 测试数据库连接
export async function testConnection() {
  try {
    const { error } = await supabase.from('users').select('count').limit(1)
    if (error) {
      throw error
    }
    console.warn('✅ [数据库] Supabase 连接成功')
    return true
  }
  catch (error: any) {
    console.error('❌ [数据库] Supabase 连接失败:', error.message)
    throw error
  }
}

// 初始化用户表 - 在 Supabase 中通过 SQL 编辑器创建表
export async function initUserTable() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS users (
      user_id BIGSERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE,
      password VARCHAR(100),
      email VARCHAR(100) UNIQUE,
      phone VARCHAR(20) UNIQUE,
      status SMALLINT DEFAULT 1,
      login_method VARCHAR(20) DEFAULT 'email',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      last_login_at TIMESTAMP WITH TIME ZONE,
      department_id BIGINT
    );
    
    -- 创建更新时间触发器
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $$ language 'plpgsql';
    
    CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
  `

  try {
    const { error } = await supabase.rpc('exec_sql', { sql: createTableSQL })
    if (error) {
      console.warn('⚠️  [数据库] 表可能已存在或需要手动创建:', error.message)
    }
    else {
      console.warn('✅ [数据库] 用户表初始化成功')
    }
  }
  catch (error: any) {
    console.warn('⚠️  [数据库] 用户表初始化警告:', error.message)
    console.warn('💡 [数据库] 请在 Supabase 控制台的 SQL 编辑器中手动执行以下 SQL:')
    console.warn(createTableSQL)
  }
}

// 导出 Supabase 客户端供其他模块使用
export default supabase
