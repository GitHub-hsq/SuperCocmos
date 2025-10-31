# 📦 Vercel 部署指南 - SuperCocmos

## 🎯 概述

本指南将帮助您在 Vercel 上部署 SuperCocmos 项目，包括 Redis 配置。

---

## 🚀 部署步骤

### 1. 准备 Redis 服务

#### 方案 A：使用 Upstash Redis（推荐）⭐

Upstash 是专为无服务器环境设计的 Redis 服务，与 Vercel 完美集成。

**步骤：**

1. **注册 Upstash 账号**
   - 访问 [Upstash Console](https://console.upstash.com/)
   - 使用 GitHub 账号登录（推荐）

2. **创建 Redis 数据库**
   ```
   1. 点击 "Create Database"
   2. 选择 Region（建议选择离您用户最近的区域）
   3. Type: Regional（免费）
   4. 点击 "Create"
   ```

3. **获取连接信息**
   - 在数据库详情页面，找到以下信息：
     ```
     UPSTASH_REDIS_REST_URL=https://your-region.upstash.io
     UPSTASH_REDIS_REST_TOKEN=your-token
     ```
   - 或使用传统连接方式：
     ```
     REDIS_HOST=your-region.upstash.io
     REDIS_PORT=6379
     REDIS_PASSWORD=your-password
     ```

#### 方案 B：使用 Vercel KV

Vercel KV 是 Vercel 提供的 Redis 服务（基于 Upstash）。

**步骤：**

1. 在 Vercel 项目中，进入 **Storage** 标签
2. 点击 **Create Database**，选择 **KV**
3. 创建后会自动生成环境变量：
   ```
   KV_REST_API_URL
   KV_REST_API_TOKEN
   KV_URL
   ```

> ⚠️ **注意**：如果使用 Vercel KV，您需要修改 `service/src/cache/redisClient.ts` 以使用 KV 客户端。

---

### 2. 配置环境变量

在 Vercel 项目中配置以下环境变量：

#### Redis 配置（使用 Upstash 传统连接）

```bash
# Redis 配置
REDIS_HOST=your-region.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=your-upstash-password
REDIS_DB=0
```

#### 其他必需环境变量

```bash
# Auth0 配置
VITE_AUTH0_DOMAIN=your-auth0-domain.auth0.com
VITE_AUTH0_CLIENT_ID=your-client-id
VITE_AUTH0_AUDIENCE=your-api-audience

# Supabase 配置
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI 配置（可选）
OPENAI_API_KEY=your-openai-key
OPENAI_API_BASE_URL=https://api.openai.com

# 其他配置
NODE_ENV=production
TIMEOUT_MS=100000
```

**配置方式：**

1. 进入 Vercel 项目 → Settings → Environment Variables
2. 逐个添加上述环境变量
3. 选择环境：Production / Preview / Development

---

### 3. 部署到 Vercel

#### 方法 1：通过 Vercel Dashboard（推荐）

1. **连接 GitHub 仓库**
   ```
   1. 登录 Vercel Dashboard
   2. 点击 "New Project"
   3. 选择您的 GitHub 仓库
   4. 点击 "Import"
   ```

2. **配置构建设置**
   ```
   Framework Preset: Vite
   Build Command: pnpm build
   Output Directory: dist
   Install Command: pnpm install
   ```

3. **部署**
   - 点击 "Deploy"
   - 等待部署完成

#### 方法 2：使用 Vercel CLI

```bash
# 1. 安装 Vercel CLI
npm i -g vercel

# 2. 登录
vercel login

# 3. 部署
vercel

# 4. 部署到生产环境
vercel --prod
```

---

## 🔧 项目结构说明

```
SuperCocmos/
├── src/                 # 前端源码（Vue 3）
├── service/             # 后端服务（Node.js + Express）
│   ├── src/
│   │   ├── cache/
│   │   │   └── redisClient.ts  # Redis 客户端配置
│   │   └── index.ts    # 服务入口
│   └── build/           # 构建输出
├── vercel.json          # Vercel 配置文件
└── package.json
```

---

## ⚙️ Redis 客户端配置详解

当前项目使用 `ioredis` 客户端，配置文件位于：`service/src/cache/redisClient.ts`

### 当前配置（支持 Upstash）

```typescript
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: Number(process.env.REDIS_DB) || 0,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000)
    return delay
  },
  maxRetriesPerRequest: 3,
}
```

### 如果使用 Vercel KV，需要修改为：

```typescript
import { createClient } from '@vercel/kv'

export const redis = createClient({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
})
```

> ⚠️ **重要**：使用 Vercel KV 需要安装依赖：`pnpm add @vercel/kv`

---

## 🧪 测试 Redis 连接

### 本地测试

```bash
# 1. 配置环境变量（创建 service/.env）
REDIS_HOST=your-host
REDIS_PORT=6379
REDIS_PASSWORD=your-password

# 2. 运行测试脚本
cd service
pnpm test:redis
```

### 生产环境测试

部署后，检查 Vercel 日志：

```
Vercel Dashboard → Deployments → [选择部署] → Functions → 查看日志
```

应该看到：
```
✅ [Redis] 已连接到 Redis 服务器
✅ [Redis] PING 测试成功: PONG
```

---

## 📊 Redis 使用场景

项目中 Redis 主要用于以下场景：

1. **JWT Token 缓存** - `service/src/cache/jwtCache.ts`
   - 缓存用户认证 Token
   - 减少 Auth0 API 调用

2. **用户会话管理** - `service/src/cache/userLoginCache.ts`
   - 记录用户登录状态
   - 管理在线用户

3. **模型配置缓存** - `service/src/cache/modelCache.ts`
   - 缓存 AI 模型配置
   - 减少数据库查询

4. **消息缓存** - `service/src/cache/messageCache.ts`
   - 临时缓存聊天消息
   - 提高响应速度

5. **SSE 事件广播** - `service/src/services/sseEventBroadcaster.ts`
   - 跨设备消息同步
   - 实时通知推送

---

## 🚨 常见问题

### 1. Redis 连接失败

**错误信息：**
```
❌ [Redis] Redis 错误: Connection timeout
```

**解决方案：**
- 检查 Vercel 环境变量是否正确配置
- 确认 Redis 服务器可从外网访问
- 检查 Upstash 数据库是否处于活跃状态

### 2. Vercel 部署超时

**解决方案：**
```json
// vercel.json
{
  "functions": {
    "service/build/*.mjs": {
      "maxDuration": 60 // 增加到 60 秒
    }
  }
}
```

### 3. 环境变量未生效

**解决方案：**
1. 确保变量名完全匹配（区分大小写）
2. 重新部署项目（环境变量更改需要重新部署）
3. 检查变量是否分配到正确的环境（Production/Preview）

---

## 📈 性能优化建议

### 1. Redis 连接池优化

```typescript
// service/src/cache/redisClient.ts
const redisConfig = {
  // ... 现有配置
  lazyConnect: true, // 延迟连接
  keepAlive: 30000, // 保持连接 30 秒
  connectionName: 'vercel', // 连接命名
  enableReadyCheck: true, // 启用就绪检查
}
```

### 2. 使用 Upstash Redis REST API（推荐）

对于 Vercel Serverless Functions，使用 REST API 更高效：

```bash
pnpm add @upstash/redis
```

```typescript
import { Redis } from '@upstash/redis'

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})
```

### 3. 设置缓存过期时间

```typescript
// 示例：设置 1 小时过期
await redis.setex('key', 3600, 'value')
```

---

## 🎉 部署完成后

### 1. 验证功能

- ✅ 访问部署的 URL
- ✅ 测试用户登录（Auth0）
- ✅ 测试聊天功能
- ✅ 检查 Redis 缓存是否工作

### 2. 监控

- 查看 Vercel Analytics
- 监控 Redis 使用情况（Upstash Dashboard）
- 检查错误日志

### 3. 域名配置（可选）

1. 在 Vercel 项目设置中添加自定义域名
2. 配置 DNS 记录
3. 等待 SSL 证书生成

---

## 📚 相关资源

- [Vercel 文档](https://vercel.com/docs)
- [Upstash 文档](https://docs.upstash.com/)
- [ioredis 文档](https://github.com/redis/ioredis)
- [Vercel KV 文档](https://vercel.com/docs/storage/vercel-kv)

---

## 💡 推荐配置总结

**最佳实践：**

1. ✅ 使用 **Upstash Redis**（免费层足够）
2. ✅ 配置环境变量到 Production
3. ✅ 使用 REST API 连接（`@upstash/redis`）
4. ✅ 设置合理的缓存过期时间
5. ✅ 定期监控 Redis 使用情况

**预估成本：**
- Upstash Redis 免费层：10,000 commands/day
- Vercel Hobby 计划：免费（够用）
- Vercel Pro 计划：$20/月（商业项目）

---

🎊 **恭喜！您的 SuperCocmos 项目已经准备好部署到 Vercel 了！**
