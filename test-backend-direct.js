// 直接测试后端API（绕过前端代理）
const http = require('http');

function testAPI(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: 3002,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          body: body,
          headers: res.headers,
        });
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function runTests() {
  console.log('🧪 测试后端API（直接访问，不通过Vite代理）\n');
  console.log('=' .repeat(60));

  // 测试1: GET /api/models
  try {
    console.log('\n1️⃣ 测试: GET /api/models');
    const result1 = await testAPI('/api/models');
    console.log('   状态码:', result1.status);
    console.log('   响应:', result1.body.substring(0, 200));
    if (result1.status === 200) {
      console.log('   ✅ 成功');
    } else {
      console.log('   ❌ 失败');
    }
  } catch (error) {
    console.log('   ❌ 错误:', error.message);
  }

  // 测试2: GET /models (不带 /api 前缀)
  try {
    console.log('\n2️⃣ 测试: GET /models');
    const result2 = await testAPI('/models');
    console.log('   状态码:', result2.status);
    console.log('   响应:', result2.body.substring(0, 200));
    if (result2.status === 200) {
      console.log('   ✅ 成功');
    } else {
      console.log('   ❌ 失败');
    }
  } catch (error) {
    console.log('   ❌ 错误:', error.message);
  }

  // 测试3: POST /api/models/add
  try {
    console.log('\n3️⃣ 测试: POST /api/models/add');
    const testData = {
      id: 'test-model-' + Date.now(),
      provider: 'TestProvider',
      displayName: 'Test Model',
      enabled: true,
    };
    console.log('   请求数据:', JSON.stringify(testData));
    const result3 = await testAPI('/api/models/add', 'POST', testData);
    console.log('   状态码:', result3.status);
    console.log('   响应:', result3.body.substring(0, 200));
    if (result3.status === 200) {
      console.log('   ✅ 成功');
    } else {
      console.log('   ❌ 失败');
    }
  } catch (error) {
    console.log('   ❌ 错误:', error.message);
  }

  // 测试4: POST /api/session (测试已知可用的API)
  try {
    console.log('\n4️⃣ 测试: POST /api/session (对照测试)');
    const result4 = await testAPI('/api/session', 'POST');
    console.log('   状态码:', result4.status);
    console.log('   响应:', result4.body.substring(0, 200));
    if (result4.status === 200) {
      console.log('   ✅ 成功');
    } else {
      console.log('   ❌ 失败');
    }
  } catch (error) {
    console.log('   ❌ 错误:', error.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n📋 诊断建议:');
  console.log('   - 如果测试1失败但测试2成功: 后端 /api 路由未正确注册');
  console.log('   - 如果所有测试都失败: 后端服务未运行或端口错误');
  console.log('   - 如果直接测试成功但浏览器404: 前端代理配置问题');
  console.log('   - 如果测试4失败: 后端服务完全不可用\n');
}

runTests().catch(console.error);

