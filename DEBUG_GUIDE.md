# 🐛 后端调试完全指南

## 📖 目录

1. [VSCode 断点调试](#1-vscode-断点调试推荐)
2. [Console.log 调试](#2-consolelog-调试)
3. [常见问题排查](#3-常见问题排查)
4. [调试技巧](#4-调试技巧)

---

## 1. VSCode 断点调试（推荐）

### 🚀 快速开始

1. **打开 VSCode**，确保已打开项目根目录

2. **按 F5 或点击调试按钮**，选择配置：
   - `🚀 调试后端服务` - 推荐使用

3. **设置断点**：
   - 在代码行号左侧点击，会出现红点 🔴
   - 示例位置：
     ```typescript
     // service/src/index.ts 第 86 行
     router.post('/upload', upload.single('file'), async (req, res) => {
       console.log('📤 [上传] 接收到文件上传请求')  // ← 点击这里设置断点
     ```

4. **上传文件触发断点**：
   - 启动调试后，在前端上传文件
   - 代码会自动停在断点处

5. **调试操作**：
   - **F10** - 单步跳过（逐行执行）
   - **F11** - 单步进入（进入函数内部）
   - **Shift + F11** - 单步跳出（跳出当前函数）
   - **F5** - 继续执行

### 🎯 查看变量

调试时可以查看：
- **变量面板** - 左侧显示所有变量
- **鼠标悬停** - 悬停在变量上查看值
- **调试控制台** - 可以输入表达式查看

示例：
```typescript
// 在断点处，可以在调试控制台输入：
req.file
req.file.originalname
filePath
error?.message
```

---

## 2. Console.log 调试

### 📝 已添加的日志点

我已经在关键位置添加了详细日志：

#### **文件上传流程** (`service/src/index.ts`)

```typescript
📤 [上传] 接收到文件上传请求
📁 [上传] 文件信息: { 原始文件名, 服务器文件名, 文件路径, 文件大小 }
🔍 [分类] 开始分类文件...
✅ [分类] 分类完成: { classification, error }
❌ [上传] 处理文件时出错: ...
```

#### **文件加载流程** (`service/src/quiz/loader.ts`)

```typescript
📄 [加载] 开始加载文件: { filePath, ext }
✅ [加载] 文本文件加载成功，内容长度: 1234
❌ [加载] 加载文本文件失败: ...
```

#### **分类工作流** (`service/src/quiz/workflow.ts`)

```typescript
🎯 [工作流] 开始分类文件: /path/to/file
📂 [工作流] 步骤 1: 加载文件...
✅ [工作流] 文件加载成功，文本长度: 1234
🔍 [工作流] 步骤 2: 执行分类...
🤖 [分类器] 开始调用 LLM 进行分类...
📝 [分类器] 文本预览 (前100字): ...
🔄 [分类器] 发送文本给 LLM，长度: 3000
📊 [分类器] LLM 返回结果: note
📖 [分类器] 分类为: note (笔记)
✅ [工作流] 分类完成
```

### 🖥️ 查看日志

启动后端服务后，在终端可以看到彩色日志：

```bash
cd service
pnpm start

# 看到类似输出：
# Server is running on port 3002
# 📤 [上传] 接收到文件上传请求
# 📁 [上传] 文件信息: ...
```

---

## 3. 常见问题排查

### ❓ 问题：Cannot read properties of undefined (reading 'message')

**排查步骤**：

1. **查看日志中的错误详情**：
   ```
   ❌ [上传] 处理文件时出错: ...
   错误详情: { message, stack, type, error }
   ```

2. **检查 error 对象类型**：
   - 如果 `type` 不是 'object'，说明不是标准 Error 对象
   - 查看 `error` 的实际内容

3. **可能的原因**：
   - OpenAI API Key 未配置
   - 网络连接问题
   - LangChain 导入失败
   - 文件读取失败

### ❓ 问题：文件上传后没有反应

**排查步骤**：

1. **检查是否到达后端**：
   ```
   # 如果看到这行，说明后端收到了
   📤 [上传] 接收到文件上传请求
   ```

2. **检查文件信息是否正确**：
   ```
   📁 [上传] 文件信息: { ... }
   ```

3. **检查分类是否开始**：
   ```
   🔍 [分类] 开始分类文件...
   ```

4. **如果卡在某一步**：
   - 设置断点
   - 查看是否有异常抛出
   - 检查环境变量配置

### ❓ 问题：OpenAI API 调用失败

**排查步骤**：

1. **检查环境变量**：
   ```bash
   # service/.env
   OPENAI_API_KEY=sk-xxx
   OPENAI_API_BASE_URL=https://api.openai.com
   OPENAI_API_MODEL=gpt-4o-mini
   ```

2. **查看 API 调用日志**：
   ```
   🔄 [分类器] 发送文本给 LLM，长度: 3000
   ```

3. **如果这里卡住**：
   - 检查网络连接
   - 检查 API Key 是否有效
   - 检查代理设置

---

## 4. 调试技巧

### 💡 技巧 1：添加临时日志

在任何地方添加：
```typescript
console.log('🔍 调试点 1:', someVariable)
console.log('🔍 调试点 2:', { var1, var2, var3 })
```

### 💡 技巧 2：使用 JSON.stringify

对于复杂对象：
```typescript
console.log('对象详情:', JSON.stringify(obj, null, 2))
```

### 💡 技巧 3：捕获异常堆栈

```typescript
try {
  // 你的代码
} catch (error: any) {
  console.error('错误:', error)
  console.error('堆栈:', error?.stack)  // 查看完整调用栈
}
```

### 💡 技巧 4：条件断点

在 VSCode 中：
1. 右键点击断点
2. 选择"编辑断点"
3. 添加条件，如：`filePath.includes('.txt')`

### 💡 技巧 5：监视表达式

调试时在"监视"面板添加：
- `req.file?.originalname`
- `error?.message`
- `state.classification`

---

## 🎯 实战演练

### 场景：上传文件后报错

1. **启动调试模式** (F5)
2. **在这些位置设置断点**：
   ```typescript
   // service/src/index.ts:86
   router.post('/upload', ...
   
   // service/src/quiz/loader.ts:6
   export async function loadFile(...
   
   // service/src/quiz/workflow.ts:37
   async function classify(...
   ```

3. **上传文件**

4. **逐步执行**：
   - 查看每个变量的值
   - 确认执行流程
   - 找到出错位置

5. **记录问题**：
   - 在哪一步出错
   - 错误信息是什么
   - 变量值是否正确

---

## 📚 快捷键速查

| 功能 | Windows/Linux | Mac |
|------|---------------|-----|
| 开始调试 | F5 | F5 |
| 停止调试 | Shift + F5 | Shift + F5 |
| 单步跳过 | F10 | F10 |
| 单步进入 | F11 | F11 |
| 单步跳出 | Shift + F11 | Shift + F11 |
| 继续执行 | F5 | F5 |
| 切换断点 | F9 | F9 |

---

## 🆘 需要帮助？

如果遇到问题：

1. **查看完整日志输出**
2. **复制错误信息**（包括堆栈）
3. **截图断点处的变量值**
4. **描述复现步骤**

祝调试顺利！🎉

