# 🧪 LLM 连接测试指南

## ✅ 已添加的功能

1. **测试函数**: `testLLMConnection()` 在 `service/src/quiz/workflow.ts`
2. **测试 API**: `POST /api/quiz/test-llm` 在 `service/src/index.ts`

---

## 📋 测试前准备

### 1. 确保已配置 API Key

在 `service/.env` 文件中添加：

```env
# 必须配置
OPENAI_API_KEY=sk-your-api-key-here

# 可选配置（如使用代理）
OPENAI_API_BASE_URL=https://api.openai.com/v1
OPENAI_API_MODEL=gpt-4o-mini
```

> 💡 如果没有 `.env` 文件，请创建它：
> ```bash
> cd service
> type nul > .env  # Windows
> # 或
> touch .env       # Mac/Linux
> ```

### 2. 安装依赖并启动服务

```bash
# 安装依赖（如果还没安装）
cd service
pnpm install

# 启动后端服务
pnpm start
```

服务应该在 `http://localhost:3002` 启动。

---

## 🚀 测试方法

### 方式 1：使用测试脚本（最简单）

**Windows:**
```bash
.\test-llm.cmd
```

**Mac/Linux:**
```bash
chmod +x test-llm.sh
./test-llm.sh
```

### 方式 2：使用 curl 命令

```bash
curl -X POST http://localhost:3002/api/quiz/test-llm \
  -H "Content-Type: application/json"
```

### 方式 3：使用 PowerShell

```powershell
Invoke-RestMethod -Uri "http://localhost:3002/api/quiz/test-llm" `
  -Method POST `
  -ContentType "application/json" | ConvertTo-Json
```

### 方式 4：使用 Postman 或其他 HTTP 客户端

- **URL**: `http://localhost:3002/api/quiz/test-llm`
- **Method**: `POST`
- **Headers**: `Content-Type: application/json`
- **Body**: 空 (不需要请求体)

---

## ✅ 成功响应示例

```json
{
  "status": "Success",
  "message": "LLM 连接测试成功！",
  "data": {
    "model": "gpt-4o-mini",
    "response": "你好，LLM 连接成功！"
  }
}
```

---

## ❌ 错误排查

### 错误 1: Connection refused

**原因**: 后端服务未启动

**解决**:
```bash
cd service
pnpm start
```

### 错误 2: OPENAI_API_KEY 未配置

**响应**:
```json
{
  "status": "Fail",
  "message": "LLM 连接失败: OPENAI_API_KEY 未配置！请在 service/.env 文件中配置"
}
```

**解决**: 在 `service/.env` 中添加 `OPENAI_API_KEY=sk-...`

### 错误 3: API Key 无效

**响应**:
```json
{
  "status": "Fail",
  "message": "LLM 连接失败: 401 Unauthorized"
}
```

**解决**: 检查 API Key 是否正确，是否有足够的额度

### 错误 4: 网络超时

**响应**:
```json
{
  "status": "Fail",
  "message": "LLM 连接失败: timeout of 60000ms exceeded"
}
```

**解决**:
1. 检查网络连接
2. 如果在国内，配置 `OPENAI_API_BASE_URL` 使用代理服务
3. 增加超时时间（修改 `workflow.ts` 中的 `timeout` 参数）

---

## 📊 控制台日志

测试时，后端控制台会输出详细日志：

```
🧪 [API] 收到 LLM 测试请求
🧪 [测试] 开始测试 LLM 连接...
🔑 [LLM配置] {
  model: 'gpt-4o-mini',
  baseURL: 'https://api.openai.com/v1',
  hasApiKey: true,
  apiKeyPrefix: 'sk-proj...'
}
✅ [测试] LLM 实例创建成功
🔄 [测试] 正在发送测试请求...
✅ [测试] LLM 响应成功!
📝 [测试] 响应内容: 你好，LLM 连接成功！
✅ [API] LLM 测试成功
```

---

## 🔧 测试代码位置

如果需要查看或修改测试逻辑：

1. **测试函数**: `service/src/quiz/workflow.ts` (行 483-534)
2. **API 端点**: `service/src/index.ts` (行 262-296)

---

## 📞 下一步

测试成功后，你可以：

1. ✅ 使用 `/upload` 上传文件并自动分类
2. ✅ 使用 `/quiz/generate` 从笔记生成题目
3. ✅ 使用 `/quiz/run` 运行完整工作流

参考文档: `service/ENV_SETUP.md`

