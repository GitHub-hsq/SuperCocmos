# 🚨 立即执行数据库索引！

## 当前问题

查询 `conversations` 表耗时 **873ms**，占总耗时的 **67.3%**！

```
📊 [Performance] 步骤2-查找会话: 877ms (67.3%)  ⚠️ 太慢！
```

## 解决方案

执行以下索引 SQL 文件（任选其一）：

### 选项1：执行完整的性能索引（推荐）✅

文件：`performance-indexes.sql`

```bash
# 在 Supabase Dashboard -> SQL Editor 中执行
```

包含：
- conversations 表的所有索引
- messages 表的所有索引  
- users 表的索引
- user_roles 表的索引

### 选项2：仅执行对话相关索引

文件：`add-conversation-indexes.sql`

```bash
# 在 Supabase Dashboard -> SQL Editor 中执行
```

## 最关键的索引（必须创建）

```sql
-- 1. 会话ID + 用户ID 复合索引（用于权限验证）
CREATE INDEX IF NOT EXISTS idx_conversations_id_user 
ON conversations(id, user_id);

-- 2. 消息查询索引
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
ON messages(conversation_id, created_at ASC);

-- 3. Auth0 ID 索引
CREATE INDEX IF NOT EXISTS idx_users_auth0_id 
ON users(auth0_id);
```

## 预期效果

- **优化前**：873ms
- **优化后**：10-50ms
- **性能提升**：95%+ ⚡

## 立即操作

1. 打开 Supabase Dashboard
2. 点击 SQL Editor
3. 复制粘贴 `performance-indexes.sql` 的内容
4. 点击 Run
5. 完成！🎉

