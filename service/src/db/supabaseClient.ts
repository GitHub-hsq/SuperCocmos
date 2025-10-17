import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// 加载环境变量
dotenv.config()
// 从环境变量获取 Supabase 配置
const supabaseUrl = process.env.SUPABASE_URL
// 服务端使用 SERVICE_ROLE_KEY 绕过 RLS 策略
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ [Supabase] 缺少必要的环境变量: SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY')
  throw new Error('Missing Supabase configuration')
}

// 创建 Supabase 客户端（使用 SERVICE_ROLE_KEY 绕过 RLS）
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false, // 服务端不需要持久化 session
  },
})

// 测试连接
export async function testSupabaseConnection() {
  try {
    const { error } = await supabase.from('users').select('count').limit(1)
    if (error)
      throw error
    console.warn('✅ [Supabase] 连接成功')
    return true
  }
  catch (error: any) {
    console.error('❌ [Supabase] 连接失败:', error.message)
    return false
  }
}
