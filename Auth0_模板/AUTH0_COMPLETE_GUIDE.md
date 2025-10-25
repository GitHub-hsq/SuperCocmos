# 🔐 Auth0 + Vue 3 完整实现指南

> 本文档整合了 Auth0 在 Vue 3 项目中的完整实现方案，包括配置、登录流程、权限验证和最佳实践。

---

## 📋 目录

1. [核心概念](#核心概念)
2. [项目配置](#项目配置)
3. [登录流程](#登录流程)
4. [权限获取流程](#权限获取流程)
5. [文件结构与实现](#文件结构与实现)
6. [useAuth0() 使用规则](#useauth0-使用规则)
7. [最佳实践](#最佳实践)
8. [常见问题](#常见问题)
9. [完整示例](#完整示例)

---

## 核心概念

### 🎯 createAuth0() vs useAuth0()

| 特性           | createAuth0() | useAuth0()                |
|------         |--------------  |-----------               |
| **用途**       | Vue 插件注册器 | Composition API Hook      |
| **使用位置**   | `main.ts`      | 组件 `setup()` / 路由守卫 |
| **返回值**     | Vue 插件对象    | Auth0 实例                |
| **可调用方法** | ❌ 无运行时方法 | ✅ 所有 Auth0 方法        |
| **是否有状态** | ❌             | ✅ 响应式状态            |

**关键理解：**
- `createAuth0()` 只是插件注册器，不包含任何运行时方法
- `useAuth0()` 返回实际可用的 Auth0 实例和响应式状态
- 必须先在 `main.ts` 中用 `.use()` 注册插件，才能在组件中使用 `useAuth0()`

---

## 项目配置

### 1️⃣ 安装依赖

```bash
npm install @auth0/auth0-vue jwt-decode
```

**重要说明：**
- `@auth0/auth0-vue` 是 Vue 3 的官方 SDK
- 它内部已经包含 `@auth0/auth0-spa-js`，无需手动安装
- `jwt-decode` 用于安全解码 JWT token

### 2️⃣ Auth0 Dashboard 配置

#### 创建 Application

1. 登录 [Auth0 Dashboard](https://manage.auth0.com/)
2. 创建一个新的 **Single Page Application**
3. 配置 **Allowed Callback URLs**：
   ```
   http://localhost:5173, http://localhost:8080
   ```
4. 配置 **Allowed Logout URLs**：
   ```
   http://localhost:5173, http://localhost:8080
   ```
5. 配置 **Allowed Web Origins**：
   ```
   http://localhost:5173, http://localhost:8080
   ```

#### 创建 API（用于权限管理）

1. 在 Auth0 Dashboard 中创建 **API**
2. 设置 **Identifier**（audience）：
   ```
   http://supercocmos.com
   ```
3. 启用 **RBAC**（Role-Based Access Control）
4. 启用 **Add Permissions in the Access Token**

#### 配置权限和角色

1. 在 API 中定义 **Permissions**：
   - `read:statics` - 查看统计数据
   - `write:notes` - 编辑笔记
   - 等等...

2. 创建 **Roles**（用户管理 → 角色）：
   - **Admin** - 包含 `read:statics` 等管理权限
   - **User** - 基础用户权限

3. 给用户分配角色：
   - 用户管理 → 选择用户 → 角色 → 分配角色

### 3️⃣ 项目配置文件

创建 `auth_config.json`：

```json
{
  "domain": "your-tenant.auth0.com",
  "clientId": "your-client-id"
}
```

**⚠️ 安全提示：**
- 不要提交 `auth_config.json` 到 Git（添加到 `.gitignore`）
- 在生产环境使用环境变量

---

## 登录流程

### 📊 完整流程图

```
用户点击登录
    ↓
调用 loginWithRedirect()
    ↓
重定向到 Auth0 登录页面
    ↓
用户输入凭证
    ↓
Auth0 验证成功
    ↓
重定向回应用（带 code）
    ↓
@auth0/auth0-vue 自动处理回调
    ↓
获取 Access Token 和 ID Token
    ↓
更新 isAuthenticated = true
    ↓
用户成功登录
```

### 🔧 代码实现

#### 1. 创建 Auth0 插件（`src/auth.ts`）

```typescript
import { createAuth0 } from '@auth0/auth0-vue'
import authConfig from '../auth_config.json'

export const auth0 = createAuth0({
  domain: authConfig.domain,
  clientId: authConfig.clientId,
  authorizationParams: {
    redirect_uri: window.location.origin,
    audience: 'http://supercocmos.com' // 你的 API identifier
  }
})

export default auth0
```

#### 2.在mian.ts注册插件（`src/main.ts`）

```typescript
import { createApp } from 'vue'
import App from './App.vue'
import { auth0 } from './auth'
import { createRouter } from './router'

const app = createApp(App)

// 注册 Auth0 插件
app.use(auth0)

// 创建并注册路由
const router = createRouter(app)
app.use(router)

app.mount('#app')
```

#### 3. 在组件中使用

```typescript
import { useAuth0 } from '@auth0/auth0-vue'

export default {
  setup() {
    const {
      loginWithRedirect,
      logout,
      isAuthenticated,
      isLoading,
      user
    } = useAuth0()

    return {
      // 登录
      login: () => loginWithRedirect({
        appState: { target: '/welcome' } // 登录成功后的回调页面
      }),

      // 登出
      logout: () => logout({
        logoutParams: { returnTo: window.location.origin }
      }),

      isAuthenticated,
      isLoading,
      user
    }
  }
}
```

---

## 权限获取流程

### 📊 完整流程图

```
用户已登录
    ↓
调用 getAccessTokenSilently()
    ↓
获取 Access Token（包含权限）
    ↓
使用 jwt-decode 解码 Token
    ↓
从 payload 中提取 permissions 数组
    ↓
返回权限列表
    ↓
在路由守卫/组件中验证权限
```

### 🔧 代码实现

#### 1. 权限工具函数（`src/utils/permissions.ts`）

```typescript
import { jwtDecode } from 'jwt-decode'

// JWT Payload 接口定义
interface JWTPayload {
  permissions?: string[]
  [key: string]: any
}

// getAccessTokenSilently 方法的选项类型
interface TokenOptions {
  authorizationParams?: {
    audience?: string
    scope?: string
    [key: string]: any
  }
  cacheMode?: 'on' | 'off' | 'cache-only'
  detailedResponse?: boolean
  [key: string]: any
}

/**
 * 获取用户权限列表
 * @param getAccessTokenSilently - Auth0 的 getAccessTokenSilently 方法（从 useAuth0() 获取）
 * @returns 权限字符串数组
 *
 * ⚠️ 重要：不能在此工具函数中直接调用 useAuth0()
 * useAuth0() 只能在 Vue 组件的 setup() 或路由守卫中调用
 * 所以我们将 getAccessTokenSilently 作为参数传入
 */
export async function getUserPermissions(
  getAccessTokenSilently: (options?: TokenOptions) => Promise<string>
): Promise<string[]> {
  try {
    if (!getAccessTokenSilently) {
      console.warn('⚠️ getAccessTokenSilently 方法不可用')
      return []
    }

    // 获取 Access Token
    const token = await getAccessTokenSilently({
      authorizationParams: {
        audience: 'http://supercocmos.com',
      }
    })

    if (!token) {
      console.warn('⚠️ Token 为空')
      return []
    }

    // 使用 jwt-decode 安全解码 JWT token
    try {
      const payload = jwtDecode<JWTPayload>(token)

      // 调试输出：查看完整的 payload 结构
      console.log('🔍 JWT Payload:', payload)

      // 从标准 permissions 字段获取
      const permissions = payload.permissions || []

      // 如果使用自定义命名空间，修改为：
      // const permissions = payload['https://your-namespace/permissions'] || [];

      if (Array.isArray(permissions)) {
        return permissions
      }

      console.warn('⚠️ Permissions 字段不是数组类型')
      return []
    }
    catch (decodeError) {
      console.error('❌ Token 解码失败:', decodeError)
      return []
    }
  }
  catch (error) {
    console.error('❌ 获取权限失败:', error)
    return []
  }
}

export default getUserPermissions
```

**关键点：**
- ✅ 使用 `jwt-decode` 库安全解码（避免手动 `atob()` 的问题）
- ✅ 多层错误处理（token 获取 + token 解码）
- ✅ 完整的类型定义（TypeScript 类型安全）
- ✅ 参数传递模式（不能在工具函数中直接调用 `useAuth0()`）
- ✅ 支持自定义命名空间（注释说明）

#### 2. 路由守卫权限验证（`src/router/index.ts`）

```typescript
import { useAuth0 } from '@auth0/auth0-vue'
import { createRouter as createVueRouter, createWebHashHistory, Router } from 'vue-router'
import { getUserPermissions } from '../utils/permissions'

// 扩展路由元信息类型
declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    permissions?: string[]
  }
}

export function createRouter(app: App): Router {
  const router = createVueRouter({
    history: createWebHashHistory(),
    routes: [
      {
        path: '/',
        name: 'home',
        component: Home
      },
      {
        path: '/profile',
        name: 'profile',
        component: Profile,
        meta: { requiresAuth: true } // 需要登录
      },
      {
        path: '/statics',
        name: 'statics',
        component: Statics,
        meta: {
          requiresAuth: true,
          permissions: ['read:statics'] // 需要登录且获得特定权限
        }
      },
      {
        path: '/403',
        name: '403',
        component: () => import('../views/403.vue')
      }
    ]
  })

  // 🔒 路由守卫
  router.beforeEach(async (to, from, next) => {
    // ✅ 在路由守卫中调用 useAuth0() 是正确的
    // 路由守卫是少数允许的非组件上下文
    const { isAuthenticated, isLoading, loginWithRedirect, getAccessTokenSilently } = useAuth0()

    // 1. 等待 Auth0 初始化完成
    if (isLoading.value) {
      // ⚠️ 重要：根据页面类型采取不同策略
      if (to.meta.requiresAuth) {
        // 需要认证的页面：阻止导航，等待 Auth0 加载完成
        // 这样可以避免在未知认证状态时进入受保护页面
        next(false)
        return
      }
      // 公开页面：允许访问，不影响用户体验
      next()
      return
    }

    // 2. 检查是否需要认证
    if (to.meta.requiresAuth && !isAuthenticated.value) {
      loginWithRedirect({ appState: { target: to.path } })
      next(false) // 阻止导航
      return
    }

    // 3. 检查权限
    const requiredPermissions = to.meta.permissions

    if (requiredPermissions && requiredPermissions.length > 0) {
      try {
        // ✅ 传递 getAccessTokenSilently 方法给工具函数
        const userPermissions = await getUserPermissions(getAccessTokenSilently)
        console.log('🔑 用户权限:', userPermissions)

        const hasPermission = requiredPermissions.some(p => userPermissions.includes(p))

        if (!hasPermission) {
          console.warn(`🚫 用户缺少权限: ${requiredPermissions.join(', ')}`)
          next('/403') // 跳转到 403 页面
          return
        }
      }
      catch (err) {
        console.error('❌ 权限检查失败:', err)
        next('/403')
        return
      }
    }

    next() // 允许导航
  })

  return router
}
```

**权限验证流程：**

```
路由守卫触发
    ↓
Auth0 是否已加载？
    ├─ 否 → 需要认证？
    │      ├─ 是 → 阻止导航，等待加载
    │      └─ 否 → 允许访问（公开页面）
    └─ 是 → 继续检查
        ↓
    需要认证？
    ├─ 是 → 已登录？
    │      ├─ 否 → 重定向到 Auth0 登录
    │      └─ 是 → 继续检查权限
    └─ 否 → 允许导航
        ↓
    需要特定权限？
    ├─ 是 → 获取用户权限
    │      ├─ 有权限 → 允许访问
    │      └─ 无权限 → 跳转到 403
    └─ 否 → 允许访问
```

---

## 文件结构与实现

### 📁 项目结构

```
src/
├── auth.ts                     # Auth0 插件配置
├── auth.d.ts                   # TypeScript 类型声明（可选）
├── main.ts                     # 应用入口，注册 Auth0 插件
├── utils/
│   └── permissions.ts          # 权限获取工具函数
├── router/
│   └── index.ts               # 路由配置和守卫
├── components/
│   └── NavBar.vue             # 导航栏
└── views/
    ├── Home.vue               # 公开页面
    ├── welcome.vue            # 需要登录
    ├── Profile.vue            # 需要登录
    ├── statics.vue            # 需要 read:statics 权限
    └── 403.vue                # 无权限页面
```

### 🔧 组件实现示例

#### NavBar.vue（导航栏组件）

```vue
<script lang="ts">
import type { Ref } from 'vue'
import { useAuth0 } from '@auth0/auth0-vue'
import { onBeforeMount, ref, watch } from 'vue'
import { getUserPermissions } from '../utils/permissions'

export default {
  name: 'NavBar',
  setup() {
    // ✅ 在 setup() 中调用 useAuth0()
    const auth0 = useAuth0()
    const hasAdminPermission: Ref<boolean> = ref(false)

    /**
     * 检查用户权限
     */
    const checkPermissions = async (): Promise<void> => {
      if (auth0.isLoading.value)
        return

      if (auth0.isAuthenticated.value) {
        try {
          // ✅ 传递 getAccessTokenSilently 方法
          const permissions = await getUserPermissions(auth0.getAccessTokenSilently)
          console.log('🔑 权限列表：', permissions)
          hasAdminPermission.value = permissions.includes('read:statics')
        }
        catch (error) {
          console.error('❌ 检查权限失败:', error)
          hasAdminPermission.value = false
        }
      }
      else {
        hasAdminPermission.value = false
      }
    }

    // 在组件挂载前检查初始状态
    onBeforeMount(() => {
      if (!auth0.isLoading.value && auth0.isAuthenticated.value) {
        checkPermissions()
      }
    })

    // 监听加载状态变化
    watch(() => auth0.isLoading.value, (isLoading: boolean, wasLoading: boolean) => {
      if (wasLoading && !isLoading && auth0.isAuthenticated.value) {
        console.log('✅ Auth0 加载完成，检查权限')
        checkPermissions()
      }
    })

    // 监听认证状态变化
    watch(() => auth0.isAuthenticated.value, (isAuth: boolean, wasAuth: boolean) => {
      if (isAuth && !wasAuth) {
        console.log('✅ 用户已登录，检查权限')
        checkPermissions()
      }
      else if (!isAuth && wasAuth) {
        console.log('🔓 用户已退出，清除权限')
        hasAdminPermission.value = false
      }
    })

    return {
      isAuthenticated: auth0.isAuthenticated,
      isLoading: auth0.isLoading,
      user: auth0.user,
      hasAdminPermission,

      login(): void {
        auth0.loginWithRedirect({ appState: { target: '/welcome' } })
      },

      logout(): void {
        auth0.logout({
          logoutParams: { returnTo: window.location.origin }
        })
      }
    }
  }
}
</script>

<template>
  <nav>
    <router-link to="/">
      Home
    </router-link>

    <!-- 登录后可见 -->
    <router-link v-if="isAuthenticated" to="/welcome">
      Welcome
    </router-link>
    <router-link v-if="isAuthenticated" to="/profile">
      Profile
    </router-link>

    <!-- 只有 Admin 权限可见 -->
    <router-link v-if="hasAdminPermission" to="/statics">
      Admin Panel
    </router-link>

    <!-- 登录/登出按钮 -->
    <button v-if="!isAuthenticated" @click="login">
      Login
    </button>
    <button v-if="isAuthenticated" @click="logout">
      Logout
    </button>
  </nav>
</template>
```

**关键改进：**
- ✅ 使用 `onBeforeMount` + `watch` 替代 `setTimeout`（更可靠）
- ✅ 完整的类型注解（TypeScript 类型安全）
- ✅ 正确处理 `user` 可能为 `undefined`（使用 `user?.picture`）
- ✅ 详细的日志输出（便于调试）

---

## useAuth0() 使用规则

### ✅ 允许使用的地方

#### 1. Vue 组件的 setup() 函数中

```typescript
export default {
  setup() {
    // ✅ 正确：在 setup() 中调用
    const { isAuthenticated, user, loginWithRedirect } = useAuth0()

    return {
      isAuthenticated,
      user,
      login: loginWithRedirect
    }
  }
}
```

#### 2. 路由守卫中

```typescript
router.beforeEach(async (to, from, next) => {
  // ✅ 正确：在路由守卫中调用
  // 路由守卫是少数允许的非组件上下文
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0()

  if (isLoading.value) {
    next()
    return
  }

  if (to.meta.requiresAuth && !isAuthenticated.value) {
    loginWithRedirect({ appState: { target: to.path } })
    next(false)
    return
  }

  next()
})
```

**为什么路由守卫可以调用 useAuth0()？**
- 路由守卫在 Vue 应用的上下文中执行
- @auth0/auth0-vue 通过 Vue 的依赖注入系统提供实例
- 路由守卫可以访问 Vue 的注入系统，因此可以使用 `useAuth0()`

### ❌ 禁止使用的地方

#### 1. 普通工具函数中

```typescript
// ❌ 错误：在普通函数中调用
export async function getUserPermissions() {
  const { getAccessTokenSilently } = useAuth0() // ❌ 报错！
  // Error: inject() can only be used inside setup()
}

// ✅ 正确：将方法作为参数传入
export async function getUserPermissions(getAccessTokenSilently: Function) {
  const token = await getAccessTokenSilently({ /* ... */ })
  // ...
}
```

#### 2. 全局作用域中

```typescript
// ❌ 错误：在模块顶层调用
import { useAuth0 } from '@auth0/auth0-vue'

const { isAuthenticated } = useAuth0() // ❌ 报错！

export default {
  setup() {
    // ...
  }
}
```

#### 3. 类方法或普通函数中

```typescript
// ❌ 错误：在类方法中调用
class AuthService {
  checkAuth() {
    const { isAuthenticated } = useAuth0() // ❌ 报错！
  }
}
```

### 📝 使用规则总结

| 场景 | 是否可用 | 说明 |
|-----|---------|------|
| 组件 setup() | ✅ | 标准用法 |
| 路由守卫 | ✅ | 少数允许的非组件上下文 |
| 工具函数 | ❌ | 需要通过参数传递 |
| 全局作用域 | ❌ | 无法访问 Vue 上下文 |
| 类/对象方法 | ❌ | 无法访问 Vue 上下文 |

---

## 最佳实践

### ✅ DO（推荐做法）

#### 1. 在组件/路由守卫中使用 useAuth0()

```typescript
// ✅ 正确
const { isAuthenticated, getAccessTokenSilently } = useAuth0()
```

#### 2. 检查 isLoading 状态

```typescript
// ✅ 正确
if (auth0.isLoading.value) {
  // 等待初始化
}
```

#### 3. 使用 watch 监听状态变化

```typescript
// ✅ 正确：响应式监听
watch(() => auth0.isLoading.value, (isLoading, wasLoading) => {
  if (wasLoading && !isLoading && auth0.isAuthenticated.value) {
    fetchUserData()
  }
})
```

#### 4. 在路由守卫的所有分支调用 next()

```typescript
// ✅ 正确
if (condition) {
  next(false)
  return
}
next()
```

#### 5. 使用工具函数封装权限逻辑

```typescript
// ✅ 正确：封装在工具函数中
const permissions = await getUserPermissions(auth0.getAccessTokenSilently)
```

#### 6. 完整的错误处理

```typescript
// ✅ 正确
try {
  const token = await getAccessTokenSilently({ /* ... */ })
  const payload = jwtDecode(token)
  return payload.permissions || []
}
catch (error) {
  console.error('获取权限失败:', error)
  return []
}
```

### ❌ DON'T（避免做法）

#### 1. 直接导入 auth0 插件并调用方法

```typescript
// ❌ 错误
import { auth0 } from '@/auth'

auth0.getAccessTokenClaims() // auth0 没有这个方法！
```

#### 2. 在 Auth0 未初始化时调用方法

```typescript
// ❌ 错误
onMounted(() => {
  getUserPermissions() // Auth0 可能还没初始化
})
```

#### 3. 在路由守卫中忘记调用 next()

```typescript
// ❌ 错误
if (isLoading.value) {
  // 忘记调用 next()，导航会挂起
}
```

#### 4. 混淆权限数据结构

```typescript
// ❌ 错误
const claims = await getUserPermissions()
const permissions = claims.permissions || [] // getUserPermissions 返回的就是数组！

// ✅ 正确
const permissions = await getUserPermissions() // 直接是数组
```

#### 5. 在工具函数中调用 useAuth0()

```typescript
// ❌ 错误
export async function getUserPermissions() {
  const { getAccessTokenSilently } = useAuth0() // 报错！
}

// ✅ 正确：参数传递
export async function getUserPermissions(getAccessTokenSilently: Function) {
  // ...
}
```

---

## 常见问题

### Q1: 为什么 `auth0.getAccessTokenClaims is not a function`?

**原因：** 直接导入了 `auth0` 插件而不是使用 `useAuth0()`

```typescript
// ✅ 正确
import { useAuth0 } from '@auth0/auth0-vue'

// ❌ 错误
import { auth0 } from '@/auth'
// auth0 是插件注册器，没有运行时方法！
auth0.getAccessTokenClaims()
const { getAccessTokenClaims } = useAuth0()
await getAccessTokenClaims()
```

### Q2: 为什么在工具函数中调用 useAuth0() 报错？

**原因：** `useAuth0()` 依赖 Vue 的依赖注入系统，只能在 Vue 上下文中使用

```typescript
// ❌ 错误
export async function getUserPermissions() {
  const { getAccessTokenSilently } = useAuth0()
  // Error: inject() can only be used inside setup()
}

// ✅ 正确：使用参数传递
export async function getUserPermissions(getAccessTokenSilently: Function) {
  const token = await getAccessTokenSilently({ /* ... */ })
}

// 在组件中使用
const auth0 = useAuth0()
const permissions = await getUserPermissions(auth0.getAccessTokenSilently)
```

### Q3: 权限检查总是失败？

**检查清单：**
1. ✅ Auth0 API 的 audience 配置是否正确
2. ✅ 用户是否被分配了正确的角色
3. ✅ 角色是否包含所需的权限
4. ✅ API 的 RBAC 是否启用
5. ✅ "Add Permissions in the Access Token" 是否启用

**调试方法：**

```typescript
// 查看 Token Payload
const token = await getAccessTokenSilently({
  authorizationParams: { audience: 'http://supercocmos.com' }
})
const payload = jwtDecode(token)
console.log('📋 Token Payload:', payload)
console.log('🔑 Permissions:', payload.permissions)
```

### Q4: 为什么路由守卫中可以使用 useAuth0()？

**答：** 路由守卫是 Vue Router 的一部分，在 Vue 应用的上下文中执行：

```typescript
router.beforeEach(async (to, from, next) => {
  // ✅ 路由守卫在 Vue 应用上下文中执行
  // 可以访问 Vue 的依赖注入系统
  // 因此可以调用 useAuth0()
  const { isAuthenticated } = useAuth0()

  // ...
})
```

**允许的原因：**
- 路由守卫是在 Vue 实例化后注册的
- 路由守卫执行时，Vue 应用已经完成初始化
- @auth0/auth0-vue 通过 `app.use()` 注入到 Vue 应用中
- 路由守卫可以访问这个注入的实例

### Q5: 如何判断 Auth0 是否已初始化？

```typescript
const { isLoading } = useAuth0()

// 方法 1：检查 isLoading
if (!isLoading.value) {
  // Auth0 已初始化完成
}

// 方法 2：使用 watch 监听
watch(() => isLoading.value, (isLoading, wasLoading) => {
  if (wasLoading && !isLoading) {
    // 从加载中变为加载完成
    console.log('Auth0 初始化完成')
  }
})
```

### Q6: 是否需要手动安装 @auth0/auth0-spa-js？

**答：不需要！**

```bash
# ❌ 不需要
npm install @auth0/auth0-spa-js

# ✅ 只需要安装
npm install @auth0/auth0-vue
```

**原因：**
- `@auth0/auth0-vue` 内部依赖 `@auth0/auth0-spa-js`
- npm/yarn 会自动安装所有依赖
- 手动安装可能导致版本冲突

### Q7: 为什么 Auth0 加载中时，需要认证的页面要阻止导航？

**答：为了安全！**

```typescript
if (isLoading.value) {
  if (to.meta.requiresAuth) {
    next(false) // ✅ 正确：阻止导航
    return
  }
  next() // 公开页面允许
}
```

**原因分析：**

❌ **错误做法：**
```typescript
if (isLoading.value) {
  next() // 直接允许所有页面
}
```

这样做的问题：
1. Auth0 还在加载，无法判断用户是否已登录
2. 用户可能访问受保护页面（如 `/profile`）
3. 直接 `next()` 会让用户进入页面
4. **绕过了认证检查，造成安全隐患！**

✅ **正确做法：**
- **需要认证的页面**：`next(false)` 阻止导航，等待 Auth0 加载完成
- **公开页面**：`next()` 允许访问，不影响用户体验

**实际效果：**
- 用户首次访问公开页面（如 `/`）→ 立即显示，不等待
- 用户首次访问受保护页面（如 `/profile`）→ 短暂等待 Auth0 初始化 → 判断是否已登录 → 允许/拒绝访问

---

## 完整示例

### 场景：带权限控制的管理面板

#### 1. 路由配置

```typescript
const routes = [
  {
    path: '/admin',
    name: 'admin',
    component: AdminPanel,
    meta: {
      requiresAuth: true,
      permissions: ['read:admin']
    }
  }
]
```

#### 2. AdminPanel.vue

```vue
<script lang="ts">
import type { Ref } from 'vue'
import { useAuth0 } from '@auth0/auth0-vue'
import { onBeforeMount, ref, watch } from 'vue'
import { getUserPermissions } from '@/utils/permissions'

export default {
  name: 'AdminPanel',
  setup() {
    const auth0 = useAuth0()
    const permissions: Ref<string[]> = ref([])

    const fetchPermissions = async (): Promise<void> => {
      if (auth0.isLoading.value)
        return

      if (auth0.isAuthenticated.value) {
        try {
          permissions.value = await getUserPermissions(auth0.getAccessTokenSilently)
        }
        catch (error) {
          console.error('获取权限失败:', error)
        }
      }
    }

    onBeforeMount(() => {
      if (!auth0.isLoading.value && auth0.isAuthenticated.value) {
        fetchPermissions()
      }
    })

    watch(() => auth0.isLoading.value, (isLoading, wasLoading) => {
      if (wasLoading && !isLoading && auth0.isAuthenticated.value) {
        fetchPermissions()
      }
    })

    return {
      isAuthenticated: auth0.isAuthenticated,
      isLoading: auth0.isLoading,
      user: auth0.user,
      permissions,
      login: () => auth0.loginWithRedirect(),
      logout: () => auth0.logout({
        logoutParams: { returnTo: window.location.origin }
      })
    }
  }
}
</script>

<template>
  <div v-if="!isLoading">
    <div v-if="isAuthenticated">
      <h1>管理面板</h1>
      <p>欢迎，{{ user?.name }}</p>

      <div v-if="permissions.length > 0">
        <h3>你的权限：</h3>
        <ul>
          <li v-for="perm in permissions" :key="perm">
            {{ perm }}
          </li>
        </ul>
      </div>

      <button @click="logout">
        登出
      </button>
    </div>

    <div v-else>
      <button @click="login">
        请先登录
      </button>
    </div>
  </div>

  <div v-else>
    <p>加载中...</p>
  </div>
</template>
```

---

## 🧪 测试清单

在部署前，建议测试以下场景：

- [ ] **未登录用户访问公开页面** → 正常访问
- [ ] **未登录用户访问受保护页面** → 重定向到 Auth0 登录
- [ ] **登录后访问受保护页面** → 正常访问
- [ ] **无权限访问管理面板** → 重定向到 403
- [ ] **有权限访问管理面板** → 正常访问
- [ ] **导航栏根据权限显示/隐藏菜单** → 正确显示
- [ ] **登出后权限清除** → 权限相关 UI 消失
- [ ] **刷新页面后状态保持** → 登录状态和权限不丢失

---

## 📚 相关资源

### 官方文档
- [Auth0 Vue SDK](https://github.com/auth0/auth0-vue)
- [Auth0 官方文档](https://auth0.com/docs)
- [Vue 3 文档](https://vuejs.org/)
- [Vue Router](https://router.vuejs.org/)

### 工具
- [JWT.io](https://jwt.io/) - JWT Token 解码工具
- [Auth0 Dashboard](https://manage.auth0.com/) - Auth0 管理控制台

### 本项目文件
- `src/auth.ts` - Auth0 插件配置
- `src/utils/permissions.ts` - 权限工具函数
- `src/router/index.ts` - 路由守卫实现
- `auth_config.json` - Auth0 配置文件

---

## 📝 总结

### 核心要点

1. **依赖管理**
   - 只需安装 `@auth0/auth0-vue`
   - 不要手动安装 `@auth0/auth0-spa-js`

2. **useAuth0() 使用规则**
   - ✅ 可以在组件 `setup()` 中使用
   - ✅ 可以在路由守卫中使用
   - ❌ 不能在普通工具函数中使用

3. **权限验证**
   - 使用 `jwt-decode` 安全解码 Token
   - 多层错误处理
   - 参数传递模式（而非直接调用）

4. **初始化时机**
   - 使用 `onBeforeMount` + `watch`
   - 避免使用 `setTimeout`
   - 监听 `isLoading` 状态变化

5. **类型安全**
   - 完整的 TypeScript 类型定义
   - 使用可选链处理可能为 `undefined` 的值

### 最终检查

✅ Auth0 配置正确
✅ 依赖安装正确（无重复依赖）
✅ useAuth0() 使用正确（只在允许的地方调用）
✅ 权限工具函数实现正确（参数传递模式）
✅ 路由守卫实现正确（完整的权限检查）
✅ 组件实现正确（响应式状态监听）
✅ 错误处理完善
✅ 类型安全

---

**文档版本：** 1.0
**最后更新：** 2025-10-24
**适用版本：** Vue 3 + @auth0/auth0-vue ^2.3.0

---

🎉 **恭喜！你已经掌握了 Auth0 在 Vue 3 项目中的完整实现方案！**
