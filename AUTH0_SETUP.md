# 🔐 Auth0 集成配置指南

## 快速开始

### 1. 创建环境变量文件

复制 `.env.example` 为 `.env`：

```bash
cp .env.example .env
```

### 2. 填写 Auth0 配置

在 `.env` 中填写你的 Auth0 配置：

```env
# Auth0 Configuration
VITE_AUTH0_DOMAIN=your-tenant.auth0.com
VITE_AUTH0_CLIENT_ID=your-client-id
VITE_AUTH0_AUDIENCE=http://supercocmos.com
VITE_AUTH0_REDIRECT_URI=http://localhost:1002
```

**获取配置信息：**

1. 登录 [Auth0 Dashboard](https://manage.auth0.com/)
2. 进入 Applications → 选择你的应用
3. 复制 **Domain** 和 **Client ID**
4. **Audience** 是你创建的 API Identifier

**为什么使用环境变量？**
✅ 更安全（已在 .gitignore）
✅ 支持多环境配置（开发/生产）
✅ CI/CD 友好
✅ Vite 原生支持

### 3. 配置 Auth0 Dashboard

#### 创建 Application

1. 创建 **Single Page Application**
2. 配置回调 URLs：
   ```
   http://localhost:1002, http://localhost:5173
   ```
3. 配置 Logout URLs：
   ```
   http://localhost:1002, http://localhost:5173
   ```
4. 配置 Web Origins：
   ```
   http://localhost:1002, http://localhost:5173
   ```

#### 创建 API（用于权限管理）

1. 创建 API，设置 Identifier 为：`http://supercocmos.com`
2. 启用 **RBAC**
3. 启用 **Add Permissions in the Access Token**

#### 配置权限和角色

1. 在 API 中定义 Permissions（例如：`read:admin`, `write:notes`）
2. 创建 Roles（用户管理 → 角色）
3. 给角色分配权限
4. 给用户分配角色

### 4. 启动应用

```bash
pnpm dev
```

## 文件说明

- `src/auth.ts` - Auth0 插件配置（从环境变量读取）
- `src/utils/permissions.ts` - 权限工具函数
- `src/router/index.ts` - 路由守卫实现
- `.env` - 环境变量配置（不要提交到 Git）
- `.env.example` - 配置模板

## 使用权限

### 在路由中使用

```typescript
// 公开路由（无需登录）
{
  path: '/',
  name: 'Home',
  component: Home,
  meta: { public: true }
}

// 需要登录
{
  path: '/chat',
  name: 'Chat',
  component: Chat,
  meta: { requiresAuth: true }
}

// 需要特定权限
{
  path: '/admin',
  name: 'Admin',
  component: AdminPanel,
  meta: {
    requiresAuth: true, // 可选，有 permissions 时会自动检查登录
    permissions: ['read:admin'] // 需要 read:admin 权限
  }
}

// ⚠️ 子路由必须配置自己的 meta（不会继承父路由）
{
  path: '/chat',
  component: ChatLayout,
  meta: { requiresAuth: true },
  children: [
    {
      path: ':uuid?',
      component: ChatView,
      meta: { requiresAuth: true } // 必须配置！
    }
  ]
}
```

### 在组件中使用

```vue
<script setup lang="ts">
import { useAuth0 } from '@auth0/auth0-vue'
import { getUserPermissions } from '@/utils/permissions'

const { getAccessTokenSilently, isAuthenticated } = useAuth0()

async function checkPermissions() {
  if (!isAuthenticated.value)
    return

  const permissions = await getUserPermissions(getAccessTokenSilently)
  console.log('用户权限:', permissions)
}
</script>
```

## 登录选项说明

### prompt 参数

在调用 `loginWithRedirect` 时，可以设置 `prompt` 参数控制登录行为：

| 参数值 | 行为 | 使用场景 |
|-------|------|---------|
| `login` | **强制显示登录页面** | 允许切换账号，即使已登录 |
| `select_account` | 显示账号选择页面 | 有多个账号时选择 |
| `consent` | 显示授权同意页面 | 需要用户同意权限 |
| `none` | 静默登录（默认） | 已登录时自动续期 |

**示例：**
```typescript
// 强制显示登录页面
loginWithRedirect({
  appState: { target: '/chat' },
  authorizationParams: {
    prompt: 'login' // 🔑 即使已登录也显示登录页面
  }
})

// 显示账号选择
loginWithRedirect({
  authorizationParams: {
    prompt: 'select_account' // 📋 让用户选择账号
  }
})
```

## 配置检查

在启动应用前，运行配置检查：

```bash
pnpm check-auth0
```

成功输出示例：
```
✅ VITE_AUTH0_DOMAIN: dev-xxx.us.auth0.com
✅ VITE_AUTH0_CLIENT_ID: xxxxx
✅ VITE_AUTH0_AUDIENCE: http://supercocmos.com
✅ VITE_AUTH0_REDIRECT_URI: http://localhost:1002

✅ 环境变量配置正确！
🚀 现在可以运行: pnpm dev
```

## 常见问题

### Q: 启动时出现 403 错误？

**A:** 这通常是回调 URL 配置错误导致的。

**常见原因：**
1. `.env` 中的 `VITE_AUTH0_REDIRECT_URI` 端口错误（应该是 `1002`，不是 `3002`）
2. Auth0 Dashboard 的 Allowed Callback URLs 没有包含 `http://localhost:1002`
3. `.env` 文件编码问题（使用 UTF-8，避免中文注释）

**修复步骤：**
```bash
# 1. 确认前端端口（vite.config.ts 中配置的是 1002）
# 2. 修改 .env
VITE_AUTH0_REDIRECT_URI=http://localhost:1002  # 必须是 1002！

# 3. 在 Auth0 Dashboard 中添加：
#    Applications → Settings → Allowed Callback URLs
#    添加: http://localhost:1002

# 4. 运行检查
pnpm check-auth0

# 5. 重启开发服务器
pnpm dev
```

### Q: `useAuth0() is undefined` 错误？

**A:** 这是初始化顺序问题，已在最新代码中修复：
- Auth0 插件在路由守卫之前注册
- 路由守卫延迟到 `setupAuthGuard()` 调用

### Q: Token 中没有 permissions 字段？

**A:** 确保：
1. Auth0 API 的 RBAC 已启用
2. "Add Permissions in the Access Token" 已启用
3. 用户已被分配角色，角色包含权限

### Q: 权限检查总是失败？

**A:** 检查：
1. `audience` 配置是否正确
2. 用户是否被分配了正确的角色
3. 查看浏览器控制台的 JWT Payload 输出

## 更多信息

查看 `Auth0_模板/AUTH0_COMPLETE_GUIDE.md` 获取完整的实现指南。
