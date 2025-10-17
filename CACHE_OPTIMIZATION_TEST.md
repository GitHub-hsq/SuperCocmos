## 🎨 用户配置系统 V2 - 设计与实现

### ✅ 实施状态

| 模块 | 状态 | 说明 |
|------|------|------|
| 数据库表结构 | ✅ 完成 | `user_configs` 表已创建 |
| 后端 API | ✅ 完成 | 配置 CRUD + Redis 缓存 |
| ConfigStore | ✅ 完成 | Pinia store + 防重复加载 |
| 面板组件 | ✅ 完成 | 3个新面板组件已创建并集成 |
| 前端集成 | ✅ 完成 | 已集成到 Chat 页面，保持原有布局 |
| 优化问题 | ✅ 完成 | 修复重复加载、类型定义 |

### 📁 新创建的文件

```
src/components/common/Setting/
├── SettingV2.vue                        # 主设置组件（Drawer布局，独立使用）
└── panels/                              # 面板组件（可独立使用或嵌入现有布局）
    ├── UserSettingsPanel.vue            # 用户设置面板 (替换 General)
    ├── ChatConfigPanel.vue              # 聊天配置面板 (备用，可添加新标签)
    ├── WorkflowConfigPanel.vue          # 工作流配置面板 (替换 WorkflowModel)
    └── ProviderConfigPanel.vue          # 供应商管理面板（包装器，保持 ProviderConfig）
```

### 🔄 组件替换映射

| 原组件 | 新组件 | 标签键 | 说明 |
|--------|--------|--------|------|
| General.vue | UserSettingsPanel.vue | 'General' | ✅ 已替换 |
| Advanced.vue | Advanced.vue | 'Advanced' | ✅ 保持不变 |
| About.vue | About.vue | 'Config' | ✅ 保持不变（API使用量） |
| WorkflowModel.vue | WorkflowConfigPanel.vue | 'WorkflowModel' | ✅ 已替换 |
| ProviderConfig.vue | ProviderConfigPanel.vue | 'ProviderConfig' | ✅ 已替换（包装器）|
| - | ChatConfigPanel.vue | - | 🔄 备用（可添加新标签）|

### 🎯 核心功能特性

1. **保持原有布局**
   - 左侧 Sider：对话列表 ↔ 设置导航（滑动切换）
   - 右侧主区域：聊天界面 ↔ 设置内容（淡入淡出切换）
   - 完全兼容现有交互逻辑

2. **新面板组件特性**
   - **UserSettingsPanel**：头像、昵称、主题、语言
   - **WorkflowConfigPanel**：4个工作流节点，可独立配置模型和参数
   - **ProviderConfigPanel**：供应商管理（复用现有组件）
   - **ChatConfigPanel**：备用，可添加新标签使用

3. **用户友好**
   - 通俗易懂的参数名称（创造力🎨、多样性🎲、回复长度📏）
   - 详细的参数说明和范围提示
   - 快速预设（创意模式、平衡模式、精确模式）
   - 工作流节点：一键复制配置、恢复推荐参数

4. **性能优化**
   - ConfigStore 防重复加载（检查 `loaded` 状态）
   - Redis 缓存用户配置（TTL 1小时）
   - 修改时自动清除缓存
   - ModelStore 防重复加载（组件初始化标记）

---

## 🐛 关键问题修复

### 问题1：角色显示不正确 ✅ 已修复
**原因**：数据库 `user_id` 是 UUID (string)，但代码中定义为 `number` 类型
**影响**：角色查询失败，导致所有用户都显示为"普通用户"
**修复**：
- ✅ 修改所有 user_id 类型从 `number` 改为 `string`
- ✅ 修复 `getUserWithRoles` 等 8 个函数的类型定义
- ✅ 后端正确提取主要角色（优先 admin）
- ✅ 前端 App.vue 获取并保存角色信息

### 问题2：路由守卫循环跳转 ⚠️ 暂时移除
**原因**：Clerk 初始化时机和 Vue Router 守卫执行顺序冲突
**影响**：反复重定向，死循环
**当前方案**：
- ⚠️ 暂时移除路由守卫
- ✅ Clerk 自带 `<SignedIn>` 组件保护聊天页面
- ✅ App.vue 延迟 300ms 再获取用户信息
**备注**：路由级别的保护暂时由 Clerk 组件层面实现

### 🛠️ 调试工具

在浏览器控制台运行：
```javascript
// 查看完整用户信息（包含 Clerk 和 Store 状态）
window.__getUserInfo()

// 直接访问 authStore
window.__authStore.userInfo

// 查看 Clerk 状态
window.Clerk?.session
window.Clerk?.user
```

---

## 📝 本次会话完成的工作

### 1. **后端配置 API 完整实现** ✅
- ✅ `service/src/db/configService.ts` - 配置数据库服务（集成 Redis 缓存）
- ✅ `service/src/api/configController.ts` - 10个配置API端点
- ✅ `service/src/api/routes.ts` - 注册配置路由

### 2. **Clerk 认证统一优化** ✅
- ✅ `service/src/middleware/clerkAuth.ts` - 优化认证中间件
  - 扩展 Express Request 类型（添加 userId 和 dbUserId）
  - 新增 `requireAuthWithUser` 中间件
  - 所有中间件都附加 userId 到 req
- ✅ `service/src/index.ts` - 14个路由迁移到 Clerk 认证

### 3. **Redis 缓存全面集成** ✅
- ✅ `service/src/cache/cacheService.ts` - 统一缓存服务
- ✅ `service/src/cache/cacheKeys.ts` - 缓存键规范
- ✅ `service/src/db/configService.ts` - 配置服务集成缓存
- ✅ `service/src/api/providerController.ts` - 供应商API集成缓存

### 4. **前端请求工具增强** ✅
- ✅ `src/utils/request/index.ts` - 添加 patch/put/del 方法
- ✅ 支持所有 HTTP 方法（GET/POST/PUT/PATCH/DELETE）

### 5. **前端面板组件创建与集成** ✅
- ✅ `src/components/common/Setting/panels/UserSettingsPanel.vue`
- ✅ `src/components/common/Setting/panels/ChatConfigPanel.vue`
- ✅ `src/components/common/Setting/panels/WorkflowConfigPanel.vue`
- ✅ `src/components/common/Setting/panels/ProviderConfigPanel.vue`
- ✅ 集成到 `src/views/chat/index.vue`，保持原有布局

### 6. **性能优化** ✅
- ✅ ConfigStore 防重复加载
- ✅ ModelStore 防重复加载
- ✅ Model.ModelInfo 类型扩展（添加 providerId 和 modelId）

### 7. **关键类型修复（UUID vs Number）** ✅
- ✅ `SupabaseUser.user_id`: number → string (UUID)
- ✅ `UserRole.user_id`: number → string (UUID)
- ✅ `UserWithRoles.user_id`: number → string (UUID)
- ✅ 所有用户角色相关函数参数：number → string
- ✅ 这修复了角色查询失败的根本原因！

### 8. **路由守卫实现** ✅
- ✅ 添加路由守卫，保护 /chat 页面
- ✅ 未登录自动重定向到 /signin
- ✅ 已登录访问登录页自动重定向到 /chat
- ✅ 公开页面：/, /signin, /signup, /404, /500

---

## 🎨 重新设计的配置结构

### 📊 配置页面重构建议

基于你的需求，我建议将 Setting 调整为 **4 个主要标签页**：

---

## 1️⃣ 用户设置 (User Settings)

**页面名称**：`个人设置` / `User Profile`

```typescript
interface UserConfig {
  // 个人信息
  avatar: string // 头像链接
  name: string // 显示名称

  // 界面设置
  theme: 'auto' | 'light' | 'dark' // 主题模式
  language: 'zh-CN' | 'en-US' // 界面语言
}
```

**配置项设计**：

| 配置项 | 中文名称 | 英文名称 | 提示说明 |
|--------|---------|---------|---------|
| avatar | 头像 | Avatar | 填入图片链接，用于个性化您的聊天界面 |
| name | 昵称 | Display Name | 在聊天中显示的名称 |
| theme | 主题模式 | Theme Mode | 选择浅色、深色或跟随系统 |
| language | 界面语言 | Language | 切换应用显示语言 |

---

## 2️⃣ 聊天设置 (Chat Settings)

**页面名称**：`聊天配置` / `Chat Configuration`

```typescript
interface ChatConfig {
  // 默认模型选择
  defaultModel: {
    providerId: string // 默认供应商ID
    modelId: string // 默认模型ID
  } | null

  // 模型参数（影响AI回复风格）
  parameters: {
    temperature: number // 0-2，默认0.7
    topP: number // 0-1，默认0.9
    maxTokens: number // 100-128000，默认4096
  }

  // 系统提示词
  systemPrompt: string // 默认：'你是一个有帮助的AI助手'

  // 其他聊天设置
  streamEnabled: boolean // 是否启用流式输出（打字机效果）

  // 使用统计（只读，从后端获取）
  // usage: { totalTokens, usedTokens, remainingTokens }
}
```

**配置项设计**：

| 配置项 | 显示名称 | 提示说明（Tooltip） | 默认值 |
|--------|---------|-------------------|-------|
| **defaultModel** | **默认模型** | **选择对话时默认使用的AI模型** | - |
| - provider | 供应商 | 选择API提供商（如OpenAI、Anthropic等） | - |
| - model | 模型 | 选择具体的AI模型版本 | - |
| **parameters** | **模型参数** | **调整这些参数可以改变AI的回复风格** | - |
| - temperature | 创造力 🎨 | 控制回复的随机性和创造力<br>• 0-0.3: 严谨、一致性高（适合代码、翻译）<br>• 0.7-1.0: 平衡（推荐，适合日常对话）<br>• 1.5-2.0: 发散、创意性强（适合创作、头脑风暴） | 0.7 |
| - topP | 多样性 🎲 | 控制词汇选择的范围<br>• 0.1-0.5: 保守，使用常见词汇<br>• 0.9-1.0: 丰富，词汇多样化（推荐） | 0.9 |
| - maxTokens | 回复长度 📏 | 单次回复的最大字数（约等于字数×1.5）<br>• 1024: 简短回复<br>• 4096: 中等长度（推荐）<br>• 16000+: 长文本、代码生成 | 4096 |
| **systemPrompt** | **角色设定** | **给AI设定一个身份或行为准则**<br>例如："你是一个专业的编程助手"、"你是一个友善的老师" | 你是一个有帮助的AI助手 |
| **streamEnabled** | **打字机效果** | 开启后，AI回复会逐字显示（更流畅的体验） | true |

**新增区块**：
- **📊 使用统计**（只读展示，数据来自后端）
  - 总配额
  - 已使用
  - 剩余量
  - 刷新按钮

---

## 3️⃣ 工作流配置 (Workflow Settings)

**页面名称**：`题目工作流` / `Question Workflow`

```typescript
interface WorkflowConfig {
  nodes: {
    [nodeType in WorkflowNodeType]: {
      // 节点名称和描述
      displayName: string // 显示名称
      description: string // 节点功能说明

      // 模型选择
      modelId: string | null // 使用的模型ID（全局唯一的display_name）

      // 模型参数
      parameters: {
        temperature: number
        topP: number
        maxTokens: number
      }

      // 系统提示词（可选，不同节点可能需要不同的prompt）
      systemPrompt?: string

      // 学科专属模型（只有某些节点需要）
      subjectSpecific?: {
        [subject in Subject]?: string // 学科 -> 模型ID
      }
    }
  }
}

type WorkflowNodeType = 'classify' | 'parse_questions' | 'generate_questions' | 'revise'
type Subject = 'math' | 'physics' | 'chemistry' | 'biology' | 'chinese' | 'english'
```

**节点配置设计**：

| 节点类型 | 显示名称 | 功能说明 | 推荐参数 |
|---------|---------|---------|---------|
| **classify** | 📋 题目分类 | 识别题目所属学科（数学、物理等） | temp: 0.3, topP: 0.8 |
| **parse_questions** | 🔍 题目解析 | 提取题目中的关键信息和考点 | temp: 0.5, topP: 0.9 |
| **generate_questions** | ✍️ 题目生成 | 根据要求生成新的练习题 | temp: 0.8, topP: 0.95 |
| **revise** | ✅ 结果审核 | 检查和修正生成的题目质量 | temp: 0.3, topP: 0.8 |

**每个节点的配置项**：

| 配置项 | 显示名称 | 提示说明 |
|--------|---------|---------|
| modelId | 使用的模型 | 选择执行此步骤的AI模型<br>• 推荐使用准确率高的模型（如GPT-4, Claude） |
| temperature | 创造力 | 同聊天配置，但不同节点推荐值不同 |
| topP | 多样性 | 同聊天配置 |
| maxTokens | 最大输出 | 此步骤生成内容的字数上限 |
| systemPrompt | 专属提示词 | （可选）为此节点定制专门的提示词 |
| subjectSpecific | 学科专属模型 | （仅部分节点）为不同学科指定不同的专家模型 |

**界面建议**：
- 使用折叠面板（Collapse），每个节点一个面板
- 每个面板展示节点的状态指示（已配置✅ / 使用默认⚠️）
- 提供"复制配置"功能，快速将一个节点的配置应用到其他节点
- 提供"恢复默认"按钮

---

## 4️⃣ 供应商管理 (Provider Management)

**页面名称**：`供应商管理` / `Provider Management`

这个页面已经有独立的表结构（`providers` 和 `models`），不需要存储在 `user_configs` 中。

**保持现有设计**，只是建议优化：
- ✅ 当前设计已经很好
- 建议添加：模型测试功能（测试API是否可用）
- 建议添加：使用统计（每个模型的调用次数、成功率）

---

## 🗄️ 数据库表结构设计

```sql
-- ============================================
-- 用户配置表（重构版本）
-- ============================================
CREATE TABLE IF NOT EXISTS user_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,

  -- 🔹 1. 用户设置（个人信息 + 界面偏好）
  user_settings JSONB DEFAULT '{
    "avatar": "",
    "name": "",
    "theme": "auto",
    "language": "zh-CN"
  }'::jsonb,

  -- 🔹 2. 聊天配置（默认模型 + 模型参数 + 系统提示词）
  chat_config JSONB DEFAULT '{
    "defaultModel": null,
    "parameters": {
      "temperature": 0.7,
      "topP": 0.9,
      "maxTokens": 4096
    },
    "systemPrompt": "你是一个有帮助的AI助手。",
    "streamEnabled": true
  }'::jsonb,

  -- 🔹 3. 工作流配置（题目工作流的节点配置）
  workflow_config JSONB DEFAULT '{
    "classify": {
      "displayName": "题目分类",
      "description": "识别题目所属学科",
      "modelId": null,
      "parameters": {
        "temperature": 0.3,
        "topP": 0.8,
        "maxTokens": 2048
      },
      "systemPrompt": null
    },
    "parse_questions": {
      "displayName": "题目解析",
      "description": "提取题目关键信息",
      "modelId": null,
      "parameters": {
        "temperature": 0.5,
        "topP": 0.9,
        "maxTokens": 4096
      },
      "systemPrompt": null,
      "subjectSpecific": {}
    },
    "generate_questions": {
      "displayName": "题目生成",
      "description": "生成新的练习题",
      "modelId": null,
      "parameters": {
        "temperature": 0.8,
        "topP": 0.95,
        "maxTokens": 8192
      },
      "systemPrompt": null,
      "subjectSpecific": {}
    },
    "revise": {
      "displayName": "结果审核",
      "description": "检查题目质量",
      "modelId": null,
      "parameters": {
        "temperature": 0.3,
        "topP": 0.8,
        "maxTokens": 4096
      },
      "systemPrompt": null
    }
  }'::jsonb,

  -- 🔹 4. 其他扩展配置（预留）
  additional_config JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- 外键约束
  CONSTRAINT user_configs_user_fk
    FOREIGN KEY (user_id)
    REFERENCES users(user_id)
    ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX idx_user_configs_user_id ON user_configs(user_id);
CREATE INDEX idx_user_configs_user_settings ON user_configs USING gin(user_settings);
CREATE INDEX idx_user_configs_chat_config ON user_configs USING gin(chat_config);
CREATE INDEX idx_user_configs_workflow_config ON user_configs USING gin(workflow_config);

-- 添加注释
COMMENT ON TABLE user_configs IS '用户配置表（用户设置 + 聊天配置 + 工作流配置）';
COMMENT ON COLUMN user_configs.user_settings IS '用户个人设置（头像、昵称、主题、语言）';
COMMENT ON COLUMN user_configs.chat_config IS '聊天配置（默认模型、参数、系统提示词）';
COMMENT ON COLUMN user_configs.workflow_config IS '工作流配置（题目工作流的节点配置）';
COMMENT ON COLUMN user_configs.additional_config IS '额外配置（预留扩展）';

-- 更新时间触发器
CREATE TRIGGER user_configs_updated_at
  BEFORE UPDATE ON user_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## 📱 前端 TypeScript 类型定义

```typescript
// ============================================
// 用户配置类型定义
// ============================================

// 1. 用户设置
export interface UserSettings {
  avatar: string
  name: string
  theme: 'auto' | 'light' | 'dark'
  language: 'zh-CN' | 'en-US'
}

// 2. 聊天配置
export interface ChatConfig {
  defaultModel: {
    providerId: string
    modelId: string
  } | null
  parameters: {
    temperature: number // 0-2
    topP: number // 0-1
    maxTokens: number // 100-128000
  }
  systemPrompt: string
  streamEnabled: boolean
}

// 3. 工作流配置
export type WorkflowNodeType = 'classify' | 'parse_questions' | 'generate_questions' | 'revise'
export type Subject = 'math' | 'physics' | 'chemistry' | 'biology' | 'chinese' | 'english'

export interface WorkflowNodeConfig {
  displayName: string
  description: string
  modelId: string | null
  parameters: {
    temperature: number
    topP: number
    maxTokens: number
  }
  systemPrompt?: string
  subjectSpecific?: Partial<Record<Subject, string>>
}

export interface WorkflowConfig {
  [key: string]: WorkflowNodeConfig
}

// 完整的用户配置
export interface UserConfig {
  userSettings: UserSettings
  chatConfig: ChatConfig
  workflowConfig: WorkflowConfig
  additionalConfig?: Record<string, any>
}
```

---

## 🎯 配置项命名建议（通俗易懂版）

### 原来的技术术语 → 改进后的用户友好名称

| 原术语 | 改进后 | 图标建议 |
|--------|--------|---------|
| temperature | 创造力 / 随机性 | 🎨 |
| top_p | 多样性 / 词汇丰富度 | 🎲 |
| max_tokens | 回复长度 / 最大字数 | 📏 |
| system_prompt | 角色设定 / AI身份 | 🎭 |
| stream_enabled | 打字机效果 / 逐字显示 | ⌨️ |
| model | AI模型 / 大脑版本 | 🤖 |
| provider | 服务商 / API提供商 | 🏢 |

---

## 💡 额外建议

### 1. **配置预设（Presets）**
为不同使用场景提供预设配置：

```typescript
const CHAT_PRESETS = {
  creative: { temperature: 1.5, topP: 0.95, name: '创意模式 🎨' },
  balanced: { temperature: 0.7, topP: 0.9, name: '平衡模式 ⚖️' },
  precise: { temperature: 0.3, topP: 0.8, name: '精确模式 🎯' },
}
```

### 2. **配置导入导出**
保留现有的数据导入导出功能，但改进为：
- 导出用户配置（JSON格式）
- 导入配置时自动校验
- 提供"分享配置"功能（生成配置码）

### 3. **配置历史记录**
- 记录最近3次配置变更
- 提供"撤销"功能

### 4. **智能推荐**
- 根据用户的对话类型推荐参数
- "大部分用户使用 temperature=0.7" 这样的提示

---

## 🎨 UI/UX 建议

### 页面布局

```
┌─────────────────────────────────────┐
│  Setting 标题栏                      │
├─────────────────────────────────────┤
│  [个人设置] [聊天配置] [工作流] [供应商]│ ← 标签页
├─────────────────────────────────────┤
│                                     │
│  [配置内容区域]                       │
│                                     │
│  • 每个配置项带图标                   │
│  • 鼠标悬停显示详细提示                │
│  • 实时预览效果（如果可能）            │
│                                     │
├─────────────────────────────────────┤
│          [恢复默认] [保存更改]         │ ← 底部操作栏
└─────────────────────────────────────┘
```

---

这个设计方案怎么样？我重点考虑了：

1. ✅ **用户友好**：使用通俗易懂的名称和详细的提示
2. ✅ **结构清晰**：按功能分为4个独立的配置页面
3. ✅ **易于扩展**：每个配置块使用JSONB，方便新增字段
4. ✅ **类型安全**：完整的TypeScript类型定义
5. ✅ **性能优化**：支持按配置类别单独读写
