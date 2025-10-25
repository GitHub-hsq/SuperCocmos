# 🔐 Auth0 配置详解

## 📚 三种应用类型

你在 Auth0 Dashboard 中有三个不同的配置，每个有不同的用途：

### 1️⃣ 单页面应用（SPA）- 前端登录

**名称：** 你创建的 SPA 应用  
**Client ID:** `tZDZNUE3dHZrm6WrtNQGidmNOhYrj134`  
**Client Secret:** ❌ **没有**（SPA 不需要 secret）

**用途：**
- 用户在浏览器中登录
- 前端 JavaScript 代码使用
- 获取 Access Token 调用你的 API

**配置位置：**
```env
# 前端 .env
VITE_AUTH0_DOMAIN=dev-1cn6r8b7szo6fs0y.us.auth0.com
VITE_AUTH0_CLIENT_ID=tZDZNUE3dHZrm6WrtNQGidmNOhYrj134  ✅ 这个
VITE_AUTH0_AUDIENCE=http://supercocmos.com
```

---

### 2️⃣ 机器对机器（M2M）- 后端验证

**名称：** "管理笔记api"  
**Client ID:** `mekzeXfbMWlK4HoHi18MyUaR0G2wSOlL`  
**Client Secret:** `u4srke-Eq-zGLTgavHcslyl_ae2GWj06kGxg9N6slaDDQKfmY2-g5fZkRW-N3XlE`  
**API:** `http://supercocmos.com`

**用途：**
- 后端验证前端传来的 Access Token
- 检查 token 是否有效
- 检查 token 的权限（permissions）

**配置位置：**
```env
# 后端 service/.env
AUTH0_DOMAIN=dev-1cn6r8b7szo6fs0y.us.auth0.com
AUTH0_AUDIENCE=http://supercocmos.com
AUTH0_M2M_CLIENT_ID=mekzeXfbMWlK4HoHi18MyUaR0G2wSOlL  ✅ 这个
AUTH0_M2M_CLIENT_SECRET=u4srke-Eq-zGLTgavHcslyl_ae2GWj06kGxg9N6slaDDQKfmY2-g5fZkRW-N3XlE  ✅ 这个
```

---

### 3️⃣ Auth0 Management API - 管理 Auth0

**Identifier:** `https://dev-1cn6r8b7szo6fs0y.us.auth0.com/api/v2/`  
**Client ID:** `tZDZNUE3dHZrm6WrtNQGidmNOhYrj134`  
**Client Secret:** `r6qSgYecDv-54bJ_zsB_W0OPSOsHQHeDVVfLezVtZTkB4oAFJbdqhm0a3L_1RMdB`

**用途：**
- 在后端管理 Auth0 本身
- 例如：创建用户、更新用户、管理角色
- **通常不需要！**（除非你要在后端批量管理 Auth0 用户）

**配置位置：**
```env
# 后端 service/.env（可选，只有需要管理 Auth0 时才配置）
AUTH0_MANAGEMENT_API=https://dev-1cn6r8b7szo6fs0y.us.auth0.com/api/v2/
AUTH0_MANAGEMENT_CLIENT_ID=tZDZNUE3dHZrm6WrtNQGidmNOhYrj134
AUTH0_MANAGEMENT_CLIENT_SECRET=r6qSgYecDv-54bJ_zsB_W0OPSOsHQHeDVVfLezVtZTkB4oAFJbdqhm0a3L_1RMdB
```

---

## 🎯 你的项目应该怎么配置？

### 前端 `.env`（已配置 ✅）

```env
# 使用单页面应用的配置
VITE_AUTH0_DOMAIN=dev-1cn6r8b7szo6fs0y.us.auth0.com
VITE_AUTH0_CLIENT_ID=tZDZNUE3dHZrm6WrtNQGidmNOhYrj134
VITE_AUTH0_AUDIENCE=http://supercocmos.com
VITE_AUTH0_REDIRECT_URI=http://localhost:1003
```

### 后端 `service/.env`（需要更新）

```env
# 基础配置
AUTH0_DOMAIN=dev-1cn6r8b7szo6fs0y.us.auth0.com
AUTH0_AUDIENCE=http://supercocmos.com

# 机器对机器应用（用于验证 token）
AUTH0_M2M_CLIENT_ID=mekzeXfbMWlK4HoHi18MyUaR0G2wSOlL
AUTH0_M2M_CLIENT_SECRET=u4srke-Eq-zGLTgavHcslyl_ae2GWj06kGxg9N6slaDDQKfmY2-g5fZkRW-N3XlE

# 单页面应用 Client ID（用于识别前端）
AUTH0_SPA_CLIENT_ID=tZDZNUE3dHZrm6WrtNQGidmNOhYrj134
```

---

## 📊 完整流程图

```
用户在浏览器中
    ↓
点击"立即开始"
    ↓
前端使用 SPA Client ID (tZDZ...)
    ↓
跳转到 Auth0 登录
    ↓
Auth0 验证用户身份
    ↓
返回 Access Token（包含 audience: http://supercocmos.com）
    ↓
前端调用后端 API（携带 token）
    ↓
后端使用 M2M Client ID + Secret 验证 token
    ↓
验证通过，返回数据
```

---

## 🔑 关键区别

| 特性 | SPA（前端） | M2M（后端） | Management API |
|------|-----------|------------|----------------|
| **Client ID** | `tZDZ...` | `mekz...` | `tZDZ...` |
| **Client Secret** | ❌ 无 | ✅ 有 | ✅ 有 |
| **使用位置** | 浏览器 | 服务器 | 服务器 |
| **用途** | 用户登录 | 验证 token | 管理 Auth0 |
| **Audience** | `http://supercocmos.com` | `http://supercocmos.com` | `https://.../api/v2/` |

---

## ⚠️ 重要提示

### ❌ 错误配置（不要这样）

```env
# ❌ 前端不要使用 M2M 的 Client ID 和 Secret
VITE_AUTH0_CLIENT_ID=mekzeXfbMWlK4HoHi18MyUaR0G2wSOlL  # 错误！
VITE_AUTH0_CLIENT_SECRET=u4srke...  # 前端不需要 secret！
```

### ✅ 正确配置

**前端（`.env`）：**
```env
# 使用 SPA Client ID（没有 secret）
VITE_AUTH0_CLIENT_ID=tZDZNUE3dHZrm6WrtNQGidmNOhYrj134  ✅
# 没有 CLIENT_SECRET（前端不需要）
```

**后端（`service/.env`）：**
```env
# 使用 M2M Client ID + Secret（用于验证）
AUTH0_M2M_CLIENT_ID=mekzeXfbMWlK4HoHi18MyUaR0G2wSOlL  ✅
AUTH0_M2M_CLIENT_SECRET=u4srke...  ✅
```

---

## 🧪 验证配置

### 前端测试

```javascript
// 在浏览器控制台运行
console.log('前端配置:')
console.log('Domain:', import.meta.env.VITE_AUTH0_DOMAIN)
console.log('Client ID:', import.meta.env.VITE_AUTH0_CLIENT_ID)
console.log('Audience:', import.meta.env.VITE_AUTH0_AUDIENCE)
// 应该看到 SPA 的 Client ID: tZDZ...
```

### 后端测试

```bash
# 在后端目录运行
cd service
node -e "require('dotenv').config(); console.log('M2M Client ID:', process.env.AUTH0_M2M_CLIENT_ID)"
# 应该看到 M2M 的 Client ID: mekz...
```

---

## 💡 总结

**你需要两个应用：**

1. **单页面应用（SPA）** - `tZDZNUE3dHZrm6WrtNQGidmNOhYrj134`
   - ✅ 前端使用
   - ✅ 用户登录
   - ✅ 没有 secret

2. **机器对机器（M2M）** - `mekzeXfbMWlK4HoHi18MyUaR0G2wSOlL`
   - ✅ 后端使用
   - ✅ 验证 token
   - ✅ 有 secret

**Auth0 Management API 通常不需要**（除非你要在后端批量管理用户）

---

**配置完成后，用户同步功能就能正常工作了！** 🎉

