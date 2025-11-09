# Langchain 工作流开发

使用 LangGraph 和 ChatOpenAI 创建 AI 驱动的工作流。

---

## 📁 文件位置

Langchain 工作流位于：
```
service/src/
├── quiz/              # 测验生成工作流
│   ├── workflow.ts    # 主工作流定义
│   ├── types.ts       # 类型定义
│   ├── defaultPrompts.ts
│   └── loader.ts
└── novel/             # 小说生成工作流
    ├── workflows/
    ├── prompts/
    └── types.ts
```

---

## 🎯 工作流核心概念

### StateGraph
LangGraph 使用状态图（StateGraph）定义工作流：

```typescript
import { StateGraph, END } from '@langchain/langgraph'

const workflow = new StateGraph<MyWorkflowState>({
  channels: myStateChannels
})

workflow.addNode('step1', step1Function)
workflow.addNode('step2', step2Function)

workflow.addEdge('step1', 'step2')
workflow.addEdge('step2', END)

const app = workflow.compile()
```

### 节点（Nodes）
每个节点是一个异步函数，处理状态并返回更新：

```typescript
async function myNode(state: MyWorkflowState): Promise<Partial<MyWorkflowState>> {
  // 处理逻辑
  const result = await someOperation()

  // 返回状态更新
  return {
    someField: result,
    anotherField: state.anotherField + 1
  }
}
```

---

## 📝 基本工作流模板

```typescript
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { StateGraph, END } from '@langchain/langgraph'
import { ChatOpenAI } from '@langchain/openai'

/**
 * 工作流状态接口
 */
interface MyWorkflowState {
  input: string
  step1Result?: string
  step2Result?: string
  finalOutput?: string
  errors: string[]
}

/**
 * 创建 LLM 实例
 */
function createLLM(apiKey: string, model: string = 'gpt-4o-mini') {
  return new ChatOpenAI({
    model,
    apiKey,
    temperature: 0,
    maxTokens: 2000,
  })
}

/**
 * 第一步：分析输入
 */
async function analyzeInput(state: MyWorkflowState): Promise<Partial<MyWorkflowState>> {
  try {
    const llm = createLLM(process.env.OPENAI_API_KEY!)

    const prompt = ChatPromptTemplate.fromMessages([
      ['system', '你是一个专业的分析助手'],
      ['human', '请分析以下内容：{input}']
    ])

    const chain = prompt.pipe(llm)
    const result = await chain.invoke({ input: state.input })

    return {
      step1Result: result.content as string
    }
  } catch (error) {
    console.error('❌ [analyzeInput] 错误:', error)
    return {
      errors: [...state.errors, `分析失败: ${error}`]
    }
  }
}

/**
 * 第二步：处理结果
 */
async function processResult(state: MyWorkflowState): Promise<Partial<MyWorkflowState>> {
  try {
    const llm = createLLM(process.env.OPENAI_API_KEY!)

    const prompt = ChatPromptTemplate.fromMessages([
      ['system', '你是一个专业的处理助手'],
      ['human', '请处理以下分析结果：{analysis}']
    ])

    const chain = prompt.pipe(llm)
    const result = await chain.invoke({ analysis: state.step1Result })

    return {
      step2Result: result.content as string,
      finalOutput: result.content as string
    }
  } catch (error) {
    console.error('❌ [processResult] 错误:', error)
    return {
      errors: [...state.errors, `处理失败: ${error}`]
    }
  }
}

/**
 * 构建并运行工作流
 */
export async function runMyWorkflow(input: string) {
  // 定义状态通道
  const stateChannels = {
    input: null,
    step1Result: null,
    step2Result: null,
    finalOutput: null,
    errors: null,
  }

  // 创建工作流
  const workflow = new StateGraph<MyWorkflowState>({
    channels: stateChannels
  })

  // 添加节点
  workflow.addNode('analyze', analyzeInput)
  workflow.addNode('process', processResult)

  // 定义流程
  workflow.setEntryPoint('analyze')
  workflow.addEdge('analyze', 'process')
  workflow.addEdge('process', END)

  // 编译工作流
  const app = workflow.compile()

  // 执行工作流
  const initialState: MyWorkflowState = {
    input,
    errors: []
  }

  const finalState = await app.invoke(initialState)
  return finalState
}
```

---

## 🚀 实际项目示例

### Quiz Workflow（测验生成）

```typescript
/**
 * 工作流状态
 */
interface WorkflowState {
  file_content: string
  file_path: string
  classification_label: ClassificationLabel
  subject: Subject
  extracted_paragraphs: string[]
  raw_questions: string
  questions: QuizItem[]
  human_feedback: HumanFeedbackInput | null
  review_result: string
  node_configs: WorkflowNodeConfig[]
  model_info?: ModelInfo
}

/**
 * 分类节点：判断文档类型
 */
async function classifier(state: WorkflowState): Promise<Partial<WorkflowState>> {
  const nodeConfig = state.node_configs.find(n => n.type === 'classifier')
  const llm = makeLLM(state.model_info, nodeConfig?.model_config)

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', DEFAULT_CLASSIFIER_PROMPT],
    ['human', '{text}']
  ])

  const chain = prompt.pipe(llm)
  const result = await chain.invoke({
    text: state.file_content.slice(0, 2000)
  })

  const content = result.content as string
  const label = parseClassificationLabel(content)

  console.log('📌 分类结果:', label)

  return {
    classification_label: label
  }
}

/**
 * 生成题目节点
 */
async function generateQuestions(state: WorkflowState): Promise<Partial<WorkflowState>> {
  const nodeConfig = state.node_configs.find(n => n.type === 'generate_questions')
  const llm = makeLLM(state.model_info, nodeConfig?.model_config)

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', DEFAULT_GENERATE_QUESTIONS_PROMPT],
    ['human', '{material}']
  ])

  const chain = prompt.pipe(llm)
  const result = await chain.invoke({
    material: state.extracted_paragraphs.join('\n\n')
  })

  return {
    raw_questions: result.content as string
  }
}

/**
 * 构建工作流
 */
export async function runWorkflow(
  filePath: string,
  workflowNodeConfigs: WorkflowNodeConfig[],
  modelInfo?: ModelInfo
): Promise<WorkflowState> {
  // 加载文件内容
  const fileContent = await loadFile(filePath)

  // 定义状态通道
  const stateChannels = {
    file_content: null,
    file_path: null,
    classification_label: null,
    subject: null,
    extracted_paragraphs: null,
    raw_questions: null,
    questions: null,
    human_feedback: null,
    review_result: null,
    node_configs: null,
    model_info: null,
  }

  // 创建工作流
  const workflow = new StateGraph<WorkflowState>({
    channels: stateChannels
  })

  // 添加节点
  workflow.addNode('classifier', classifier)
  workflow.addNode('generate_questions', generateQuestions)
  workflow.addNode('parse_questions', parseQuestions)
  workflow.addNode('review_and_score', reviewAndScore)

  // 定义流程
  workflow.setEntryPoint('classifier')
  workflow.addEdge('classifier', 'generate_questions')
  workflow.addEdge('generate_questions', 'parse_questions')
  workflow.addEdge('parse_questions', 'review_and_score')
  workflow.addEdge('review_and_score', END)

  // 编译并执行
  const app = workflow.compile()

  const initialState: WorkflowState = {
    file_content: fileContent,
    file_path: filePath,
    classification_label: 'unknown',
    subject: 'general',
    extracted_paragraphs: [],
    raw_questions: '',
    questions: [],
    human_feedback: null,
    review_result: '',
    node_configs: workflowNodeConfigs,
    model_info: modelInfo,
  }

  const finalState = await app.invoke(initialState)
  return finalState
}
```

---

## 🔧 LLM 配置

### 支持多个 AI 供应商

```typescript
/**
 * 判断模型是否为特定供应商
 */
function isKrioraModel(modelId: string): boolean {
  return modelId.includes('moonshotai/') || modelId.includes('qwen/')
}

/**
 * 创建 LLM 实例（支持多供应商）
 */
function makeLLM(modelInfo?: ModelInfo, config?: ModelConfig) {
  const model = modelInfo?.name || process.env.OPENAI_API_MODEL || 'gpt-4o-mini'

  let apiKey = modelInfo?.apiKey
  let baseURL = modelInfo?.baseURL

  // 根据模型选择 API 配置
  if (!apiKey || !baseURL) {
    if (isKrioraModel(model)) {
      apiKey = apiKey || process.env.KRIORA_API_KEY || process.env.OPENAI_API_KEY
      baseURL = baseURL || process.env.KRIORA_API_URL || 'https://api.kriora.com'
    } else {
      apiKey = apiKey || process.env.OPENAI_API_KEY
      baseURL = baseURL || process.env.OPENAI_API_BASE_URL
    }
  }

  if (!apiKey) {
    throw new Error('API_KEY 未配置！')
  }

  return new ChatOpenAI({
    model,
    apiKey,
    configuration: baseURL ? { baseURL } : undefined,
    temperature: config?.temperature ?? 0,
    topP: config?.top_p,
    maxTokens: config?.max_tokens,
    presencePenalty: config?.presence_penalty,
    frequencyPenalty: config?.frequency_penalty,
  })
}
```

### 模型配置接口

```typescript
export interface ModelInfo {
  name: string
  provider: string
  apiKey?: string
  baseURL?: string
}

export interface ModelConfig {
  temperature?: number
  top_p?: number
  max_tokens?: number
  presence_penalty?: number
  frequency_penalty?: number
}
```

---

## 📊 条件分支

使用条件边实现分支逻辑：

```typescript
/**
 * 路由函数：根据分类结果决定下一步
 */
function routeByClassification(state: WorkflowState): string {
  switch (state.classification_label) {
    case 'textbook':
      return 'extract_textbook'
    case 'article':
      return 'extract_article'
    case 'unknown':
    default:
      return 'extract_general'
  }
}

// 在工作流中使用
workflow.addConditionalEdges(
  'classifier',
  routeByClassification,
  {
    'extract_textbook': 'textbook_extractor',
    'extract_article': 'article_extractor',
    'extract_general': 'general_extractor',
  }
)
```

---

## ⚠️ 错误处理

### 节点级别错误处理

```typescript
async function myNode(state: MyWorkflowState): Promise<Partial<MyWorkflowState>> {
  try {
    const llm = createLLM(process.env.OPENAI_API_KEY!)
    const result = await llm.invoke('prompt')

    return {
      result: result.content as string
    }
  } catch (error) {
    console.error('❌ [myNode] 错误:', error)

    // 将错误记录到状态中
    return {
      errors: [...state.errors, `节点失败: ${error}`],
      result: '' // 提供默认值
    }
  }
}
```

### 工作流级别错误处理

```typescript
export async function runWorkflow(input: string) {
  try {
    const app = workflow.compile()
    const result = await app.invoke(initialState)

    // 检查是否有错误
    if (result.errors.length > 0) {
      console.error('⚠️  工作流完成但有错误:', result.errors)
    }

    return result
  } catch (error) {
    console.error('❌ 工作流执行失败:', error)
    throw error
  }
}
```

---

## 📝 Prompt 最佳实践

### 使用 ChatPromptTemplate

```typescript
import { ChatPromptTemplate } from '@langchain/core/prompts'

// ✅ 推荐：使用结构化 prompt
const prompt = ChatPromptTemplate.fromMessages([
  ['system', '你是一个专业的{role}'],
  ['human', '请{action}：{content}']
])

const chain = prompt.pipe(llm)
const result = await chain.invoke({
  role: '编辑',
  action: '润色',
  content: '原文内容...'
})

// ❌ 避免：硬编码字符串
const result = await llm.invoke(`你是编辑，请润色：${content}`)
```

### 分离 Prompt 定义

```typescript
// defaultPrompts.ts
export const CLASSIFIER_PROMPT = `你是一个文档分类专家...`

export const GENERATE_QUESTIONS_PROMPT = `你是一个题目生成专家...`

// workflow.ts
import { CLASSIFIER_PROMPT } from './defaultPrompts'

const prompt = ChatPromptTemplate.fromMessages([
  ['system', CLASSIFIER_PROMPT],
  ['human', '{text}']
])
```

---

## 📋 检查清单

创建 Langchain 工作流时，确认：

- [ ] 定义清晰的 State 接口
- [ ] 所有节点函数都是 async
- [ ] 节点返回 Partial<State>
- [ ] 使用 try-catch 处理错误
- [ ] LLM 配置支持多供应商
- [ ] Prompt 使用 ChatPromptTemplate
- [ ] 记录关键步骤日志
- [ ] 工作流有明确的 END 点
- [ ] 测试不同的输入场景
- [ ] 处理 API 超时和限流

---

## 💡 最佳实践

### 1. 状态设计
```typescript
// ✅ 推荐：结构化状态
interface WorkflowState {
  input: string
  step1Result?: string
  step2Result?: string
  errors: string[]
  metadata: {
    startTime: number
    duration?: number
  }
}

// ❌ 避免：扁平无类型
interface WorkflowState {
  data: any
  result: any
}
```

### 2. 日志记录
```typescript
async function myNode(state: WorkflowState): Promise<Partial<WorkflowState>> {
  console.log('🚀 [myNode] 开始执行')
  const start = performance.now()

  try {
    const result = await processData()
    const duration = performance.now() - start

    console.log(`✅ [myNode] 完成，耗时: ${duration.toFixed(0)}ms`)
    return { result }
  } catch (error) {
    const duration = performance.now() - start
    console.error(`❌ [myNode] 失败，耗时: ${duration.toFixed(0)}ms`, error)
    return { errors: [...state.errors, error] }
  }
}
```

### 3. 可配置节点
```typescript
interface NodeConfig {
  type: WorkflowNodeType
  enabled: boolean
  model_config?: ModelConfig
}

async function myNode(state: WorkflowState): Promise<Partial<WorkflowState>> {
  const nodeConfig = state.node_configs.find(n => n.type === 'my_node')

  if (!nodeConfig?.enabled) {
    console.log('⏭️  [myNode] 已禁用，跳过')
    return {}
  }

  const llm = makeLLM(state.model_info, nodeConfig.model_config)
  // ...
}
```

---

## 🔗 相关资源

- [LangGraph 官方文档](https://js.langchain.com/docs/langgraph)
- [ChatOpenAI 配置](https://js.langchain.com/docs/integrations/chat/openai)
- [Prompt 模板](https://js.langchain.com/docs/modules/model_io/prompts/quick_start)

---

**记住**：Langchain 工作流应该是可观测、可配置和容错的。充分利用 TypeScript 的类型系统确保状态的正确传递。
