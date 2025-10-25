#!/usr/bin/env node

/**
 * Auth0 配置检查脚本
 * 帮助检查环境变量是否正确配置
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

console.log('🔍 检查 Auth0 配置...\n')

// 读取 .env 文件
let envContent
try {
  envContent = readFileSync(join(__dirname, '.env'), 'utf-8')
}
catch (error) {
  console.error('❌ 错误: 找不到 .env 文件')
  console.log('💡 请先创建 .env 文件：')
  console.log('   cp .env.example .env')
  process.exit(1)
}

// 解析环境变量
const envVars = {}
const lines = envContent.split(/\r?\n/)

lines.forEach((line) => {
  const match = line.match(/^([^#=]+)=(.*)$/)
  if (match) {
    const [, key, value] = match
    envVars[key.trim()] = value.trim()
  }
})

// 检查必需的环境变量
const requiredVars = [
  'VITE_AUTH0_DOMAIN',
  'VITE_AUTH0_CLIENT_ID',
  'VITE_AUTH0_AUDIENCE',
  'VITE_AUTH0_REDIRECT_URI',
]

let hasErrors = false

console.log('📋 环境变量检查:\n')

requiredVars.forEach((varName) => {
  const value = envVars[varName]

  const isDefault = !value
    || value === ''
    || value.includes('your-tenant')
    || value.includes('your-client-id')
    || value.includes('your-')

  if (isDefault) {
    console.log(`❌ ${varName}: ${value ? '使用默认值' : '未配置'}`)
    hasErrors = true
  }
  else {
    console.log(`✅ ${varName}: ${value}`)
  }
})

// 检查 REDIRECT_URI 端口
const redirectUri = envVars.VITE_AUTH0_REDIRECT_URI
if (redirectUri) {
  const match = redirectUri.match(/:(\d+)/)
  if (match) {
    const port = match[1]
    if (port !== '1002') {
      console.log(`\n⚠️  警告: REDIRECT_URI 端口是 ${port}，但前端运行在 1002`)
      console.log('   请确保端口一致，或修改 vite.config.ts 中的端口配置')
    }
  }
}

console.log('\n📝 Auth0 Dashboard 配置检查清单:\n')
console.log('请登录 Auth0 Dashboard 并确认以下配置：')
console.log(`   1. Allowed Callback URLs 包含: ${envVars.VITE_AUTH0_REDIRECT_URI || 'http://localhost:1002'}`)
console.log(`   2. Allowed Logout URLs 包含: ${envVars.VITE_AUTH0_REDIRECT_URI || 'http://localhost:1002'}`)
console.log(`   3. Allowed Web Origins 包含: ${envVars.VITE_AUTH0_REDIRECT_URI || 'http://localhost:1002'}`)
console.log(`   4. API (${envVars.VITE_AUTH0_AUDIENCE || 'http://supercocmos.com'}) 的 RBAC 已启用`)
console.log('   5. API 的 "Add Permissions in the Access Token" 已启用\n')

if (hasErrors) {
  console.log('❌ 配置检查失败，请修复上述错误后重试\n')
  process.exit(1)
}
else {
  console.log('✅ 环境变量配置正确！\n')
  console.log('🚀 现在可以运行: pnpm dev\n')
}
