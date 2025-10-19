# SuperCocmos 登录认证流程文档

## 📋 目录

1. [架构概览](#架构概览)
2. [认证流程](#认证流程)
3. [Clerk 集成](#clerk-集成)
4. [数据库同步](#数据库同步)
5. [后端认证层](#后端认证层)
6. [前端请求流程](#前端请求流程)
7. [关键代码位置](#关键代码位置)
8. [验证点清单](#验证点清单)

---

## 架构概览

```
┌──────────────────────────────────────────────────────────────────────┐
│                           用户登录流程                                 │
└──────────────────────────────────────────────────────────────────────┘

┌─────────────┐    ①登录     ┌──────────────┐   ②验证     ┌──────────────┐
│   浏览器    │  ────────>   │   Clerk      │  ────────>  │  Clerk 服务  │
│  (Vue App)  │              │  组件/SDK    │             │   (OAuth)    │
└─────────────┘              └──────────────┘             └──────────────┘
       │                            │                            │
       │                            │                            │
       │                       ③返回 JWT                         │
       │                            │                            │
       │<───────────────────────────┘                            │
       │                                                         │
       │                                                         │
       │  ④携带 JWT 请求 API                                      │
       │  ──────────────────────────────>  ┌──────────────────┐  │
       │                                   │   Express 后端   │  │
       │                                   │  (clerkAuth 中间 │  │
       │                                   │      件验证)     │  │
       │                                   └──────────────────┘  │
       │                                            │            │
       │                                            │            │
       │                                   ⑤查询用户信息          │
       │                                            │            │
       │                                            v            │
       │                                   ┌──────────────────┐  │
       │                                   │    Supabase      │  │
       │                                   │   (PostgreSQL)   │  │
       │                                   └──────────────────┘  │
       │                                            │            │
       │                                            │            │
       │  ⑥返回用户信息 + 角色                        │           │
       │  <──────────────────────────────────────────            │
       │                                                         │
       │                                                         │
       │  ⑦Clerk Webhook (异步)                                  │
       │  <──────────────────────────────────────────────────────┘
       │  同步用户数据到 Supabase

```

---

## 认证流程

### 1. 前端登录入口

**文件**: `src/views/auth/SignInUi.vue`

用户通过 Clerk 提供的登录组件进行登录：

```vue
<SignIn
  :force-redirect-url="forceRedirectUrl"
  :appearance="{ ... }"
/>
```

**登录方式**:
- Google OAuth
- GitHub OAuth
- Apple OAuth
- Email + Password

### 2. Clerk 初始化

**文件**: `src/main.ts`

应用启动时初始化 Clerk SDK：

```typescript
app.use(clerkPlugin, {
  publishableKey: PUBLISHABLE_KEY,
  signInUrl: '/signin',
  signUpUrl: '/signup',
  signUpFallbackRedirectUrl: SIGN_IN_FALLBACK_REDIRECT_URL,
})
```

**环境变量**:
- `VITE_CLERK_PUBLISHABLE_KEY`: Clerk 公钥
- `VITE_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL`: 登录后跳转地址

### 3. 用户登录成功

Clerk 验证成功后：
1. **前端**: Clerk SDK 将 JWT Token 存储在 `window.Clerk.session`
2. **后端**: Clerk 触发 Webhook 通知用户事件
3. **数据库**: Webhook 处理器将用户同步到 Supabase

---

## Clerk 集成

### Clerk Webhook 处理

**文件**: `service/src/api/authController.ts` - `handleClerkWebhook()`

**路由**: `POST /api/webhooks/clerk`

**处理的事件**:

#### 用户事件
- `user.created`: 新用户注册
- `user.updated`: 用户信息更新
- `user.deleted`: 用户删除（软删除）

```typescript
case 'user.created':
case 'user.updated': {
  await upsertUserFromOAuth({
    clerk_id: id,
    email,
    username,
    avatar_url,
    provider,
  })
  break
}
```

#### 会话事件
- `session.created`: 用户登录，更新 `last_login_at`
- `session.ended`: 会话结束
- `session.removed`: 会话移除
- `session.revoked`: 会话撤销

**验证机制**:
- 使用 `svix` 库验证 Webhook 签名
- 需要配置 `CLERK_WEBHOOK_SECRET` 环境变量

```typescript
const wh = new Webhook(WEBHOOK_SECRET)
evt = wh.verify(JSON.stringify(payload), {
  'svix-id': headers['svix-id'],
  'svix-timestamp': headers['svix-timestamp'],
  'svix-signature': headers['svix-signature'],
})
```

---

## 数据库同步

### 用户同步逻辑

**文件**: `service/src/db/supabaseUserService.ts` - `upsertUserFromOAuth()`

**同步策略**:

1. **通过 clerk_id 查找用户**
   - 存在 → 更新信息
   - 不存在 → 继续

2. **通过 email 查找用户**
   - 存在 → 关联 clerk_id 并更新
   - 不存在 → 创建新用户

3. **自动恢复已删除用户**
   - 如果用户 `status = 0`（已删除）
   - 重新激活并设置 `status = 1`

```typescript
if (user) {
  const wasDeleted = user.status === 0
  if (wasDeleted) {
    console.log(`🔄 恢复已删除用户: ${input.email}`)
  }
  await updateUser(user.user_id, {
    status: 1, // 重新激活
    last_login_at: new Date().toISOString(),
  })
}
```

### 数据库表结构

**表名**: `users`

**关键字段**:
- `user_id`: UUID (主键)
- `clerk_id`: Clerk 用户 ID
- `email`: 邮箱
- `username`: 用户名
- `avatar_url`: 头像 URL
- `provider`: 登录提供商 (google, github, apple, clerk)
- `login_method`: 登录方式
- `status`: 状态 (1=激活, 0=删除)
- `last_login_at`: 最后登录时间

---

## 后端认证层

项目实现了**双层认证机制**：

### 1. Clerk 认证中间件

**文件**: `service/src/middleware/clerkAuth.ts`

#### `clerkAuth` - 基础认证
```typescript
export const clerkAuth = clerkMiddleware({
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  secretKey: process.env.CLERK_SECRET_KEY,
})
```

**作用**: 将 Clerk 认证信息附加到 `req.auth`

#### `requireAuth` - 要求登录
```typescript
export function requireAuth(req, res, next) {
  const auth = getAuth(req)
  if (!auth?.userId) {
    return res.status(401).json({ message: '未授权：需要登录' })
  }
  req.userId = auth.userId // ✅ 附加 Clerk userId
  next()
}
```

**作用**:
- 验证用户已登录
- 将 `userId` (Clerk ID) 附加到 `req`

#### `requireAuthWithUser` - 要求登录 + 加载用户信息
```typescript
export async function requireAuthWithUser(req, res, next) {
  const auth = getAuth(req)
  if (!auth?.userId) {
    return res.status(401).json({ message: '未授权：需要登录' })
  }

  req.userId = auth.userId // ✅ Clerk ID

  const user = await findUserByClerkId(auth.userId)
  if (!user) {
    return res.status(404).json({ message: '用户不存在' })
  }

  req.dbUserId = user.user_id // ✅ 数据库 UUID
  next()
}
```

**作用**:
- 验证用户已登录
- 从数据库加载用户信息
- 将 `userId` 和 `dbUserId` 附加到 `req`

#### `requireAdmin` - 要求管理员权限
```typescript
export async function requireAdmin(req, res, next) {
  const auth = getAuth(req)
  if (!auth?.userId) {
    return res.status(401).json({ message: '未授权：需要登录' })
  }

  req.userId = auth.userId

  const user = await findUserByClerkId(auth.userId)
  if (!user) {
    return res.status(403).json({ message: '用户不存在' })
  }

  req.dbUserId = user.user_id

  const isAdmin = await userHasRole(user.user_id, 'admin')
  if (!isAdmin) {
    return res.status(403).json({ message: '需要管理员权限' })
  }

  next()
}
```

**作用**:
- 验证用户是管理员
- 从角色表 `user_roles` 中检查权限

### 2. 传统 Auth 中间件（兼容层）

**文件**: `service/src/middleware/auth.ts`

```typescript
async function auth(req, res, next) {
  const AUTH_SECRET_KEY = process.env.AUTH_SECRET_KEY
  if (isNotEmptyString(AUTH_SECRET_KEY)) {
    const Authorization = req.header('Authorization')
    if (!Authorization || Authorization.replace('Bearer ', '').trim() !== AUTH_SECRET_KEY.trim()) {
      throw new Error('无访问权限')
    }
  }
  next()
}
```

**作用**:
- 提供简单的 API Key 验证
- 用于非 Clerk 环境的兼容性
- 如果不设置 `AUTH_SECRET_KEY`，则跳过验证

### 路由使用示例

**文件**: `service/src/api/routes.ts`

```typescript
// ✅ 仅需登录
router.get('/auth/me', clerkAuth, requireAuth, authController.getCurrentUser)

// ✅ 需要登录 + 加载用户信息
router.get('/config', clerkAuth, requireAuthWithUser, configController.getConfig)

// ✅ 需要管理员权限
router.post('/roles', clerkAuth, requireAdmin, roleController.createRole)
```

**中间件执行顺序**:
1. `clerkAuth` - 解析 JWT，附加认证信息到 `req.auth`
2. `requireAuth` / `requireAuthWithUser` / `requireAdmin` - 验证权限
3. 控制器函数 - 处理业务逻辑

---

## 前端请求流程

### API Client 配置

**文件**: `src/api/client.ts`

#### 请求拦截器 - 自动携带 Token

```typescript
apiClient.interceptors.request.use(async (config) => {
  // 优先从 Clerk 获取 token
  if (window.Clerk?.session) {
    try {
      const clerkToken = await window.Clerk.session.getToken()
      if (clerkToken) {
        config.headers.Authorization = `Bearer ${clerkToken}`
        return config
      }
    }
    catch (error) {
      console.error('❌ 获取 Clerk token 失败:', error)
    }
  }

  // 降级：使用传统 token 存储（兼容性）
  const authStore = useAuthStore()
  const token = authStore.token || localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})
```

**Token 获取优先级**:
1. **Clerk Session Token** (推荐)
   - 通过 `window.Clerk.session.getToken()` 动态获取
   - 自动刷新，始终有效
2. **LocalStorage Token** (兼容)
   - 从 Pinia store 或 localStorage 读取
   - 用于非 Clerk 认证场景

#### 响应拦截器 - 错误处理

```typescript
apiClient.interceptors.response.use(
  (response) => {
    // 处理业务层面的 Unauthorized
    if (response.data?.status === 'Unauthorized') {
      const authStore = useAuthStore()
      authStore.removeToken()
      window.location.reload()
    }
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      console.error('❌ 未授权，请先登录')
    }
    return Promise.reject(error)
  }
)
```

### 获取当前用户信息

**文件**: `src/api/services/authService.ts`

```typescript
export async function getCurrentUser() {
  const response = await request.get<ApiResponse<{ user: User }>>('/auth/me')
  return response.data
}
```

**后端处理**:
1. `clerkAuth` - 解析 JWT
2. `requireAuth` - 验证登录状态，附加 `req.userId`
3. `authController.getCurrentUser()`:
   - 通过 `req.userId` (Clerk ID) 从数据库查询用户
   - 查询用户角色
   - 返回完整用户信息

```typescript
export async function getCurrentUser(req, res) {
  const auth = getAuth(req)
  const user = await findUserByClerkId(auth.userId)
  const userWithRoles = await getUserWithRoles(user.user_id)

  res.send({
    status: 'Success',
    data: {
      user: {
        id: user.user_id,
        clerkId: user.clerk_id,
        username: user.username,
        email: user.email,
        role: roles.includes('admin') ? 'admin' : 'user',
        roles: userWithRoles.roles,
        ...
      }
    }
  })
}
```

---

## 关键代码位置

### 前端

| 文件 | 作用 |
|------|------|
| `src/main.ts` | Clerk 初始化 |
| `src/views/auth/SignInUi.vue` | 登录组件 |
| `src/api/client.ts` | API 请求拦截器，自动携带 Token |
| `src/api/services/authService.ts` | 认证 API 封装 |
| `src/store/modules/auth/index.ts` | 认证状态管理 |
| `src/router/index.ts` | 路由配置 |

### 后端

| 文件 | 作用 |
|------|------|
| `service/src/middleware/clerkAuth.ts` | Clerk 认证中间件 |
| `service/src/middleware/auth.ts` | 传统 Auth 中间件（兼容） |
| `service/src/api/routes.ts` | API 路由配置 |
| `service/src/api/authController.ts` | 认证控制器（Webhook + 获取用户） |
| `service/src/db/supabaseUserService.ts` | 用户数据库操作 |
| `service/src/db/userRoleService.ts` | 角色权限管理 |

### 环境变量

**前端** (`.env`):
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxx
VITE_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/chat
```

**后端** (`service/.env`):
```env
CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
CLERK_WEBHOOK_SECRET=whsec_xxx
AUTH_SECRET_KEY=optional_legacy_key
```

---

## 验证点清单

### ✅ 前端验证点

1. **Clerk 初始化**
   - [ ] `VITE_CLERK_PUBLISHABLE_KEY` 是否正确配置？
   - [ ] Clerk 组件是否正常加载？
   - [ ] 登录后能否跳转到指定页面？

2. **Token 获取**
   - [ ] `window.Clerk.session` 是否存在？
   - [ ] `getToken()` 是否返回有效 JWT？
   - [ ] 请求拦截器是否正确添加 `Authorization` 头？

3. **用户信息获取**
   - [ ] `/auth/me` 接口是否返回用户信息？
   - [ ] 用户角色是否正确？

### ✅ 后端验证点

1. **Clerk 配置**
   - [ ] `CLERK_PUBLISHABLE_KEY` 是否正确？
   - [ ] `CLERK_SECRET_KEY` 是否正确？
   - [ ] `CLERK_WEBHOOK_SECRET` 是否配置？

2. **中间件链路**
   - [ ] `clerkAuth` 是否正确解析 JWT？
   - [ ] `requireAuth` 是否正确验证登录状态？
   - [ ] `req.userId` 和 `req.dbUserId` 是否正确附加？

3. **Webhook 同步**
   - [ ] Clerk Dashboard 中是否配置了 Webhook URL？
   - [ ] Webhook 签名验证是否通过？
   - [ ] 用户是否成功同步到 Supabase？
   - [ ] 用户状态（status）是否正确？

4. **数据库操作**
   - [ ] `findUserByClerkId()` 能否找到用户？
   - [ ] `upsertUserFromOAuth()` 是否正确处理创建/更新逻辑？
   - [ ] 角色表 `user_roles` 是否正确关联？

### ✅ 权限验证点

1. **普通用户**
   - [ ] 能否访问 `/auth/me`？
   - [ ] 能否访问 `/config`？
   - [ ] 访问 `/roles` 管理接口时是否返回 403？

2. **管理员用户**
   - [ ] 能否访问 `/roles` 管理接口？
   - [ ] 能否创建/更新/删除角色？
   - [ ] `userHasRole(userId, 'admin')` 是否返回 true？

### ✅ 兼容性验证点

1. **传统 Auth 中间件**
   - [ ] 不设置 `AUTH_SECRET_KEY` 时是否跳过验证？
   - [ ] 设置后是否正确验证 Bearer Token？

2. **降级逻辑**
   - [ ] Clerk 不可用时是否降级到 localStorage Token？
   - [ ] Token 过期时是否正确处理？

---

## 流程总结

```
用户点击登录
    ↓
Clerk 组件显示登录界面
    ↓
用户选择登录方式（OAuth / Email）
    ↓
Clerk 验证用户身份
    ↓
[成功] Clerk 返回 JWT Token
    ↓
前端将 Token 存储在 Clerk Session 中
    ↓
[异步] Clerk 触发 Webhook 通知后端
    ↓
后端接收 Webhook 事件（user.created / user.updated）
    ↓
后端验证 Webhook 签名
    ↓
后端将用户同步到 Supabase（upsertUserFromOAuth）
    ↓
用户跳转到 /chat 页面
    ↓
前端发送请求到 /auth/me
    ↓
请求拦截器自动添加 Authorization: Bearer <JWT>
    ↓
后端 clerkAuth 中间件解析 JWT
    ↓
后端 requireAuth 中间件验证登录状态
    ↓
后端 authController.getCurrentUser 查询数据库
    ↓
返回用户信息 + 角色
    ↓
前端存储用户信息到 Pinia Store
    ↓
用户可以正常使用应用
```

---

## 调试建议

### 前端调试
```javascript
// 检查 Clerk 是否初始化
// 解码 Token (使用 jwt-decode)
import { jwtDecode } from 'jwt-decode'

console.log(window.Clerk)

// 检查当前会话
console.log(window.Clerk.session)

// 手动获取 Token
const token = await window.Clerk.session.getToken()
console.log('JWT Token:', token)
console.log('Token Payload:', jwtDecode(token))
```

### 后端调试
```typescript
// 在中间件中打印认证信息
export function requireAuth(req, res, next) {
  const auth = getAuth(req)
  console.log('🔍 Auth Info:', {
    userId: auth?.userId,
    sessionId: auth?.sessionId,
  })
  // ...
}

// 在控制器中打印用户信息
export async function getCurrentUser(req, res) {
  console.log('🔍 Request Info:', {
    userId: req.userId,
    dbUserId: req.dbUserId,
    headers: req.headers.authorization,
  })
  // ...
}
```

### Webhook 调试
```typescript
// 在 Clerk Dashboard 中查看 Webhook 日志
// 或在代码中记录详细日志
export async function handleClerkWebhook(req, res) {
  console.log('📨 Webhook Event:', {
    type: req.body.type,
    data: JSON.stringify(req.body.data, null, 2),
  })
  // ...
}
```

---

## 常见问题

### Q1: 用户登录成功但 `/auth/me` 返回 404？
**原因**: Webhook 未同步用户到数据库
**解决**:
1. 检查 Clerk Dashboard 中 Webhook 配置
2. 查看后端 Webhook 日志
3. 手动触发用户更新事件

### Q2: Token 一直显示未授权？
**原因**: JWT Token 未正确添加到请求头
**解决**:
1. 检查 `window.Clerk.session` 是否存在
2. 查看浏览器 Network 面板的请求头
3. 确认 `getToken()` 返回值

### Q3: 管理员无法访问管理接口？
**原因**: 数据库中未分配 admin 角色
**解决**:
```sql
-- 查询用户角色
SELECT * FROM user_roles WHERE user_id = 'user_uuid';

-- 分配 admin 角色
INSERT INTO user_roles (user_id, role_id)
VALUES ('user_uuid', (SELECT role_id FROM roles WHERE role_code = 'admin'));
```

---

## 安全建议

1. **环境变量保护**
   - 不要将 Secret Key 提交到版本控制
   - 使用 `.env.local` 存储敏感信息

2. **Token 安全**
   - 使用 HTTPS 传输
   - 定期刷新 Token
   - 不要在 URL 中传递 Token

3. **Webhook 验证**
   - 务必验证 Webhook 签名
   - 使用 HTTPS Webhook URL
   - 记录所有 Webhook 事件

4. **权限控制**
   - 使用细粒度角色权限
   - 不要在前端假设用户权限
   - 所有敏感操作在后端验证

---

**文档版本**: 1.0
**最后更新**: 2025-01-20
**维护者**: SuperCocmos Team
