# ✅ Auth0 配置检查清单

使用这个清单确保 Auth0 所有配置都正确。

## 📋 Application 配置

### Applications → 你的应用 → Settings

- [ ] **Domain**: `dev-1cn6r8b7szo6fs0y.us.auth0.com` ✓
- [ ] **Client ID**: `tZDZNUE3dHZrm6WrtNQGidmNOhYrj134` ✓

### Application URIs

- [ ] **Allowed Callback URLs**:
  ```
  http://localhost:1002, http://localhost:1003, http://localhost:3000
  ```

- [ ] **Allowed Logout URLs**:
  ```
  http://localhost:1002, http://localhost:1003, http://localhost:3000
  ```

- [ ] **Allowed Web Origins**:
  ```
  http://localhost:1002, http://localhost:1003, http://localhost:3000
  ```

- [ ] 点击 **Save Changes**

## 📋 API 配置

### APIs → 你的 API (`http://supercocmos.com`) → Settings

**必须配置的选项：**

- [ ] **Enable RBAC** = ✅ ON
- [ ] **Add Permissions in the Access Token** = ✅ ON
- [ ] **Allow Skipping User Consent** = ✅ ON ⚠️ **重要！避免 "Consent required" 错误**
- [ ] 点击 **Save**

### APIs → 你的 API → Permissions

- [ ] 创建权限：`read:admin`
- [ ] 创建权限：`write:admin`
- [ ] 创建权限：`read:statics`

## 📋 Roles 配置

### User Management → Roles

#### 创建 Admin 角色

- [ ] **Name**: `Admin`
- [ ] **Description**: `系统管理员`
- [ ] 点击 **Create**

#### 给 Admin 角色添加权限

- [ ] 进入 Admin 角色 → Permissions 标签
- [ ] 点击 **Add Permissions**
- [ ] 选择你的 API (`http://supercocmos.com`)
- [ ] 勾选权限：
  - ✅ `read:admin`
  - ✅ `write:admin`
  - ✅ `read:statics`
- [ ] 点击 **Add Permissions**

## 📋 用户配置

### User Management → Users → 选择测试用户

- [ ] 进入 **Roles** 标签
- [ ] 点击 **Assign Roles**
- [ ] 选择 `Admin`
- [ ] 点击 **Assign**

## 🧪 验证配置

### 1. 运行配置检查脚本

```bash
pnpm check-auth0
```

**预期输出：**
```
✅ VITE_AUTH0_DOMAIN: dev-1cn6r8b7szo6fs0y.us.auth0.com
✅ VITE_AUTH0_CLIENT_ID: tZDZNUE3dHZrm6WrtNQGidmNOhYrj134
✅ VITE_AUTH0_AUDIENCE: http://supercocmos.com
✅ VITE_AUTH0_REDIRECT_URI: http://localhost:1003

✅ 环境变量配置正确！
🚀 现在可以运行: pnpm dev
```

### 2. 清除缓存并重新登录

```javascript
// 在浏览器控制台运行
localStorage.clear()
sessionStorage.clear()
location.reload()
```

### 3. 测试访问管理员面板

```javascript
// 登录后，在控制台运行
window.location.href = '/admin'
```

**如果配置正确，应该：**
- ✅ 成功进入 /admin 页面
- ✅ 看到用户信息和权限列表
- ✅ 没有 "Consent required" 错误

## ❌ 故障排除

### 错误 1: Consent Required

```
❌ [App] Auth0 错误: Consent required
```

**解决方案：**
1. APIs → 你的 API → Settings
2. 启用 **Allow Skipping User Consent**
3. 清除缓存并重新登录

### 错误 2: 403 Forbidden / 权限检查失败

```
🚫 [Router] 缺少权限: read:statics
```

**检查：**
1. 用户是否被分配了 Admin 角色？
2. Admin 角色是否包含所需权限？
3. API 的 RBAC 是否启用？
4. "Add Permissions in the Access Token" 是否启用？

**验证：**
```javascript
// 在浏览器控制台查看 Token
const { getAccessTokenSilently } = useAuth0()
const token = await getAccessTokenSilently({
  authorizationParams: { audience: 'http://supercocmos.com' }
})

// 复制 token 到 https://jwt.io/ 查看
console.log(token)

// 应该能在 payload 中看到 permissions 字段
```

### 错误 3: Token 中没有 permissions 字段

**检查：**
1. ✅ Enable RBAC
2. ✅ Add Permissions in the Access Token
3. ✅ 用户已分配角色
4. ✅ 角色包含权限
5. ✅ 清除缓存并重新登录

## 📊 完整的配置图示

```
Auth0 Dashboard
│
├─ Applications
│  └─ 你的应用
│     ├─ Settings
│     │  ├─ Domain ✓
│     │  └─ Client ID ✓
│     └─ Application URIs
│        ├─ Callback URLs ✓
│        ├─ Logout URLs ✓
│        └─ Web Origins ✓
│
├─ APIs
│  └─ http://supercocmos.com
│     ├─ Settings
│     │  ├─ Enable RBAC ✓
│     │  ├─ Add Permissions in Token ✓
│     │  └─ Allow Skipping Consent ✓
│     └─ Permissions
│        ├─ read:admin ✓
│        ├─ write:admin ✓
│        └─ read:statics ✓
│
└─ User Management
   ├─ Roles
   │  └─ Admin
   │     └─ Permissions
   │        ├─ read:admin ✓
   │        ├─ write:admin ✓
   │        └─ read:statics ✓
   └─ Users
      └─ 测试用户
         └─ Roles
            └─ Admin ✓
```

## 🎉 配置完成

完成所有配置后，你应该能够：
- ✅ 正常登录
- ✅ 看到权限通知
- ✅ 访问 `/admin` 页面
- ✅ 没有任何错误

---

**如果所有配置都正确，但仍然有问题，请清除浏览器缓存并重新登录！**

