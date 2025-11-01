# Vercel 环境变量配置清单

## ⚠️ 500 错误诊断

如果你看到 `GET https://supercocmos.me/api/config 500 (Internal Server Error)`，说明后端初始化失败，通常是环境变量缺失导致。

## 📋 必需的环境变量

请在 Vercel Dashboard → 你的项目 → Settings → Environment Variables 中配置以下变量：

### 1. Auth0 配置（必需）

```bash
# 从 Auth0 Dashboard 获取
AUTH0_DOMAIN=dev-1cn6r8b7szo6fs0y.us.auth0.com
AUTH0_AUDIENCE=http://supercocmos.com

# 后端需要的 Auth0 客户端配置
AUTH0_M2M_CLIENT_ID=你的 M2M Client ID
AUTH0_M2M_CLIENT_SECRET=你的 M2M Client Secret
AUTH0_SPA_CLIENT_ID=你的 SPA Client ID
```

### 2. Supabase 配置（必需）

```bash
SUPABASE_URL=https://你的项目.supabase.co
SUPABASE_ANON_KEY=你的 Anon Key
SUPABASE_SERVICE_ROLE_KEY=你的 Service Role Key
```

### 3. Redis 配置（必需 - Vercel 部署）

**重要**：Vercel Serverless 环境必须使用 Upstash Redis（REST API），不能使用传统的 TCP Redis。

```bash
# 从 Upstash 获取（https://upstash.com/）
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=你的 Token
```

### 4. 前端环境变量（必需）

这些变量需要以 `VITE_` 开头才能在前端访问：

```bash
# API 配置
VITE_GLOB_API_URL=/api

# Auth0 前端配置
VITE_AUTH0_DOMAIN=dev-1cn6r8b7szo6fs0y.us.auth0.com
VITE_AUTH0_CLIENT_ID=你的 SPA Client ID
VITE_AUTH0_AUDIENCE=http://supercocmos.com
VITE_AUTH0_REDIRECT_URI=https://supercocmos.me

# 功能开关
VITE_GLOB_OPEN_LONG_REPLY=false
VITE_GLOB_APP_PWA=false
```

### 5. OpenAI/LLM 配置（可选，取决于你的实现）

```bash
OPENAI_API_KEY=sk-xxx
OPENAI_API_BASE_URL=https://api.openai.com
```

### 6. 其他配置

```bash
# Node.js 环境
NODE_ENV=production

# Vercel 自动设置（无需手动配置）
VERCEL=1
VERCEL_URL=你的部署域名
```

## 🔍 检查步骤

### 1. 检查 Vercel 日志

访问 Vercel Dashboard → 你的项目 → Deployments → 最新部署 → Function Logs

查找错误信息，特别是：
- `Auth0 配置缺失`
- `Supabase 连接失败`
- `Redis 连接失败`

### 2. 测试环境变量

在 Vercel Function Logs 中检查是否有这些调试信息：

```
🔍 [Dotenv Debug] AUTH0_DOMAIN: xxx
🔍 [Dotenv Debug] SUPABASE_URL: https://xxx...
```

### 3. 检查 Auth0 配置

确保 Auth0 Application 的 **Allowed Callback URLs** 包含：
```
https://supercocmos.me
```

确保 Auth0 API 的 **Identifier** 是：
```
http://supercocmos.com
```

## 🐛 常见错误

### 错误 1: `Cannot access before initialization`

**原因**：前端依赖循环引用或打包问题
**解决**：已在 `package.json` 和 `vite.config.ts` 中修复

### 错误 2: `CORS error`

**原因**：后端 CORS 配置不允许生产域名
**解决**：已在 `service/src/index.ts` 中添加 `https://supercocmos.me`

### 错误 3: `500 Internal Server Error on /api/config`

**原因**：环境变量缺失，数据库初始化失败
**解决**：检查上述所有必需环境变量是否已配置

### 错误 4: `Redis connection failed`

**原因**：
- 未配置 Upstash Redis
- 或配置了错误的 Redis 连接方式（TCP vs REST）

**解决**：
- 确保配置了 `UPSTASH_REDIS_REST_URL` 和 `UPSTASH_REDIS_REST_TOKEN`
- 不要在 Vercel 环境配置 `REDIS_HOST`、`REDIS_PORT`（这些是本地开发用的）

## 📝 快速修复清单

- [ ] 已在 Vercel 配置所有 Auth0 环境变量
- [ ] 已在 Vercel 配置所有 Supabase 环境变量
- [ ] 已在 Vercel 配置 Upstash Redis 环境变量
- [ ] 已在 Vercel 配置所有 `VITE_*` 前端环境变量
- [ ] Auth0 Allowed Callback URLs 包含生产域名
- [ ] Auth0 Allowed Web Origins 包含生产域名
- [ ] 已重新部署（环境变量更改后需要重新部署）

## 🚀 重新部署

配置环境变量后，必须重新部署：

```bash
# 方法 1: 推送代码触发部署
git commit --allow-empty -m "chore: trigger deployment"
git push

# 方法 2: 在 Vercel Dashboard 手动重新部署
# Deployments → 最新部署 → ... → Redeploy
```

## 📞 进一步调试

如果问题仍然存在，请提供：
1. Vercel Function Logs 的完整错误信息
2. 浏览器 Console 的完整错误信息
3. Network 面板中失败请求的详细信息（Headers, Response）

