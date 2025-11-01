/**
 * 配置检查工具
 * 运行: cd service && pnpm esno check-config.ts
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

console.warn('🔍 [检查] 开始检查配置...\n')
console.warn('='.repeat(60))

// 1. 检查环境变量
console.warn('\n📝 [步骤 1/3] 检查环境变量...\n')

const envChecks = [
  {
    // Clerk 相关环境变量已移除，现在使用 Auth0
    expected: 'sk_test_ 或 sk_live_ 开头',
    validator: (v: string) => v.startsWith('sk_test_') || v.startsWith('sk_live_'),
  },
  // Clerk 相关环境变量已移除，现在使用 Auth0
  {
    name: 'SUPABASE_URL',
    value: process.env.SUPABASE_URL,
    expected: 'https://...supabase.co',
    validator: (v: string) => v.startsWith('https://') && v.includes('supabase'),
  },
  {
    name: 'SUPABASE_ANON_KEY',
    value: process.env.SUPABASE_ANON_KEY,
    expected: '长字符串 (JWT token)',
    validator: (v: string) => v.length > 100,
  },
]

let envOk = true

for (const check of envChecks) {
  if (!check.value) {
    console.warn(`❌ ${check.name}: 未配置`)
    console.warn(`   期望: ${check.expected}\n`)
    envOk = false
  }
  else if (!check.validator(check.value)) {
    console.warn(`⚠️  ${check.name}: 配置格式可能有误`)
    console.warn(`   当前值: ${check.value.substring(0, 20)}...`)
    console.warn(`   期望: ${check.expected}\n`)
    envOk = false
  }
  else {
    const masked = `${check.value.substring(0, 15)}...`
    console.warn(`✅ ${check.name}: ${masked}`)
  }
}

if (!envOk) {
  console.warn('\n⚠️  请检查 service/.env 文件配置')
  process.exit(1)
}

// 2. 测试 Supabase 连接
console.warn('\n='.repeat(60))
console.warn('\n📝 [步骤 2/3] 测试 Supabase 连接...\n')

async function testSupabase() {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
    )

    // 测试连接
    const { error: userError } = await supabase
      .from('users')
      .select('count')
      .limit(1)

    if (userError) {
      console.warn(`❌ 连接失败: ${userError.message}`)
      return false
    }

    console.warn('✅ Supabase 连接成功')

    // 检查表是否存在
    console.warn('\n检查必需的表:')

    const tables = ['users', 'roles', 'user_roles']
    for (const table of tables) {
      const { error } = await supabase.from(table).select('count').limit(1)
      if (error) {
        console.warn(`❌ 表 ${table} 不存在或无法访问`)
        console.warn(`   错误: ${error.message}`)
      }
      else {
        console.warn(`✅ 表 ${table} 存在`)
      }
    }

    // 检查角色
    const { data: roles } = await supabase.from('roles').select('role_name')
    if (roles && roles.length > 0) {
      console.warn(`\n✅ 找到 ${roles.length} 个角色: ${roles.map(r => r.role_name).join(', ')}`)
    }
    else {
      console.warn('\n⚠️  roles 表为空，请确保已执行 schema.sql')
    }

    return true
  }
  catch (error: any) {
    console.warn(`❌ 测试失败: ${error.message}`)
    return false
  }
}

// 3. 提供后续步骤
async function main() {
  const supabaseOk = await testSupabase()

  console.warn('\n='.repeat(60))
  console.warn('\n📝 [步骤 3/3] Webhook 配置建议...\n')

  if (envOk && supabaseOk) {
    console.warn('✅ 基本配置正确！\n')
    console.warn('📌 开发环境 Webhook 配置步骤:\n')
    console.warn('1. 启动后端服务:')
    console.warn('   cd service && pnpm start\n')
    console.warn('2. 在另一个终端启动 ngrok:')
    console.warn('   npx ngrok http 3002\n')
    console.warn('3. 复制 ngrok 生成的 URL (如 https://abc123.ngrok.io)')
    console.warn('4. 更新 Auth0 Webhook:')
    console.warn('   - 访问 https://manage.auth0.com')
    console.warn('   - Webhooks -> 选择你的 endpoint')
    console.warn('   - Endpoint URL: https://your-ngrok-url.ngrok.io/api/webhooks/auth0')
    console.warn('   - 确保订阅了: user.created, user.updated, user.deleted\n')
    console.warn('5. 测试同步:')
    console.warn('   - 在 Auth0 Dashboard 创建测试用户')
    console.warn('   - 或访问 http://localhost:1002/#/login 注册')
    console.warn('   - 观察后端日志')
    console.warn('   - 检查 Supabase users 表\n')
    console.warn('💡 关于密码:')
    console.warn('   - OAuth 用户 (Google/GitHub): 不需要密码，password 字段为 NULL')
    console.warn('   - Auth0 管理所有认证，你不需要在 Supabase 存储密码\n')
  }
  else {
    console.warn('❌ 配置有问题，请先解决上述错误\n')
  }

  console.warn('='.repeat(60))
  console.warn('\n📚 详细文档: WEBHOOK_DEBUG_GUIDE.md')
  console.warn('🆘 需要帮助? 查看后端日志或 Auth0 Webhook Attempts\n')
}

main()
