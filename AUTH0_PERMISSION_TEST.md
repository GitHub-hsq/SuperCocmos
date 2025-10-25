# 🔐 Auth0 权限测试指南

## 📋 测试场景

我们创建了一个管理员面板 `/admin`，需要 `read:admin` 权限才能访问。

## 🎯 测试目标

1. **有权限的用户** → 可以访问管理员面板
2. **无权限的用户** → 重定向到 403 页面

## ⚠️ 常见错误：Consent Required

如果你看到错误：
```
❌ [App] Auth0 错误: Consent required
```

**原因：** API 配置要求用户同意授权，但这对第一方应用来说是不必要的。

**解决方案：**
1. 进入 **APIs** → 选择你的 API
2. **Settings** → 找到 **Allow Skipping User Consent**
3. ✅ **启用**这个选项
4. 点击 **Save**
5. 清除浏览器缓存并重新登录

## 📝 Auth0 Dashboard 配置步骤

### 步骤 1: 创建权限（Permissions）

1. 登录 Auth0 Dashboard: https://manage.auth0.com/
2. 进入 **APIs** → 选择你的 API（Identifier: `http://supercocmos.com`）
3. 进入 **Permissions** 标签
4. 点击 **Add Permission**
5. 添加以下权限：

| Permission | Description |
|-----------|-------------|
| `read:admin` | 访问管理员面板 |
| `write:admin` | 管理员写入权限 |
| `read:statics` | 查看统计数据 |

6. 点击 **Save**

### 步骤 2: 创建角色（Roles）

1. 进入 **User Management** → **Roles**
2. 点击 **Create Role**
3. 创建以下角色：

#### 角色 1: Admin（管理员）
- **Name**: `Admin`
- **Description**: `系统管理员`
- **Permissions**:
  - ✅ `read:admin`
  - ✅ `write:admin`
  - ✅ `read:statics`

#### 角色 2: User（普通用户）
- **Name**: `User`
- **Description**: `普通用户`
- **Permissions**:
  - （不分配任何权限，或只分配基础权限）

### 步骤 3: 给用户分配角色

1. 进入 **User Management** → **Users**
2. 选择你的测试用户
3. 进入 **Roles** 标签
4. 点击 **Assign Roles**
5. 选择 `Admin` 或 `User`
6. 点击 **Assign**

### 步骤 4: 确认 API 配置

1. 进入 **APIs** → 选择你的 API（`http://supercocmos.com`）
2. 进入 **Settings** 标签
3. 确认以下设置：
   - ✅ **Enable RBAC** 已启用
   - ✅ **Add Permissions in the Access Token** 已启用
   - ✅ **Allow Skipping User Consent** 已启用 ⚠️ 重要！
4. 点击 **Save**

**为什么要启用 "Allow Skipping User Consent"？**
- 这是第一方应用（你自己的应用），不需要用户同意授权
- 如果不启用，会报错：`Consent required`
- 启用后，用户登录时不会显示授权同意页面

## 🧪 测试步骤

### 测试 1: 有权限的用户

1. **分配 Admin 角色**
   - Auth0 Dashboard → Users → 选择用户 → Roles → Assign Roles → 选择 `Admin`

2. **清除浏览器缓存**
   ```javascript
   localStorage.clear()
   location.reload()
   ```

3. **重新登录**
   - 访问 `http://localhost:1003`
   - 点击"立即开始" → 登录

4. **访问管理员面板**
   - 在浏览器地址栏输入：`http://localhost:1003/admin`
   - 或在控制台运行：
     ```javascript
     window.location.href = '/admin'
     ```

5. **预期结果**
   - ✅ 成功进入管理员面板
   - ✅ 看到用户信息和权限列表
   - ✅ 权限标签显示 `read:admin`
   - ✅ 控制台输出：
     ```
     📍 [路由跳转] HH:MM:SS | /chat → /admin
     ✅ [AdminPanel] 用户权限: ['read:admin', 'write:admin', 'read:statics']
     ✅ [路由完成] HH:MM:SS | 成功导航到: /admin
     ```

### 测试 2: 无权限的用户

1. **移除 Admin 角色**
   - Auth0 Dashboard → Users → 选择用户 → Roles → 移除 `Admin`

2. **清除浏览器缓存**
   ```javascript
   localStorage.clear()
   location.reload()
   ```

3. **重新登录**
   - 访问 `http://localhost:1003`
   - 点击"立即开始" → 登录

4. **尝试访问管理员面板**
   - 在浏览器地址栏输入：`http://localhost:1003/admin`

5. **预期结果**
   - ✅ 自动重定向到 `/403` 页面
   - ✅ 显示"访问被拒绝"提示
   - ✅ 控制台输出：
     ```
     📍 [路由跳转] HH:MM:SS | /chat → /admin
     🚫 [Router] 缺少权限: read:admin
     📍 [路由跳转] HH:MM:SS | /admin → /403
     ✅ [路由完成] HH:MM:SS | 成功导航到: /403
     ```

## 🔍 调试工具

### 查看路由历史
```javascript
window.__printRouteHistory()
```

### 查看用户权限（在管理员面板中）
打开浏览器控制台，应该能看到：
```
✅ [AdminPanel] 用户权限: ['read:admin', 'write:admin', ...]
```

### 手动检查 JWT Token
在浏览器控制台运行：
```javascript
// 获取当前用户的权限
const { getAccessTokenSilently } = window.__auth0Client
const token = await getAccessTokenSilently({
  authorizationParams: { audience: 'http://supercocmos.com' }
})

// 解码 token（复制到 https://jwt.io/ 查看）
console.log(token)
```

## 📊 测试清单

### 基础认证测试
- [ ] 未登录访问 `/chat` → 跳转到 Auth0 登录
- [ ] 登录成功 → 自动跳转回 `/chat`
- [ ] 刷新页面保持登录状态
- [ ] 退出登录 → 返回首页

### 权限控制测试
- [ ] Admin 用户访问 `/admin` → 成功访问
- [ ] 普通用户访问 `/admin` → 重定向到 403
- [ ] 403 页面显示正确的提示信息
- [ ] 从 403 页面可以返回首页

### 路由历史测试
- [ ] `window.__printRouteHistory()` 正常工作
- [ ] 路由跳转都有详细日志
- [ ] 日志包含时间戳和完整路径

## 🚀 快速测试命令

```javascript
// 1. 查看路由历史
window.__printRouteHistory()

// 2. 跳转到管理员面板
window.location.href = '/admin'

// 3. 清除缓存重新登录
localStorage.clear()
location.reload()
```

## 📌 常见问题

### Q: Token 中没有 permissions 字段？

**A:** 检查：
1. API 的 RBAC 是否启用
2. "Add Permissions in the Access Token" 是否启用
3. 用户是否被分配了角色
4. 角色是否包含权限

### Q: 权限更新不生效？

**A:** 清除浏览器缓存：
```javascript
localStorage.clear()
location.reload()
```

Auth0 的 token 有缓存，需要重新登录才能获取新的权限。

## 🎓 下一步

权限测试通过后，你可以：
1. 创建更多需要不同权限的页面
2. 在组件中使用权限控制显示/隐藏功能
3. 根据权限动态显示菜单项

---

**祝测试顺利！** 🎉
