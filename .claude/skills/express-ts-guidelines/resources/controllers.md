# 控制器模式

控制器是 HTTP 请求的入口点，负责处理请求、调用服务层、返回响应。

---

## 📁 文件位置

所有控制器位于：`service/src/api/*Controller.ts`

**示例**：
```
service/src/api/
├── conversationController.ts  # 对话管理
├── auth0Controller.ts         # Auth0 认证
├── configController.ts        # 配置管理
├── providerController.ts      # 供应商管理
└── novelController.ts         # 小说工作流
```

---

## 🎯 控制器职责

### ✅ 应该做的

1. **处理 HTTP 请求和响应**
2. **验证请求参数**
3. **获取用户身份（Auth0）**
4. **调用数据库服务层**
5. **返回合适的 HTTP 状态码**
6. **统一错误处理**

### ❌ 不应该做的

1. ❌ 直接操作数据库（使用服务层）
2. ❌ 包含业务逻辑（委托给服务层）
3. ❌ 忽略错误处理
4. ❌ 返回不明确的错误信息

---

## 📝 基本模板

```typescript
/**
 * 项目控制器
 * 处理项目相关的 HTTP 请求
 */

import type { Request, Response } from 'express'
import { createItem, deleteItem, getItem, getItems, updateItem } from '../db/itemService'

/**
 * 从请求中获取 Auth0 用户 ID
 */
async function getUserIdFromRequest(req: Request): Promise<string | null> {
  // 从 Auth0 中间件设置的 userId 获取（优先）
  const userId = (req as any).userId
  if (userId) return userId

  // 从 Auth0 token 中获取
  const auth = (req as any).auth
  if (auth?.sub) return auth.sub

  return null
}

/**
 * 创建新项目
 */
export async function handleCreateItem(req: Request, res: Response) {
  try {
    // 1. 验证用户身份
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return res.status(401).json({ error: '未授权' })
    }

    // 2. 验证请求参数
    const { title, description } = req.body
    if (!title) {
      return res.status(400).json({ error: '标题不能为空' })
    }

    // 3. 调用服务层
    const item = await createItem({
      userId,
      title,
      description,
    })

    // 4. 检查结果
    if (!item) {
      return res.status(500).json({ error: '创建失败' })
    }

    // 5. 返回成功响应
    return res.status(201).json(item)
  } catch (error) {
    console.error('❌ [handleCreateItem] 错误:', error)
    return res.status(500).json({ error: '服务器错误' })
  }
}

/**
 * 获取项目列表
 */
export async function handleGetItems(req: Request, res: Response) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return res.status(401).json({ error: '未授权' })
    }

    const items = await getItems(userId)
    return res.json(items)
  } catch (error) {
    console.error('❌ [handleGetItems] 错误:', error)
    return res.status(500).json({ error: '服务器错误' })
  }
}

/**
 * 获取单个项目
 */
export async function handleGetItem(req: Request, res: Response) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return res.status(401).json({ error: '未授权' })
    }

    const { id } = req.params
    if (!id) {
      return res.status(400).json({ error: '缺少项目 ID' })
    }

    const item = await getItem(id, userId)
    if (!item) {
      return res.status(404).json({ error: '项目不存在' })
    }

    return res.json(item)
  } catch (error) {
    console.error('❌ [handleGetItem] 错误:', error)
    return res.status(500).json({ error: '服务器错误' })
  }
}

/**
 * 更新项目
 */
export async function handleUpdateItem(req: Request, res: Response) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return res.status(401).json({ error: '未授权' })
    }

    const { id } = req.params
    const { title, description } = req.body

    // 至少需要一个更新字段
    if (!title && !description) {
      return res.status(400).json({ error: '至少提供一个更新字段' })
    }

    const item = await updateItem(id, userId, { title, description })
    if (!item) {
      return res.status(404).json({ error: '更新失败或项目不存在' })
    }

    return res.json(item)
  } catch (error) {
    console.error('❌ [handleUpdateItem] 错误:', error)
    return res.status(500).json({ error: '服务器错误' })
  }
}

/**
 * 删除项目
 */
export async function handleDeleteItem(req: Request, res: Response) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return res.status(401).json({ error: '未授权' })
    }

    const { id } = req.params
    const success = await deleteItem(id, userId)

    if (!success) {
      return res.status(404).json({ error: '删除失败或项目不存在' })
    }

    return res.json({ success: true })
  } catch (error) {
    console.error('❌ [handleDeleteItem] 错误:', error)
    return res.status(500).json({ error: '服务器错误' })
  }
}
```

---

## 🔐 Auth0 用户身份获取

所有需要认证的接口都应该获取用户 ID：

```typescript
/**
 * 从请求中获取 Auth0 用户 ID
 * 支持多种来源（优先级从高到低）
 */
async function getUserIdFromRequest(req: Request): Promise<string | null> {
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

**使用方式**：

```typescript
export async function handleSomeAction(req: Request, res: Response) {
  const userId = await getUserIdFromRequest(req)
  if (!userId) {
    return res.status(401).json({ error: '未授权' })
  }

  // 继续处理...
}
```

---

## 📊 HTTP 状态码规范

| 状态码 | 场景 | 示例 |
|-------|------|------|
| **200** | 成功（GET/PUT/DELETE） | `res.json(data)` |
| **201** | 创建成功（POST） | `res.status(201).json(newItem)` |
| **400** | 请求参数错误 | `res.status(400).json({ error: '缺少必填字段' })` |
| **401** | 未授权 | `res.status(401).json({ error: '未授权' })` |
| **403** | 无权限 | `res.status(403).json({ error: '权限不足' })` |
| **404** | 资源不存在 | `res.status(404).json({ error: '资源不存在' })` |
| **500** | 服务器错误 | `res.status(500).json({ error: '服务器错误' })` |

---

## ⚠️ 参数验证模式

### 必填参数

```typescript
export async function handleCreate(req: Request, res: Response) {
  const { title, content } = req.body

  // 验证必填字段
  if (!title) {
    return res.status(400).json({ error: '标题不能为空' })
  }

  if (!content) {
    return res.status(400).json({ error: '内容不能为空' })
  }

  // 继续处理...
}
```

### 可选参数

```typescript
export async function handleUpdate(req: Request, res: Response) {
  const { title, content, tags } = req.body

  // 至少需要一个更新字段
  if (!title && !content && !tags) {
    return res.status(400).json({ error: '至少提供一个更新字段' })
  }

  // 继续处理...
}
```

### 路径参数

```typescript
export async function handleGetById(req: Request, res: Response) {
  const { id } = req.params

  if (!id) {
    return res.status(400).json({ error: '缺少 ID 参数' })
  }

  // 继续处理...
}
```

### 查询参数

```typescript
export async function handleList(req: Request, res: Response) {
  // 从查询参数获取分页信息（带默认值）
  const page = parseInt(req.query.page as string) || 1
  const limit = parseInt(req.query.limit as string) || 20

  // 限制最大值
  const finalLimit = Math.min(limit, 100)

  // 继续处理...
}
```

---

## 🚀 实际项目示例

### conversationController.ts

```typescript
/**
 * 创建新对话
 */
export async function handleCreateConversation(req: Request, res: Response) {
  try {
    // 1. 获取用户 ID
    const userId = await getSupabaseUserIdFromRequest(req)
    if (!userId) {
      return res.status(401).json({ error: '未授权' })
    }

    // 2. 验证参数
    const { title, modelId, providerId, frontendUuid } = req.body
    if (!modelId || !providerId) {
      return res.status(400).json({ error: '缺少必填参数' })
    }

    // 3. 调用服务层
    const conversation = await createConversation({
      user_id: userId,
      title: title || '新对话',
      model_id: modelId,
      provider_id: providerId,
      frontend_uuid: frontendUuid,
    })

    // 4. 检查结果
    if (!conversation) {
      return res.status(500).json({ error: '创建对话失败' })
    }

    // 5. 返回成功
    return res.status(201).json(conversation)
  } catch (error) {
    console.error('❌ [handleCreateConversation] 错误:', error)
    return res.status(500).json({ error: '服务器错误' })
  }
}
```

---

## 📋 检查清单

创建或修改控制器时，确认：

- [ ] 导入必要的类型（`Request`, `Response`）
- [ ] 所有异步函数使用 `async/await`
- [ ] 所有异步操作包含 `try-catch`
- [ ] 验证用户身份（需要认证的接口）
- [ ] 验证请求参数（必填字段）
- [ ] 调用数据库服务层（不直接操作数据库）
- [ ] 返回合适的 HTTP 状态码
- [ ] 返回统一的错误格式
- [ ] 添加必要的日志（console.error）
- [ ] 函数命名以 `handle` 开头（如 `handleCreate`）
- [ ] 添加 JSDoc 注释说明函数用途

---

## 💡 最佳实践

### 1. 统一错误响应格式

```typescript
// ✅ 推荐：统一的错误格式
return res.status(400).json({ error: '参数错误' })

// ❌ 避免：不一致的格式
return res.status(400).json({ message: 'Bad request' })
return res.status(400).send('Error')
```

### 2. 避免嵌套过深

```typescript
// ✅ 推荐：早期返回
export async function handleAction(req: Request, res: Response) {
  const userId = await getUserIdFromRequest(req)
  if (!userId) {
    return res.status(401).json({ error: '未授权' })
  }

  const { param } = req.body
  if (!param) {
    return res.status(400).json({ error: '缺少参数' })
  }

  // 主逻辑
  const result = await doSomething(userId, param)
  return res.json(result)
}

// ❌ 避免：嵌套过深
export async function handleAction(req: Request, res: Response) {
  const userId = await getUserIdFromRequest(req)
  if (userId) {
    const { param } = req.body
    if (param) {
      const result = await doSomething(userId, param)
      return res.json(result)
    } else {
      return res.status(400).json({ error: '缺少参数' })
    }
  } else {
    return res.status(401).json({ error: '未授权' })
  }
}
```

### 3. 使用性能监控

```typescript
export async function handleExpensiveOperation(req: Request, res: Response) {
  const start = performance.now()

  try {
    // 执行操作...
    const result = await expensiveOperation()

    const duration = performance.now() - start
    console.log(`✅ 操作完成，耗时: ${duration.toFixed(0)}ms`)

    return res.json(result)
  } catch (error) {
    const duration = performance.now() - start
    console.error(`❌ 操作失败，耗时: ${duration.toFixed(0)}ms`, error)
    return res.status(500).json({ error: '操作失败' })
  }
}
```

---

**记住**：控制器应该保持简洁，专注于处理 HTTP 请求和响应。将业务逻辑和数据操作委托给服务层。
