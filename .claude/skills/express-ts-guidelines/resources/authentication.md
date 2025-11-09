# 认证与授权

SuperCocmos 使用 Auth0 进行用户认证和授权。

---

## 🔐 Auth0 集成

### 环境变量配置

```env
# Auth0 配置
AUTH0_DOMAIN=your-domain.auth0.com
AUTH0_AUDIENCE=http://supercocmos.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
```

---

## 📁 相关文件

```
service/src/middleware/
├── auth0.ts          # Auth0 认证中间件
├── authUnified.ts    # 统一认证中间件
└── modelAccessAuth.ts # 模型访问权限

service/src/api/
└── auth0Controller.ts # Auth0 相关端点
```

---

## 🚀 使用认证中间件

### 基本认证

```typescript
import { requireAuth } from '../middleware/authUnified'

// 需要认证的路由
router.post('/conversations', requireAuth, handleCreateConversation)
router.get('/conversations', requireAuth, handleGetConversations)
```

### 管理员权限

```typescript
import { requireAdmin } from '../middleware/authUnified'

// 需要管理员权限的路由
router.post('/admin/config', requireAdmin, handleUpdateConfig)
router.delete('/admin/users/:id', requireAdmin, handleDeleteUser)
```

### 可选认证

```typescript
import { unifiedAuth } from '../middleware/authUnified'

// 可选认证（有token则验证，无token则继续）
router.get('/public-data', unifiedAuth, handleGetPublicData)
```

---

## 📝 控制器中获取用户信息

### 获取 Auth0 ID

```typescript
/**
 * 从请求中获取 Auth0 用户 ID
 */
async function getAuth0IdFromRequest(req: Request): Promise<string | null> {
  // 1. 从 Auth0 中间件设置的 userId 获取（推荐）
  const userId = (req as any).userId
  if (userId) return userId

  // 2. 从 Auth0 token 中获取
  const auth = (req as any).auth
  if (auth?.sub) return auth.sub

  // 3. 从 session 中获取（兼容旧版本）
  const session = (req as any).session
  if (session?.userId) return session.userId

  return null
}
```

### 获取 Supabase 用户 UUID

```typescript
/**
 * 从 Auth0 ID 获取 Supabase 用户 UUID
 */
async function getSupabaseUserIdFromRequest(req: Request): Promise<string | null> {
  const auth0Id = await getAuth0IdFromRequest(req)
  if (!auth0Id) return null

  try {
    const { findUserByAuth0Id } = await import('../db/supabaseUserService')
    const user = await findUserByAuth0Id(auth0Id)
    return user?.user_id || null
  } catch (error) {
    console.error('❌ [getSupabaseUserId] 查询失败', error)
    return null
  }
}
```

### 完整示例

```typescript
export async function handleCreateItem(req: Request, res: Response) {
  try {
    // 1. 获取 Auth0 ID
    const auth0Id = await getAuth0IdFromRequest(req)
    if (!auth0Id) {
      return res.status(401).json({ error: '未授权' })
    }

    // 2. 获取 Supabase 用户 ID（用于数据库查询）
    const userId = await getSupabaseUserIdFromRequest(req)
    if (!userId) {
      return res.status(401).json({ error: '用户不存在' })
    }

    // 3. 继续处理...
    const { title } = req.body
    const item = await createItem({ userId, title })

    return res.json(item)
  } catch (error) {
    console.error('❌ 错误:', error)
    return res.status(500).json({ error: '服务器错误' })
  }
}
```

---

## 🔑 Auth0 Roles 和权限

### 检查用户角色

```typescript
/**
 * 检查用户是否为管理员
 */
function isAdmin(req: Request): boolean {
  const auth = (req as any).auth

  if (!auth) return false

  const roles = auth[`${process.env.AUTH0_AUDIENCE}/roles`]
  return Array.isArray(roles) && roles.includes('admin')
}

// 在控制器中使用
export async function handleAdminAction(req: Request, res: Response) {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: '权限不足' })
  }

  // 继续处理管理员操作...
}
```

### 检查特定权限

```typescript
/**
 * 检查用户是否有特定权限
 */
function hasPermission(req: Request, permission: string): boolean {
  const auth = (req as any).auth

  if (!auth) return false

  const permissions = auth.permissions || []
  return permissions.includes(permission)
}

// 使用示例
export async function handleDeleteUser(req: Request, res: Response) {
  if (!hasPermission(req, 'delete:users')) {
    return res.status(403).json({ error: '权限不足' })
  }

  // 继续处理...
}
```

---

## 🛡️ 模型访问权限

SuperCocmos 实现了基于角色的模型访问控制：

```typescript
import { requireModelAccess } from '../middleware/modelAccessAuth'

// 需要模型访问权限的路由
router.post('/chat', requireAuth, requireModelAccess, handleChat)
```

### 权限检查逻辑

```typescript
/**
 * 检查用户是否有权限访问指定模型
 */
async function checkModelAccess(
  userId: string,
  modelId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('model_role_access')
      .select('*')
      .eq('user_id', userId)
      .eq('model_id', modelId)
      .single()

    if (error || !data) {
      return false
    }

    return data.has_access
  } catch (err) {
    console.error('❌ [checkModelAccess] 错误:', err)
    return false
  }
}
```

---

## 📊 Auth0 Token 结构

Auth0 JWT token 包含以下信息：

```typescript
interface Auth0Token {
  sub: string                    // Auth0 用户 ID
  email: string
  email_verified: boolean
  name?: string
  picture?: string
  iat: number                    // 签发时间
  exp: number                    // 过期时间
  aud: string                    // Audience
  iss: string                    // Issuer
  permissions?: string[]         // 权限列表
  [namespace: string]: any       // 自定义声明（如角色）
}
```

### 访问 Token 信息

```typescript
export async function handleGetProfile(req: Request, res: Response) {
  const auth = (req as any).auth as Auth0Token

  if (!auth) {
    return res.status(401).json({ error: '未授权' })
  }

  return res.json({
    userId: auth.sub,
    email: auth.email,
    name: auth.name,
    picture: auth.picture,
    roles: auth[`${process.env.AUTH0_AUDIENCE}/roles`] || []
  })
}
```

---

## ⚠️ 安全最佳实践

### 1. 始终验证用户身份

```typescript
// ✅ 推荐
export async function handleAction(req: Request, res: Response) {
  const userId = await getUserIdFromRequest(req)
  if (!userId) {
    return res.status(401).json({ error: '未授权' })
  }
  // 继续...
}

// ❌ 危险：信任客户端提供的 ID
export async function handleAction(req: Request, res: Response) {
  const userId = req.body.userId // 不安全！
  // ...
}
```

### 2. 检查资源所有权

```typescript
export async function handleUpdateItem(req: Request, res: Response) {
  const userId = await getUserIdFromRequest(req)
  const { id } = req.params

  // 检查资源是否属于当前用户
  const item = await getItem(id)
  if (!item || item.user_id !== userId) {
    return res.status(403).json({ error: '无权访问' })
  }

  // 继续更新...
}
```

### 3. 使用 HTTPS

```typescript
// 生产环境强制 HTTPS
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      return res.redirect(`https://${req.header('host')}${req.url}`)
    }
    next()
  })
}
```

### 4. 设置安全 Headers

```typescript
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  next()
})
```

---

## 📋 检查清单

实现认证功能时，确认：

- [ ] 路由使用正确的认证中间件
- [ ] 控制器中验证用户身份
- [ ] 检查资源所有权（防止越权）
- [ ] 返回合适的状态码（401/403）
- [ ] 不信任客户端提供的用户 ID
- [ ] 敏感操作记录审计日志
- [ ] 生产环境使用 HTTPS
- [ ] Token 过期处理
- [ ] 错误信息不泄露敏感数据

---

## 💡 常见场景

### 公开接口 + 可选认证

```typescript
export async function handleGetPublicData(req: Request, res: Response) {
  const userId = await getUserIdFromRequest(req)

  // 根据是否认证返回不同数据
  if (userId) {
    // 返回个性化数据
    const personalizedData = await getPersonalizedData(userId)
    return res.json(personalizedData)
  } else {
    // 返回公开数据
    const publicData = await getPublicData()
    return res.json(publicData)
  }
}
```

### 批量操作权限检查

```typescript
export async function handleBatchDelete(req: Request, res: Response) {
  const userId = await getUserIdFromRequest(req)
  const { ids } = req.body

  // 检查所有资源的所有权
  const items = await getItemsByIds(ids)
  const unauthorized = items.filter(item => item.user_id !== userId)

  if (unauthorized.length > 0) {
    return res.status(403).json({
      error: '部分资源无权访问',
      unauthorized_ids: unauthorized.map(item => item.id)
    })
  }

  // 继续批量删除...
}
```

### 限流保护

```typescript
import { limiter } from '../middleware/limiter'

// 对敏感接口应用限流
router.post('/api/expensive-operation', requireAuth, limiter, handleExpensiveOperation)
```

---

## 🔗 相关资源

- [Auth0 Express 中间件文档](https://github.com/auth0/express-oauth2-jwt-bearer)
- [JWT 调试工具](https://jwt.io/)
- [控制器模式](./controllers.md)

---

**记住**：安全是首要任务。始终验证用户身份，检查权限，不信任客户端输入。
