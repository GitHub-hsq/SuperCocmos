// 快速检查端口和服务状态
const http = require('http')

console.log('🔍 检查后端服务状态...\n')

// 检查端口是否被占用
const net = require('net')
const server = net.createServer()

server.once('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log('✅ 端口 3002 正在使用中（服务可能已启动）')
    testAPI()
  } else {
    console.log('❌ 端口检查失败:', err.message)
  }
})

server.once('listening', () => {
  server.close()
  console.log('⚠️  端口 3002 空闲（服务未启动）')
})

server.listen(3002)

// 测试 API
function testAPI() {
  console.log('📡 测试 API 端点...\n')
  
  const options = {
    hostname: 'localhost',
    port: 3002,
    path: '/api/session',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    timeout: 3000
  }

  const req = http.request(options, (res) => {
    console.log(`✅ 服务响应成功: ${res.statusCode}`)
    
    let data = ''
    res.on('data', (chunk) => {
      data += chunk
    })
    
    res.on('end', () => {
      try {
        const json = JSON.parse(data)
        console.log('📦 响应数据:', JSON.stringify(json, null, 2))
        console.log('\n✅ 后端服务启动成功！')
        console.log('\n📝 下一步:')
        console.log('1. 在另一个终端运行: npx ngrok http 3002')
        console.log('2. 复制 ngrok 生成的 HTTPS URL')
        console.log('3. 更新 Clerk Webhook URL')
      } catch (e) {
        console.log('响应:', data)
      }
    })
  })

  req.on('error', (error) => {
    console.error('❌ 服务测试失败:', error.message)
    console.log('\n可能原因:')
    console.log('- 服务正在启动中（等待几秒后重试）')
    console.log('- 服务启动失败（查看 service 终端的日志）')
    console.log('\n重新启动服务:')
    console.log('cd service && pnpm start')
  })

  req.on('timeout', () => {
    console.error('❌ 请求超时')
    req.destroy()
  })

  req.end()
}

