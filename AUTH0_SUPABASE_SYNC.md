# 🔄 Auth0 用户同步到 Supabase 指南

## 📋 概述

当用户通过 Auth0 登录时，自动将用户信息同步到 Supabase 数据库，实现：
- ✅ 首次登录：创建新用户
- ✅ 重复登录：更新用户信息和最后登录时间
- ✅ 邮箱关联：如果邮箱已存在，关联到 Auth0 ID

## 🎯 工作流程

```
用户登录 Auth0
    ↓
Auth0 返回用户信息
  - sub (用户 ID)
  - email
  - name
  - picture (头像)
  - email_verified
    ↓
前端调用 POST /api/auth/sync-auth0-user
    ↓
后端检查 Supabase
  ├─ Auth0 ID 存在 → 更新用户信息
  ├─ Email 存在 → 关联 Auth0 ID
  └─ 不存在 → 创建新用户
    ↓
返回 Supabase 用户信息
```

## 📁 文件结构

### 后端文件

```
service/src/
├── db/
│   └── supabaseUserService.ts     # 新增 upsertUserFromAuth0()
├── api/
│   ├── auth0Controller.ts         # 新增 Auth0 控制器
│   └── routes.ts                  # 新增 Auth0 路由
```

### 前端文件

```
src/
├── api/services/
│   └── auth0Service.ts            # 新增 Auth0 同步服务
└── App.vue                        # 添加自动同步逻辑
```

## 🔧 数据映射

| Auth0 字段 | Supabase 字段 | 说明 |
|-----------|--------------|------|
| `user.sub` | `clerk_id` | Auth0 用户 ID（复用 clerk_id 字段） |
| `user.email` | `email` | 邮箱 |
| `user.name` | `username` | 用户名（fallback: nickname 或 email前缀） |
| `user.picture` | `avatar_url` | 头像 URL |
| - | `provider` | 固定为 `'auth0'` |
| - | `login_method` | 固定为 `'auth0'` |
| - | `status` | 固定为 `1` （激活） |

## 🚀 使用方法

### 自动同步（已实现）

用户登录后，`App.vue` 会自动调用同步：

```typescript
// App.vue
watch(
  () => [auth0Client.isLoading.value, auth0Client.isAuthenticated.value],
  async (newVals, oldVals) => {
    // 当用户登录完成
    if (isAuthenticated && auth0Client.user.value) {
      // 自动同步到 Supabase
      const result = await syncAuth0UserToSupabase(auth0Client.user.value)
      console.warn('✅ 用户已同步到 Supabase:', result.data?.username)
    }
  }
)
```

### 手动同步（可选）

如果需要手动触发同步：

```typescript
import { useAuth0 } from '@auth0/auth0-vue'
import { syncAuth0UserToSupabase } from '@/api/services/auth0Service'

const { user } = useAuth0()

async function syncUser() {
  if (user.value) {
    const result = await syncAuth0UserToSupabase(user.value)
    console.log('同步结果:', result)
  }
}
```

## 📊 API 端点

### 1. 同步用户

**请求：**
```http
POST /api/auth/sync-auth0-user
Content-Type: application/json

{
  "auth0_id": "auth0|123456",
  "email": "user@example.com",
  "username": "John Doe",
  "avatar_url": "https://...",
  "email_verified": true
}
```

**响应（成功）：**
```json
{
  "success": true,
  "message": "用户同步成功",
  "data": {
    "user_id": "uuid",
    "username": "user123",
    "email": "user@example.com",
    "avatar_url": "https://...",
    "status": 1,
    "created_at": "2025-10-24T12:00:00Z",
    "last_login_at": "2025-10-24T13:00:00Z"
  }
}
```

### 2. 获取用户信息

**请求：**
```http
GET /api/auth/user/auth0|123456
```

**响应：**
```json
{
  "success": true,
  "data": {
    "user_id": "uuid",
    "username": "user123",
    "email": "user@example.com",
    ...
  }
}
```

## 🧪 测试

### 测试步骤 1: 新用户登录

1. **使用新邮箱在 Auth0 注册**
2. **登录成功**
3. **查看控制台**：
   ```
   ✅ 用户已同步到 Supabase: user123
   ```
4. **检查 Supabase**：
   ```sql
   SELECT * FROM users WHERE clerk_id LIKE 'auth0|%';
   ```

### 测试步骤 2: 已存在用户登录

1. **用相同账号再次登录**
2. **应该更新 `last_login_at`**
3. **控制台显示**：
   ```
   📝 [Supabase] 更新 Auth0 用户: user@example.com
   ✅ 用户已同步到 Supabase: user123
   ```

### 测试步骤 3: 邮箱关联

1. **在 Supabase 中手动创建一个邮箱用户**
2. **用相同邮箱在 Auth0 登录**
3. **应该关联 auth0_id 到现有用户**
4. **控制台显示**：
   ```
   🔗 [Supabase] 关联现有用户到 Auth0: user@example.com
   ✅ 用户已同步到 Supabase: user123
   ```

## 🔍 调试

### 查看同步状态

在浏览器控制台：

```javascript
// 查看当前 Auth0 用户
const { user } = useAuth0()
console.log('Auth0 用户:', user.value)

// 手动触发同步
import { syncAuth0UserToSupabase } from '@/api/services/auth0Service'
const result = await syncAuth0UserToSupabase(user.value)
console.log('同步结果:', result)
```

### 查看 Supabase 数据

```sql
-- 查看所有 Auth0 用户
SELECT user_id, username, email, clerk_id, provider, last_login_at 
FROM users 
WHERE provider = 'auth0'
ORDER BY last_login_at DESC;

-- 查看特定 Auth0 用户
SELECT * FROM users WHERE clerk_id = 'auth0|123456';
```

## ⚠️ 注意事项

### 1. clerk_id 字段复用

由于现有数据库设计，我们复用 `clerk_id` 字段存储 Auth0 ID。

**Auth0 ID 格式：** `auth0|1234567890`  
**Clerk ID 格式：** `clerk_xxx`

可以通过前缀区分不同的登录方式。

### 2. 用户名冲突处理

如果用户名已存在，系统会自动添加随机后缀：
- `john` → `john_a3f2b9`

### 3. 数据库字段说明

| 字段 | 说明 | Auth0 用户的值 |
|------|------|--------------|
| `user_id` | 主键 UUID | 自动生成 |
| `clerk_id` | 第三方 ID | `auth0|123456` |
| `username` | 用户名 | Auth0 的 name/nickname |
| `email` | 邮箱 | Auth0 的 email |
| `avatar_url` | 头像 | Auth0 的 picture |
| `provider` | 登录提供商 | `'auth0'` |
| `login_method` | 登录方式 | `'auth0'` |
| `status` | 状态 | `1` (激活) |
| `last_login_at` | 最后登录时间 | 每次登录更新 |

## 🎉 完成

现在 Auth0 用户会自动同步到 Supabase！

**测试：**
1. 清除缓存并登录
2. 查看控制台：`✅ 用户已同步到 Supabase`
3. 在 Supabase Dashboard 查看 `users` 表

---

**相关文档：**
- `AUTH0_SETUP.md` - Auth0 基础配置
- `AUTH0_PERMISSION_TEST.md` - 权限测试
- `AUTH0_CONFIG_CHECKLIST.md` - 配置检查清单

