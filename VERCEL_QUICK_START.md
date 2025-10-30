# 🚀 Vercel 快速部署 - 5 分钟上线

## 📋 前置准备

- ✅ GitHub 账号
- ✅ Vercel 账号（用 GitHub 登录）
- ✅ Upstash 账号（用 GitHub 登录）

---

## ⚡ 快速步骤

### 1️⃣ 创建 Upstash Redis（2分钟）

```bash
1. 访问：https://console.upstash.com/
2. 使用 GitHub/Google 账号登录（无需密码）
3. 点击 "Create Database"
4. 输入数据库名称，选择离你最近的区域（推荐：Singapore/Tokyo）
5. 点击 "Create"
```

**📋 复制 REST API 信息（重要）：**

进入数据库详情页，找到 **REST API** 选项卡，复制以下信息：

```bash
# ✅ Vercel 部署需要这两个变量
UPSTASH_REDIS_REST_URL="https://caring-hedgehog-31136.upstash.io"
UPSTASH_REDIS_REST_TOKEN="AXmgAAIncDJmZWJmNWM2N2ZiNTk0NDc3YWEwYjRiMzg3Yjg0NDdhMnAyMzExMzY"
```

**💡 说明：**
- ✅ Upstash 使用 **Token 认证**（不是传统密码），更安全
- ✅ REST API 适合 Serverless 环境（Vercel）
- ✅ Google 账号登录没有问题，Token 就是你的认证凭证
- ❌ 不要使用 TCP 连接方式（那是本地开发用的）
- ❌ Management API Token 是管理资源用的，不是连接 Redis 用的

**其他连接信息（可选）：**

<details>
<summary>点击展开：本地开发 TCP 连接信息</summary>

```bash
# TCP 连接（仅用于本地开发）
REDIS_HOST=caring-hedgehog-31136.upstash.io
REDIS_PORT=6379
REDIS_PASSWORD=AXmgAAIncDJmZWJmNWM2N2ZiNTk0NDc3YWEwYjRiMzg3Yjg0NDdhMnAyMzExMzY
```

CLI 测试连接：
```bash
redis-cli --tls -u rediss://default:AXmgAAIncDJmZWJmNWM2N2ZiNTk0NDc3YWEwYjRiMzg3Yjg0NDdhMnAyMzExMzY@caring-hedgehog-31136.upstash.io:6379
```
</details>

---

### 2️⃣ 准备后端代码（3分钟）

**为 Vercel Serverless 环境配置 Upstash Redis：**

1. **安装 Upstash Redis 依赖**

   ```bash
   cd service
   pnpm add @upstash/redis
   ```

2. **切换 Redis 客户端**

   编辑 `service/src/index.ts`，找到 Redis 导入语句：

   ```typescript
   // ❌ 将这行（ioredis，本地开发用）
   import { redis } from './cache/redisClient'

   // ✅ 改为这行（@upstash/redis，Vercel 部署用）
   import { redis } from './cache/redisClient.upstash'
   ```

3. **验证配置文件存在**

   确认文件 `service/src/cache/redisClient.upstash.ts` 存在（已包含在项目中）

**为什么要用 @upstash/redis？**
- ✅ 专为 Serverless 设计，使用 HTTP REST API
- ✅ 无需长连接，避免连接池耗尽
- ✅ 自动处理认证和重试
- ✅ 更适合 Vercel 的 Serverless Functions

---

### 3️⃣ 推送代码到 GitHub（1分钟）

```bash
# 提交更改
git add .
git commit -m "feat: 配置 Upstash Redis for Vercel"
git branch -M main

# 如果还没设置远程仓库
git remote add origin https://github.com/你的用户名/SuperCocmos.git

# 推送到 GitHub
git push -u origin main
```

---

### 4️⃣ 部署到 Vercel（2分钟）

**步骤：**

1. **导入项目**
   ```
   1. 访问 https://vercel.com/
   2. 点击 "New Project"
   3. 选择你的 SuperCocmos 仓库
   4. 点击 "Import"
   ```

2. **配置环境变量**

   点击 "Environment Variables"，添加以下变量：

   **必需变量：**
   ```bash
   # ⚡ Upstash Redis（REST API - Serverless 专用）
   UPSTASH_REDIS_REST_URL=https://你的数据库地址.upstash.io
   UPSTASH_REDIS_REST_TOKEN=你的_REST_Token

   # 🔐 Auth0
   VITE_AUTH0_DOMAIN=你的域名.auth0.com
   VITE_AUTH0_CLIENT_ID=你的客户端ID
   VITE_AUTH0_AUDIENCE=你的API标识符

   # 🗄️ Supabase
   SUPABASE_URL=你的项目URL
   SUPABASE_ANON_KEY=你的匿名密钥
   SUPABASE_SERVICE_ROLE_KEY=你的服务密钥

   # 🌍 其他
   NODE_ENV=production
   ```

   **⚠️ 重要提示：**
   - 使用 `UPSTASH_REDIS_REST_URL` 和 `UPSTASH_REDIS_REST_TOKEN`（不是传统的 HOST/PORT/PASSWORD）
   - 确保你的代码使用了 `@upstash/redis` 包（见下方配置说明）
   - Token 就是你的认证凭证，无需额外密码

3. **开始部署**
   ```
   点击 "Deploy"
   等待 2-3 分钟
   ```

4. **完成！** 🎉

   部署成功后会得到一个地址：
   ```
   https://super-cosmos-xxx.vercel.app
   ```

---

## ✅ 验证部署

访问你的 Vercel 地址，测试以下功能：

- [ ] 页面正常加载
- [ ] Auth0 登录可用
- [ ] 可以创建新对话
- [ ] 聊天功能正常
- [ ] 会话切换流畅

---

## 🔧 查看日志

如果遇到问题，检查日志：

```
Vercel Dashboard → 你的项目 → Deployments → [最新部署] → View Function Logs
```

查找以下标志：
```
✅ [Redis] 已连接到 Redis 服务器
✅ [Redis] PING 测试成功: PONG
```

---

## 📱 绑定自定义域名（可选）

1. **添加域名**
   ```
   Vercel Dashboard → Settings → Domains
   输入你的域名（如：chat.yourdomain.com）
   ```

2. **配置 DNS**
   ```
   在你的域名服务商添加 CNAME 记录：

   类型: CNAME
   名称: chat
   值: cname.vercel-dns.com
   ```

3. **等待生效**
   ```
   DNS 生效时间：5-30 分钟
   SSL 证书自动生成：1-2 分钟
   ```

---

## 💰 费用说明

### 免费方案（Hobby）

✅ **Vercel Hobby**
- 带宽：100GB/月
- 构建时间：6000 分钟/月
- Serverless 执行：100GB-Hrs/月
- **费用：免费** ✨

✅ **Upstash Redis**
- 命令数：10,000/天
- 存储：256MB
- 连接数：100
- **费用：免费** ✨

**总计：完全免费！** 🎉

### 付费方案（可选）

**Vercel Pro** - $20/月
- 带宽：1TB/月
- 更多团队协作功能
- 优先支持

**Upstash Pro** - $10/月起
- 更多命令和存储
- 多区域复制
- 专业支持

---

## 🎯 下一步

部署成功后，您可以：

1. ✅ 配置 Auth0 回调地址
2. ✅ 测试所有功能
3. ✅ 邀请用户使用
4. ✅ 监控性能和使用情况
5. ✅ 考虑升级到付费计划（如需要）

---

## 🆘 常见问题

### Q1: 构建失败？
**A:** 检查 package.json 中的构建脚本，确保本地构建成功

### Q2: Redis 连接失败 "Connection timeout" 或 "ECONNREFUSED"？
**A: 这通常是因为使用了错误的 Redis 客户端**

**解决方案：**
1. ✅ 确认已安装 `@upstash/redis`：
   ```bash
   cd service
   pnpm add @upstash/redis
   ```

2. ✅ 确认代码使用了正确的导入：
   ```typescript
   // service/src/index.ts
   import { redis } from './cache/redisClient.upstash'  // ✅ 正确
   // import { redis } from './cache/redisClient'      // ❌ 错误（ioredis 不适合 Serverless）
   ```

3. ✅ 确认环境变量使用 REST API 格式：
   ```bash
   UPSTASH_REDIS_REST_URL=https://xxx.upstash.io       # ✅ 正确
   UPSTASH_REDIS_REST_TOKEN=AXmgAAI...                 # ✅ 正确
   # REDIS_HOST=xxx.upstash.io                         # ❌ 错误（TCP 连接）
   # REDIS_PASSWORD=xxx                                # ❌ 错误（TCP 连接）
   ```

### Q3: 环境变量不生效？
**A:**
- 确保变量名完全匹配（区分大小写）：`UPSTASH_REDIS_REST_URL`（不是 `REDIS_URL`）
- 环境变量更改后需要重新部署
- 检查是否分配到 Production 环境

### Q4: Auth0 登录失败？
**A:**
- 在 Auth0 Dashboard 添加 Vercel 回调 URL
- 格式：`https://your-app.vercel.app/`
- 确认环境变量正确配置

### Q5: Upstash 说我没有密码怎么办？
**A: 完全正常！Upstash 使用 Token 认证，不需要密码**
- ✅ Token 就是你的认证凭证
- ✅ Google/GitHub 账号登录没有问题
- ✅ 只需要 `UPSTASH_REDIS_REST_URL` 和 `UPSTASH_REDIS_REST_TOKEN` 两个环境变量

---

## 📞 获取帮助

- [Vercel 文档](https://vercel.com/docs)
- [Upstash 文档](https://docs.upstash.com/)
- [项目 Issues](https://github.com/你的用户名/SuperCocmos/issues)

---

🎊 **享受您的部署之旅！**
