# 数据库服务层

数据库服务层负责所有与 Supabase 的交互，提供类型安全的数据操作接口。

---

## 📁 文件位置

所有数据库服务位于：`service/src/db/*Service.ts`

**示例**：
```
service/src/db/
├── conversationService.ts     # 对话数据操作
├── messageService.ts          # 消息数据操作
├── configService.ts           # 配置数据操作
├── providerService.ts         # 供应商数据操作
├── supabaseClient.ts          # Supabase 客户端
└── supabaseUserService.ts     # 用户数据操作
```

---

## 🎯 服务层职责

### ✅ 应该做的

1. **使用 Supabase 客户端操作数据库**
2. **定义清晰的 TypeScript 接口**
3. **处理数据库错误**
4. **记录操作日志**
5. **使用 Redis 缓存（可选）**
6. **返回类型化数据或 null**

### ❌ 不应该做的

1. ❌ 处理 HTTP 请求/响应（交给控制器）
2. ❌ 直接抛出异常（返回 null 或空数组）
3. ❌ 使用 `any` 类型
4. ❌ 忽略 Supabase 的 `error` 对象

---

## 📝 基本模板

```typescript
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'
import { logger } from '../utils/logger'

/**
 * 数据模型接口
 */
export interface Item {
  id: string
  user_id: string
  title: string
  description?: string
  status: 'active' | 'archived'
  created_at: string
  updated_at: string
}

/**
 * 创建参数接口
 */
export interface CreateItemParams {
  userId: string
  title: string
  description?: string
  status?: 'active' | 'archived'
}

/**
 * 更新参数接口
 */
export interface UpdateItemParams {
  title?: string
  description?: string
  status?: 'active' | 'archived'
}

/**
 * 创建新项目
 */
export async function createItem(
  params: CreateItemParams,
  client: SupabaseClient = supabase
): Promise<Item | null> {
  try {
    const { data, error } = await client
      .from('items')
      .insert([{
        user_id: params.userId,
        title: params.title,
        description: params.description,
        status: params.status || 'active',
      }])
      .select()
      .single()

    if (error) {
      console.error('❌ [Item] 创建失败:', error)
      return null
    }

    logger.debug('✅ [Item] 创建成功:', data.id)
    return data as Item
  } catch (err) {
    console.error('❌ [Item] 创建异常:', err)
    return null
  }
}

/**
 * 获取单个项目
 */
export async function getItem(
  id: string,
  userId: string,
  client: SupabaseClient = supabase
): Promise<Item | null> {
  try {
    const { data, error } = await client
      .from('items')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (error) {
      console.error('❌ [Item] 查询失败:', error)
      return null
    }

    return data as Item
  } catch (err) {
    console.error('❌ [Item] 查询异常:', err)
    return null
  }
}

/**
 * 获取用户的所有项目
 */
export async function getItems(
  userId: string,
  client: SupabaseClient = supabase
): Promise<Item[]> {
  try {
    const { data, error } = await client
      .from('items')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ [Item] 查询列表失败:', error)
      return []
    }

    return data as Item[]
  } catch (err) {
    console.error('❌ [Item] 查询列表异常:', err)
    return []
  }
}

/**
 * 更新项目
 */
export async function updateItem(
  id: string,
  userId: string,
  params: UpdateItemParams,
  client: SupabaseClient = supabase
): Promise<Item | null> {
  try {
    const { data, error} = await client
      .from('items')
      .update(params)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('❌ [Item] 更新失败:', error)
      return null
    }

    logger.debug('✅ [Item] 更新成功:', data.id)
    return data as Item
  } catch (err) {
    console.error('❌ [Item] 更新异常:', err)
    return null
  }
}

/**
 * 删除项目（软删除）
 */
export async function deleteItem(
  id: string,
  userId: string,
  client: SupabaseClient = supabase
): Promise<boolean> {
  try {
    const { error } = await client
      .from('items')
      .update({ status: 'archived' })
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      console.error('❌ [Item] 删除失败:', error)
      return false
    }

    logger.debug('✅ [Item] 删除成功:', id)
    return true
  } catch (err) {
    console.error('❌ [Item] 删除异常:', err)
    return false
  }
}
```

---

## 🔍 Supabase 查询模式

### 基础 CRUD

```typescript
// CREATE
const { data, error } = await supabase
  .from('table_name')
  .insert([{ column: 'value' }])
  .select()
  .single()

// READ (单条)
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('id', id)
  .single()

// READ (多条)
const { data, error } = await supabase
  .from('table_name')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })

// UPDATE
const { data, error } = await supabase
  .from('table_name')
  .update({ column: 'new_value' })
  .eq('id', id)
  .select()
  .single()

// DELETE (硬删除)
const { error } = await supabase
  .from('table_name')
  .delete()
  .eq('id', id)
```

### 高级查询

```typescript
// 条件查询（AND）
const { data, error } = await supabase
  .from('items')
  .select('*')
  .eq('user_id', userId)
  .eq('status', 'active')
  .gte('created_at', startDate)

// 条件查询（OR）
const { data, error } = await supabase
  .from('items')
  .select('*')
  .or(`status.eq.active,status.eq.pending`)

// IN 查询
const { data, error } = await supabase
  .from('items')
  .select('*')
  .in('id', ['id1', 'id2', 'id3'])

// LIKE 查询
const { data, error } = await supabase
  .from('items')
  .select('*')
  .ilike('title', `%${searchTerm}%`)

// 分页
const { data, error } = await supabase
  .from('items')
  .select('*')
  .range(0, 9)  // 前 10 条

// 关联查询
const { data, error } = await supabase
  .from('conversations')
  .select(`
    *,
    messages (
      id,
      content,
      created_at
    )
  `)
  .eq('user_id', userId)

// 计数
const { count, error } = await supabase
  .from('items')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', userId)
```

---

## 🚀 缓存集成（Redis）

使用 Redis 缓存频繁访问的数据：

```typescript
import { getCached, setCached, deleteCached } from '../cache/cacheService'
import { CONVERSATION_KEYS } from '../cache/cacheKeys'

/**
 * 获取用户的对话列表（带缓存）
 */
export async function getUserConversations(
  userId: string,
  client: SupabaseClient = supabase
): Promise<Conversation[]> {
  // 1. 尝试从缓存获取
  const cacheKey = CONVERSATION_KEYS.userConversations(userId)
  const cached = await getCached<Conversation[]>(cacheKey)

  if (cached) {
    logger.debug('✅ [Conversation] 从缓存返回')
    return cached
  }

  // 2. 缓存未命中，查询数据库
  try {
    const { data, error } = await client
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('❌ [Conversation] 查询失败:', error)
      return []
    }

    const conversations = data as Conversation[]

    // 3. 写入缓存
    await setCached(cacheKey, conversations, 300) // 5分钟

    return conversations
  } catch (err) {
    console.error('❌ [Conversation] 查询异常:', err)
    return []
  }
}

/**
 * 创建对话（清除缓存）
 */
export async function createConversation(
  params: CreateConversationParams,
  client: SupabaseClient = supabase
): Promise<Conversation | null> {
  try {
    const { data, error } = await client
      .from('conversations')
      .insert([params])
      .select()
      .single()

    if (error) {
      console.error('❌ [Conversation] 创建失败:', error)
      return null
    }

    // 清除用户会话列表缓存
    const cacheKey = CONVERSATION_KEYS.userConversations(params.user_id)
    await deleteCached(cacheKey)

    logger.debug('✅ [Conversation] 创建成功:', data.id)
    return data as Conversation
  } catch (err) {
    console.error('❌ [Conversation] 创建异常:', err)
    return null
  }
}
```

---

## 📊 错误处理模式

### 标准错误处理

```typescript
export async function getItem(id: string): Promise<Item | null> {
  try {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('id', id)
      .single()

    // 检查 Supabase 错误
    if (error) {
      console.error('❌ [Item] 查询失败:', error)
      return null
    }

    return data as Item
  } catch (err) {
    // 捕获异常（网络错误等）
    console.error('❌ [Item] 查询异常:', err)
    return null
  }
}
```

### 不同返回类型

```typescript
// 单条记录 - 返回 null
export async function getItem(id: string): Promise<Item | null> {
  // ... 失败返回 null
}

// 多条记录 - 返回空数组
export async function getItems(userId: string): Promise<Item[]> {
  // ... 失败返回 []
}

// 布尔操作 - 返回 boolean
export async function deleteItem(id: string): Promise<boolean> {
  // ... 成功返回 true，失败返回 false
}

// 计数 - 返回数字
export async function getItemCount(userId: string): Promise<number> {
  // ... 失败返回 0
}
```

---

## 🎨 实际项目示例

### conversationService.ts

```typescript
/**
 * 创建新对话
 */
export async function createConversation(
  params: CreateConversationParams,
  client: SupabaseClient = supabase,
): Promise<Conversation | null> {
  try {
    const { data, error } = await client
      .from('conversations')
      .insert([
        {
          user_id: params.user_id,
          title: params.title || '新对话',
          model_id: params.model_id,
          provider_id: params.provider_id,
          frontend_uuid: params.frontend_uuid,
          temperature: params.temperature ?? 0.7,
          top_p: params.top_p ?? 1.0,
          max_tokens: params.max_tokens ?? 2048,
          system_prompt: params.system_prompt,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error('❌ [Conversation] 创建对话失败:', error)
      return null
    }

    // 清除缓存
    const cacheKey = CONVERSATION_KEYS.userConversations(params.user_id)
    await deleteCached(cacheKey)

    logger.debug('✅ [Conversation] 创建对话成功:', data.id)
    return data as Conversation
  } catch (err) {
    console.error('❌ [Conversation] 创建对话异常:', err)
    return null
  }
}
```

### messageService.ts

```typescript
/**
 * 批量创建消息
 */
export async function createMessages(
  messages: CreateMessageParams[],
  client: SupabaseClient = supabase,
): Promise<Message[]> {
  try {
    const { data, error } = await client
      .from('messages')
      .insert(messages)
      .select()

    if (error) {
      console.error('❌ [Message] 批量创建失败:', error)
      return []
    }

    logger.debug(`✅ [Message] 批量创建成功: ${data.length} 条`)
    return data as Message[]
  } catch (err) {
    console.error('❌ [Message] 批量创建异常:', err)
    return []
  }
}
```

---

## 📋 检查清单

创建或修改数据库服务时，确认：

- [ ] 导入 `SupabaseClient` 类型
- [ ] 定义清晰的接口（数据模型、参数）
- [ ] 函数接受 `client` 参数（默认值为 `supabase`）
- [ ] 使用 `try-catch` 包裹所有数据库操作
- [ ] 检查 `error` 对象
- [ ] 记录错误日志（`console.error`）
- [ ] 返回类型化数据（使用 `as` 断言）
- [ ] 单条记录失败返回 `null`
- [ ] 多条记录失败返回 `[]`
- [ ] 使用 `.single()` 获取单条记录
- [ ] 使用 `.order()` 排序结果
- [ ] 清除相关缓存（修改操作后）

---

## 💡 最佳实践

### 1. 接受 client 参数

```typescript
// ✅ 推荐：接受 client 参数，便于测试和事务
export async function getItem(
  id: string,
  client: SupabaseClient = supabase
): Promise<Item | null> {
  // ...
}

// ❌ 避免：硬编码 supabase 实例
export async function getItem(id: string): Promise<Item | null> {
  const { data } = await supabase.from('items').select()
  // ...
}
```

### 2. 使用类型断言

```typescript
// ✅ 推荐：明确类型
const conversation = data as Conversation

// ❌ 避免：使用 any
const conversation: any = data
```

### 3. 软删除优于硬删除

```typescript
// ✅ 推荐：软删除（更新状态）
export async function deleteItem(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('items')
    .update({ status: 'archived' })
    .eq('id', id)

  return !error
}

// ⚠️ 谨慎使用：硬删除
export async function hardDeleteItem(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('items')
    .delete()
    .eq('id', id)

  return !error
}
```

### 4. 记录关键操作

```typescript
export async function createItem(params: CreateItemParams): Promise<Item | null> {
  const startTime = performance.now()

  try {
    const { data, error } = await supabase
      .from('items')
      .insert([params])
      .select()
      .single()

    if (error) {
      console.error('❌ [Item] 创建失败:', error)
      return null
    }

    const duration = performance.now() - startTime
    logger.debug(`✅ [Item] 创建成功: ${data.id}，耗时: ${duration.toFixed(0)}ms`)

    return data as Item
  } catch (err) {
    console.error('❌ [Item] 创建异常:', err)
    return null
  }
}
```

---

## 🔗 相关资源

- [Supabase JavaScript 客户端文档](https://supabase.com/docs/reference/javascript)
- [TypeScript 类型定义](./typescript-standards.md)
- [错误处理策略](./error-handling.md)

---

**记住**：数据库服务层应该保持纯净，只处理数据操作。将 HTTP 逻辑留给控制器，将业务逻辑抽取到独立的服务函数中。
