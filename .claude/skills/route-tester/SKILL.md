---
name: route-tester
description: Auth0 JWT 认证 API 路由测试指南。使用 curl、Postman 或测试脚本测试受保护的 API 端点。
version: 1.0.0
---

# API 路由测试指南

测试 SuperCocmos 后端 API 的完整指南，涵盖 Auth0 JWT 认证、权限验证和常见调试场景。

---

## 🎯 认证架构概览

### 认证方式

SuperCocmos 使用 **Auth0 Bearer Token** 认证：

```
Authorization: Bearer <access_token>
```

### 权限层级

| 层级 | 中间件 | 说明 |
|------|--------|------|
| **Level 0** | 无 | 公开端点，无需认证 |
| **Level 1** | `auth + requireAuth` | 需要登录用户 |
| **Level 2** | `auth + requireAdmin` | 需要管理员角色 |

---

## 🔑 获取 Auth0 Access Token

### 方法 1: 从前端浏览器获取（推荐）

**步骤**：

1. 在浏览器中打开前端应用（http://localhost:5173）
2. 登录 Auth0
3. 打开浏览器开发者工具（F12）
4. 切换到 Console 标签
5. 运行以下代码：

```javascript
// 获取 Auth0 instance（假设使用 @auth0/auth0-vue）
const auth0 = window.$auth0 || window.auth0

// 获取 access token
auth0.getAccessTokenSilently().then(token => {
  console.log('Access Token:')
  console.log(token)

  // 自动复制到剪贴板
  navigator.clipboard.writeText(token)
  console.log('✅ Token 已复制到剪贴板')
})
```

**或者手动从 Network 标签获取**：

1. 打开浏览器开发者工具 → Network 标签
2. 刷新页面或执行任意 API 请求
3. 查找任意后端 API 请求（如 `/api/auth/me`）
4. 点击请求 → Headers → Request Headers
5. 找到 `Authorization: Bearer xxx`
6. 复制 `Bearer` 后面的 token

---

### 方法 2: 使用 Auth0 测试账号（开发环境）

如果你有测试账号，可以使用 Auth0 的 Resource Owner Password Grant：

```bash
# 替换为你的 Auth0 配置
curl --request POST \
  --url https://YOUR_AUTH0_DOMAIN/oauth/token \
  --header 'content-type: application/json' \
  --data '{
    "grant_type": "password",
    "username": "test@example.com",
    "password": "testpassword",
    "audience": "YOUR_AUTH0_AUDIENCE",
    "client_id": "YOUR_CLIENT_ID",
    "client_secret": "YOUR_CLIENT_SECRET"
  }'
```

**响应**：
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 86400
}
```

⚠️ **注意**：Password Grant 仅适用于开发环境，生产环境应使用其他授权方式。

---

### 方法 3: 使用 Postman 获取 Token

1. 打开 Postman
2. 创建新请求 → Authorization 标签
3. Type 选择 "OAuth 2.0"
4. 配置参数：
   - **Grant Type**: Authorization Code (with PKCE)
   - **Auth URL**: `https://YOUR_AUTH0_DOMAIN/authorize`
   - **Access Token URL**: `https://YOUR_AUTH0_DOMAIN/oauth/token`
   - **Client ID**: 你的 Auth0 Client ID
   - **Audience**: 你的 Auth0 Audience
5. 点击 "Get New Access Token"
6. 登录后复制 token

---

## 🧪 使用 curl 测试 API

### 基本 curl 模板

```bash
# 设置环境变量（方便复用）
export API_BASE="http://localhost:3002/api"
export TOKEN="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."

# GET 请求
curl -X GET "$API_BASE/auth/me" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# POST 请求
curl -X POST "$API_BASE/conversations" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "测试对话"
  }'

# PUT 请求
curl -X PUT "$API_BASE/conversations/123" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "更新后的标题"
  }'

# DELETE 请求
curl -X DELETE "$API_BASE/conversations/123" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📋 常见 API 测试场景

### 1. 测试用户认证

#### 获取当前用户信息

```bash
curl -X GET "$API_BASE/auth/me" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

**预期响应 (200)**：
```json
{
  "id": "auth0|123456",
  "email": "user@example.com",
  "username": "testuser",
  "role": "user"
}
```

**错误响应 (401 - 未认证)**：
```json
{
  "success": false,
  "message": "未授权，请先登录"
}
```

---

### 2. 测试角色权限

#### 获取所有角色（需要登录）

```bash
curl -X GET "$API_BASE/roles" \
  -H "Authorization: Bearer $TOKEN"
```

**预期响应 (200)**：
```json
{
  "data": [
    { "id": "1", "name": "user", "description": "普通用户" },
    { "id": "2", "name": "admin", "description": "管理员" }
  ]
}
```

#### 创建角色（需要管理员权限）

```bash
curl -X POST "$API_BASE/roles" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "editor",
    "description": "编辑者"
  }'
```

**预期响应 (200 - 管理员用户)**：
```json
{
  "success": true,
  "data": {
    "id": "3",
    "name": "editor",
    "description": "编辑者"
  }
}
```

**错误响应 (403 - 普通用户)**：
```json
{
  "success": false,
  "message": "需要管理员权限",
  "data": {
    "requiredRole": "Admin",
    "userRoles": ["user"]
  }
}
```

---

### 3. 测试对话管理

#### 创建对话

```bash
curl -X POST "$API_BASE/conversations" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "我的第一个对话",
    "model": "gpt-4"
  }'
```

#### 获取对话列表

```bash
curl -X GET "$API_BASE/conversations?limit=20&offset=0" \
  -H "Authorization: Bearer $TOKEN"
```

#### 更新对话标题

```bash
curl -X PUT "$API_BASE/conversations/conv_123" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "更新后的标题"
  }'
```

#### 删除对话

```bash
curl -X DELETE "$API_BASE/conversations/conv_123" \
  -H "Authorization: Bearer $TOKEN"
```

---

### 4. 测试供应商管理

#### 获取所有供应商

```bash
curl -X GET "$API_BASE/providers" \
  -H "Authorization: Bearer $TOKEN"
```

#### 添加供应商

```bash
curl -X POST "$API_BASE/providers" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "OpenAI",
    "base_url": "https://api.openai.com/v1",
    "api_key": "sk-..."
  }'
```

---

### 5. 测试 SSE 流式响应

SSE (Server-Sent Events) 用于 ChatGPT 流式对话：

```bash
curl -X POST "$API_BASE/chat-process" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  --no-buffer \
  -d '{
    "prompt": "你好，请介绍一下自己",
    "conversationId": "conv_123",
    "model": "gpt-4"
  }'
```

**预期响应（流式）**：
```
data: {"type":"text","data":"你好"}

data: {"type":"text","data":"！"}

data: {"type":"text","data":"我是"}

data: {"type":"done"}
```

---

## 🔍 调试技巧

### 1. 验证 Token 是否有效

```bash
# 解码 JWT token（不验证签名）
echo $TOKEN | cut -d'.' -f2 | base64 -d 2>/dev/null | jq .
```

**查看 Token 内容**：
```json
{
  "sub": "auth0|123456",
  "iss": "https://YOUR_AUTH0_DOMAIN/",
  "aud": "YOUR_AUDIENCE",
  "iat": 1234567890,
  "exp": 1234567890,
  "http://supercocmos.com/roles": ["Admin"]
}
```

**检查点**：
- ✅ `exp`（过期时间）是否大于当前时间
- ✅ `aud`（audience）是否匹配后端配置
- ✅ `iss`（issuer）是否匹配 Auth0 Domain
- ✅ 角色信息是否存在（如果需要管理员权限）

---

### 2. 查看详细的错误信息

```bash
# 使用 -v 查看完整的 HTTP 交互
curl -v -X GET "$API_BASE/auth/me" \
  -H "Authorization: Bearer $TOKEN"
```

**查看响应头**：
```
< HTTP/1.1 401 Unauthorized
< Content-Type: application/json
< Access-Control-Allow-Origin: http://localhost:5173
```

---

### 3. 常见错误排查

#### 401 Unauthorized

**可能原因**：
1. ❌ Token 过期
2. ❌ Token 格式错误（缺少 `Bearer ` 前缀）
3. ❌ Token 签名无效
4. ❌ Audience 不匹配

**解决方案**：
```bash
# 检查 token 是否过期
echo $TOKEN | cut -d'.' -f2 | base64 -d 2>/dev/null | jq '.exp'
date +%s  # 当前时间戳

# 确保使用 Bearer 前缀
curl -H "Authorization: Bearer $TOKEN" ...  # ✅
curl -H "Authorization: $TOKEN" ...        # ❌
```

#### 403 Forbidden

**可能原因**：
1. ❌ 用户角色不足（需要 Admin 角色）
2. ❌ Token 中缺少角色信息

**解决方案**：
```bash
# 检查 token 中的角色
echo $TOKEN | cut -d'.' -f2 | base64 -d 2>/dev/null | jq '."http://supercocmos.com/roles"'

# 预期输出（管理员）
["Admin"]
```

如果角色为空或只有 `["user"]`，说明该用户不是管理员。

#### 404 Not Found

**可能原因**：
1. ❌ API 路径错误
2. ❌ 缺少 `/api` 前缀
3. ❌ 资源 ID 不存在

**解决方案**：
```bash
# 确认路径格式
curl "$API_BASE/conversations"     # ✅ 正确
curl "http://localhost:3002/conversations"  # ❌ 缺少 /api
```

#### 500 Internal Server Error

**可能原因**：
1. ❌ 数据库连接失败
2. ❌ 请求参数格式错误
3. ❌ 后端代码错误

**解决方案**：
- 查看后端日志（`service/src` 目录运行 `pnpm dev`）
- 检查请求体 JSON 格式是否正确
- 确认数据库（Supabase）连接正常

---

## 📝 测试脚本示例

### Bash 测试脚本

创建 `test-api.sh`：

```bash
#!/bin/bash

# 配置
API_BASE="http://localhost:3002/api"
TOKEN="your_access_token_here"

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 测试函数
test_endpoint() {
  local method=$1
  local endpoint=$2
  local data=$3

  echo "Testing: $method $endpoint"

  if [ -z "$data" ]; then
    response=$(curl -s -w "\n%{http_code}" -X $method "$API_BASE$endpoint" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json")
  else
    response=$(curl -s -w "\n%{http_code}" -X $method "$API_BASE$endpoint" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "$data")
  fi

  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)

  if [ $http_code -eq 200 ] || [ $http_code -eq 201 ]; then
    echo -e "${GREEN}✅ Success ($http_code)${NC}"
    echo "$body" | jq . 2>/dev/null || echo "$body"
  else
    echo -e "${RED}❌ Failed ($http_code)${NC}"
    echo "$body" | jq . 2>/dev/null || echo "$body"
  fi

  echo "---"
}

# 运行测试
echo "🧪 开始 API 测试"
echo "===================="

test_endpoint "GET" "/auth/me"
test_endpoint "GET" "/roles"
test_endpoint "GET" "/conversations"
test_endpoint "POST" "/conversations" '{"title":"测试对话"}'

echo "===================="
echo "✅ 测试完成"
```

**使用**：
```bash
chmod +x test-api.sh
./test-api.sh
```

---

### Node.js 测试脚本

创建 `test-api.js`：

```javascript
const https = require('https')

const API_BASE = 'http://localhost:3002/api'
const TOKEN = 'your_access_token_here'

async function testEndpoint(method, endpoint, data = null) {
  const url = `${API_BASE}${endpoint}`

  console.log(`Testing: ${method} ${endpoint}`)

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: data ? JSON.stringify(data) : undefined
    })

    const json = await response.json()

    if (response.ok) {
      console.log('✅ Success:', response.status)
      console.log(JSON.stringify(json, null, 2))
    } else {
      console.log('❌ Failed:', response.status)
      console.log(JSON.stringify(json, null, 2))
    }
  } catch (error) {
    console.error('❌ Error:', error.message)
  }

  console.log('---')
}

async function runTests() {
  console.log('🧪 开始 API 测试')
  console.log('====================')

  await testEndpoint('GET', '/auth/me')
  await testEndpoint('GET', '/roles')
  await testEndpoint('GET', '/conversations')
  await testEndpoint('POST', '/conversations', { title: '测试对话' })

  console.log('====================')
  console.log('✅ 测试完成')
}

runTests()
```

**使用**：
```bash
node test-api.js
```

---

## 🎯 Postman Collection

### 导入到 Postman

创建 `supercocmos-api.postman_collection.json`：

```json
{
  "info": {
    "name": "SuperCocmos API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:3002/api"
    },
    {
      "key": "token",
      "value": "your_access_token_here"
    }
  ],
  "auth": {
    "type": "bearer",
    "bearer": [
      {
        "key": "token",
        "value": "{{token}}",
        "type": "string"
      }
    ]
  },
  "item": [
    {
      "name": "Auth",
      "item": [
        {
          "name": "Get Current User",
          "request": {
            "method": "GET",
            "url": "{{base_url}}/auth/me"
          }
        }
      ]
    },
    {
      "name": "Conversations",
      "item": [
        {
          "name": "Get Conversations",
          "request": {
            "method": "GET",
            "url": "{{base_url}}/conversations"
          }
        },
        {
          "name": "Create Conversation",
          "request": {
            "method": "POST",
            "url": "{{base_url}}/conversations",
            "body": {
              "mode": "raw",
              "raw": "{\n  \"title\": \"New Conversation\"\n}"
            }
          }
        }
      ]
    }
  ]
}
```

**导入步骤**：
1. 打开 Postman
2. Import → Upload Files
3. 选择 `supercocmos-api.postman_collection.json`
4. 修改 `token` 变量为你的 Access Token

---

## ✅ 测试清单

### 基础测试

- [ ] 获取当前用户信息 (`GET /auth/me`)
- [ ] 无 token 时返回 401
- [ ] 过期 token 时返回 401
- [ ] 格式错误的 token 时返回 401

### 权限测试

- [ ] 普通用户可以访问需要认证的端点
- [ ] 普通用户无法访问管理员端点（返回 403）
- [ ] 管理员可以访问所有端点

### 功能测试

- [ ] 创建对话
- [ ] 获取对话列表
- [ ] 更新对话
- [ ] 删除对话
- [ ] 获取角色列表
- [ ] 创建角色（管理员）

### SSE 测试

- [ ] SSE 流式响应正常
- [ ] 客户端断开连接时服务器正确处理

---

## 📚 相关资源

- [认证与授权](../express-ts-guidelines/resources/authentication.md)
- [控制器模式](../express-ts-guidelines/resources/controllers.md)
- [错误处理](../express-ts-guidelines/resources/error-handling.md)
- [Auth0 官方文档](https://auth0.com/docs)

---

## 💡 提示

1. **开发环境**: 使用 `http://localhost:3002/api`
2. **生产环境**: 使用 `https://supercocmos.me/api`
3. **Token 过期时间**: 通常为 24 小时（86400 秒）
4. **刷新 Token**: 前端会自动刷新，无需手动操作
5. **CORS**: 确保后端允许你的前端域名
