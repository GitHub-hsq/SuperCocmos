/* eslint-disable no-console */
// 测试模型管理API的脚本
const baseURL = 'http://localhost:3002'

async function testAPIs() {
  console.log('🧪 开始测试模型管理API...\n')

  // 测试1: 获取模型列表 (GET /api/models)
  try {
    console.log('1️⃣ 测试 GET /api/models')
    const response = await fetch(`${baseURL}/api/models`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    console.log('   状态码:', response.status)
    const data = await response.json()
    console.log('   响应:', JSON.stringify(data, null, 2))
    console.log('   ✅ 成功\n')
  }
  catch (error) {
    console.error('   ❌ 失败:', error.message, '\n')
  }

  // 测试2: 添加模型 (POST /api/models/add)
  try {
    console.log('2️⃣ 测试 POST /api/models/add')
    const testModel = {
      id: `test-model-${Date.now()}`,
      provider: 'TestProvider',
      displayName: 'Test Model',
      enabled: true,
    }
    console.log('   请求数据:', JSON.stringify(testModel, null, 2))

    const response = await fetch(`${baseURL}/api/models/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testModel),
    })
    console.log('   状态码:', response.status)
    const data = await response.json()
    console.log('   响应:', JSON.stringify(data, null, 2))
    console.log('   ✅ 成功\n')
  }
  catch (error) {
    console.error('   ❌ 失败:', error.message, '\n')
  }

  console.log('✅ 测试完成')
}

// 运行测试
testAPIs().catch(console.error)
