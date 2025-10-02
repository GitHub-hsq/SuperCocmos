# 🔧 修复404错误指南

## 问题描述
获取模型列表 (`/api/models`) 和添加模型 (`/api/models/add`) 返回404错误

## ✅ 已修复的配置

### 1. 恢复代理配置 (vite.config.ts)
```typescript
proxy: {
  '/api': {
    target: 'http://127.0.0.1:3002',
    changeOrigin: true,
    rewrite: path => path.replace('/api/', '/'),  // ✅ 已恢复
  },
}
```

**说明：** 与其他现有API保持一致的配置
- `/api/models` → 重写为 → `/models`
- `/api/models/add` → 重写为 → `/models/add`

### 2. 临时移除认证 (service/src/index.ts)
```typescript
// 第459行：添加模型（已临时移除认证）
router.post('/models/add', async (req, res) => {

// 第513行：更新模型（已临时移除认证）
router.post('/models/update', async (req, res) => {

// 第561行：删除模型（已临时移除认证）
router.post('/models/delete', async (req, res) => {
```

**说明：** 便于测试，生产环境建议恢复 `[auth]` 中间件

## 🚀 立即执行步骤

### 步骤1: 重启前端服务 ⚠️ **必须执行！**

```bash
# 停止当前的前端开发服务器 (Ctrl+C)
# 然后重新启动
pnpm dev
```

> **重要：** 修改 `vite.config.ts` 后必须重启前端服务才能生效！

### 步骤2: 确认后端服务运行

打开新的终端窗口：

```bash
cd service
pnpm start
# 或者
npm start
```

你应该看到：
```
Server is running on port 3002
```

### 步骤3: 运行测试脚本验证

在项目根目录运行：

```bash
node test-backend-direct.js
```

**预期输出：**
```
🧪 测试后端API（直接访问，不通过Vite代理）

1️⃣ 测试: GET /api/models
   状态码: 200
   ✅ 成功

2️⃣ 测试: GET /models
   状态码: 200
   ✅ 成功
   
... (其他测试)
```

### 步骤4: 在浏览器中测试

1. 打开浏览器：`http://192.168.1.29:1002`
2. 打开开发者工具 (F12) → Network 标签
3. 进入 设置 → 模型配置
4. 点击"刷新"按钮
5. 查看 Network 标签中的请求：
   - **请求URL:** `http://192.168.1.29:1002/api/models`
   - **状态码:** 应该是 `200`
   - **响应:** 应该包含模型列表

## 🔍 故障排查

### 问题A: 仍然404

**检查清单：**
1. ✅ 前端服务已重启？
2. ✅ 后端服务正在运行？
3. ✅ 端口3002没有被其他程序占用？

**验证方法：**
```bash
# Windows检查端口
netstat -ano | findstr :3002
netstat -ano | findstr :1002

# 直接访问后端（使用浏览器）
# 打开: http://127.0.0.1:3002/models
# 应该看到JSON响应
```

### 问题B: 后端不可访问

**可能原因：**
- 后端服务未启动
- 端口被占用
- 防火墙阻止

**解决方法：**
```bash
# 1. 重新编译后端
cd service
pnpm build

# 2. 重启后端
pnpm start
```

### 问题C: CORS错误

**症状：** 浏览器控制台显示跨域错误

**解决：** 后端已配置CORS，检查：
```typescript
// service/src/index.ts 第27行
app.all('*', (_, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'authorization, Content-Type')
  res.header('Access-Control-Allow-Methods', '*')
  next()
})
```

### 问题D: 网络代理配置

**检查环境变量：**

创建或检查 `.env` 文件：
```env
# 前端环境变量
VITE_APP_API_BASE_URL=http://127.0.0.1:3002
```

## 📊 完整的请求流程

```
┌─────────────────────────────────────────────────────────────┐
│ 浏览器发送请求                                                │
│ http://192.168.1.29:1002/api/models                         │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│ Vite开发服务器 (端口 1002)                                    │
│ 代理配置: /api → http://127.0.0.1:3002                       │
│ rewrite: /api/models → /models                              │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│ 发送到后端                                                    │
│ http://127.0.0.1:3002/models                                │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│ Express后端 (端口 3002)                                       │
│ app.use('', router)                                         │
│ router.get('/models', ...)                                  │
│ ✅ 匹配成功                                                   │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│ 返回响应                                                      │
│ { status: 'Success', data: [...] }                          │
└─────────────────────────────────────────────────────────────┘
```

## ⚡ 快速验证命令

```bash
# 1. 测试后端直接访问（应该返回JSON）
curl http://127.0.0.1:3002/models

# 2. 测试后端API路径（应该返回JSON）
curl http://127.0.0.1:3002/api/models

# 3. 测试添加模型（应该返回成功）
curl -X POST http://127.0.0.1:3002/models/add \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-model",
    "provider": "Test",
    "displayName": "Test Model",
    "enabled": true
  }'
```

## 📝 注意事项

1. **必须重启前端服务** - 修改 `vite.config.ts` 后必须重启
2. **后端服务必须运行** - 确保在端口3002上监听
3. **检查浏览器控制台** - 查看实际的请求URL和错误信息
4. **使用测试脚本** - 运行 `node test-backend-direct.js` 验证后端

## ✅ 成功标志

当一切正常时，你应该看到：

**浏览器 Network 标签：**
```
Status: 200 OK
Response: {
  "status": "Success",
  "message": "获取模型列表成功",
  "data": [
    {
      "id": "gpt-4o",
      "provider": "OpenAI",
      "displayName": "GPT-4o",
      "enabled": true,
      ...
    },
    ...
  ]
}
```

**前端界面：**
- 模型配置页面显示默认的两个模型
- 可以点击"新增模型"按钮
- 可以编辑和删除模型
- 启用/禁用开关正常工作

