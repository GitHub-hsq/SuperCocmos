// 快速验证环境变量
require('dotenv').config()

console.warn('🔍 检查环境变量...\n')

const checks = [
  { name: 'SUPABASE_URL', value: process.env.SUPABASE_URL },
  { name: 'SUPABASE_ANON_KEY', value: process.env.SUPABASE_ANON_KEY },
  // Clerk 相关环境变量已移除，现在使用 Auth0
]

let allOk = true

checks.forEach((check) => {
  if (check.value) {
    const preview = `${check.value.substring(0, 20)}...`
    console.warn(`✅ ${check.name}: ${preview}`)
  }
  else {
    console.error(`❌ ${check.name}: 未配置`)
    allOk = false
  }
})

if (allOk) {
  console.warn('\n✅ 所有环境变量都已正确配置！')
}
else {
  console.error('\n❌ 有环境变量缺失，请检查 service/.env 文件')
}
