# SSE Cookie 认证测试指南

## 实现概述

已成功实现方案 A：使用 Cookie 传递 token，提升 SSE 连接的安全性。

### 关键改动

**后端改动**：
1. ✅ 安装并配置 `cookie-parser` 中间件
2. ✅ 修改 `sseAuth` 中间件：优先从 Cookie 读取 token，降级支持 URL 参数
3. ✅ 新增 `POST /api/auth/set-token-cookie` API，设置 HttpOnly Cookie
4. ✅ CORS 已配置 `Access-Control-Allow-Credentials: true`

**前端改动**：
1. ✅ SSE 连接已配置 `withCredentials: true`（自动发送 Cookie）
2. ✅ 登录后自动调用后端 API 设置 token 到 Cookie
3. ✅ 新增 `setTokenCookie()` 服务函数

---

## 安全优势

### 方案 A（当前实现）
```
✅ Token 存储在 HttpOnly Cookie 中
✅ 浏览器不会在 URL 中暴露 token
✅ 防止 XSS 攻击（JavaScript 无法访问 HttpOnly Cookie）
✅ 支持跨域带 Cookie（CORS 配置）
```

### 对比旧方案（URL 参数）
```
❌ Token 暴露在 URL 中（浏览器历史、日志、代理）
❌ 容易被 XSS 攻击窃取
❌ 不符合安全最佳实践
```

---

## 测试步骤

### 1. 启动服务

**后端**：
```bash
cd service
pnpm dev
```

**前端**：
```bash
pnpm dev
```

### 2. 登录测试

1. 打开浏览器，访问 `http://127.0.0.1:1002`
2. 点击登录，完成 Auth0 认证
3. 登录成功后，检查以下内容：

**Chrome DevTools → Console**：
```
✅ [AppInit] Token 已通过后端设置到 HttpOnly Cookie
✅ [SSE] 📡 开始建立连接...
✅ [SSE] ✅ 连接确认: {...}
```

**Chrome DevTools → Application → Cookies**：
- 应该看到 `access_token` Cookie
- 属性：
  - `HttpOnly`: ✅
  - `Secure`: 生产环境为 ✅
  - `SameSite`: Lax
  - `Path`: /
  - `Max-Age`: 86400（24小时）

### 3. SSE 连接测试

**Chrome DevTools → Network → EventSource**：
1. 找到 `sync` 请求
2. 查看 **Request Headers**：
   - 应该有 `Cookie: access_token=xxx`
   - **不应该有** URL 参数 `?token=xxx`

**Chrome DevTools → Console**：
```
✅ [SSE Auth] ✅ 从 Cookie 中提取到 token
✅ [SSE] ✅ 连接确认: {...}
```

### 4. 页面刷新测试

**操作**：在聊天页面按 F5 或 Ctrl+R 刷新

**预期行为**：
1. **旧连接断开**（正常）：
   - 后端日志：`[SSE] 🔌 用户 xxx 断开连接`（ECONNRESET 错误）
   - 这是正常的，因为浏览器会关闭旧的 EventSource

2. **新连接建立**（重要）：
   - 前端日志：
     ```
     [AppInit] 开始应用初始化...
     [AppInit] Token 已通过后端设置到 HttpOnly Cookie
     [SSE] 📡 开始建立连接...
     [SSE] ✅ 连接确认
     ```
   - 后端日志：
     ```
     [SSE Auth] ✅ 从 Cookie 中提取到 token
     [SSE] ✅ 用户 xxx 连接成功
     ```

**如果刷新后没有重连**：
- 检查前端控制台是否有 `[AppInit]` 日志
- 检查 DevTools → Application → Cookies，`access_token` 是否还在
- 尝试退出登录后重新登录

### 5. 跨设备同步测试

1. 在设备 A 上登录，创建一个新会话
2. 在设备 B 上登录同一账号
3. 设备 B 应该实时收到 SSE 事件，自动同步新会话

**预期日志**：
```
[SSE] 📝 新会话创建: {...}
[Chat Store] ✅ SSE 事件：新会话已添加
```

### 5. 降级测试（可选）

如果 Cookie 设置失败，SSE 应该降级到 URL 参数认证：

**Chrome DevTools → Console**：
```
⚠️ [SSE Auth] ⚠️ 从 URL 参数中提取到 token（不安全，建议使用 Cookie）
```

---

## 常见问题

### Q1: Cookie 没有设置成功

**检查项**：
1. 后端是否安装了 `cookie-parser`？
   ```bash
   cd service
   grep cookie-parser package.json
   ```
2. CORS 配置是否正确？
   ```typescript
   // service/src/index.ts
   res.header('Access-Control-Allow-Credentials', 'true')
   res.header('Access-Control-Allow-Origin', origin) // 必须是具体来源，不能是 *
   ```
3. 前端请求是否带 `withCredentials`？
   ```typescript
   // src/services/sseService.ts
   new EventSource(url, { withCredentials: true })
   ```

### Q2: SSE 连接失败（401 Unauthorized）

**检查项**：
1. 查看后端日志，确认 token 是否被正确提取：
   ```
   [SSE Auth] ✅ 从 Cookie 中提取到 token
   [SSE Auth] ✅ 用户认证成功: auth0|xxx
   ```
2. 如果显示"Cookie 和 URL 参数中都没有 token"，说明 Cookie 没有发送：
   - 检查 CORS 配置
   - 检查 Cookie 的 `SameSite` 属性
   - 检查前端是否调用了 `setTokenCookie()`

### Q3: Cookie 在跨域环境下不生效

**原因**：
- Chrome 80+ 默认要求 `SameSite=None; Secure` 才能跨站发送 Cookie
- 本地开发环境（HTTP）不支持 `Secure` 属性

**解决方案**：
1. 生产环境使用 HTTPS
2. 本地开发环境：
   - 前后端使用相同的域名（如都用 `127.0.0.1`）
   - 或者使用 Chrome 启动参数：`--disable-web-security`（仅用于测试）

---

## 性能验证

### 预期性能指标

| 指标 | 旧方案（URL参数） | 新方案（Cookie） |
|-----|----------------|----------------|
| **Token 暴露** | ❌ 暴露在 URL | ✅ 仅在 Cookie |
| **XSS 防护** | ❌ 无防护 | ✅ HttpOnly |
| **连接成功率** | 95% | 95% |
| **首次连接延迟** | ~100ms | ~100ms |
| **重连延迟** | 3-6-12s | 3-6-12s |

---

## 后续优化建议

1. **生产环境配置**：
   - 启用 HTTPS
   - 设置 `Secure: true`
   - 考虑使用 `SameSite=Strict`

2. **Token 刷新**：
   - Auth0 token 默认 24 小时过期
   - 考虑在 token 即将过期时自动刷新 Cookie

3. **监控和日志**：
   - 记录 SSE 连接成功率
   - 记录 Cookie 认证失败次数
   - 监控降级到 URL 参数的频率

---

## 文件清单

### 后端修改
- ✅ `service/src/index.ts`：添加 cookie-parser
- ✅ `service/src/middleware/sseAuth.ts`：优先从 Cookie 读取 token
- ✅ `service/src/api/authController.ts`：新增 setTokenCookie()
- ✅ `service/src/api/routes.ts`：新增路由和注释

### 前端修改
- ✅ `src/store/modules/appInit/index.ts`：调用后端 API 设置 Cookie
- ✅ `src/api/services/authService.ts`：新增 setTokenCookie()
- ✅ `src/services/sseService.ts`：已配置 withCredentials: true
- ✅ `src/services/sseReconnect.ts`：**新增 SSE 重连管理器（闭包模式）**
- ✅ `src/App.vue`：初始化 setupSSEReconnect(auth0Client)

---

**测试完成后，请在此文档中记录测试结果。**
