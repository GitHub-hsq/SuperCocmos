/* eslint-disable no-console */
/**
 * 配置检查工具
 * 运行: cd service && pnpm esno check-config.ts
 */

import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config()

console.log('🔍 [检查] 开始检查配置...\n')
console.log('='.repeat(60))

// 1. 检查环境变量
console.log('\n📝 [步骤 1/3] 检查环境变量...\n')

const envChecks = [
  {
    name: 'CLERK_SECRET_KEY',
    value: process.env.CLERK_SECRET_KEY,
    expected: 'sk_test_ 或 sk_live_ 开头',
    validator: (v: string) => v.startsWith('sk_test_') || v.startsWith('sk_live_'),
  },
  {
    name: 'CLERK_WEBHOOK_SECRET',
    value: process.env.CLERK_WEBHOOK_SECRET,
    expected: 'whsec_ 开头',
    validator: (v: string) => v.startsWith('whsec_'),
  },
  {
    name: 'VITE_CLERK_PUBLISHABLE_KEY',
    value: process.env.VITE_CLERK_PUBLISHABLE_KEY,
    expected: 'pk_test_ 或 pk_live_ 开头',
    validator: (v: string) => v.startsWith('pk_test_') || v.startsWith('pk_live_'),
  },
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
    console.log(`❌ ${check.name}: 未配置`)
    console.log(`   期望: ${check.expected}\n`)
    envOk = false
  }
  else if (!check.validator(check.value)) {
    console.log(`⚠️  ${check.name}: 配置格式可能有误`)
    console.log(`   当前值: ${check.value.substring(0, 20)}...`)
    console.log(`   期望: ${check.expected}\n`)
    envOk = false
  }
  else {
    const masked = check.value.substring(0, 15) + '...'
    console.log(`✅ ${check.name}: ${masked}`)
  }
}

if (!envOk) {
  console.log('\n⚠️  请检查 service/.env 文件配置')
  process.exit(1)
}

// 2. 测试 Supabase 连接
console.log('\n='.repeat(60))
console.log('\n📝 [步骤 2/3] 测试 Supabase 连接...\n')

async function testSupabase() {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
    )

    // 测试连接
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('count')
      .limit(1)

    if (userError) {
      console.log(`❌ 连接失败: ${userError.message}`)
      return false
    }

    console.log('✅ Supabase 连接成功')

    // 检查表是否存在
    console.log('\n检查必需的表:')

    const tables = ['users', 'roles', 'user_roles']
    for (const table of tables) {
      const { error } = await supabase.from(table).select('count').limit(1)
      if (error) {
        console.log(`❌ 表 ${table} 不存在或无法访问`)
        console.log(`   错误: ${error.message}`)
      }
      else {
        console.log(`✅ 表 ${table} 存在`)
      }
    }

    // 检查角色
    const { data: roles } = await supabase.from('roles').select('role_name')
    if (roles && roles.length > 0) {
      console.log(`\n✅ 找到 ${roles.length} 个角色: ${roles.map(r => r.role_name).join(', ')}`)
    }
    else {
      console.log('\n⚠️  roles 表为空，请确保已执行 schema.sql')
    }

    return true
  }
  catch (error: any) {
    console.log(`❌ 测试失败: ${error.message}`)
    return false
  }
}

// 3. 提供后续步骤
async function main() {
  const supabaseOk = await testSupabase()

  console.log('\n='.repeat(60))
  console.log('\n📝 [步骤 3/3] Webhook 配置建议...\n')

  if (envOk && supabaseOk) {
    console.log('✅ 基本配置正确！\n')
    console.log('📌 开发环境 Webhook 配置步骤:\n')
    console.log('1. 启动后端服务:')
    console.log('   cd service && pnpm start\n')
    console.log('2. 在另一个终端启动 ngrok:')
    console.log('   npx ngrok http 3002\n')
    console.log('3. 复制 ngrok 生成的 URL (如 https://abc123.ngrok.io)')
    console.log('4. 更新 Clerk Webhook:')
    console.log('   - 访问 https://dashboard.clerk.com')
    console.log('   - Webhooks -> 选择你的 endpoint')
    console.log('   - Endpoint URL: https://your-ngrok-url.ngrok.io/api/webhooks/clerk')
    console.log('   - 确保订阅了: user.created, user.updated, user.deleted\n')
    console.log('5. 测试同步:')
    console.log('   - 在 Clerk Dashboard 创建测试用户')
    console.log('   - 或访问 http://localhost:1002/#/login 注册')
    console.log('   - 观察后端日志')
    console.log('   - 检查 Supabase users 表\n')
    console.log('💡 关于密码:')
    console.log('   - OAuth 用户 (Google/GitHub): 不需要密码，password 字段为 NULL')
    console.log('   - Clerk 管理所有认证，你不需要在 Supabase 存储密码\n')
  }
  else {
    console.log('❌ 配置有问题，请先解决上述错误\n')
  }

  console.log('='.repeat(60))
  console.log('\n📚 详细文档: WEBHOOK_DEBUG_GUIDE.md')
  console.log('🆘 需要帮助? 查看后端日志或 Clerk Webhook Attempts\n')
}

main()

