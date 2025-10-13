/* eslint-disable no-console */
/**
 * 测试 Webhook 配置
 * 运行: pnpm esno test-webhook.ts
 */

import dotenv from 'dotenv'

dotenv.config()

console.log('🔍 [测试] 检查 Webhook 配置...\n')

// 检查环境变量
const checks = [
  { name: 'CLERK_SECRET_KEY', value: process.env.CLERK_SECRET_KEY },
  { name: 'CLERK_WEBHOOK_SECRET', value: process.env.CLERK_WEBHOOK_SECRET },
  { name: 'VITE_CLERK_PUBLISHABLE_KEY', value: process.env.VITE_CLERK_PUBLISHABLE_KEY },
  { name: 'SUPABASE_URL', value: process.env.SUPABASE_URL },
  { name: 'SUPABASE_ANON_KEY', value: process.env.SUPABASE_ANON_KEY },
]

let allConfigured = true

for (const check of checks) {
  if (check.value) {
    const maskedValue = `${check.value.substring(0, 10)}...`
    console.log(`✅ ${check.name}: ${maskedValue}`)
  }
  else {
    console.log(`❌ ${check.name}: 未配置`)
    allConfigured = false
  }
}

console.log(`\n${'='.repeat(50)}`)

if (allConfigured) {
  console.log('✅ 所有必需的环境变量都已配置')
  console.log('\n📝 下一步检查:')
  console.log('1. 确认服务器正在运行: http://localhost:3002')
  console.log('2. 检查 Clerk Webhook 配置:')
  console.log('   - Endpoint URL: http://your-ngrok-url.ngrok.io/api/webhooks/clerk')
  console.log('   - 订阅事件: user.created, user.updated, user.deleted')
  console.log('3. 在 Clerk 创建测试用户，观察后端日志')
}
else {
  console.log('❌ 有环境变量未配置，请检查 .env 文件')
}

console.log('='.repeat(50))
