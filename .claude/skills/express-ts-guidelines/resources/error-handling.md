# 统一错误处理策略

确保所有错误都被正确记录、处理和返回给客户端，提升系统可靠性和调试效率。

---

## 🎯 错误处理原则

### 核心理念

1. **永远不要忽略错误** - 所有错误都应被捕获和记录
2. **使用结构化日志** - 使用 Pino logger 记录错误上下文
3. **返回有意义的错误信息** - 帮助前端处理错误
4. **区分用户错误和系统错误** - 不同的错误类型需要不同的处理
5. **保护敏感信息** - 不要泄露系统内部细节

---

## 📊 错误分类

### 1. 客户端错误 (4xx)

**原因**：用户输入错误、权限不足等

```typescript
// 400 Bad Request - 参数错误
res.status(400).json({ error: '缺少必需参数: title' })

// 401 Unauthorized - 未认证
res.status(401).json({ error: '未授权，请先登录' })

// 403 Forbidden - 权限不足
res.status(403).json({ error: '权限不足，需要管理员角色' })

// 404 Not Found - 资源不存在
res.status(404).json({ error: '对话不存在' })

// 409 Conflict - 冲突
res.status(409).json({ error: '用户名已存在' })

// 429 Too Many Requests - 限流
res.status(429).json({ error: '请求过于频繁，请稍后再试' })
```

### 2. 服务器错误 (5xx)

**原因**：数据库连接失败、外部 API 错误等

```typescript
// 500 Internal Server Error - 通用服务器错误
res.status(500).json({ error: '服务器错误，请稍后重试' })

// 503 Service Unavailable - 服务不可用
res.status(503).json({ error: '服务暂时不可用' })
```

---

## 🛠️ 日志工具 (Pino Logger)

### 基本用法

```typescript
import { logger } from '../utils/logger'

// ✅ 信息日志
logger.info('用户登录成功', { userId: '123' })

// ⚠️ 警告日志
logger.warn('缓存未命中', { key: 'user:123' })

// ❌ 错误日志
logger.error('数据库查询失败', { error: err.message, userId })

// 🐛 调试日志 (仅开发环境)
logger.debug('请求参数', { params: req.body })
```

### 结构化日志最佳实践

```typescript
// ✅ 好的做法：包含上下文信息
logger.error('创建对话失败', {
  error: err.message,
  userId,
  conversationId,
  timestamp: new Date().toISOString()
})

// ❌ 不好的做法：纯文本日志
logger.error(`创建对话失败: ${err.message}`)
```

### 性能监测

```typescript
import { measurePerformance } from '../utils/logger'

// 监测慢查询
const users = await measurePerformance(
  '获取所有用户',
  () => getAllUsers(),
  1000  // 超过 1000ms 记录为慢查询
)
```

---

## 🎯 控制器层错误处理

### 标准错误处理模板

```typescript
import type { Request, Response } from 'express'
import { logger } from '../utils/logger'
import { getConversations } from '../db/conversationService'

export async function handleGetConversations(req: Request, res: Response) {
  try {
    // 1. 验证用户身份
    const userId = (req as any).userId
    if (!userId) {
      return res.status(401).json({ error: '未授权' })
    }

    // 2. 验证请求参数
    const { limit, offset } = req.query
    if (limit && isNaN(Number(limit))) {
      return res.status(400).json({ error: 'limit 必须是数字' })
    }

    // 3. 调用服务层
    const conversations = await getConversations(
      userId,
      Number(limit) || 20,
      Number(offset) || 0
    )

    // 4. 返回成功响应
    return res.json({
      data: conversations,
      total: conversations.length
    })

  } catch (error: any) {
    // 5. 记录错误日志
    logger.error('获取对话列表失败', {
      error: error.message,
      stack: error.stack,
      userId: (req as any).userId,
      query: req.query
    })

    // 6. 返回用户友好的错误信息
    return res.status(500).json({
      error: '获取对话列表失败，请稍后重试'
    })
  }
}
```

### 分步骤错误处理

```typescript
export async function handleUpdateConversation(req: Request, res: Response) {
  try {
    const userId = (req as any).userId
    const { id } = req.params
    const { title } = req.body

    // 步骤 1: 验证身份
    if (!userId) {
      logger.warn('未授权访问', { endpoint: '/conversations/:id', method: 'PUT' })
      return res.status(401).json({ error: '未授权' })
    }

    // 步骤 2: 验证参数
    if (!title || typeof title !== 'string') {
      logger.warn('参数验证失败', { userId, conversationId: id, title })
      return res.status(400).json({ error: 'title 是必需的字符串参数' })
    }

    // 步骤 3: 检查资源是否存在
    const conversation = await getConversation(id, userId)
    if (!conversation) {
      logger.warn('对话不存在', { userId, conversationId: id })
      return res.status(404).json({ error: '对话不存在' })
    }

    // 步骤 4: 执行更新
    const updated = await updateConversation(id, userId, { title })
    if (!updated) {
      logger.error('更新对话失败', { userId, conversationId: id, title })
      return res.status(500).json({ error: '更新失败' })
    }

    // 步骤 5: 返回成功
    logger.info('对话更新成功', { userId, conversationId: id })
    return res.json({ data: updated })

  } catch (error: any) {
    logger.error('更新对话异常', {
      error: error.message,
      stack: error.stack,
      userId: (req as any).userId,
      conversationId: req.params.id
    })
    return res.status(500).json({ error: '服务器错误' })
  }
}
```

---

## 🗄️ 数据库服务层错误处理

### 基本模式

```typescript
import { supabase } from './supabaseClient'
import { logger } from '../utils/logger'

export async function getConversations(
  userId: string,
  limit = 20,
  offset = 0
): Promise<Conversation[]> {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // ✅ 检查 Supabase 错误
    if (error) {
      logger.error('Supabase 查询失败', {
        error: error.message,
        code: error.code,
        details: error.details,
        userId,
        table: 'conversations'
      })
      return []  // 返回空数组而非抛出异常
    }

    return data || []

  } catch (error: any) {
    logger.error('获取对话列表异常', {
      error: error.message,
      stack: error.stack,
      userId
    })
    return []  // 服务层不抛出异常，返回默认值
  }
}
```

### 创建操作错误处理

```typescript
export async function createConversation(
  userId: string,
  title: string
): Promise<Conversation | null> {
  try {
    const newConversation = {
      id: nanoid(),
      user_id: userId,
      title,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('conversations')
      .insert(newConversation)
      .select()
      .single()

    if (error) {
      logger.error('创建对话失败', {
        error: error.message,
        code: error.code,
        userId,
        title
      })
      return null
    }

    logger.info('对话创建成功', { userId, conversationId: data.id })
    return data

  } catch (error: any) {
    logger.error('创建对话异常', {
      error: error.message,
      userId,
      title
    })
    return null
  }
}
```

### 更新/删除操作错误处理

```typescript
export async function deleteConversation(
  conversationId: string,
  userId: string
): Promise<boolean> {
  try {
    // 先检查是否存在且属于该用户
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .single()

    if (!existing) {
      logger.warn('对话不存在或无权限', { userId, conversationId })
      return false
    }

    // 执行删除
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId)
      .eq('user_id', userId)

    if (error) {
      logger.error('删除对话失败', {
        error: error.message,
        userId,
        conversationId
      })
      return false
    }

    logger.info('对话删除成功', { userId, conversationId })
    return true

  } catch (error: any) {
    logger.error('删除对话异常', {
      error: error.message,
      userId,
      conversationId
    })
    return false
  }
}
```

---

## 🔐 认证中间件错误处理

### Auth0 验证错误

```typescript
import { expressjwt } from 'express-jwt'
import jwksRsa from 'jwks-rsa'
import { logger } from '../utils/logger'

export const requireAuth = expressjwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`
  }),
  audience: process.env.AUTH0_AUDIENCE,
  issuer: `https://${process.env.AUTH0_DOMAIN}/`,
  algorithms: ['RS256']
})

// 错误处理中间件
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err.name === 'UnauthorizedError') {
    logger.warn('JWT 验证失败', {
      error: err.message,
      code: err.code,
      path: req.path,
      method: req.method
    })
    return res.status(401).json({
      error: '认证失败，请重新登录'
    })
  }
  next(err)
})
```

### 权限验证错误

```typescript
export async function requireModelAccess(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = (req as any).userId
    const model = req.body.model || req.query.model

    if (!model) {
      logger.warn('缺少 model 参数', { userId, path: req.path })
      return res.status(400).json({ error: '缺少 model 参数' })
    }

    const hasAccess = await checkModelAccess(userId, model)
    if (!hasAccess) {
      logger.warn('模型访问权限不足', { userId, model })
      return res.status(403).json({
        error: `您没有权限访问模型: ${model}`
      })
    }

    next()

  } catch (error: any) {
    logger.error('权限验证异常', {
      error: error.message,
      userId: (req as any).userId,
      path: req.path
    })
    return res.status(500).json({ error: '权限验证失败' })
  }
}
```

---

## 🌊 SSE 流式响应错误处理

### 基本模式

```typescript
export async function handleChatProcess(req: Request, res: Response) {
  try {
    const userId = (req as any).userId
    const { prompt, conversationId } = req.body

    // 设置 SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    // 发送事件的辅助函数
    const sendEvent = (data: any) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`)
    }

    try {
      // 调用 ChatGPT 流式接口
      await chatReplyProcess(
        prompt,
        conversationId,
        (chunk) => sendEvent({ type: 'text', data: chunk }),
        (error) => {
          logger.error('ChatGPT 流式响应错误', {
            error: error.message,
            userId,
            conversationId
          })
          sendEvent({ type: 'error', data: '生成回复失败' })
        }
      )

      sendEvent({ type: 'done' })

    } catch (streamError: any) {
      logger.error('SSE 流式处理异常', {
        error: streamError.message,
        userId,
        conversationId
      })
      sendEvent({ type: 'error', data: '服务器错误' })
    }

    res.end()

  } catch (error: any) {
    logger.error('处理聊天请求失败', {
      error: error.message,
      userId: (req as any).userId
    })
    res.status(500).json({ error: '服务器错误' })
  }
}
```

### 客户端断开处理

```typescript
export async function handleSSE(req: Request, res: Response) {
  // 监听客户端断开
  req.on('close', () => {
    logger.info('客户端断开 SSE 连接', {
      userId: (req as any).userId,
      path: req.path
    })
    // 清理资源
    cleanup()
  })

  req.on('error', (err) => {
    logger.error('SSE 连接错误', {
      error: err.message,
      userId: (req as any).userId
    })
  })

  // ... SSE 逻辑
}
```

---

## 🧪 Langchain 工作流错误处理

### 工作流执行错误

```typescript
import { logger } from '../utils/logger'

export async function runWorkflow(
  document: string,
  config: WorkflowConfig
): Promise<WorkflowResult | null> {
  try {
    logger.info('开始执行工作流', { config })

    const result = await workflow.invoke({
      document,
      config
    })

    logger.info('工作流执行成功', {
      duration: result.duration,
      steps: result.steps
    })

    return result

  } catch (error: any) {
    logger.error('工作流执行失败', {
      error: error.message,
      stack: error.stack,
      config
    })
    return null
  }
}
```

### 流式工作流错误处理

```typescript
export async function runWorkflowStream(
  input: string,
  onChunk: (chunk: string) => void,
  onError: (error: Error) => void
) {
  try {
    const stream = await workflow.stream({ input })

    for await (const chunk of stream) {
      try {
        onChunk(chunk)
      } catch (chunkError: any) {
        logger.error('处理流式数据块失败', {
          error: chunkError.message,
          chunk
        })
        onError(chunkError)
      }
    }

  } catch (error: any) {
    logger.error('流式工作流执行失败', {
      error: error.message,
      stack: error.stack
    })
    onError(error)
  }
}
```

---

## 🚨 全局错误处理中间件

### 捕获未处理的错误

```typescript
// 在 index.ts 最后添加
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error('未捕获的错误', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: (req as any).userId
  })

  // 不泄露错误细节
  res.status(500).json({
    error: '服务器内部错误'
  })
})

// 捕获未处理的 Promise 拒绝
process.on('unhandledRejection', (reason: any, promise) => {
  logger.error('未处理的 Promise 拒绝', {
    reason: reason?.message || reason,
    stack: reason?.stack
  })
})

// 捕获未捕获的异常
process.on('uncaughtException', (error) => {
  logger.error('未捕获的异常', {
    error: error.message,
    stack: error.stack
  })
  // 优雅退出
  process.exit(1)
})
```

---

## ✅ 错误处理检查清单

### 控制器层

- [ ] 所有 async 函数都包裹在 try-catch 中
- [ ] 验证用户身份，返回 401
- [ ] 验证请求参数，返回 400
- [ ] 资源不存在时返回 404
- [ ] 权限不足时返回 403
- [ ] 记录错误日志（error.message + stack）
- [ ] 返回用户友好的错误信息

### 服务层

- [ ] 检查 Supabase 的 error 对象
- [ ] 记录详细的错误日志
- [ ] 返回 null 或空数组（不抛出异常）
- [ ] 使用 TypeScript 类型避免运行时错误

### 中间件层

- [ ] 捕获认证/授权错误
- [ ] 记录警告日志
- [ ] 返回合适的 HTTP 状态码

### SSE 层

- [ ] 处理流式响应错误
- [ ] 监听客户端断开事件
- [ ] 发送错误事件给客户端
- [ ] 清理资源

---

## 🎓 最佳实践总结

1. **分层处理**：服务层返回 null，控制器返回 HTTP 错误
2. **结构化日志**：使用 Pino logger 记录上下文
3. **用户友好**：不泄露系统细节，返回清晰的错误信息
4. **全面覆盖**：捕获所有可能的错误点
5. **性能监测**：记录慢查询和性能问题
6. **优雅降级**：即使出错也不崩溃，返回默认值
7. **可追踪性**：每个错误都有足够的上下文信息

---

## 📖 相关资源

- [控制器模式](./controllers.md)
- [数据库服务](./database-services.md)
- [TypeScript 规范](./typescript-standards.md)
