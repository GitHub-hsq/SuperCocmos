// workflow.ts
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ChatOpenAI } from '@langchain/openai'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { END, StateGraph } from '@langchain/langgraph'
import type { ClassificationLabel, HumanFeedbackInput, QuizItem, WorkflowState } from './types'
import { loadFile } from './loader'

// ---------- LLM ----------
function makeLLM() {
  return new ChatOpenAI({
    model: process.env.OPENAI_API_MODEL || 'gpt-4o-mini',
    temperature: 0,
    apiKey: process.env.OPENAI_API_KEY,
    configuration: {
      baseURL: process.env.OPENAI_API_BASE_URL,
    },
    streaming: false,
  })
}

// ---------- 1. 分类器 ----------
const classifierPrompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    `你是一个分类器，判断输入文本的类型。
规则：
- 如果主要是知识点、概念、说明等内容，返回 'note'
- 如果主要是题目（包含题干、选项、答案），返回 'question'
- 如果同时包含大量笔记和题目，返回 'mixed'
只输出: note 或 question 或 mixed`,
  ],
  ['human', '{text}'],
])

async function classify(state: WorkflowState): Promise<WorkflowState> {
  const llm = makeLLM()
  const chain = classifierPrompt.pipe(llm)
  const result = await chain.invoke({ text: state.text.slice(0, 3000) }) // 只取前3000字符分类
  const label = (result.content as string).trim().toLowerCase()

  if (label.includes('mixed')) {
    state.classification = 'mixed'
    state.error = '文件同时包含笔记和题目，请分开处理'
  }
  else if (label.includes('note')) {
    state.classification = 'note'
  }
  else if (label.includes('question')) {
    state.classification = 'question'
  }
  else {
    state.classification = 'unknown'
  }

  return state
}

// ---------- 2. 题目解析（切片） ----------
// const parseQuestionsPrompt = ChatPromptTemplate.fromMessages([
//   [
//     'system',
//     `你是题目解析助手。将原始题目文本解析为标准JSON格式。
// 每道题必须包含：
// - type: "single_choice" | "multiple_choice" | "true_false"
// - question: 题目内容
// - options: 选项数组 ["A. ...", "B. ..."]
// - answer: 正确答案（如 ["A"] 或 ["A","B"]）
// - explanation: 答案解析

// ${state.revision_note ? `\n用户修改建议：${state.revision_note}\n请根据建议调整输出。` : ''}

// 直接输出JSON数组，不要任何额外说明。`,
//   ],
//   ['human', '{text}'],
// ])

async function parseQuestions(state: WorkflowState): Promise<WorkflowState> {
  const llm = makeLLM()

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
    content = content.replace(/^```json\s*\n?/i, '').replace(/\n?```\s*$/i, '')
    const parsed = JSON.parse(content)
    state.questions = Array.isArray(parsed) ? parsed : [parsed]
    state.retry_count = (state.retry_count || 0) + 1
  }
  catch (e) {
    state.error = `题目解析失败: ${e.message}`
    state.questions = []
  }

  return state
}

// ---------- 3. 笔记出题 ----------
// const notePrompt = ChatPromptTemplate.fromMessages([
//   [
//     'system',
//     `你是出题助手，根据笔记内容生成题目。
// 每道题必须包含：
// - type: "single_choice" | "multiple_choice" | "true_false"
// - question: 题目内容
// - options: 选项数组
// - answer: 正确答案
// - explanation: 答案解析

// ${state.revision_note ? `\n用户修改建议：${state.revision_note}\n请根据建议调整输出。` : ''}

// 直接输出JSON数组。`,
//   ],
//   ['human', '请根据以下笔记生成{num_questions}道题目:\n\n{text}'],
// ])

async function generateQuestions(state: WorkflowState): Promise<WorkflowState> {
  const llm = makeLLM()

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
    content = content.replace(/^```json\s*\n?/i, '').replace(/\n?```\s*$/i, '')
    const parsed = JSON.parse(content)
    state.questions = Array.isArray(parsed) ? parsed : [parsed]
    state.retry_count = (state.retry_count || 0) + 1
  }
  catch (e) {
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
      questions: { value: [] as QuizItem[] },
      num_questions: { value: 15 },
      user_feedback: { value: undefined },
      revision_note: { value: undefined },
      error: { value: undefined },
      saved_path: { value: undefined },
      retry_count: { value: 0 },
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
): Promise<WorkflowState> {
  const app = buildWorkflow()
  const initState: WorkflowState = {
    file_path: filePath,
    text: '',
    classification: 'note',
    questions: [],
    num_questions: numQuestions ?? 15,
    retry_count: 0,
  }

  const finalState = await app.invoke(initState)

  return finalState
}
