import type { ClassificationLabel, HumanFeedbackInput, ModelConfig, ModelInfo, QuizItem, Subject, WorkflowNodeConfig, WorkflowNodeType, WorkflowState } from './types'
// workflow.ts
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { END, StateGraph } from '@langchain/langgraph'
import { ChatOpenAI } from '@langchain/openai'
import {
  DEFAULT_CLASSIFIER_PROMPT,
  DEFAULT_GENERATE_QUESTIONS_PROMPT,
  DEFAULT_PARSE_QUESTIONS_PROMPT,
  DEFAULT_REVIEW_AND_SCORE_PROMPT,
  getDefaultGenerateQuestionsWithTypesPrompt,
} from './defaultPrompts'
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

  console.warn('🔑 [LLM配置]', {
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
async function classify(state: WorkflowState): Promise<WorkflowState> {
  console.warn('🤖 [分类器] 开始调用 LLM 进行分类...')
  console.warn('📝 [分类器] 文本预览 (前100字):', state.text.slice(0, 100))

  try {
    const nodeConfig = getNodeConfig(state, 'classify')
    const llm = nodeConfig
      ? makeLLM(nodeConfig.modelInfo, nodeConfig.config)
      : makeLLM()

    // 🔥 优先使用用户配置的提示词，否则使用默认提示词
    const systemPrompt = nodeConfig?.systemPrompt || DEFAULT_CLASSIFIER_PROMPT
    const classifierPrompt = ChatPromptTemplate.fromMessages([
      ['system', systemPrompt],
      ['human', '{text}'],
    ])

    const chain = classifierPrompt.pipe(llm)
    const textSample = state.text.slice(0, 3000)

    console.warn('🔄 [分类器] 发送文本给 LLM，长度:', textSample.length)

    const result = await chain.invoke({ text: textSample })
    const response = (result.content as string).trim().toLowerCase()

    console.warn('📊 [分类器] LLM 返回结果:', response)

    // 解析响应
    const typeMatch = response.match(/type:\s*(note|question|mixed|unknown)/)
    const subjectMatch = response.match(/subject:\s*(math|physics|chemistry|biology|chinese|english|unknown)/)

    const type = typeMatch?.[1] || 'unknown'
    const subject = subjectMatch?.[1] || 'unknown'

    state.classification = type as ClassificationLabel
    state.subject = subject as Subject

    console.warn('✅ [分类器] 分类结果:', {
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

  // 🔥 优先使用用户配置的提示词，否则使用默认提示词
  const basePrompt = nodeConfig?.systemPrompt || DEFAULT_PARSE_QUESTIONS_PROMPT

  // 动态拼接用户修改建议（如果有）
  const systemPrompt = state.revision_note
    ? `${basePrompt}\n\n### 用户修改建议\n\`\`\`\n${state.revision_note}\n\`\`\`\n\n请根据用户的修改建议调整解析结果：\n- 如果建议修正答案，请核实并修改\n- 如果建议调整选项，请相应修改\n- 如果建议删除某些题目，请过滤掉\n- 在 explanation 中说明修改内容`
    : basePrompt

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

  // 🔥 优先使用用户配置的提示词，否则使用默认提示词
  const basePrompt = nodeConfig?.systemPrompt || DEFAULT_GENERATE_QUESTIONS_PROMPT

  // 动态拼接用户修改建议（如果有）
  const systemPrompt = state.revision_note
    ? `${basePrompt}\n\n## 用户修改建议处理\n\n### 用户修改建议\n\`\`\`\n${state.revision_note}\n\`\`\`\n\n请根据用户的修改建议调整题目生成：\n- 如果建议调整难度，请相应修改题目复杂度\n- 如果建议增加某个知识点，请增加相关题目\n- 如果建议修改题型比例，请调整题型分配\n- 如果建议修改具体题目，请针对性修改`
    : basePrompt

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

// ---------- 4. 审核专家AI（审核质量并分配分数） ----------
async function reviewAndScore(state: WorkflowState): Promise<WorkflowState> {
  console.warn('🔍 [审核专家] 开始审核题目质量并分配分数...')

  try {
    const nodeConfig = getNodeConfig(state, 'review_and_score')
    const llm = nodeConfig
      ? makeLLM(nodeConfig.modelInfo, nodeConfig.config)
      : makeLLM()

    // 🔥 优先使用用户配置的提示词，否则使用默认提示词
    const systemPrompt = nodeConfig?.systemPrompt || DEFAULT_REVIEW_AND_SCORE_PROMPT

    const prompt = ChatPromptTemplate.fromMessages([
      ['system', systemPrompt],
      ['human', '请审核以下题目并分配分数:\n\n{questions}'],
    ])

    const chain = prompt.pipe(llm)

    // 将题目转换为 JSON 字符串传递给 LLM
    const questionsJson = JSON.stringify(state.questions, null, 2)

    const result = await chain.invoke({
      questions: questionsJson,
    })

    // 解析结果
    let content = (result.content as string).trim()
    content = content.replace(/^```json\s*/i, '').replace(/\n?```\s*$/, '')
    const parsed = JSON.parse(content)

    // 更新状态
    if (parsed.questions && Array.isArray(parsed.questions)) {
      state.questions = parsed.questions
      console.warn('✅ [审核专家] 审核完成，已分配分数')

      // 验证总分
      if (parsed.scoreDistribution) {
        const totalScore = parsed.scoreDistribution.totalScore
        console.warn(`📊 [审核专家] 分数统计: 总分=${totalScore}`)

        if (totalScore !== 100) {
          console.warn(`⚠️ [审核专家] 警告：总分不是100分（实际为${totalScore}分）`)
        }
      }
    }
    else {
      throw new Error('审核结果格式错误：缺少 questions 数组')
    }

    state.retry_count = (state.retry_count || 0) + 1
  }
  catch (e: any) {
    console.error('❌ [审核专家] 审核失败:', e.message)
    state.error = `题目审核失败: ${e.message}`
    state.questions = []
  }

  return state
}

// ---------- 5. 人工审核（等待前端反馈） ----------
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
  workflow.addNode('review_and_score', reviewAndScore)
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

  // 解析题目 -> 审核并分配分数
  workflow.addEdge('parse_questions', 'review_and_score')

  // 生成题目 -> 审核并分配分数
  workflow.addEdge('generate_questions', 'review_and_score')

  // 审核完成 -> 等待反馈
  workflow.addEdge('review_and_score', 'wait_feedback')

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
export async function classifyFile(
  filePath: string,
  workflowConfig?: WorkflowNodeConfig[],
): Promise<{
  classification: string
  error?: string
}> {
  console.warn('🎯 [工作流] 开始分类文件:', filePath)

  try {
    const state: WorkflowState = {
      file_path: filePath,
      text: '',
      classification: 'note',
      subject: 'unknown',
      questions: [],
      num_questions: 0,
      retry_count: 0,
      workflowConfig,
    }

    console.warn('📂 [工作流] 步骤 1: 加载文件...')
    // 加载文件
    await loadFile(state)
    console.warn('✅ [工作流] 文件加载成功，文本长度:', state.text.length)

    console.warn('🔍 [工作流] 步骤 2: 执行分类...')
    // 执行分类
    await classify(state)
    console.warn('✅ [工作流] 分类完成:', {
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
  workflowConfig?: WorkflowNodeConfig[],
  progressManager?: ReturnType<typeof import('./workflowProgressManager').createWorkflowProgressManager>,
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
      workflowConfig,
    }

    // 加载文件
    progressManager?.updateNodeStatus('generate_questions', 'running', '正在加载文件...')
    await loadFile(state)

    // 获取节点配置
    const nodeConfig = getNodeConfig(state, 'generate_questions')

    // 构建提示词
    const totalQuestions
      = questionTypes.single_choice + questionTypes.multiple_choice + questionTypes.true_false

    const llm = nodeConfig
      ? makeLLM(nodeConfig.modelInfo, nodeConfig.config)
      : makeLLM()

    // 🔥 优先使用用户配置的提示词，否则使用默认提示词
    const systemPrompt = nodeConfig?.systemPrompt || getDefaultGenerateQuestionsWithTypesPrompt(questionTypes)

    const prompt = ChatPromptTemplate.fromMessages([
      ['system', systemPrompt],
      ['human', '请根据以下笔记生成题目:\n\n{text}'],
    ])

    const chain = prompt.pipe(llm)
    progressManager?.updateNodeStatus('generate_questions', 'running', `正在生成 ${totalQuestions} 道题目...`)
    const result = await chain.invoke({ text: state.text })

    let content = (result.content as string).trim()
    content = content.replace(/^```json\s*/i, '').replace(/\n?```\s*$/, '')
    const parsed = JSON.parse(content)

    // 设置生成的题目到 state（题目此时没有分数）
    state.questions = Array.isArray(parsed) ? parsed : (parsed.questions || [])
    state.num_questions = totalQuestions

    console.warn('📝 [题目生成] 生成完成，共', state.questions.length, '题，开始审核...')
    progressManager?.updateNodeStatus(
      'generate_questions',
      'completed',
      `题目生成完成，共 ${state.questions.length} 题`,
      { questions: state.questions }, // 🔥 传递题目数据给前端
    )

    // 🔥 调用审核专家AI分配分数
    progressManager?.updateNodeStatus('review_and_score', 'running', '正在审核并分配分数...')
    await reviewAndScore(state)

    if (state.error) {
      throw new Error(state.error)
    }

    console.warn('✅ [题目生成] 审核完成，已分配分数')

    // 🔥 计算分数统计（提前计算，用于传递给前端）
    const tempScoreDistribution = {
      single_choice: { perQuestion: 0, total: 0 },
      multiple_choice: { perQuestion: 0, total: 0 },
      true_false: { perQuestion: 0, total: 0 },
      totalScore: 0,
    }

    state.questions.forEach((q) => {
      const score = q.score || 0
      if (q.type === 'single_choice') {
        tempScoreDistribution.single_choice.total += score
        if (tempScoreDistribution.single_choice.perQuestion === 0)
          tempScoreDistribution.single_choice.perQuestion = score
      }
      else if (q.type === 'multiple_choice') {
        tempScoreDistribution.multiple_choice.total += score
      }
      else if (q.type === 'true_false') {
        tempScoreDistribution.true_false.total += score
        if (tempScoreDistribution.true_false.perQuestion === 0)
          tempScoreDistribution.true_false.perQuestion = score
      }
      tempScoreDistribution.totalScore += score
    })

    progressManager?.updateNodeStatus(
      'review_and_score',
      'completed',
      '审核打分完成',
      { questions: state.questions, scoreDistribution: tempScoreDistribution }, // 🔥 传递题目和分数数据
    )

    // 🔥 保存最终的试卷到文件（包含分数）
    const { mkdir } = await import('node:fs/promises')
    const outputDir = join(process.cwd(), 'output', 'quiz')
    await mkdir(outputDir, { recursive: true })

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const outputFile = join(outputDir, `quiz_${timestamp}.json`)

    // 计算分数统计
    const scoreDistribution = {
      single_choice: { perQuestion: 0, total: 0 },
      multiple_choice: { perQuestion: 0, total: 0 },
      true_false: { perQuestion: 0, total: 0 },
      totalScore: 0,
    }

    state.questions.forEach((q) => {
      const score = q.score || 0
      if (q.type === 'single_choice') {
        scoreDistribution.single_choice.total += score
        if (scoreDistribution.single_choice.perQuestion === 0)
          scoreDistribution.single_choice.perQuestion = score
      }
      else if (q.type === 'multiple_choice') {
        scoreDistribution.multiple_choice.total += score
      }
      else if (q.type === 'true_false') {
        scoreDistribution.true_false.total += score
        if (scoreDistribution.true_false.perQuestion === 0)
          scoreDistribution.true_false.perQuestion = score
      }
      scoreDistribution.totalScore += score
    })

    // 计算多选题平均分
    const multipleChoiceCount = state.questions.filter(q => q.type === 'multiple_choice').length
    if (multipleChoiceCount > 0) {
      scoreDistribution.multiple_choice.perQuestion
        = Math.round(scoreDistribution.multiple_choice.total / multipleChoiceCount)
    }

    const outputData = {
      metadata: {
        generatedAt: new Date().toISOString(),
        sourceFile: filePath,
        questionTypes,
        totalQuestions,
      },
      result: {
        questions: state.questions,
        scoreDistribution,
      },
    }

    await writeFile(outputFile, JSON.stringify(outputData, null, 2), 'utf-8')
    console.warn('📝 [题目生成] 已保存到文件:', outputFile)

    return {
      ...state,
      scoreDistribution,
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
  console.warn('🧪 [测试] 开始测试 LLM 连接...')

  try {
    // 创建 LLM 实例
    const llm = makeLLM()
    console.warn('✅ [测试] LLM 实例创建成功')

    // 发送一个简单的测试问题
    const prompt = ChatPromptTemplate.fromMessages([
      ['system', '你是一个友好的助手。请用一句话回答问题。'],
      ['human', '请说"你好，LLM 连接成功！"'],
    ])

    const chain = prompt.pipe(llm)
    console.warn('🔄 [测试] 正在发送测试请求...')

    const result = await chain.invoke({ text: '测试' })
    const response = (result.content as string).trim()

    console.warn('✅ [测试] LLM 响应成功!')
    console.warn('📝 [测试] 响应内容:', response)

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
