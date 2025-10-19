# SuperCosmos 项目记忆

## 项目概述
SuperCosmos 是一个基于 AI 的智能聊天和题目处理系统，集成了多供应商模型管理、用户配置系统、工作流引擎等功能。

## 技术栈
- **前端**: Vue 3 + TypeScript + Vite + Naive UI
- **后端**: Node.js + Express
- **数据库**: Supabase (PostgreSQL)
- **缓存**: Redis
- **认证**: Clerk
- **包管理**: pnpm

## 项目结构
```
SuperCosmos/
├── src/                    # 前端源码
│   ├── components/        # Vue 组件
│   ├── store/            # Pinia 状态管理
│   ├── api/              # API 服务层
│   ├── views/            # 页面视图
│   ├── hooks/            # Vue Composables
│   ├── typings/          # TypeScript 类型定义
│   └── utils/            # 工具函数
├── service/               # 后端服务
│   └── src/
│       ├── api/          # API 控制器
│       ├── db/           # 数据库服务
│       ├── cache/        # Redis 缓存
│       └── middleware/   # 中间件
└── .claude/              # Claude Code 配置

```

## 核心功能模块

### 1. 用户配置系统 (Config System)
- **用户设置**: 头像、昵称、主题、语言
- **聊天配置**: 默认模型、参数（temperature, topP, maxTokens）、系统提示词
- **工作流配置**: 各节点的模型选择和参数配置
- **路径**: `src/store/modules/config/`, `service/src/db/configService.ts`

### 2. 模型管理系统 (Model Management)
- 支持多供应商（Provider）和多模型
- 缓存机制（localStorage + 30分钟过期）
- 动态加载和刷新
- **路径**: `src/store/modules/model/`, `service/src/db/providerService.ts`

### 3. 工作流引擎 (Workflow Engine)
- 题目分类 (classify)
- 题目解析 (parse_questions)
- 题目生成 (generate_questions)
- 结果审核 (revise)
- **路径**: `service/src/quiz/workflow.ts`

### 4. 认证系统 (Authentication)
- Clerk OAuth 集成
- JWT token 管理
- 用户角色系统（免费版、付费版、管理员）
- **路径**: `service/src/middleware/clerkAuth.ts`, `service/src/db/supabaseUserService.ts`

## 代码规范

### TypeScript
- 严格类型检查：`pnpm type-check`
- 使用命名空间定义类型（如 `Config.*`, `Model.*`）
- 避免使用 `any`，未使用的参数/变量加 `_` 前缀

### ESLint
- 运行检查：`pnpm lint`
- 自动修复：`pnpm lint --fix`
- 不允许 `console.log`（仅允许 `console.warn`, `console.error`）
- 导入顺序：类型导入 → 外部库 → 内部模块
- 函数声明：顶层函数使用 `function` 关键字而非箭头函数

### Git 规范
- 主分支：`main`
- 开发分支：`dev`
- 提交格式：`type: description` (如 `fix:`, `feat:`, `refactor:`)
- 提交前必须通过 `type-check` 和 `lint`

## 重要注意事项

### 缓存系统
- **供应商列表缓存**: localStorage, 30分钟过期
- **Redis 缓存**: 用于用户配置、会话等
- 缓存键定义在 `service/src/cache/cacheKeys.ts`

### 状态管理
- **ConfigStore**: 用户配置（不持久化，从后端获取）
- **ModelStore**: 模型列表（本地缓存 + 后端同步）
- **AuthStore**: 认证信息（Clerk token）

### API 设计
- 统一响应格式：`{ status: 'Success'|'Fail', message?: string, data?: T }`
- 认证：Bearer token (Clerk 或传统 token)
- 错误处理：统一在拦截器中处理

### 数据库表
- `users`: 用户基本信息
- `user_roles`: 用户角色
- `user_configs`: 用户配置（JSON 格式）
- `providers`: AI 供应商
- `models`: AI 模型
- `provider_api_keys`: API 密钥（加密存储）

## 常用命令
```bash
# 开发
pnpm dev              # 启动前端开发服务器
pnpm run dev:service  # 启动后端服务

# 代码检查
pnpm lint             # ESLint 检查
pnpm type-check       # TypeScript 类型检查

# Git
git checkout dev      # 切换到开发分支
git checkout main     # 切换到主分支
```

## 最近的重要更改
- ✅ 修复了所有 lint 和 TypeScript 类型错误
- ✅ 实现了用户配置系统 V2
- ✅ 集成了 Clerk 认证和 Supabase
- ✅ 添加了 Redis 缓存层
- ✅ 重新设计了 Settings 页面

## 待办事项
- [ ] 完善工作流节点的学科特定配置
- [ ] 优化模型切换的用户体验
- [ ] 添加配置导入导出功能
- [ ] 实现配置预设功能

---
*最后更新: 2025-10-18*
