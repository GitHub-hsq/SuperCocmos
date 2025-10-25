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
  // Clerk 相关环境变量已移除，现在使用 Auth0
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
  console.log('2. 检查 Auth0 Webhook 配置:')
  console.log('   - Endpoint URL: http://your-ngrok-url.ngrok.io/api/webhooks/auth0')
  console.log('   - 订阅事件: user.created, user.updated, user.deleted')
  console.log('3. 在 Auth0 创建测试用户，观察后端日志')
}
else {
  console.log('❌ 有环境变量未配置，请检查 .env 文件')
}

console.log('='.repeat(50))
