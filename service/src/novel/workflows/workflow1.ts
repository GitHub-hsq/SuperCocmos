/**
 * 工作流1：剧情大纲生成
 * 流程：idea -> 编剧AI -> 审核AI -> 修改循环(最多3次) -> 用户审核 -> 保存
 */

import { ChatPromptTemplate } from '@langchain/core/prompts'
import { END, START, StateGraph } from '@langchain/langgraph'
import { novelService } from '../../db/novelService'
import { makeReviewerLLM, makeScreenwriterLLM } from '../llmConfig'
import {
  generateOutlinePrompt,
  reviseOutlinePrompt,
  screenwriterSystemPrompt,
} from '../prompts/screenwriter'
import { reviewOutlinePrompt, reviewerSystemPrompt } from '../prompts/reviewer'
import type { ChatMessage, Workflow1State } from '../types'

const MAX_ITERATIONS = 3 // 最多审核3次

/**
 * 解析审核结果，提取分数
 */
function parseReviewScore(reviewText: string): number {
  // 尝试匹配【总分】：XX分
  const match = reviewText.match(/【总分】[：:]\s*(\d+)\s*分/)
  if (match)
    return Number.parseInt(match[1])

  // 尝试匹配其他格式
  const match2 = reviewText.match(/总分[：:]\s*(\d+)/)
  if (match2)
    return Number.parseInt(match2[1])

  // 如果无法解析，返回0
  console.warn('⚠️ 无法解析审核分数，返回0')
  return 0
}

/**
 * 节点1：生成初版大纲
 */
async function generateOutlineNode(state: Workflow1State): Promise<Partial<Workflow1State>> {
  console.warn('📝 [工作流1] 步骤1: 编剧AI生成初版大纲')

  const llm = makeScreenwriterLLM()
  const prompt = ChatPromptTemplate.fromMessages([
    ['system', screenwriterSystemPrompt],
    ['human', generateOutlinePrompt(state.idea, state.chat_history.map(m => `${m.role}: ${m.content}`).join('\n'))],
  ])

  const chain = prompt.pipe(llm)
  const result = await chain.invoke({})

  const outline = result.content.toString()

  console.warn('✅ [工作流1] 初版大纲生成完成，字数:', outline.length)

  return {
    outline,
    iteration_count: state.iteration_count + 1,
  }
}

/**
 * 节点2：审核大纲
 */
async function reviewOutlineNode(state: Workflow1State): Promise<Partial<Workflow1State>> {
  console.warn('🔍 [工作流1] 步骤2: 审核AI审查大纲')

  const llm = makeReviewerLLM()
  const prompt = ChatPromptTemplate.fromMessages([
    ['system', reviewerSystemPrompt],
    ['human', reviewOutlinePrompt(state.outline!, state.idea)],
  ])

  const chain = prompt.pipe(llm)
  const result = await chain.invoke({})

  const reviewText = result.content.toString()
  const score = parseReviewScore(reviewText)

  console.warn(`✅ [工作流1] 审核完成，得分: ${score}/100`)

  // 保存最优解
  const isBest = !state.best_score || score > state.best_score

  return {
    review_score: score,
    review_feedback: reviewText,
    ...(isBest && {
      best_outline: state.outline,
      best_score: score,
    }),
  }
}

/**
 * 节点3：修改大纲
 */
async function reviseOutlineNode(state: Workflow1State): Promise<Partial<Workflow1State>> {
  console.warn(`📝 [工作流1] 步骤3: 编剧AI修改大纲 (第${state.iteration_count}次迭代)`)

  const llm = makeScreenwriterLLM()
  const prompt = ChatPromptTemplate.fromMessages([
    ['system', screenwriterSystemPrompt],
    ['human', reviseOutlinePrompt(state.outline!, state.review_feedback!)],
  ])

  const chain = prompt.pipe(llm)
  const result = await chain.invoke({})

  const outline = result.content.toString()

  console.warn('✅ [工作流1] 大纲修改完成')

  return {
    outline,
    iteration_count: state.iteration_count + 1,
  }
}

/**
 * 路由函数：根据审核结果决定下一步
 */
function routeAfterReview(state: Workflow1State): string {
  const score = state.review_score || 0

  // 分数>=80，直接通过
  if (score >= 80) {
    console.warn('🎉 [工作流1] 大纲通过审核！')
    return 'save'
  }

  // 已经迭代3次，取最优解
  if (state.iteration_count >= MAX_ITERATIONS) {
    console.warn('⚠️ [工作流1] 已达最大迭代次数，取最优解')
    return 'use_best'
  }

  // 继续修改
  console.warn('🔄 [工作流1] 大纲需要修改，继续迭代')
  return 'revise'
}

/**
 * 节点4：使用最优解
 */
async function useBestOutlineNode(state: Workflow1State): Promise<Partial<Workflow1State>> {
  console.warn(`📋 [工作流1] 使用最优解，分数: ${state.best_score}/100`)

  return {
    outline: state.best_outline,
    review_score: state.best_score,
  }
}

/**
 * 节点5：保存大纲到数据库
 */
async function saveOutlineNode(state: Workflow1State): Promise<Partial<Workflow1State>> {
  console.warn('💾 [工作流1] 保存大纲到数据库')

  try {
    // 更新volume的outline字段
    await novelService.updateVolume(state.volume_id, {
      outline: state.outline,
      status: 'styling', // 更新状态为下一阶段
    })

    // 更新工作流执行状态
    if (state.execution_id) {
      await novelService.updateWorkflowExecution(state.execution_id, {
        status: 'completed',
        output: {
          outline: state.outline,
          score: state.review_score,
          iterations: state.iteration_count,
        },
      })
    }

    console.warn('✅ [工作流1] 大纲保存成功')

    return {}
  }
  catch (error: any) {
    console.error('❌ [工作流1] 保存失败:', error.message)

    if (state.execution_id) {
      await novelService.updateWorkflowExecution(state.execution_id, {
        status: 'failed',
        error: error.message,
      })
    }

    throw error
  }
}

/**
 * 构建工作流图
 */
export function buildWorkflow1() {
  const workflow = new StateGraph<Workflow1State>({
    channels: {
      volume_id: { value: (left?: string, right?: string) => right ?? left ?? '' },
      user_id: { value: (left?: string, right?: string) => right ?? left ?? '' },
      idea: { value: (left?: string, right?: string) => right ?? left ?? '' },
      chat_history: { value: (left?: ChatMessage[], right?: ChatMessage[]) => right ?? left ?? [] },
      outline: { value: (left?: string, right?: string) => right ?? left },
      review_score: { value: (left?: number, right?: number) => right ?? left },
      review_feedback: { value: (left?: string, right?: string) => right ?? left },
      iteration_count: { value: (left?: number, right?: number) => right ?? left ?? 0 },
      best_outline: { value: (left?: string, right?: string) => right ?? left },
      best_score: { value: (left?: number, right?: number) => right ?? left },
      execution_id: { value: (left?: string, right?: string) => right ?? left },
    },
  })

  // 添加节点
  workflow.addNode('generate', generateOutlineNode)
  workflow.addNode('review', reviewOutlineNode)
  workflow.addNode('revise', reviseOutlineNode)
  workflow.addNode('use_best', useBestOutlineNode)
  workflow.addNode('save', saveOutlineNode)

  // 添加边
  workflow.addEdge(START, 'generate')
  workflow.addEdge('generate', 'review')

  // 条件路由
  workflow.addConditionalEdges('review', routeAfterReview, {
    save: 'save',
    use_best: 'use_best',
    revise: 'revise',
  })

  workflow.addEdge('revise', 'review') // 修改后再次审核
  workflow.addEdge('use_best', 'save') // 最优解直接保存
  workflow.addEdge('save', END)

  return workflow.compile()
}

/**
 * 执行工作流1
 */
export async function runWorkflow1(
  volumeId: string,
  userId: string,
  executionId: string,
  input: { idea?: string, chat_history?: ChatMessage[] },
): Promise<void> {
  try {
    console.warn('🚀 [工作流1] 开始执行')

    // 获取volume信息
    const volume = await novelService.getVolume(volumeId)

    // 构建初始状态
    const initialState: Workflow1State = {
      volume_id: volumeId,
      user_id: userId,
      idea: input.idea || volume.novel_id, // 如果没有提供idea，使用novel的idea
      chat_history: input.chat_history || [],
      iteration_count: 0,
      execution_id: executionId,
    }

    // 执行工作流
    const app = buildWorkflow1()
    const result = await app.invoke(initialState)

    console.warn('🎉 [工作流1] 执行完成')
    console.warn('📊 最终结果:', {
      score: result.review_score,
      iterations: result.iteration_count,
    })
  }
  catch (error: any) {
    console.error('❌ [工作流1] 执行失败:', error)

    // 更新执行状态为失败
    await novelService.updateWorkflowExecution(executionId, {
      status: 'failed',
      error: error.message,
    })

    throw error
  }
}
