# 🔑 OpenAI API 配置指南

## 快速开始

### 1. 创建 .env 文件

在 `service` 目录下创建 `.env` 文件：

```bash
cd service
touch .env  # Mac/Linux
# 或
type nul > .env  # Windows
```

### 2. 添加配置

在 `.env` 文件中添加以下内容：

```env
# ====== 必须配置 ======
OPENAI_API_KEY=sk-your-api-key-here

# ====== 可选配置 ======
OPENAI_API_BASE_URL=https://api.openai.com/v1
OPENAI_API_MODEL=gpt-4o-mini
```

### 3. 重启服务

```bash
cd service
pnpm start
```

---

## 📝 配置说明

### OPENAI_API_KEY（必须）

获取方式：

**方式 1：官方 OpenAI（推荐）**
1. 访问 https://platform.openai.com/api-keys
2. 注册并创建 API Key
3. 复制 Key（格式：`sk-proj-...` 或 `sk-...`）

**方式 2：使用国内代理服务**

如果无法访问 OpenAI 官方 API，可以使用代理服务：

```env
# 示例（请替换为你的实际配置）
OPENAI_API_KEY=sk-你的密钥
OPENAI_API_BASE_URL=https://your-proxy-url/v1
```

常见代理服务商：
- API2D
- OpenAI-SB
- 其他第三方服务

### OPENAI_API_BASE_URL（可选）

- 默认值：`https://api.openai.com/v1`
- 使用代理时修改为代理服务的地址
- **注意**：必须以 `/v1` 结尾

### OPENAI_API_MODEL（可选）

- 默认值：`gpt-4o-mini`
- 可选模型：
  - `gpt-4o-mini` - 最新、最快、最便宜
  - `gpt-4o` - 更强大但更贵
  - `gpt-3.5-turbo` - 便宜但效果一般

---

## ⚠️ 常见问题

### 问题 1: "Cannot read properties of undefined (reading 'message')"

**原因**：
- API Key 未配置
- API Key 格式错误
- API Key 无效或过期
- 网络无法访问 OpenAI API

**解决**：

1. 检查 `.env` 文件是否存在
2. 检查 API Key 格式（必须以 `sk-` 开头）
3. 验证 API Key 是否有效：
   ```bash
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer $OPENAI_API_KEY"
   ```

### 问题 2: 网络连接超时

**原因**：国内网络无法直接访问 OpenAI

**解决**：
1. 使用代理服务
2. 配置 `OPENAI_API_BASE_URL` 为代理地址

### 问题 3: API Key 余额不足

**原因**：OpenAI 账户余额为 0

**解决**：
1. 访问 https://platform.openai.com/account/billing
2. 充值账户

---

## 🧪 测试配置

重启服务后，上传文件测试：

### ✅ 配置成功
```
🔑 [LLM配置] { model: 'gpt-4o-mini', baseURL: '...', hasApiKey: true, apiKeyPrefix: 'sk-proj...' }
🤖 [分类器] 开始调用 LLM 进行分类...
📊 [分类器] LLM 返回结果: note
✅ [分类] 分类完成
```

### ❌ 配置失败
```
❌ [分类器] API 调用失败: ...
错误详情: { name: '...', message: '...', code: '...' }
```

---

## 📚 完整配置示例

```env
# ====== OpenAI 官方 API ======
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
OPENAI_API_BASE_URL=https://api.openai.com/v1
OPENAI_API_MODEL=gpt-4o-mini

# ====== 或使用代理服务 ======
# OPENAI_API_KEY=sk-xxxxxxxxxxxxx
# OPENAI_API_BASE_URL=https://your-proxy.com/v1
# OPENAI_API_MODEL=gpt-4o-mini

# ====== 其他配置（可选）======
# 认证密钥
# AUTH_SECRET_KEY=your-secret-key

# 请求限流（每小时）
MAX_REQUEST_PER_HOUR=0

# 超时时间（毫秒）
TIMEOUT_MS=60000
```

---

## 🔒 安全提示

1. ⚠️ **不要**将 `.env` 文件提交到 Git
2. ⚠️ **不要**在代码中硬编码 API Key
3. ⚠️ **不要**公开分享你的 API Key
4. ✅ `.env` 文件已在 `.gitignore` 中

---

需要帮助？查看 [OpenAI API 文档](https://platform.openai.com/docs/api-reference)

