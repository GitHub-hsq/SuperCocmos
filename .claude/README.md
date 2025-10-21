# SuperCosmos - Claude Code 项目配置

这个目录包含 Claude Code 的项目配置文件。

## 文件说明

- **settings.local.json**: Claude 的权限配置

## 📚 项目文档

项目技术文档已迁移至 [`docs/`](../docs/) 目录：

- 📋 [项目总结](../docs/01-overview/PROJECT_SUMMARY.md) - 完整项目介绍
- 🧠 [项目记忆](../docs/01-overview/memory.md) - 开发记录（原 memory.md）
- 🏗️ [系统架构](../docs/02-architecture/ARCHITECTURE.md) - 技术架构详解
- 🔐 [认证流程](../docs/02-architecture/LOGIN_FLOW.md) - Clerk认证集成

详见 [docs/README.md](../docs/) 了解所有文档。

---

## 💬 历史对话上下文注入机制

### 概述

项目采用 **三层缓存 + 全量存储** 的架构，确保对话历史的快速加载和持久化：

```
用户发送消息
    ↓
前端: localStorage (最近10条) → 如果未命中 → 后端: Redis (最近20条) → 如果未命中 → 数据库: Supabase (全量)
    ↓
后端加载历史 → LLM 生成回复
    ↓
保存到数据库 → 更新 Redis → 前端更新 localStorage
```

### 1. 前端缓存层 (localStorage)

**位置**: `src/utils/messageCache.ts`

**功能**:
- 每个对话缓存最近 **10 条消息**
- 缓存 key: `msg_cache_{conversationId}`
- 减少后端查询，加快响应速度

**核心函数**:
```typescript
// 获取缓存
getMessagesFromLocalCache(conversationId: string): CachedMessage[] | null

// 写入缓存（最多10条）
setMessagesToLocalCache(conversationId: string, messages: CachedMessage[]): boolean

// 追加消息
appendMessageToLocalCache(conversationId: string, message: CachedMessage): boolean

// 自动降级：localStorage → Backend
getConversationContext(conversationId: string, limit: number): Promise<Message[]>
```

### 2. 后端缓存层 (Redis)

**位置**: `service/src/cache/messageCache.ts`

**功能**:
- 每个对话缓存最近 **20 条消息**
- TTL: **1 小时**自动过期
- 缓存 key: `msg:{conversationId}`

**核心函数**:
```typescript
// 从 Redis 获取
getMessagesFromCache(conversationId: string): Promise<Message[] | null>

// 写入 Redis（TTL 1小时）
setMessagesToCache(conversationId: string, messages: Message[], ttl: number): Promise<boolean>

// 追加消息（自动保留最近20条）
appendMessageToCache(conversationId: string, message: Message): Promise<boolean>

// 智能加载：Redis → Database
getConversationContextWithCache(conversationId: string, limit: number, systemPrompt?: string): Promise<Message[]>
```

### 3. 数据库持久化层 (Supabase)

**位置**: `service/src/db/messageService.ts` 和 `conversationService.ts`

**表结构**:

#### `conversations` 表
存储对话元数据：
- `id`: 对话ID (UUID)
- `user_id`: 用户ID
- `title`: 对话标题
- `model_id`: 模型ID
- `provider_id`: 供应商ID
- `temperature`, `top_p`, `max_tokens`: 模型参数
- `system_prompt`: 系统提示词
- `total_tokens`: 总 token 数
- `message_count`: 消息数量
- `created_at`, `updated_at`: 时间戳

#### `messages` 表
存储所有消息记录：
- `id`: 消息ID (UUID)
- `conversation_id`: 所属对话ID
- `role`: 角色 (`user` / `assistant` / `system`)
- `content`: 消息内容
- `tokens`: token 数量
- `model_info`: 模型信息 (JSON)
- `created_at`: 创建时间

**核心函数**:
```typescript
// 创建消息
createMessage(params: CreateMessageParams): Promise<Message | null>

// 获取对话的所有消息
getConversationMessages(conversationId: string, options: { limit, offset }): Promise<Message[]>

// 获取最近N条消息
getRecentMessages(conversationId: string, limit: number): Promise<Message[]>

// 获取对话上下文（带系统提示词）
getConversationContext(conversationId: string, limit: number, systemPrompt?: string): Promise<Message[]>
```

### 4. 完整流程

#### 📤 **用户发送消息**

1. **前端** (`src/views/chat/index.vue`):
   ```typescript
   // 构建请求参数，包含 conversationId
   const options = {
     conversationId: currentConversationId.value, // 如果是新对话则为空
     model: selectedModel.modelId,
     providerId: selectedModel.providerId,
     temperature: chatConfig.parameters.temperature,
     // ...其他参数
   }

   // 发送请求
   fetchChatAPIProcess({ prompt: message, options })
   ```

2. **后端** (`service/src/chatgpt/index.ts`):
   ```typescript
   async function chatReplyProcess(options: RequestOptions) {
     // 如果有 conversationId，加载历史上下文
     let historyMessages = []
     if (options.conversationId) {
       historyMessages = await getConversationContextWithCache(
         options.conversationId,
         10, // 加载最近10条
         options.systemMessage
       )
     }

     // 构建完整消息列表
     const fullMessages = [
       ...historyMessages, // 历史消息
       { role: 'user', content: message } // 当前消息
     ]

     // 调用 LLM API
     const response = await fetch(apiUrl, {
       method: 'POST',
       body: JSON.stringify({
         model: selectedModel,
         messages: fullMessages,
         stream: true
       })
     })

     // 流式返回响应...
   }
   ```

3. **缓存加载逻辑** (`service/src/cache/messageCache.ts`):
   ```typescript
   async function getConversationContextWithCache(conversationId, limit, systemPrompt) {
     // 1. 尝试从 Redis 读取
     let messages = await getMessagesFromCache(conversationId)

     // 2. Redis 未命中，从数据库加载
     if (!messages) {
       messages = await getRecentMessages(conversationId, limit * 2)
       // 写入 Redis
       if (messages.length > 0) {
         await setMessagesToCache(conversationId, messages)
       }
     }

     // 3. 只取最近的 limit 条
     const recentMessages = messages.slice(-limit)

     // 4. 转换为 ChatGPT 格式
     const chatMessages = messagesToChatFormat(recentMessages)

     // 5. 添加系统提示词（如果需要）
     if (systemPrompt) {
       chatMessages.unshift({ role: 'system', content: systemPrompt })
     }

     return chatMessages
   }
   ```

#### 📥 **保存响应**

1. **数据库存储**:
   ```typescript
   // 保存用户消息
   await createMessage({
     conversation_id: conversationId,
     role: 'user',
     content: userMessage,
     tokens: estimateTokens(userMessage)
   })

   // 保存助手回复
   await createMessage({
     conversation_id: conversationId,
     role: 'assistant',
     content: assistantReply,
     tokens: estimateTokens(assistantReply)
   })
   ```

2. **更新 Redis 缓存**:
   ```typescript
   // 追加用户消息
   await appendMessageToCache(conversationId, {
     role: 'user',
     content: userMessage
   })

   // 追加助手回复
   await appendMessageToCache(conversationId, {
     role: 'assistant',
     content: assistantReply
   })
   ```

3. **前端更新 localStorage**:
   ```typescript
   // 保存到本地缓存
   appendMessageToLocalCache(currentConversationId.value, {
     role: 'user',
     content: message
   })

   appendMessageToLocalCache(currentConversationId.value, {
     role: 'assistant',
     content: lastText
   })
   ```

### 5. 性能优化

**缓存命中率**:
- ✅ 前端 localStorage: 适合频繁访问同一对话
- ✅ 后端 Redis: 适合跨设备/跨浏览器访问
- ✅ 数据库: 长期存储和历史记录查询

**缓存更新策略**:
- 新消息 → 立即追加到所有缓存层
- 缓存数量限制 → localStorage (10条), Redis (20条)
- 缓存过期 → Redis 1小时自动清理

**降级策略**:
- localStorage 未命中 → 从后端加载
- Redis 未命中 → 从数据库加载并回填 Redis
- 数据库查询失败 → 返回空上下文（仅系统提示词）

### 6. 相关文件

| 文件路径 | 功能 |
|---------|------|
| `src/utils/messageCache.ts` | 前端 localStorage 缓存 |
| `src/views/chat/index.vue` | 聊天界面，对话ID管理 |
| `service/src/cache/messageCache.ts` | 后端 Redis 缓存 |
| `service/src/db/messageService.ts` | 消息数据库操作 |
| `service/src/db/conversationService.ts` | 对话数据库操作 |
| `service/src/chatgpt/index.ts` | LLM API 调用，上下文注入 |

### 7. 未来优化方向

- [ ] 支持更智能的上下文窗口管理（根据 token 数量动态调整）
- [ ] 添加对话摘要功能（压缩长对话历史）
- [ ] 支持向量数据库（长期记忆检索）
- [ ] 优化缓存失效策略（基于用户活跃度）
- [ ] 添加缓存预热机制（预测用户可能访问的对话）

---

## 快速开始

```bash
pnpm install        # 安装依赖
pnpm dev           # 启动前端
pnpm lint          # 代码检查
pnpm type-check    # 类型检查
```

详见 [项目文档](../docs/) 了解更多信息.
