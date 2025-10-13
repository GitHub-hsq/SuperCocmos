// 测试服务是否启动
const http = require('node:http')

function testServer() {
  const options = {
    hostname: 'localhost',
    port: 3002,
    path: '/api/session',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  }

  const req = http.request(options, (res) => {
    console.warn(`✅ 服务响应: ${res.statusCode}`)

    let data = ''
    res.on('data', (chunk) => {
      data += chunk
    })

    res.on('end', () => {
      console.warn('响应数据:', data)
      console.warn('\n✅ 后端服务启动成功！')
    })
  })

  req.on('error', (error) => {
    console.error('❌ 服务未启动或无法连接:', error.message)
    console.warn('\n请确保在 service 目录运行了: pnpm start')
  })

  req.end()
}

setTimeout(testServer, 2000)
console.warn('⏳ 等待服务启动...')
