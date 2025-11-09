# TypeScript 类型安全最佳实践

使用 TypeScript 的类型系统提升代码质量、减少运行时错误、改善开发体验。

---

## 🎯 核心原则

1. **避免使用 `any`** - 始终定义明确的类型
2. **优先使用接口和类型** - 提供清晰的数据结构
3. **利用类型推断** - 让 TypeScript 自动推断类型
4. **使用联合类型和字面量类型** - 限制可能的值
5. **导出可复用的类型** - 避免重复定义

---

## 📝 接口定义规范

### 数据模型接口

```typescript
/**
 * 对话模型
 */
export interface Conversation {
  id: string
  user_id: string
  title: string
  model?: string
  created_at: string
  updated_at: string
}

/**
 * 消息模型
 */
export interface Message {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'system'  // 使用字面量类型
  content: string
  tokens?: number
  created_at: string
}

/**
 * 用户模型
 */
export interface User {
  id: string
  auth0_id: string  // Auth0 用户 ID (sub)
  email: string
  username?: string
  avatar_url?: string
  role: UserRole
  created_at: string
}

/**
 * 用户角色枚举
 */
export type UserRole = 'user' | 'pro' | 'admin'
```

### 函数参数接口

```typescript
/**
 * 创建对话的参数
 */
export interface CreateConversationParams {
  userId: string
  title: string
  model?: string
}

/**
 * 更新对话的参数
 */
export interface UpdateConversationParams {
  title?: string
  model?: string
}

/**
 * 查询对话的参数
 */
export interface GetConversationsParams {
  userId: string
  limit?: number
  offset?: number
  model?: string
}
```

### API 响应接口

```typescript
/**
 * 成功响应
 */
export interface SuccessResponse<T> {
  data: T
  total?: number
  message?: string
}

/**
 * 错误响应
 */
export interface ErrorResponse {
  error: string
  code?: string
  details?: any
}

/**
 * 分页响应
 */
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}
```

---

## 🔧 函数签名最佳实践

### 服务层函数

```typescript
import type { Conversation, CreateConversationParams } from '../types'

/**
 * ✅ 好的做法：明确的参数类型和返回类型
 */
export async function createConversation(
  params: CreateConversationParams
): Promise<Conversation | null> {
  // 实现...
}

/**
 * ✅ 好的做法：解构参数对象
 */
export async function getConversations(
  userId: string,
  options?: {
    limit?: number
    offset?: number
    model?: string
  }
): Promise<Conversation[]> {
  const { limit = 20, offset = 0, model } = options || {}
  // 实现...
}

/**
 * ❌ 不好的做法：使用 any
 */
export async function badFunction(data: any): Promise<any> {
  // 避免这样做！
}
```

### 控制器函数

```typescript
import type { Request, Response } from 'express'

/**
 * 扩展 Request 类型以包含认证信息
 */
interface AuthRequest extends Request {
  userId?: string
  auth?: {
    sub: string
    email: string
  }
}

/**
 * ✅ 好的做法：使用扩展的 Request 类型
 */
export async function handleGetConversations(
  req: AuthRequest,
  res: Response
): Promise<Response> {
  const userId = req.userId  // TypeScript 知道这个属性存在
  // 实现...
  return res.json({ data: [] })
}
```

---

## 🎨 类型别名 vs 接口

### 何时使用接口

```typescript
// ✅ 对象结构：使用 interface
export interface User {
  id: string
  name: string
}

// ✅ 可扩展的类型：使用 interface
export interface BaseEntity {
  id: string
  created_at: string
}

export interface Conversation extends BaseEntity {
  title: string
  user_id: string
}
```

### 何时使用类型别名

```typescript
// ✅ 联合类型：使用 type
export type Status = 'pending' | 'active' | 'archived'

export type MessageRole = 'user' | 'assistant' | 'system'

// ✅ 函数类型：使用 type
export type Logger = (message: string, context?: any) => void

// ✅ 复杂类型组合：使用 type
export type ConversationWithMessages = Conversation & {
  messages: Message[]
}
```

---

## 🔀 联合类型和字面量类型

### 限制可能的值

```typescript
/**
 * ✅ 好的做法：使用字面量类型限制值
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface ApiConfig {
  method: HttpMethod
  endpoint: string
  auth: boolean
}

/**
 * ❌ 不好的做法：使用 string 允许任意值
 */
export interface BadApiConfig {
  method: string  // 可以是任何字符串
  endpoint: string
}
```

### 条件类型

```typescript
/**
 * 根据角色返回不同的权限
 */
export type Permission<T extends UserRole> =
  T extends 'admin' ? 'all' :
  T extends 'pro' ? 'limited' :
  'basic'

// 使用
const adminPermission: Permission<'admin'> = 'all'  // ✅
const userPermission: Permission<'user'> = 'basic'  // ✅
```

---

## 🛡️ 可选属性和必需属性

### 明确可选性

```typescript
/**
 * ✅ 好的做法：明确哪些是可选的
 */
export interface CreateUserParams {
  email: string           // 必需
  username?: string       // 可选
  avatar_url?: string     // 可选
  role?: UserRole         // 可选，有默认值
}

/**
 * 使用 Partial 工具类型将所有属性变为可选
 */
export type UpdateUserParams = Partial<CreateUserParams>
```

### 工具类型

```typescript
// Partial - 所有属性变为可选
export type PartialUser = Partial<User>

// Required - 所有属性变为必需
export type RequiredConfig = Required<ApiConfig>

// Pick - 选择部分属性
export type UserBasicInfo = Pick<User, 'id' | 'email' | 'username'>

// Omit - 排除部分属性
export type UserWithoutPassword = Omit<User, 'password_hash'>

// Record - 创建对象类型
export type UserRoleMap = Record<string, UserRole>
```

---

## 📦 类型导入和导出

### 集中管理类型

```typescript
// service/src/types.ts
/**
 * 统一的类型定义文件
 */

// 数据模型
export interface User { /* ... */ }
export interface Conversation { /* ... */ }
export interface Message { /* ... */ }

// 请求参数
export interface CreateConversationParams { /* ... */ }
export interface UpdateMessageParams { /* ... */ }

// 响应类型
export interface ApiResponse<T> { /* ... */ }

// 工具类型
export type UserRole = 'user' | 'pro' | 'admin'
export type MessageRole = 'user' | 'assistant' | 'system'
```

### 按需导入类型

```typescript
// ✅ 好的做法：使用 type import
import type { User, Conversation } from '../types'
import type { Request, Response } from 'express'

/**
 * 使用 type import 表明这是类型，不是值
 * 有助于 Tree-shaking 和打包优化
 */
```

---

## 🎯 泛型的使用

### 泛型函数

```typescript
/**
 * ✅ 通用的 Supabase 查询函数
 */
export async function queryTable<T>(
  tableName: string,
  filter: Record<string, any>
): Promise<T[]> {
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .match(filter)

  if (error) {
    logger.error('查询失败', { table: tableName, error })
    return []
  }

  return (data as T[]) || []
}

// 使用
const users = await queryTable<User>('users', { role: 'admin' })
const conversations = await queryTable<Conversation>('conversations', { user_id: '123' })
```

### 泛型接口

```typescript
/**
 * 通用的响应包装器
 */
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  timestamp: string
}

// 使用
const userResponse: ApiResponse<User> = {
  success: true,
  data: { id: '1', email: 'test@example.com', /* ... */ },
  timestamp: new Date().toISOString()
}

const conversationsResponse: ApiResponse<Conversation[]> = {
  success: true,
  data: [/* ... */],
  timestamp: new Date().toISOString()
}
```

---

## 🔍 类型守卫和类型断言

### 类型守卫

```typescript
/**
 * ✅ 好的做法：使用类型守卫函数
 */
export function isUser(obj: any): obj is User {
  return (
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.email === 'string'
  )
}

export function isConversation(obj: any): obj is Conversation {
  return (
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.user_id === 'string' &&
    typeof obj.title === 'string'
  )
}

// 使用
function processData(data: unknown) {
  if (isUser(data)) {
    // TypeScript 知道这里 data 是 User 类型
    console.log(data.email)
  } else if (isConversation(data)) {
    // TypeScript 知道这里 data 是 Conversation 类型
    console.log(data.title)
  }
}
```

### 类型断言（谨慎使用）

```typescript
/**
 * ⚠️ 类型断言：仅在确定类型时使用
 */
export async function handleRequest(req: Request, res: Response) {
  // 我们知道认证中间件会设置 userId
  const userId = (req as any).userId as string

  // 更好的做法：使用类型扩展
  interface AuthRequest extends Request {
    userId: string
  }
  const authReq = req as AuthRequest
  const betterUserId = authReq.userId
}
```

---

## 🧩 枚举 vs 字面量类型

### 使用字面量类型（推荐）

```typescript
/**
 * ✅ 推荐：字面量类型
 * 优点：简单、轻量、可以联合其他类型
 */
export type UserRole = 'user' | 'pro' | 'admin'
export type MessageRole = 'user' | 'assistant' | 'system'
export type ConversationStatus = 'active' | 'archived' | 'deleted'

export interface User {
  role: UserRole  // 自动补全和类型检查
}
```

### 使用枚举（特殊情况）

```typescript
/**
 * ⚠️ 枚举：仅在需要数值或需要反向映射时使用
 */
export enum HttpStatusCode {
  OK = 200,
  Created = 201,
  BadRequest = 400,
  Unauthorized = 401,
  Forbidden = 403,
  NotFound = 404,
  InternalServerError = 500
}

// 使用
res.status(HttpStatusCode.OK).json({ data })
```

---

## 📚 Supabase 类型安全

### 定义数据库类型

```typescript
/**
 * Supabase 数据库表类型
 */
export interface Database {
  public: {
    Tables: {
      users: {
        Row: User
        Insert: Omit<User, 'id' | 'created_at'>
        Update: Partial<Omit<User, 'id'>>
      }
      conversations: {
        Row: Conversation
        Insert: Omit<Conversation, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Conversation, 'id' | 'created_at'>>
      }
      messages: {
        Row: Message
        Insert: Omit<Message, 'id' | 'created_at'>
        Update: Partial<Omit<Message, 'id'>>
      }
    }
  }
}

/**
 * 使用类型化的 Supabase 客户端
 */
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

export const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

// 现在 Supabase 操作有完整的类型支持
const { data, error } = await supabase
  .from('users')  // 自动补全表名
  .select('*')
  .eq('role', 'admin')  // 自动补全字段名和类型检查
```

---

## 🔄 异步函数类型

### Promise 返回类型

```typescript
/**
 * ✅ 好的做法：明确 Promise 泛型
 */
export async function getUser(id: string): Promise<User | null> {
  // 实现...
}

export async function getAllUsers(): Promise<User[]> {
  // 实现...
}

export async function createUser(params: CreateUserParams): Promise<User> {
  // 实现...
}

/**
 * ❌ 不好的做法：省略返回类型
 */
export async function badGetUser(id: string) {
  // TypeScript 会推断，但不够明确
}
```

---

## 🎨 类型组合和交叉

### 交叉类型

```typescript
/**
 * 组合多个类型
 */
export interface Timestamps {
  created_at: string
  updated_at: string
}

export interface SoftDelete {
  deleted_at?: string
  is_deleted: boolean
}

export interface User extends Timestamps {
  id: string
  email: string
}

// 使用交叉类型
export type UserWithSoftDelete = User & SoftDelete
```

### 条件属性

```typescript
/**
 * 根据条件添加属性
 */
export interface BaseResponse {
  success: boolean
  timestamp: string
}

export type SuccessResponse<T> = BaseResponse & {
  success: true
  data: T
}

export type ErrorResponse = BaseResponse & {
  success: false
  error: string
}

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse
```

---

## ✅ TypeScript 最佳实践检查清单

### 类型定义

- [ ] 避免使用 `any`，使用 `unknown` 替代
- [ ] 为所有函数定义参数和返回类型
- [ ] 使用 `interface` 定义对象结构
- [ ] 使用 `type` 定义联合类型和函数类型
- [ ] 导出可复用的类型定义
- [ ] 使用字面量类型限制可能的值

### 函数签名

- [ ] 明确参数类型
- [ ] 明确返回类型（尤其是 Promise）
- [ ] 使用可选参数标记 `?`
- [ ] 使用默认参数值
- [ ] 使用解构参数提高可读性

### 数据模型

- [ ] 为所有数据库模型定义接口
- [ ] 为 API 请求/响应定义接口
- [ ] 区分 Create/Update 参数类型
- [ ] 使用工具类型（Partial, Pick, Omit）

### Supabase 集成

- [ ] 定义 Database 类型
- [ ] 使用类型化的 Supabase 客户端
- [ ] 定义 Row/Insert/Update 类型

### 类型安全

- [ ] 使用类型守卫验证运行时数据
- [ ] 谨慎使用类型断言
- [ ] 利用 TypeScript 的类型推断
- [ ] 使用 `strict` 模式

---

## 🎓 TypeScript 配置建议

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020"],
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

**关键配置说明**：
- `strict: true` - 启用所有严格类型检查
- `noUnusedLocals` - 禁止未使用的局部变量
- `noUnusedParameters` - 禁止未使用的函数参数
- `noImplicitReturns` - 函数必须明确返回值

---

## 🎯 常见类型错误和解决方案

### 错误 1: 隐式 any

```typescript
// ❌ 错误
function processData(data) {  // 'data' 隐式为 any
  return data.id
}

// ✅ 修复
function processData(data: { id: string }) {
  return data.id
}
```

### 错误 2: 可能为 undefined

```typescript
// ❌ 错误
function getUsername(user: User) {
  return user.username.toUpperCase()  // username 可能为 undefined
}

// ✅ 修复
function getUsername(user: User) {
  return user.username?.toUpperCase() ?? 'Anonymous'
}
```

### 错误 3: 类型不匹配

```typescript
// ❌ 错误
const users: User[] = await supabase.from('users').select('*')  // 返回类型不匹配

// ✅ 修复
const { data: users } = await supabase.from('users').select('*')
const typedUsers: User[] = users || []
```

---

## 📖 相关资源

- [项目架构](./architecture.md)
- [控制器模式](./controllers.md)
- [数据库服务](./database-services.md)
- [错误处理](./error-handling.md)
