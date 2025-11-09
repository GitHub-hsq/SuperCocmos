---
name: express-ts-guidelines
description: Express + TypeScript + Supabase + Langchain 后端开发规范
version: 1.0.0
---

# Express TypeScript 开发规范

SuperCocmos 后端 Express + TypeScript 开发的最佳实践和架构指南。

## 📚 快速导航

本技能包含以下资源文件，按需加载：

1. **[架构概览](./resources/architecture.md)** - 项目架构和分层设计
2. **[控制器模式](./resources/controllers.md)** - API 控制器的编写规范
3. **[数据库服务](./resources/database-services.md)** - Supabase 数据库操作
4. **[认证与授权](./resources/authentication.md)** - Auth0 认证集成
5. **[Langchain 工作流](./resources/langchain-workflows.md)** - LangGraph 工作流开发
6. **[错误处理](./resources/error-handling.md)** - 统一错误处理策略
7. **[TypeScript 规范](./resources/typescript-standards.md)** - 类型安全最佳实践

---

## 🎯 核心原则

### 1. 分层架构
```
HTTP 请求 → 控制器 → 数据库服务 → Supabase
                  ↓
              Langchain 工作流
```

**严格分层**：
- ✅ 控制器处理 HTTP 请求/响应
- ✅ 数据库服务处理数据操作
- ✅ 工作流处理 AI 逻辑
- ❌ 不要在控制器中直接操作数据库
- ❌ 不要在数据库服务中处理 HTTP

### 2. 命名约定

| 类型 | 位置 | 命名规则 | 示例 |
|------|------|---------|------|
| 控制器 | `service/src/api/` | `*Controller.ts` | `conversationController.ts` |
| 数据库服务 | `service/src/db/` | `*Service.ts` | `conversationService.ts` |
| 中间件 | `service/src/middleware/` | `*.ts` | `authUnified.ts` |
| 工作流 | `service/src/quiz/`, `service/src/novel/` | `workflow.ts` | `quiz/workflow.ts` |
| 工具函数 | `service/src/utils/` | `*.ts` | `logger.ts` |

### 3. 错误处理

**所有异步操作必须使用 try-catch**：

```typescript
// ✅ 正确
export async function createConversation(params) {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .insert([params])
      .select()
      .single()

    if (error) {
      console.error('❌ 创建对话失败:', error)
      return null
    }

    return data
  } catch (err) {
    console.error('❌ 创建对话异常:', err)
    return null
  }
}

// ❌ 错误：没有错误处理
export async function createConversation(params) {
  const { data } = await supabase.from('conversations').insert([params])
  return data
}
```

### 4. TypeScript 类型安全

**定义清晰的接口**：

```typescript
// ✅ 正确：导出接口供其他模块使用
export interface Conversation {
  id: string
  user_id: string
  title: string
  model_id: string
  created_at: string
  updated_at: string
}

export interface CreateConversationParams {
  user_id: string
  title?: string
  model_id: string
}

export async function createConversation(
  params: CreateConversationParams
): Promise<Conversation | null> {
  // ...
}

// ❌ 错误：使用 any 类型
export async function createConversation(params: any): Promise<any> {
  // ...
}
```

---

## 🚀 快速参考

### 控制器模板

```typescript
import type { Request, Response } from 'express'
import { createItem, getItems } from '../db/itemService'

/**
 * 获取用户 ID（从 Auth0）
 */
async function getUserIdFromRequest(req: Request): Promise<string | null> {
  const userId = (req as any).userId
  if (userId) return userId

  const auth = (req as any).auth
  if (auth?.sub) return auth.sub

  return null
}

/**
 * 创建新项目
 */
export async function handleCreate(req: Request, res: Response) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return res.status(401).json({ error: '未授权' })
    }

    const { title, description } = req.body
    if (!title) {
      return res.status(400).json({ error: '缺少必填字段' })
    }

    const item = await createItem({ userId, title, description })
    if (!item) {
      return res.status(500).json({ error: '创建失败' })
    }

    return res.json(item)
  } catch (error) {
    console.error('❌ [handleCreate] 错误:', error)
    return res.status(500).json({ error: '服务器错误' })
  }
}

/**
 * 获取项目列表
 */
export async function handleList(req: Request, res: Response) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return res.status(401).json({ error: '未授权' })
    }

    const items = await getItems(userId)
    return res.json(items)
  } catch (error) {
    console.error('❌ [handleList] 错误:', error)
    return res.status(500).json({ error: '服务器错误' })
  }
}
```

### 数据库服务模板

```typescript
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'
import { logger } from '../utils/logger'

export interface Item {
  id: string
  user_id: string
  title: string
  description?: string
  created_at: string
  updated_at: string
}

export interface CreateItemParams {
  userId: string
  title: string
  description?: string
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
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ [Item] 查询失败:', error)
      return []
    }

    return data as Item[]
  } catch (err) {
    console.error('❌ [Item] 查询异常:', err)
    return []
  }
}
```

---

## 📋 检查清单

在提交代码前，确认：

### 控制器
- [ ] 所有异步操作使用 try-catch
- [ ] 返回合适的 HTTP 状态码（200/400/401/500）
- [ ] 验证必填参数
- [ ] 从请求中获取 userId（Auth0）
- [ ] 使用 TypeScript 类型注解

### 数据库服务
- [ ] 使用 Supabase TypeScript 类型
- [ ] 检查 `error` 对象
- [ ] 记录错误日志（console.error 或 logger）
- [ ] 返回类型化数据或 null
- [ ] 导出接口供控制器使用

### Langchain 工作流
- [ ] 使用 StateGraph 定义工作流
- [ ] 配置 LLM 模型（支持多供应商）
- [ ] 处理工作流执行异常
- [ ] 记录关键步骤日志
- [ ] 使用类型化的 State 接口

### 通用
- [ ] 文件名符合命名约定
- [ ] 导入顺序规范（node 内置 → 第三方 → 本地）
- [ ] 添加必要的注释（特别是复杂逻辑）
- [ ] 中文日志使用 emoji 标记

---

## 💡 何时加载资源文件

根据你的任务，按需查看：

| 任务 | 查看资源 |
|------|---------|
| 创建新的 API 端点 | [控制器模式](./resources/controllers.md) |
| 数据库操作 | [数据库服务](./resources/database-services.md) |
| 添加认证保护 | [认证与授权](./resources/authentication.md) |
| 创建 AI 工作流 | [Langchain 工作流](./resources/langchain-workflows.md) |
| 理解项目架构 | [架构概览](./resources/architecture.md) |
| 处理错误 | [错误处理](./resources/error-handling.md) |
| TypeScript 问题 | [TypeScript 规范](./resources/typescript-standards.md) |

---

## 🔧 常用命令

```bash
# 开发环境启动
pnpm dev

# 生产环境构建
pnpm build

# 代码检查
pnpm lint

# 测试数据库连接
pnpm test:db

# 测试 Redis 连接
pnpm test:redis

# 测试 LLM 请求
pnpm test:llm
```

---

**记住**：遵循这些规范可以确保代码的一致性、可维护性和可靠性。当有疑问时，参考现有的控制器和服务代码作为示例。
