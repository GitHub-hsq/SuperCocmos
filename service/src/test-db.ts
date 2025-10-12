/* eslint-disable no-console */
/**
 * 数据库连接测试脚本
 */
import { testConnection } from './utils/db'
import { createUser, findUserByEmail, getAllUsers } from './utils/userService'
import dotenv from 'dotenv'

// 加载环境变量
dotenv.config()

async function main() {
  console.log('🔍 [测试] 开始测试 Supabase 数据库连接...\n')

  try {
    // 1. 测试连接
    console.log('1️⃣ 测试 Supabase 连接...')
    await testConnection()
    console.log('✅ [测试] Supabase 连接成功\n')
    
    // 测试创建用户
    console.log('   - 创建测试用户...')
    const testUser = await createUser(
      'test@example.com',
      'password123',
      'testuser',
      'email'
    )
    console.log('   ✅ 创建用户成功:', testUser.user_id)

    // 测试查找用户
    console.log('   - 查找用户...')
    const foundUser = await findUserByEmail('test@example.com')
    console.log('   ✅ 查找用户成功:', foundUser?.username)

    // 测试获取所有用户
    console.log('   - 获取所有用户...')
    const allUsers = await getAllUsers()
    console.log('   ✅ 获取用户列表成功，共', allUsers.length, '个用户')

    console.log('\n🎉 [测试] 所有测试通过！')
    process.exit(0)
  }
  catch (error: any) {
    console.error('\n❌ [测试] 测试失败:', error.message)
    console.error('\n请检查:')
    console.error('  1. service/.env 文件中的 SUPABASE_URL 和 SUPABASE_ANON_KEY 是否正确')
    console.error('  2. Supabase 项目是否正常运行')
    console.error('  3. 网络连接是否正常')
    console.error('  4. 是否已在 Supabase 控制台创建了 users 表')
    process.exit(1)
  }
}

main()

