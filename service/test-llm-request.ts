/**
 * LLM API 请求测试脚本
 * 用于测试后端发送给 LLM 的请求是否正确
 */

import * as dotenv from 'dotenv'
import fetch from 'node-fetch'

dotenv.config()

// 测试配置
// 💡 提示：将下面的 'YOUR_API_KEY_HERE' 替换为你的实际 API Key
const TEST_CONFIGS = [
  {
    name: '聚合AI - o4-mini',
    baseURL: 'https://api.kkyyxx.xyz',
    apiKey: 'sk-muzwYNYDHGAikYsC1VrhJGbm0S1nCLL6C25FJJpqLuzHpkaL', // 🔥 在这里填入你的 API Key
    model: 'claude-sonnet-4-5-20250929',
  },
]

interface ChatCompletionRequest {
  model: string
  messages: Array<{
    role: 'system' | 'user' | 'assistant'
    content: string
  }>
  temperature?: number
  top_p?: number
  max_tokens?: number
  stream?: boolean
}

/**
 * 测试 OpenAI 兼容的 Chat Completions API
 */
async function testChatCompletionsAPI(config: typeof TEST_CONFIGS[0]) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`🧪 测试: ${config.name}`)
  console.log(`${'='.repeat(60)}`)
  console.log(`📍 Base URL: ${config.baseURL}`)
  console.log(`🤖 Model: ${config.model}`)
  console.log(`🔑 API Key: ${config.apiKey ? `***${config.apiKey.slice(-4)}` : '未配置'}`)

  if (!config.apiKey) {
    console.error('❌ API Key 未配置，跳过测试')
    return
  }

  const url = `${config.baseURL}/v1/chat/completions`

  const requestBody: ChatCompletionRequest = {
    model: config.model,
    messages: [
      {
        role: 'system',
        content: '你是一个友好的AI助手。',
      },
      {
        role: 'user',
        content: '你好，请介绍lodash库',
      },
    ],
    temperature: 0.7,
    top_p: 0.9,
    max_tokens: 100,
    stream: false, // 先测试非流式
  }

  console.log('\n📤 请求信息:')
  console.log(`   URL: ${url}`)
  console.log(`   Method: POST`)
  console.log(`   Headers:`)
  console.log(`     Authorization: Bearer ***${config.apiKey.slice(-4)}`)
  console.log(`     Content-Type: application/json`)
  console.log(`   Body:`, JSON.stringify(requestBody, null, 2))

  const startTime = Date.now()

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      // 设置超时
      signal: AbortSignal.timeout(30000), // 30秒超时
    })

    const endTime = Date.now()
    const duration = endTime - startTime

    console.log(`\n📥 响应信息:`)
    console.log(`   状态码: ${response.status} ${response.statusText}`)
    console.log(`   耗时: ${duration}ms`)
    console.log(`   响应头:`)
    response.headers.forEach((value, key) => {
      console.log(`     ${key}: ${value}`)
    })

    const responseText = await response.text()

    if (!response.ok) {
      console.error(`\n❌ 请求失败!`)
      console.error(`   状态码: ${response.status}`)
      console.error(`   响应内容:`, responseText)
      return
    }

    try {
      const responseData = JSON.parse(responseText)
      console.log(`\n✅ 请求成功!`)
      console.log(`   响应数据:`, JSON.stringify(responseData, null, 2))

      if (responseData.choices && responseData.choices[0]) {
        console.log(`\n💬 AI 回复:`)
        console.log(`   ${responseData.choices[0].message.content}`)
      }

      if (responseData.usage) {
        console.log(`\n📊 Token 使用:`)
        console.log(`   提示词: ${responseData.usage.prompt_tokens}`)
        console.log(`   回复: ${responseData.usage.completion_tokens}`)
        console.log(`   总计: ${responseData.usage.total_tokens}`)
      }
    }
    catch (parseError) {
      console.log(`\n✅ 请求成功 (非JSON响应):`)
      console.log(responseText)
    }
  }
  catch (error: any) {
    const endTime = Date.now()
    const duration = endTime - startTime

    console.error(`\n❌ 请求异常!`)
    console.error(`   耗时: ${duration}ms`)
    console.error(`   错误类型: ${error.name}`)
    console.error(`   错误信息: ${error.message}`)

    if (error.name === 'AbortError') {
      console.error(`   ⏱️ 请求超时 (>30秒)`)
    }

    if (error.cause) {
      console.error(`   原因:`, error.cause)
    }
  }
}

/**
 * 测试流式响应
 */
async function testStreamingAPI(config: typeof TEST_CONFIGS[0]) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`🧪 测试流式响应: ${config.name}`)
  console.log(`${'='.repeat(60)}`)

  if (!config.apiKey) {
    console.error('❌ API Key 未配置，跳过测试')
    return
  }

  const url = `${config.baseURL}/v1/chat/completions`

  const requestBody: ChatCompletionRequest = {
    model: config.model,
    messages: [
      {
        role: 'user',
        content: '数到5',
      },
    ],
    temperature: 0.7,
    max_tokens: 50,
    stream: true, // 流式响应
  }

  console.log('\n📤 发送流式请求...')

  const startTime = Date.now()

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(30000),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ 流式请求失败: ${response.status}`)
      console.error(`   响应:`, errorText)
      return
    }

    console.log(`✅ 流式连接建立`)
    console.log(`📡 接收数据流:\n`)

    let chunkCount = 0
    const chunks: string[] = []

    // 读取流式响应
    if (response.body) {
      for await (const chunk of response.body) {
        const text = chunk.toString()
        chunks.push(text)
        chunkCount++

        // 只打印前几个 chunk 和最后几个 chunk
        if (chunkCount <= 3 || text.includes('[DONE]')) {
          console.log(`   Chunk ${chunkCount}:`, text.substring(0, 200))
        }
        else if (chunkCount === 4) {
          console.log(`   ... (中间的 chunks 省略) ...`)
        }
      }
    }

    const endTime = Date.now()
    console.log(`\n✅ 流式响应完成`)
    console.log(`   接收 chunks: ${chunkCount}`)
    console.log(`   总耗时: ${endTime - startTime}ms`)
  }
  catch (error: any) {
    const endTime = Date.now()
    console.error(`\n❌ 流式请求异常!`)
    console.error(`   耗时: ${endTime - startTime}ms`)
    console.error(`   错误: ${error.message}`)
  }
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log('🚀 开始测试 LLM API 请求\n')

  // 检查是否配置了 API Key
  if (!process.env.JUHEAI_API_KEY) {
    console.error('⚠️ 警告: JUHEAI_API_KEY 环境变量未配置')
    console.error('   请在 .env 文件中添加: JUHEAI_API_KEY=your_api_key')
    console.error('   或者直接在代码中修改 TEST_CONFIGS\n')
  }

  // 测试所有配置
  for (const config of TEST_CONFIGS) {
    if (config.apiKey) {
      // 测试普通请求
      await testChatCompletionsAPI(config)

      // 测试流式请求
      await testStreamingAPI(config)
    }
  }

  console.log(`\n${'='.repeat(60)}`)
  console.log('✅ 所有测试完成')
  console.log(`${'='.repeat(60)}\n`)
}

// 运行测试
runTests().catch(console.error)
