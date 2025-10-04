# 邮箱注册流程使用指南

## 📋 功能概述

本项目已成功实现了完整的邮箱注册流程，采用**组件化架构**，所有登录/注册操作都在**同一个页面**完成，有利于 SEO 和用户体验。

### 注册流程三步骤
1. **邮箱输入** - 用户输入邮箱地址
2. **验证码验证** - 输入6位数字验证码（自动验证）
3. **信息填写** - 填写昵称和密码

目前使用**前端模拟**方式测试流程，验证码直接在浏览器控制台输出，方便快速测试完整流程。

---

## 🏗️ 项目架构

### 组件化设计

```
src/views/
├── home/
│   └── Home.vue                    # 首页（从 index.html 转换）
└── auth/
    ├── Login.vue                   # 登录页面主容器（视图切换）
    └── components/
        └── EmailSignupForm.vue     # 邮箱注册三步骤组件
```

### 设计优势

✅ **SEO 友好**：所有登录/注册都在同一个路由 `/login` 下  
✅ **组件化**：每种登录方式独立组件，易于维护  
✅ **视图切换**：通过 `v-if` 切换，无需路由跳转  
✅ **用户体验**：页面不刷新，切换流畅  

---

## 🚀 完整流程

### 用户操作流程

```
Home 首页 (/)
  ↓ 点击 "Log in" 按钮
Login 登录页面 (/login) - 显示 4 种登录方式
  ├─ 使用账户密码登录 (X)
  ├─ 使用邮箱登录 ← 【点击这个】
  ├─ 使用 Apple 登录
  └─ 使用 Google 登录
  ↓ 点击 "使用邮箱注册"
Login 页面切换到邮箱注册组件
  ↓ 步骤1：输入邮箱 → 点击 "继续"
  ↓ 【控制台输出验证码】
  ↓ 步骤2：输入验证码（自动验证）
  ↓ 步骤3：填写昵称和密码 → 点击 "完成注册"
Chat 聊天页面 (/chat) ✅
  ↓ 点击侧边栏的 "退出登录"
Home 首页 (/) ✅ 返回首页
```

---

## 🎯 测试步骤

### 步骤 1：启动项目

```bash
# 安装依赖（如果还没安装）
pnpm install

# 启动开发服务器
pnpm dev
```

项目会在 `http://localhost:1002` 启动

### 步骤 2：访问 Home 页面

1. 打开浏览器访问 `http://localhost:1002`
2. 看到 Home 页面模板
3. 点击页面上的 **"Login"** 按钮

### 步骤 3：进入登录页面

在登录页面（`/login`），你会看到 4 种登录/注册方式：
- ✅ **使用账户密码登录/注册** (X 登录) - 未实现
- ✅ **使用邮箱登录/注册** ← **点击这个！**
- ✅ 使用 Apple 登录/注册 - 未实现
- ✅ 使用 Google 登录/注册 - 未实现

**重要**：页面会在 Login.vue 内部切换到邮箱注册表单组件（`EmailSignupForm.vue`），**URL 不会改变**，这样有利于 SEO！

### 步骤 4：邮箱输入（步骤 1）

1. 打开浏览器的**开发者工具**（F12）
2. 切换到 **Console（控制台）** 标签
3. 在页面输入框中输入任意邮箱，例如：`test@example.com`
4. 点击 **"继续"** 按钮
5. 等待 1 秒（模拟网络延迟）

**控制台输出示例：**
```
========================================
📧 验证码发送模拟
========================================
收件人邮箱: test@example.com
验证码: 123456
有效期: 5分钟
========================================
```

### 步骤 5：验证码验证（步骤 2）

1. 从控制台复制显示的6位验证码（例如：`123456`）
2. 在页面的验证码输入框中输入这个验证码
3. 输入完整 6 位后会**自动验证**（无需点击按钮）
4. 验证成功后自动进入下一步

**控制台输出示例：**
```
✅ 验证码验证成功!
```

**如果输入错误：**
```
❌ 验证码错误! 输入: 111111, 正确: 123456
```

### 步骤 6：信息填写（步骤 3）

1. **昵称**：输入昵称（至少2位，只能包含中文、字母和数字）
   - ✅ 正确示例：`张三`、`User123`、`测试用户`
   - ❌ 错误示例：`a`（太短）、`user@123`（包含特殊字符）

2. **密码**：输入密码（至少8位，必须包含大小写字母、数字和特殊字符）
   - ✅ 正确示例：`Test123!@#`、`MyPassword1!`
   - ❌ 错误示例：`test123`（缺少大写和特殊字符）、`Test123`（缺少特殊字符）

3. 点击 **"完成注册"** 按钮

**控制台输出示例：**
```
========================================
🎉 注册成功!
========================================
邮箱: test@example.com
昵称: 测试用户
密码: ********
========================================
```

4. 注册成功后自动跳转到 **Chat 聊天页面** ✅

---

## 📂 文件结构

```
src/
├── views/
│   ├── home/
│   │   ├── Home.vue               # 首页组件（从 index.html 转换）
│   │   ├── img/                   # 首页图片资源
│   │   └── styles.css             # 原始样式（已集成到 Home.vue）
│   └── auth/
│       ├── Login.vue              # 登录页面主容器（视图切换）
│       ├── components/
│       │   └── EmailSignupForm.vue # 邮箱注册三步骤组件
│       └── EmailLoginTemplate.vue # 参考模板
├── router/
│   └── index.ts                   # 路由配置（/ → Home, /login → Login）
├── api/
│   └── index.ts                   # API 接口（已预留后端接口）
├── store/
│   └── modules/
│       ├── auth/                  # 认证状态管理
│       └── user/                  # 用户信息管理
└── locales/
    ├── zh-CN.ts                   # 中文翻译
    └── en-US.ts                   # 英文翻译
```

---

## 🎨 功能特性

### 1. 完整的表单验证

#### 邮箱验证
- ✅ 必填验证
- ✅ 格式验证（标准邮箱格式）

#### 密码验证
- ✅ 必填验证
- ✅ 最少 8 位
- ✅ 至少 1 个大写字母
- ✅ 至少 1 个小写字母
- ✅ 至少 1 个数字
- ✅ 至少 1 个特殊字符（@$!%*?&）

#### 昵称验证
- ✅ 必填验证
- ✅ 最少 2 位
- ✅ 只能包含中文、字母和数字
- ✅ 不能包含特殊字符（防止XSS攻击）

### 2. 用户体验优化

- ✅ 实时错误提示
- ✅ Loading 状态提示
- ✅ 密码显示/隐藏切换
- ✅ 验证码自动验证（输入6位后）
- ✅ 自动聚焦输入框
- ✅ 响应式设计（支持移动端）

### 3. 国际化支持

- ✅ 中文界面
- ✅ 英文界面
- ✅ 所有文本都已国际化

---

## 🔧 前端模拟实现

目前使用前端模拟验证码，方便测试流程。关键实现：

### 验证码生成
```typescript
// 生成6位随机数字
generatedCode = Math.floor(100000 + Math.random() * 900000).toString()

// 在控制台输出
console.log(`验证码: ${generatedCode}`)
```

### 验证码验证
```typescript
// 自动验证（输入6位时）
if (value === generatedCode) {
  console.log('✅ 验证码验证成功!')
  // 进入下一步
} else {
  console.log(`❌ 验证码错误! 输入: ${value}, 正确: ${generatedCode}`)
}
```

### 模拟注册
```typescript
// 创建模拟用户数据
const mockUser = {
  id: `user_${Date.now()}`,
  email: email.value,
  nickname: nickname.value,
  createdAt: new Date().toISOString(),
}

// 生成模拟 token
const mockToken = btoa(`${mockUser.id}-${Date.now()}`)

// 保存到 store
authStore.setUserInfo(mockUser)
authStore.setToken(mockToken)

// 跳转到聊天页面
router.push('/chat')
```

---

## 🔄 后端集成准备

已经预留了完整的 API 接口，未来集成 Resend + Redis 时只需：

### 1. 安装依赖
```bash
cd service
pnpm add resend redis
```

### 2. 修改 EmailSignup.vue

将前端模拟代码替换为真实的 API 调用：

```typescript
// 步骤1：发送验证码
const response = await fetchSendVerificationCode({ email: email.value })

// 步骤2：验证验证码
const response = await fetchVerifyCode({ email: email.value, code: value })

// 步骤3：完成注册
const response = await fetchCompleteSignup({
  email: email.value,
  code: verificationCode.value,
  nickname: nickname.value,
  password: password.value,
})
```

### 3. 后端实现

参考文档：`LOGIN_GUIDE.md` 第 71-87 行

使用 Resend SDK 发送邮件：
```typescript
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

await resend.emails.send({
  from: 'onboarding@resend.dev',
  to: email,
  subject: 'Your Verification Code',
  html: `<strong>验证码: ${code}</strong>`,
})
```

---

## 🐛 常见问题

### Q1: 看不到验证码？
**A:** 请打开浏览器开发者工具（F12），切换到 Console（控制台）标签，验证码会在那里输出。

### Q2: 验证码一直提示错误？
**A:** 确保从控制台复制的验证码是最新的6位数字，每次点击"继续"都会生成新的验证码。

### Q3: 密码验证总是失败？
**A:** 密码必须满足：
- 至少 8 位
- 包含大写字母（A-Z）
- 包含小写字母（a-z）
- 包含数字（0-9）
- 包含特殊字符（@$!%*?&）

例如：`Test123!` 是有效密码

### Q4: 昵称验证失败？
**A:** 昵称必须：
- 至少 2 位
- 只能包含中文、英文字母、数字
- 不能包含特殊符号

例如：`张三`、`User123` 是有效昵称

---

## 📝 开发注意事项

### 1. 保留的登录方式

Login.vue 保留了 4 种登录方式：
- X 登录（账户密码）
- **邮箱登录**（跳转到 EmailSignup.vue）
- Apple 登录
- Google 登录

**不要删除其他登录方式！**

### 2. 路由配置

```typescript
// 首页
/ → Home.vue

// 登录页面（包含所有登录/注册方式）
/login → Login.vue
  ├─ 方法选择视图 (currentView='methods')
  └─ 邮箱注册视图 (currentView='email-signup') → EmailSignupForm.vue 组件

// 聊天页面
/chat → ChatLayout
```

**关键设计**：邮箱注册是通过组件切换实现的，URL 始终是 `/login`，有利于 SEO！

### 3. 控制台输出格式

为了方便调试，所有关键步骤都会在控制台输出：
- 📧 发送验证码时
- ✅ 验证成功时
- ❌ 验证失败时
- 🎉 注册成功时

---

## 🎯 下一步计划

- [ ] 集成 Resend 邮件服务
- [ ] 添加 Redis 缓存验证码
- [ ] 实现密码加密（bcrypt）
- [ ] 添加用户数据库存储
- [ ] 实现 JWT token 认证
- [ ] 添加"重新发送验证码"功能
- [ ] 添加邮箱验证码倒计时
- [ ] 实现密码登录流程

---

## ✅ 测试清单

使用此清单测试完整流程：

- [ ] 能成功访问 Home 页面
- [ ] 点击 Login 能进入登录页面
- [ ] 登录页面显示 4 种登录方式
- [ ] 点击"使用邮箱注册"跳转到邮箱注册页面
- [ ] 步骤1：输入邮箱，控制台显示验证码
- [ ] 步骤2：输入验证码，自动验证成功
- [ ] 步骤3：填写昵称和密码通过验证
- [ ] 点击"完成注册"后跳转到聊天页面
- [ ] 用户信息已保存到 store
- [ ] 退出登录跳转到 home 页面

---

## 📞 技术支持

如有问题，请检查：
1. 浏览器控制台是否有错误信息
2. 网络请求是否正常
3. 验证码是否从控制台正确复制

---

**享受你的邮箱注册流程！** 🎉

