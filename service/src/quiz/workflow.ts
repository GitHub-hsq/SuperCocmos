/* eslint-disable no-console */
import type { ClassificationLabel, HumanFeedbackInput, ModelConfig, ModelInfo, QuizItem, Subject, WorkflowNodeConfig, WorkflowNodeType, WorkflowState } from './types'
// workflow.ts
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { END, StateGraph } from '@langchain/langgraph'
import { ChatOpenAI } from '@langchain/openai'
import { loadFile } from './loader'

// ---------- LLM ----------
// 判断模型是否为 Kriora 供应商
function isKrioraModel(modelId: string): boolean {
  return modelId.includes('moonshotai/') || modelId.includes('qwen/')
}

function makeLLM(modelInfo?: ModelInfo, config?: ModelConfig) {
  // 如果没有提供模型信息，使用环境变量
  const model = modelInfo?.name || process.env.OPENAI_API_MODEL || 'gpt-4o-mini'

  // 根据模型类型选择合适的 API 配置
  let apiKey = modelInfo?.apiKey
  let baseURL = modelInfo?.baseURL

  if (!apiKey || !baseURL) {
    if (isKrioraModel(model)) {
      // 使用 Kriora API 配置
      apiKey = apiKey || process.env.KRIORA_API_KEY || process.env.OPENAI_API_KEY
      baseURL = baseURL || process.env.KRIORA_API_URL || 'https://api.kriora.com'
    }
    else {
      // 使用默认 OpenAI API 配置
      apiKey = apiKey || process.env.OPENAI_API_KEY
      baseURL = baseURL || process.env.OPENAI_API_BASE_URL
    }
  }

  console.log('🔑 [LLM配置]', {
    model,
    baseURL,
    hasApiKey: !!apiKey,
    provider: isKrioraModel(model) ? 'kriora' : (modelInfo?.provider || 'openai'),
    config,
  })

  if (!apiKey)
    throw new Error('API_KEY 未配置！请在 service/.env 文件中配置或通过工作流配置传入')

  return new ChatOpenAI({
    model,
    temperature: config?.temperature ?? 0,
    topP: config?.top_p,
    maxTokens: config?.max_tokens,
    presencePenalty: config?.presence_penalty,
    frequencyPenalty: config?.frequency_penalty,
    openAIApiKey: apiKey,
    configuration: {
      // 模型调用需要加 /v1
      baseURL: baseURL ? `${baseURL}/v1` : 'https://api.openai.com/v1',
    },
    streaming: true,
    timeout: 60000,
  })
}

// 获取节点配置
function getNodeConfig(state: WorkflowState, nodeType: WorkflowNodeType): { modelInfo: ModelInfo, config: ModelConfig } | null {
  const nodeConfig = state.workflowConfig?.find(c => c.nodeType === nodeType)
  if (!nodeConfig)
    return null

  // 如果有学科信息且该节点有学科专属配置，使用学科专属模型
  if (state.subject && state.subject !== 'unknown' && nodeConfig.subjectSpecific?.[state.subject]) {
    return {
      modelInfo: nodeConfig.subjectSpecific[state.subject]!,
      config: nodeConfig.config || {},
    }
  }

  return {
    modelInfo: nodeConfig.modelInfo,
    config: nodeConfig.config || {},
  }
}

// ---------- 1. 分类器（增强：同时识别学科） ----------
const classifierPrompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    `你是一个分类器，判断输入文本的类型和学科门类。

第一步：判断文本类型
- 如果主要是知识点、概念、说明等内容，类型为 'note'
- 如果主要是题目（包含题干、选项、答案），类型为 'question'
- 如果同时包含大量笔记和题目，类型为 'mixed'

第二步：判断学科门类（如果能判断）
- math: 数学
- physics: 物理
- chemistry: 化学
- biology: 生物
- chinese: 语文
- english: 英语
- unknown: 无法判断或多学科混合

请按以下格式输出（只输出这两行）：
type: <note|question|mixed>
subject: <math|physics|chemistry|biology|chinese|english|unknown>`,
  ],
  ['human', '{text}'],
])

async function classify(state: WorkflowState): Promise<WorkflowState> {
  console.log('🤖 [分类器] 开始调用 LLM 进行分类...')
  console.log('📝 [分类器] 文本预览 (前100字):', state.text.slice(0, 100))

  try {
    const nodeConfig = getNodeConfig(state, 'classify')
    const llm = nodeConfig
      ? makeLLM(nodeConfig.modelInfo, nodeConfig.config)
      : makeLLM()

    const chain = classifierPrompt.pipe(llm)
    const textSample = state.text.slice(0, 3000)

    console.log('🔄 [分类器] 发送文本给 LLM，长度:', textSample.length)

    const result = await chain.invoke({ text: textSample })
    const response = (result.content as string).trim().toLowerCase()

    console.log('📊 [分类器] LLM 返回结果:', response)

    // 解析响应
    const typeMatch = response.match(/type:\s*(note|question|mixed|unknown)/)
    const subjectMatch = response.match(/subject:\s*(math|physics|chemistry|biology|chinese|english|unknown)/)

    const type = typeMatch?.[1] || 'unknown'
    const subject = subjectMatch?.[1] || 'unknown'

    state.classification = type as ClassificationLabel
    state.subject = subject as Subject

    console.log('✅ [分类器] 分类结果:', {
      type: state.classification,
      subject: state.subject,
    })

    if (state.classification === 'mixed')
      state.error = '文件同时包含笔记和题目，请分开处理'
  }
  catch (error: any) {
    console.error('❌ [分类器] API 调用失败:', error)
    console.error('错误详情:', {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      status: error?.status,
      response: error?.response?.data,
    })

    state.classification = 'note'
    state.subject = 'unknown'
    state.error = `API 调用失败: ${error?.message || String(error)}`

    throw error
  }

  return state
}

async function parseQuestions(state: WorkflowState): Promise<WorkflowState> {
  const nodeConfig = getNodeConfig(state, 'parse_questions')
  const llm = nodeConfig
    ? makeLLM(nodeConfig.modelInfo, nodeConfig.config)
    : makeLLM()

  // 动态拼接系统提示
  const systemPrompt = `你是题目解析助手。将原始题目文本解析为标准JSON格式。
    每道题必须包含：
    - type: "single_choice" | "multiple_choice" | "true_false"
    - question: 题目内容
    - options: 选项数组 ["A. ...", "B. ..."]
    - answer: 正确答案（如 ["A"] 或 ["A","B"]）
    - explanation: 答案解析
    ${state.revision_note ? `\n用户修改建议：${state.revision_note}\n请根据建议调整输出。` : ''}
    
    直接输出JSON数组，不要任何额外说明。`
  const prompt = ChatPromptTemplate.fromMessages([
    ['system', systemPrompt],
    ['human', '{text}'],
  ])

  const chain = prompt.pipe(llm)

  const promptText = state.revision_note
    ? `原始题目：\n${state.text}\n\n之前的解析结果：\n${JSON.stringify(state.questions, null, 2)}\n\n修改建议：${state.revision_note}`
    : state.text

  const result = await chain.invoke({ text: promptText })

  try {
    let content = (result.content as string).trim()
    // 移除可能的 markdown 代码块标记
    content = content.replace(/^```json\s*/i, '').replace(/\n?```\s*$/, '')
    const parsed = JSON.parse(content)
    state.questions = Array.isArray(parsed) ? parsed : [parsed]
    state.retry_count = (state.retry_count || 0) + 1
  }
  catch (e: any) {
    state.error = `题目解析失败: ${e.message}`
    state.questions = []
  }

  return state
}

async function generateQuestions(state: WorkflowState): Promise<WorkflowState> {
  const nodeConfig = getNodeConfig(state, 'generate_questions')
  const llm = nodeConfig
    ? makeLLM(nodeConfig.modelInfo, nodeConfig.config)
    : makeLLM()

  const systemPrompt = `你是出题助手，根据笔记内容生成题目。
  每道题必须包含：
  - type: "single_choice" | "multiple_choice" | "true_false"
  - question: 题目内容
  - options: 选项数组
  - answer: 正确答案
  - explanation: 答案解析
  ${state.revision_note ? `\n用户修改建议：${state.revision_note}\n请根据建议调整输出。` : ''}
  
  直接输出JSON数组。`
  const prompt = ChatPromptTemplate.fromMessages([
    ['system', systemPrompt],
    ['human', '{text}'],
  ])

  const chain = prompt.pipe(llm)

  const result = await chain.invoke({
    text: state.text,
    num_questions: state.num_questions ?? 15,
  })

  try {
    let content = (result.content as string).trim()
    content = content.replace(/^```json\s*/i, '').replace(/\n?```\s*$/, '')
    const parsed = JSON.parse(content)
    state.questions = Array.isArray(parsed) ? parsed : [parsed]
    state.retry_count = (state.retry_count || 0) + 1
  }
  catch (e: any) {
    state.error = `题目生成失败: ${e.message}`
    state.questions = []
  }

  return state
}

// ---------- 4. 人工审核（等待前端反馈） ----------
const feedbackStore = new Map<string, HumanFeedbackInput>()

export function submitFeedback(workflowId: string, feedback: HumanFeedbackInput) {
  feedbackStore.set(workflowId, feedback)
}

async function waitForHumanFeedback(state: WorkflowState): Promise<WorkflowState> {
  const workflowId = state.file_path // 使用文件路径作为唯一ID
  const timeout = 90000 // 90秒
  const startTime = Date.now()

  // 轮询等待反馈
  while (Date.now() - startTime < timeout) {
    const feedback = feedbackStore.get(workflowId)
    if (feedback) {
      state.user_feedback = feedback.feedback
      state.revision_note = feedback.revision_note
      feedbackStore.delete(workflowId) // 清除已使用的反馈
      return state
    }
    await new Promise(resolve => setTimeout(resolve, 1000)) // 每秒检查一次
  }

  // 超时默认接受
  state.user_feedback = 'Accept'
  return state
}

// ---------- 5. 保存到文件 ----------
async function saveToFile(state: WorkflowState): Promise<WorkflowState> {
  try {
    const outputDir = process.env.OUTPUT_DIR || './output'
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const fileName = `quiz_${timestamp}.json`
    const filePath = join(outputDir, fileName)

    const output = {
      source: state.file_path,
      classification: state.classification,
      generated_at: new Date().toISOString(),
      questions: state.questions,
    }

    await writeFile(filePath, JSON.stringify(output, null, 2), 'utf-8')
    state.saved_path = filePath
  }
  catch (e) {
    state.error = `保存失败: ${e.message}`
  }

  return state
}

// ---------- 6. 检查错误 ----------
// eslint-disable-next-line unused-imports/no-unused-vars
function checkError(state: WorkflowState): string {
  if (state.error)
    return 'error'

  return 'continue'
}

// ---------- 7. 路由函数 ----------
function routeAfterClassification(state: WorkflowState): string {
  if (state.classification === 'mixed' || state.error)
    return 'error'
  if (state.classification === 'question')
    return 'parse'
  if (state.classification === 'note')
    return 'generate'
  return 'error'
}

function routeAfterFeedback(state: WorkflowState): string {
  if (!state.user_feedback || state.user_feedback === 'Accept')
    return 'save'

  if (state.user_feedback === 'Reject' || state.user_feedback === 'Revise') {
    // 防止无限循环
    if ((state.retry_count || 0) >= 5)
      return 'save'

    // 根据原始分类决定返回哪个节点
    return state.classification === 'question' ? 'retry_parse' : 'retry_generate'
  }

  return 'save'
}

// ---------- 8. 错误处理节点 ----------
async function handleError(state: WorkflowState): Promise<WorkflowState> {
  return state
}

// ---------- 构建工作流 ----------
export function buildWorkflow() {
  const workflow = new StateGraph<WorkflowState>({
    channels: {
      file_path: { value: '' },
      text: { value: '' },
      classification: { value: 'note' as ClassificationLabel },
      subject: { value: 'unknown' as Subject },
      questions: { value: [] as QuizItem[] },
      num_questions: { value: 15 },
      user_feedback: { value: undefined },
      revision_note: { value: undefined },
      error: { value: undefined },
      saved_path: { value: undefined },
      retry_count: { value: 0 },
      workflowConfig: { value: undefined },
    },
  })

  // 添加节点
  workflow.addNode('load_file', loadFile)
  workflow.addNode('classify', classify)
  workflow.addNode('parse_questions', parseQuestions)
  workflow.addNode('generate_questions', generateQuestions)
  workflow.addNode('wait_feedback', waitForHumanFeedback)
  workflow.addNode('save_file', saveToFile)
  workflow.addNode('handle_error', handleError)

  // 设置入口
  workflow.setEntrypoint('load_file')

  // 加载文件 -> 分类
  workflow.addEdge('load_file', 'classify')

  // 分类后的条件路由
  workflow.addConditionalEdges(
    'classify',
    routeAfterClassification,
    {
      parse: 'parse_questions', // 路径1：题目解析
      generate: 'generate_questions', // 路径2：笔记生成
      error: 'handle_error',
    },
  )

  // 解析题目 -> 等待反馈
  workflow.addEdge('parse_questions', 'wait_feedback')

  // 生成题目 -> 等待反馈
  workflow.addEdge('generate_questions', 'wait_feedback')

  // 反馈后的条件路由
  workflow.addConditionalEdges(
    'wait_feedback',
    routeAfterFeedback,
    {
      save: 'save_file',
      retry_parse: 'parse_questions', // 回到路径1
      retry_generate: 'generate_questions', // 回到路径2
    },
  )

  // 保存文件 -> 结束
  workflow.addEdge('save_file', END)

  // 错误处理 -> 结束
  workflow.addEdge('handle_error', END)

  return workflow.compile()
}

// ---------- 运行工作流 ----------
export async function runWorkflow(
  filePath: string,
  numQuestions?: number,
  workflowConfig?: WorkflowNodeConfig[],
): Promise<WorkflowState> {
  const app = buildWorkflow()
  const initState: WorkflowState = {
    file_path: filePath,
    text: '',
    classification: 'note',
    subject: 'unknown',
    questions: [],
    num_questions: numQuestions ?? 15,
    retry_count: 0,
    workflowConfig,
  }

  const finalState = await app.invoke(initState)

  return finalState
}

// ---------- 只执行分类 ----------
export async function classifyFile(filePath: string): Promise<{
  classification: string
  error?: string
}> {
  console.log('🎯 [工作流] 开始分类文件:', filePath)

  try {
    const state: WorkflowState = {
      file_path: filePath,
      text: '',
      classification: 'note',
      subject: 'unknown',
      questions: [],
      num_questions: 0,
      retry_count: 0,
    }

    console.log('📂 [工作流] 步骤 1: 加载文件...')
    // 加载文件
    await loadFile(state)
    console.log('✅ [工作流] 文件加载成功，文本长度:', state.text.length)

    console.log('🔍 [工作流] 步骤 2: 执行分类...')
    // 执行分类
    await classify(state)
    console.log('✅ [工作流] 分类完成:', {
      classification: state.classification,
      error: state.error,
    })

    return {
      classification: state.classification,
      error: state.error,
    }
  }
  catch (error: any) {
    console.error('❌ [工作流] 分类失败:', error)
    console.error('错误详情:', {
      message: error?.message,
      stack: error?.stack,
      type: typeof error,
    })
    return {
      classification: 'unknown',
      error: error?.message || String(error),
    }
  }
}

// ---------- 从笔记生成题目（指定题型和数量） ----------
export async function generateQuestionsFromNote(
  filePath: string,
  questionTypes: { single_choice: number, multiple_choice: number, true_false: number },
): Promise<WorkflowState & { scoreDistribution?: any }> {
  try {
    const state: WorkflowState = {
      file_path: filePath,
      text: '',
      classification: 'note',
      subject: 'unknown',
      questions: [],
      num_questions: 0,
      retry_count: 0,
    }

    // 加载文件
    await loadFile(state)

    // 构建提示词
    const totalQuestions
      = questionTypes.single_choice + questionTypes.multiple_choice + questionTypes.true_false

    const llm = makeLLM()
    const systemPrompt = `你是出题助手，根据笔记内容生成题目，并为每种题型分配分数。

请严格按照以下要求生成：
- 单选题：${questionTypes.single_choice}道
- 多选题：${questionTypes.multiple_choice}道
- 判断题：${questionTypes.true_false}道

请根据题目难度合理分配分数，一般来说：
- 单选题每题建议 3-5 分
- 多选题每题建议 5-8 分（难度较高）
- 判断题每题建议 2-3 分

每道题必须包含：
- type: "single_choice" | "multiple_choice" | "true_false"
- question: 题目内容
- options: 选项数组（判断题为 ["正确", "错误"]）
- answer: 正确答案（数组形式，如 ["A"] 或 ["A","B"]）
- explanation: 答案解析
- score: 该题分数（整数）

返回格式：
{{
  "questions": [...题目数组...],
  "scoreDistribution": {{
    "single_choice": {{ "perQuestion": 每题分数, "total": 单选题总分 }},
    "multiple_choice": {{ "perQuestion": 每题分数, "total": 多选题总分 }},
    "true_false": {{ "perQuestion": 每题分数, "total": 判断题总分 }}
  }}
}}

直接输出JSON对象，不要任何额外说明。`

    const prompt = ChatPromptTemplate.fromMessages([
      ['system', systemPrompt],
      ['human', '请根据以下笔记生成题目:\n\n{text}'],
    ])

    const chain = prompt.pipe(llm)
    const result = await chain.invoke({ text: state.text })

    let content = (result.content as string).trim()
    content = content.replace(/^```json\s*/i, '').replace(/\n?```\s*$/, '')
    const parsed = JSON.parse(content)

    // 兼容旧格式（直接返回数组）和新格式（返回对象）
    if (Array.isArray(parsed)) {
      state.questions = parsed
      state.num_questions = totalQuestions
      return state
    }
    else {
      state.questions = parsed.questions || []
      state.num_questions = totalQuestions
      return {
        ...state,
        scoreDistribution: parsed.scoreDistribution,
      }
    }
  }
  catch (error: any) {
    throw new Error(`生成题目失败: ${error?.message || String(error)}`)
  }
}

// ---------- 测试 LLM 连接 ----------
export async function testLLMConnection(): Promise<{
  success: boolean
  message: string
  model?: string
  response?: string
}> {
  console.log('🧪 [测试] 开始测试 LLM 连接...')

  try {
    // 创建 LLM 实例
    const llm = makeLLM()
    console.log('✅ [测试] LLM 实例创建成功')

    // 发送一个简单的测试问题
    const prompt = ChatPromptTemplate.fromMessages([
      ['system', '你是一个友好的助手。请用一句话回答问题。'],
      ['human', '请说"你好，LLM 连接成功！"'],
    ])

    const chain = prompt.pipe(llm)
    console.log('🔄 [测试] 正在发送测试请求...')

    const result = await chain.invoke({ text: '测试' })
    const response = (result.content as string).trim()

    console.log('✅ [测试] LLM 响应成功!')
    console.log('📝 [测试] 响应内容:', response)

    return {
      success: true,
      message: 'LLM 连接测试成功！',
      model: process.env.OPENAI_API_MODEL || 'gpt-4o-mini',
      response,
    }
  }
  catch (error: any) {
    console.error('❌ [测试] LLM 连接失败:', error)
    console.error('错误详情:', {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      status: error?.status,
      response: error?.response?.data,
    })

    return {
      success: false,
      message: `LLM 连接失败: ${error?.message || String(error)}`,
    }
  }
}
