# 登录功能使用指南

## 功能概述

本项目已成功集成了用户登录/注册功能，界面设计仿照 Grok AI 的登录页面，采用现代化的暗色主题设计。

## 主要特性

### 1. 登录页面设计
- **现代化暗色主题**：采用渐变背景和毛玻璃效果
- **动画效果**：包含平滑的页面过渡和浮动装饰元素
- **响应式设计**：完美支持桌面端和移动端
- **双模式切换**：支持登录/注册模式无缝切换

### 2. 功能特点
- 邮箱格式验证
- 密码强度检查（最少6位）
- 实时表单验证
- 友好的错误提示
- 国际化支持（中文/英文）

## 文件结构

```
项目根目录
├── src/
│   ├── views/
│   │   └── auth/
│   │       └── Login.vue          # 登录页面组件
│   ├── store/
│   │   └── modules/
│   │       └── auth.ts            # 认证状态管理
│   ├── api/
│   │   └── index.ts               # API 接口（新增登录/注册接口）
│   ├── router/
│   │   └── index.ts               # 路由配置（新增登录路由）
│   └── locales/
│       ├── zh-CN.ts               # 中文语言包（新增认证文本）
│       └── en-US.ts               # 英文语言包（新增认证文本）
└── service/
    ├── src/
    │   └── index.ts               # 后端 API（新增认证接口）
    └── users.json                 # 用户数据存储文件（自动生成）
```

## 使用方法

### 1. 访问登录页面

有两种方式访问登录页面：

**方式一：通过主页**
1. 访问项目主页 `src/views/home/index.html`
2. 点击 "Log in" 按钮
3. 自动跳转到登录页面

**方式二：直接访问**
- 在浏览器中访问 `http://localhost:1002/#/login`

### 2. 注册新账户

1. 在登录页面点击 "注册" 按钮切换到注册模式
2. 输入邮箱地址（格式：example@domain.com）
3. 输入密码（至少6位）
4. 确认密码
5. 点击 "注册" 按钮
6. 注册成功后会自动切换到登录模式

### 3. 登录账户

邮箱发送方式：
import com.resend.*;

public class Main {
    public static void main(String[] args) {
        Resend resend = new Resend("私有key");

        SendEmailRequest sendEmailRequest = SendEmailRequest.builder()
                .from("onboarding@resend.dev")
                .to("对方邮箱")
                .subject("邮件内容")
                .html("<p>Congrats on sending your <strong>first email</strong>!</p>")
                .build();

        SendEmailResponse data = resend.emails().send(sendEmailRequest);
    }
}

1. 在登录页面输入已注册的邮箱
2. 输入密码
3. 点击 "登录" 按钮
4. 登录成功后自动跳转到聊天页面

## 数据存储

### 当前实现（临时方案）

用户数据暂时保存在服务器端的 JSON 文件中：

- **文件位置**: `service/users.json`
- **数据格式**:
```json
[
  {
    "id": "user_1234567890_abc123",
    "email": "user@example.com",
    "password": "123456",
    "createdAt": "2025-10-03T12:00:00.000Z",
    "updatedAt": "2025-10-03T12:00:00.000Z"
  }
]
```

**注意**: 当前密码是明文存储，仅用于开发测试。

### 后续改进计划

1. **数据库集成**
   - 推荐使用 MongoDB、PostgreSQL 或 MySQL
   - 将 `users.json` 迁移到数据库

2. **密码加密**
   - 使用 bcrypt 对密码进行哈希加密
   - 示例代码:
   ```typescript
   import bcrypt from 'bcrypt'
   const hashedPassword = await bcrypt.hash(password, 10)
   ```

3. **JWT Token**
   - 使用 JWT 替代简单的 Base64 token
   - 添加 token 过期时间
   - 实现 refresh token 机制

4. **会话管理**
   - 实现持久化登录
   - 添加"记住我"功能
   - Token 自动刷新

## API 接口文档

### 注册接口

**端点**: `POST /auth/register` 或 `POST /api/auth/register`

**请求体**:
```json
{
  "email": "user@example.com",
  "password": "123456"
}
```

**成功响应**:
```json
{
  "status": "Success",
  "message": "注册成功",
  "data": {
    "user": {
      "id": "user_1234567890_abc123",
      "email": "user@example.com",
      "createdAt": "2025-10-03T12:00:00.000Z"
    }
  }
}
```

**错误响应**:
```json
{
  "status": "Fail",
  "message": "该邮箱已被注册",
  "data": null
}
```

### 登录接口

**端点**: `POST /auth/login` 或 `POST /api/auth/login`

**请求体**:
```json
{
  "email": "user@example.com",
  "password": "123456"
}
```

**成功响应**:
```json
{
  "status": "Success",
  "message": "登录成功",
  "data": {
    "user": {
      "id": "user_1234567890_abc123",
      "email": "user@example.com",
      "createdAt": "2025-10-03T12:00:00.000Z"
    },
    "token": "dXNlcl8xMjM0NTY3ODkwX2FiYzEyMy0xNjk2MzIwMDAwMDAw"
  }
}
```

**错误响应**:
```json
{
  "status": "Fail",
  "message": "邮箱或密码错误",
  "data": null
}
```

## 状态管理

使用 Pinia 管理认证状态：

```typescript
import { useAuthStore } from '@/store'

const authStore = useAuthStore()

// 检查登录状态
if (authStore.isLoggedIn) {
  console.log('用户已登录')
}

// 获取用户邮箱
console.log(authStore.getUserEmail)

// 退出登录
authStore.logout()
```

## 开发注意事项

1. **密码安全**
   - 当前密码是明文存储，不要在生产环境使用
   - 后续必须添加密码加密功能

2. **Token 管理**
   - 当前 token 是简单的 Base64 编码
   - 建议使用 JWT 并添加过期时间

3. **表单验证**
   - 前端已实现基本验证
   - 后端也有相应验证，防止恶意请求

4. **国际化**
   - 所有用户可见文本都已添加到语言包
   - 支持中文和英文切换

## 路由配置

登录页面路由：

```typescript
{
  path: '/login',
  name: 'Login',
  component: () => import('@/views/auth/Login.vue'),
}
```

访问方式：
- Hash 模式: `http://localhost:1002/#/login`
- 代码跳转: `router.push('/login')`

## 样式定制

登录页面使用了以下设计元素：

- **渐变背景**: 深色渐变 (#0a0a0a → #1a1a1a)
- **浮动装饰球**: 3个渐变色装饰球体，带有缓动动画
- **毛玻璃卡片**: 半透明背景 + 背景模糊效果
- **渐变按钮**: 紫色渐变 (#6366f1 → #8b5cf6)
- **动画效果**: 
  - 卡片滑入动画
  - 装饰球浮动动画
  - 按钮悬停效果

如需自定义样式，请编辑 `src/views/auth/Login.vue` 中的 `<style>` 部分。

## 测试账户

可以使用以下流程测试登录功能：

1. 启动项目: `pnpm dev`
2. 访问登录页面: `http://localhost:1002/#/login`
3. 注册一个新账户
4. 退出登录
5. 使用注册的账户登录

## 常见问题

### Q: 用户数据存储在哪里？
A: 暂时存储在 `service/users.json` 文件中，后续会迁移到数据库。

### Q: 密码是否加密？
A: 当前是明文存储，仅用于开发测试。生产环境必须使用密码哈希加密。

### Q: 如何添加更多语言支持？
A: 在 `src/locales/` 目录下添加新的语言文件，并在 `index.ts` 中注册。

### Q: 登录后如何跳转到其他页面？
A: 在 `Login.vue` 的登录成功回调中修改 `router.push()` 的目标路径。

## 下一步计划

- [ ] 集成数据库（MongoDB/PostgreSQL/MySQL）
- [ ] 实现密码加密（bcrypt）
- [ ] 使用 JWT token
- [ ] 添加"忘记密码"功能
- [ ] 实现邮箱验证
- [ ] 添加社交媒体登录（Google、GitHub 等）
- [ ] 实现用户个人资料管理
- [ ] 添加头像上传功能

## 技术栈

- **前端**: Vue 3 + TypeScript + Naive UI + Pinia
- **后端**: Express + TypeScript
- **样式**: Less + Tailwind CSS（部分）
- **国际化**: Vue I18n
- **路由**: Vue Router

---

如有任何问题或建议，请联系开发团队。

