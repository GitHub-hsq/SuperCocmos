# 路由诊断指南

## 当前配置

### 后端路由 (service/src/index.ts)
```typescript
// 第441行：定义路由
router.get('/models', async (req, res) => { ... })
router.post('/models/add', async (req, res) => { ... })

// 第688-689行：注册路由
app.use('', router)      // 匹配: /models, /models/add
app.use('/api', router)  // 匹配: /api/models, /api/models/add
```

### 前端代理 (vite.config.ts)
```typescript
proxy: {
  '/api': {
    target: 'http://127.0.0.1:3002',
    changeOrigin: true,
    // rewrite 已注释，保持 /api 前缀
  }
}
```

### 请求流程
```
浏览器: http://192.168.1.29:1002/api/models
  ↓
Vite代理: http://127.0.0.1:3002/api/models
  ↓
Express: app.use('/api', router) → router.get('/models')
  ↓
应该匹配: ✅
```

## 诊断步骤

### 1. 确认后端服务运行
打开浏览器或使用 curl 直接访问后端：

```bash
# 测试1：直接访问后端（不通过前端代理）
curl http://127.0.0.1:3002/api/models

# 测试2：访问另一个路径确认
curl http://127.0.0.1:3002/models
```

### 2. 检查前端请求URL
在浏览器开发者工具 (F12) → Network 标签中：
- 查看实际请求的 URL
- 查看 Request Headers
- 查看响应状态码和内容

### 3. 重启服务（重要！）

**后端服务：**
```bash
cd service
# 停止当前服务 (Ctrl+C)
npm run build
npm start
```

**前端服务：**
```bash
# 在项目根目录
# 停止当前服务 (Ctrl+C)
npm run dev
# 或
pnpm dev
```

### 4. 检查环境变量
查看 `.env` 文件是否有自定义的 API 地址：

```bash
VITE_APP_API_BASE_URL=http://127.0.0.1:3002
```

### 5. 测试其他已知API
确认代理是否正常工作：

```bash
# 测试聊天API（这个应该是工作的）
curl http://127.0.0.1:3002/api/session
```

## 可能的问题

### 问题1: 前端服务未重启
**症状：** 修改了 vite.config.ts 但404仍然出现
**解决：** 必须重启前端开发服务器（vite.config.ts的修改需要重启）

### 问题2: 后端服务未重启
**症状：** 新增的路由返回404
**解决：** 重启后端服务以加载新的路由

### 问题3: 端口冲突
**症状：** 服务启动失败或端口被占用
**解决：** 检查端口占用并关闭冲突的进程

```bash
# Windows
netstat -ano | findstr :3002
netstat -ano | findstr :1002

# 如果有占用，结束进程
taskkill /PID <进程ID> /F
```

### 问题4: 防火墙拦截
**症状：** 本地可以访问但外部IP不能访问
**解决：** 检查防火墙设置，允许端口1002和3002

## 快速验证脚本

创建并运行测试脚本：

```javascript
// test-api-direct.js
const fetch = require('node-fetch');

async function testAPI() {
  console.log('测试后端API（直接访问）\n');
  
  try {
    const response = await fetch('http://127.0.0.1:3002/api/models');
    console.log('状态码:', response.status);
    const data = await response.json();
    console.log('响应:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('错误:', error.message);
  }
}

testAPI();
```

运行：
```bash
node test-api-direct.js
```

