# SuperCosmos 项目架构文档

## 📁 项目结构

```
SuperCosmos/
├── service/                    # 后端服务
│   ├── src/
│   │   ├── api/               # API 路由和控制器
│   │   │   ├── authController.ts      # Clerk Webhook 处理
│   │   │   ├── roleController.ts      # 角色管理
│   │   │   ├── providerController.ts  # 供应商管理
│   │   │   └── routes.ts             # 路由配置
│   │   ├── db/                # 数据库相关
│   │   │   ├── supabaseClient.ts     # Supabase 客户端
│   │   │   ├── supabaseUserService.ts # 用户 CRUD
│   │   │   ├── userRoleService.ts    # 角色服务
│   │   │   ├── providerService.ts    # 供应商服务
│   │   │   ├── 00-init-users.sql     # 用户表初始化
│   │   │   ├── provider-model-schema.sql  # 供应商/模型表
│   │   │   ├── schema.sql            # 角色权限系统
│   │   │   └── user-sesion-config.sql # 会话配置表
│   │   ├── middleware/        # 中间件
│   │   │   ├── clerkAuth.ts          # Clerk 认证中间件
│   │   │   ├── auth.ts               # 旧的认证中间件
│   │   │   └── limiter.ts            # 请求限流
│   │   ├── chatgpt/           # ChatGPT 集成
│   │   ├── quiz/              # 题目生成工作流
│   │   ├── utils/             # 工具函数
│   │   └── index.ts           # 服务入口
│   ├── .env                   # 环境变量（敏感！）
│   ├── .env.example           # 环境变量模板
│   ├── SETUP.md               # 配置说明
│   └── WEBHOOK_TEST.md        # Webhook 测试指南
├── src/                       # 前端源码
│   ├── api/                   # API 客户端
│   ├── components/            # Vue 组件
│   ├── store/                 # Pinia 状态管理
│   ├── views/                 # 页面视图
│   ├── router/                # 路由配置
│   └── main.ts                # 前端入口
├── .env                       # 前端环境变量
└── vite.config.ts             # Vite 配置
```

---

## 🏗️ 系统架构

### 认证流程

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Browser   │────────▶│    Clerk     │────────▶│  Frontend   │
│             │◀────────│   (Auth)     │◀────────│   (Vue)     │
└─────────────┘         └──────────────┘         └─────────────┘
                              │                          │
                              │ Webhook                  │ API
                              ▼                          ▼
                        ┌──────────────┐         ┌─────────────┐
                        │   Backend    │────────▶│  Supabase   │
                        │  (Express)   │◀────────│  (Database) │
                        └──────────────┘         └─────────────┘
```

### 用户注册/登录流程

1. **用户在前端点击"注册"**
   - 前端调用 Clerk UI 组件
   - Clerk 处理用户注册（邮箱验证、OAuth 等）

2. **Clerk 触发 Webhook**
   - 事件：`user.created`
   - 发送到：`https://你的域名/api/webhooks/clerk`
   - 包含：用户ID、邮箱、用户名、头像等

3. **后端接收 Webhook**
   - 验证 Webhook 签名（使用 `CLERK_WEBHOOK_SECRET`）
   - 调用 `upsertUserFromOAuth()` 同步用户到 Supabase

4. **数据库触发器执行**
   - `assign_default_role_trigger` 自动触发
   - 为新用户分配 'user' 角色

5. **用户登录成功**
   - 前端获取 Clerk session
   - 后端 API 使用 `clerkAuth` 中间件验证请求
   - 通过 `clerk_id` 关联 Supabase 用户数据

---

## 🔐 认证和授权

### 前端认证（Clerk）

```typescript
// 使用 Clerk Vue SDK
import { ClerkProvider, SignIn, SignUp } from '@clerk/vue'

// 配置在 main.ts
app.use(ClerkProvider, {
  publishableKey: import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
})
```

### 后端认证（Clerk Express）

```typescript
// service/src/middleware/clerkAuth.ts
import { clerkMiddleware, getAuth, requireAuth } from '@clerk/express'

// 所有需要认证的路由都使用 clerkAuth + requireAuth
router.get('/api/auth/me', clerkAuth, requireAuth, getCurrentUser)
```

### 权限检查

```typescript
// service/src/middleware/clerkAuth.ts
export async function requireAdmin(req, res, next) {
  const auth = getAuth(req)
  const user = await findUserByClerkId(auth.userId)
  const isAdmin = await userHasRole(user.user_id, 'admin')

  if (!isAdmin) {
    return res.status(403).send({ message: '需要管理员权限' })
  }
  next()
}
```

---

## 💾 数据库设计

### 核心表结构

#### users（用户表）
- `user_id` (UUID, PK) - 用户唯一标识
- `clerk_id` (VARCHAR) - Clerk 用户 ID（关键！）
- `username` (VARCHAR) - 用户名
- `email` (VARCHAR) - 邮箱
- `avatar_url` (VARCHAR) - 头像
- `provider` (VARCHAR) - 认证提供商（google, github, clerk）
- `status` (INT) - 状态（1=启用, 0=禁用）
- `created_at`, `updated_at`, `last_login_at`

#### roles（角色表）
- `role_id` (BIGSERIAL, PK)
- `role_name` (VARCHAR) - 角色名（admin, user）
- `role_description` (TEXT)

#### user_roles（用户-角色关联表）
- `user_role_id` (BIGSERIAL, PK)
- `user_id` (UUID, FK → users)
- `role_id` (BIGINT, FK → roles)

#### providers（供应商表）
- `id` (UUID, PK)
- `name` (VARCHAR) - 供应商名称（如 OpenAI, Kriora）
- `base_url` (VARCHAR) - API 地址
- `api_key_encrypted` (TEXT) - 加密的 API Key
- `enabled` (BOOLEAN)

#### models（模型表）
- `id` (UUID, PK)
- `provider_id` (UUID, FK → providers)
- `model_id` (VARCHAR) - 模型 ID（如 gpt-4o）
- `display_name` (VARCHAR)
- `enabled` (BOOLEAN)

---

## 🔄 数据同步流程

### Clerk → Supabase 同步

```typescript
// service/src/db/supabaseUserService.ts
export async function upsertUserFromOAuth(input: {
  clerk_id: string
  email: string
  username?: string
  avatar_url?: string
  provider: string
}): Promise<SupabaseUser> {
  // 先尝试查找用户
  const user = await findUserByClerkId(input.clerk_id)

  if (user) {
    // 更新现有用户
    return await updateUser(user.user_id, { ...input })
  }
  else {
    // 创建新用户（触发器会自动分配角色）
    return await createUser(input)
  }
}
```

### 触发器自动分配角色

```sql
-- service/src/db/schema.sql
CREATE OR REPLACE FUNCTION assign_default_role()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role_id)
  SELECT NEW.user_id, role_id
  FROM public.roles
  WHERE role_name = 'user';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER assign_default_role_trigger
AFTER INSERT ON public.users
FOR EACH ROW
EXECUTE FUNCTION assign_default_role();
```

---

## 🔌 API 端点

### 认证相关

- `POST /api/webhooks/clerk` - Clerk Webhook 接收器
- `GET /api/auth/me` - 获取当前用户信息（需要认证）

### 角色管理（需要管理员权限）

- `GET /api/roles` - 获取所有角色
- `POST /api/roles` - 创建角色
- `PUT /api/roles/:id` - 更新角色
- `DELETE /api/roles/:id` - 删除角色
- `POST /api/user-roles/assign` - 分配角色
- `POST /api/user-roles/remove` - 移除角色

### 供应商管理

- `GET /api/providers` - 获取所有供应商和模型
- `POST /api/providers` - 创建供应商
- `PUT /api/providers/:id` - 更新供应商
- `DELETE /api/providers/:id` - 删除供应商

### 聊天相关

- `POST /api/chat-process` - 流式聊天接口
- `POST /api/config` - 获取配置
- `POST /api/session` - 获取会话信息

---

## 🔧 关键配置

### 环境变量（service/.env）

```bash
# Supabase（使用 SERVICE_ROLE_KEY 绕过 RLS）
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...（公钥）
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...（密钥，敏感！）

# Clerk（后端）
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
CLERK_PUBLISHABLE_KEY=pk_test_...

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_API_BASE_URL=https://api.juheai.top
```

### 前端环境变量（.env）

```bash
# Clerk（前端）
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_CLERK_SIGN_IN_FORCE_REDIRECT_URL=/chat
```

---

## 🛡️ 安全措施

### 1. RLS（Row Level Security）绕过

- 后端使用 `SERVICE_ROLE_KEY` 绕过 RLS
- 前端使用 `ANON_KEY`（受 RLS 限制）
- 原因：Clerk 认证不是 Supabase Auth，无法使用 `auth.uid()`

### 2. Webhook 签名验证

```typescript
// service/src/api/authController.ts
import { Webhook } from 'svix'

const wh = new Webhook(CLERK_WEBHOOK_SECRET)
const _evt = wh.verify(payload, headers)
// 验证失败会抛出异常
```

### 3. 密钥加密

```typescript
// service/src/db/providerService.ts
import { decrypt, encrypt } from '../utils/crypto'

// 存储时加密
const encrypted = encrypt(api_key, ENCRYPTION_KEY)

// 使用时解密
const _decrypted = decrypt(encrypted, ENCRYPTION_KEY)
```

---

## 📊 监控和日志

### 日志格式

```
✅ [模块] 成功信息
❌ [模块] 错误信息
⚠️  [模块] 警告信息
📨 [Webhook] Webhook 事件
📍 [Webhook] Session 事件
```

### 关键日志位置

- **Clerk Webhook**：`service/src/api/authController.ts`
- **Supabase 操作**：`service/src/db/supabaseUserService.ts`
- **服务器启动**：`service/src/index.ts`

---

## 🚀 部署流程

### 开发环境

```bash
# 后端
cd service
pnpm install
pnpm dev  # 运行在 3002 端口

# 前端
pnpm install
pnpm dev  # 运行在 5173 端口

# 使用 ngrok 暴露 Webhook
ngrok http 3002
# 配置 Webhook URL: https://xxx.ngrok.io/api/webhooks/clerk
```

### 生产环境

1. **构建前端**
   ```bash
   pnpm build
   # 生成 dist/ 目录
   ```

2. **部署后端**
   - 上传代码到服务器
   - 配置环境变量
   - 运行：`npm start`

3. **更新 Clerk Webhook URL**
   - 从 `https://xxx.ngrok.io` 改为生产域名
   - 如：`https://api.yourapp.com/api/webhooks/clerk`

---

## 📚 技术栈

### 后端
- **框架**: Express.js + TypeScript
- **认证**: @clerk/express
- **数据库**: Supabase (PostgreSQL)
- **ORM**: @supabase/supabase-js
- **Webhook**: svix

### 前端
- **框架**: Vue 3 + TypeScript
- **构建工具**: Vite
- **认证 UI**: @clerk/vue
- **状态管理**: Pinia
- **路由**: Vue Router

---

## 🔗 相关文档

- [SETUP.md](./service/SETUP.md) - 配置说明
- [WEBHOOK_TEST.md](./service/WEBHOOK_TEST.md) - Webhook 测试指南
- [Clerk 文档](https://clerk.com/docs)
- [Supabase 文档](https://supabase.com/docs)

---

## 📝 待优化项

- [ ] 添加 Webhook 重试机制
- [ ] 实现会话日志记录到数据库
- [ ] 优化错误处理和通知
- [ ] 添加单元测试
- [ ] 实现 API 访问日志
- [ ] 添加监控告警（如 Sentry）
- [ ] 实现数据库备份策略
- [ ] 优化前端性能（懒加载、缓存）
