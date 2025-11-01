# 🚀 Vercel 部署配置指南

## 📋 环境变量配置清单

### ⚠️ 安全说明

**`VITE_` 前缀的变量会被暴露到浏览器，这是正常的！**
- Auth0 的配置（DOMAIN, CLIENT_ID, AUDIENCE, REDIRECT_URI）**本来就是设计为公开的**
- Client ID 就像用户名（公开），Client Secret 才是密码（私密）
- 如果 Vercel 弹出警告，点击 **"Continue"** 即可

**私密变量（没有 `VITE_` 前缀，仅后端使用）：**
- `AUTH0_M2M_CLIENT_SECRET` 🔴
- `AUTH0_MANAGEMENT_CLIENT_SECRET` 🔴
- `UPSTASH_REDIS_REST_TOKEN` 🔴
- `SUPABASE_SERVICE_ROLE_KEY` 🔴

---

## 🔴 后端环境变量（必需）

```bash
# ⚡ Upstash Redis（Vercel 部署必须）
UPSTASH_REDIS_REST_URL=https://caring-hedgehog-31136.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXmgAAIncDJmZWJmNWM2N2ZiNTk0NDc3YWEwYjRiMzg3Yjg0NDdhMnAyMzExMzY

# 🗄️ Supabase
SUPABASE_URL=https://anjzmqkuklcmqjxonovf.supabase.co
SUPABASE_ANON_KEY=你的匿名密钥
SUPABASE_SERVICE_ROLE_KEY=你的服务密钥

# 🔐 Auth0（后端）
AUTH0_DOMAIN=dev-1cn6r8b7szo6fs0y.us.auth0.com
AUTH0_AUDIENCE=http://supercocmos.com
AUTH0_M2M_CLIENT_ID=你的M2M客户端ID
AUTH0_M2M_CLIENT_SECRET=你的M2M客户端密钥
AUTH0_SPA_CLIENT_ID=tZDZNUE3dHZrm6WrtNQGidmNOhYrj134
AUTH0_MANAGEMENT_CLIENT_ID=你的管理API客户端ID
AUTH0_MANAGEMENT_CLIENT_SECRET=你的管理API客户端密钥

# 🌍 其他
NODE_ENV=production
```

---

## 🟢 前端环境变量（必需）

```bash
# 🔐 Auth0（前端 - ✅ 这些是安全的，本来就是公开的）
VITE_AUTH0_DOMAIN=dev-1cn6r8b7szo6fs0y.us.auth0.com
VITE_AUTH0_CLIENT_ID=tZDZNUE3dHZrm6WrtNQGidmNOhYrj134
VITE_AUTH0_AUDIENCE=http://supercocmos.com
VITE_AUTH0_REDIRECT_URI=https://supercocmos.me

# 🌐 API 配置
VITE_GLOB_API_URL=/api
VITE_APP_API_BASE_URL=https://supercocmos.me/api
```

---

## 🟡 前端功能开关（可选）

```bash
# 长回复自动续写功能（当回复因长度限制被截断时，自动继续生成）
# 设置为 'true' 启用，'false' 禁用（默认：false）
VITE_GLOB_OPEN_LONG_REPLY=false

# PWA 渐进式 Web 应用功能（离线访问、添加到主屏幕等）
# 设置为 'true' 启用，'false' 禁用（默认：false）
VITE_GLOB_APP_PWA=false
```

---

## 📝 配置步骤

### 1. 在 Vercel Dashboard 中添加环境变量

1. 进入项目 → **Settings** → **Environment Variables**
2. 逐个添加上述环境变量
3. 选择环境：**Production** / **Preview** / **Development**
4. 确保所有变量都添加到 **Production** 环境
5. 如果看到 `VITE_` 前缀的警告，点击 **"Continue"**

### 2. 配置 Auth0 回调 URL

在 Auth0 Dashboard 中添加回调 URL：
- `https://supercocmos.me/`
- `https://www.supercocmos.me/`

### 3. 部署

1. 推送代码到 GitHub
2. Vercel 会自动检测并部署
3. 或手动触发部署：Vercel Dashboard → Deployments → Redeploy

---

## ✅ 验证部署

### 检查日志

部署后，在 Vercel Dashboard → Deployments → [最新部署] → View Function Logs 中查看：

```
✅ [Redis] 检测到 Upstash 配置，使用 Upstash Redis REST API
✅ [Redis] PING 测试成功: PONG
```

### 功能测试

访问 `https://supercocmos.me`，测试：
- [ ] 页面正常加载
- [ ] Auth0 登录可用
- [ ] 可以创建新对话
- [ ] 聊天功能正常
- [ ] 会话切换流畅

---

## 🔍 常见问题

### Q1: Vercel 警告 "VITE_ prefix might expose sensitive information"？

**A: 这是正常的警告，可以安全忽略**

- `VITE_` 前缀的变量会被注入到浏览器代码中（这是预期的）
- Auth0 的配置（DOMAIN, CLIENT_ID, AUDIENCE, REDIRECT_URI）本来就是设计为公开的
- 真正需要保密的是 Client Secret（没有 `VITE_` 前缀，只在后端使用）
- **操作：点击 "Continue" 继续**

### Q2: Redis 连接失败？

**A:**
- 确保配置了 `UPSTASH_REDIS_REST_URL` 和 `UPSTASH_REDIS_REST_TOKEN`
- 确保值没有多余的空格
- 检查日志确认使用的是 Upstash Redis（不是 ioredis）

### Q3: Auth0 登录失败？

**A:**
- 检查 `VITE_AUTH0_REDIRECT_URI` 是否设置为 `https://supercocmos.me`
- 在 Auth0 Dashboard 中添加回调 URL：
  - `https://supercocmos.me/`
  - `https://www.supercocmos.me/`
- 确认环境变量正确配置

### Q4: 环境变量不生效？

**A:**
- 确保变量名完全匹配（区分大小写）
- 环境变量更改后需要重新部署
- 检查是否分配到 Production 环境

### Q5: 功能开关说明

**`VITE_GLOB_OPEN_LONG_REPLY`** - 长回复自动续写
- `true`: 当 AI 回复因长度限制被截断时，自动继续生成后续内容
- `false`: 禁用自动续写（默认）

**`VITE_GLOB_APP_PWA`** - PWA 功能
- `true`: 启用渐进式 Web 应用功能（离线访问、添加到主屏幕等）
- `false`: 禁用 PWA 功能（默认）

---

## 📚 参考文档

- [Vercel 环境变量文档](https://vercel.com/docs/concepts/projects/environment-variables)
- [Upstash Redis 文档](https://docs.upstash.com/redis)
- [Auth0 文档](https://auth0.com/docs)
- [Supabase 文档](https://supabase.com/docs)

---

## 🎯 快速检查清单

- [ ] 所有后端环境变量已配置（没有 `VITE_` 前缀）
- [ ] 所有前端环境变量已配置（有 `VITE_` 前缀）
- [ ] Auth0 回调 URL 已添加到 Auth0 Dashboard
- [ ] 代码已推送到 GitHub
- [ ] Vercel 项目已关联 GitHub 仓库
- [ ] 环境变量已添加到 Production 环境
- [ ] 部署成功
- [ ] Redis 连接正常（检查日志）
- [ ] Auth0 登录功能正常
- [ ] 聊天功能正常

---

✅ **配置完成！可以开始部署了！**
