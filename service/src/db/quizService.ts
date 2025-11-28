import type { SupabaseClient } from '@supabase/supabase-js'
import { CACHE_TTL, deleteCached, getCached, setCached } from '../cache/cacheService'
import { logger } from '../utils/logger'
import { supabase } from './supabaseClient'

// ============================================
// 试卷相关类型定义
// ============================================

export interface Quiz {
  id: string
  user_id: string
  title: string
  source_file?: string
  classification: 'note' | 'question' | 'mixed' | 'unknown'
  subject: 'math' | 'physics' | 'chemistry' | 'biology' | 'chinese' | 'english' | 'unknown'
  total_questions: number
  total_score: number
  question_types?: QuestionTypesDistribution
  score_distribution?: ScoreDistribution
  status: 'draft' | 'published' | 'archived'
  workflow_id?: string
  created_at: string
  updated_at: string
}

export interface QuestionTypesDistribution {
  single_choice?: number
  multiple_choice?: number
  true_false?: number
}

export interface ScoreDistribution {
  single_choice?: { perQuestion: number, total: number }
  multiple_choice?: { perQuestion: number, total: number }
  true_false?: { perQuestion: number, total: number }
  totalScore?: number
}

export interface QuizQuestion {
  id: string
  quiz_id: string
  type: 'single_choice' | 'multiple_choice' | 'true_false' | 'unknown'
  question: string
  options: string[] // JSONB 数组
  answer: string[] // JSONB 数组
  explanation?: string
  score: number
  difficulty: 'easy' | 'medium' | 'hard'
  knowledge_point?: string
  order_index: number
  created_at: string
}

export interface QuizSubmission {
  id: string
  quiz_id: string
  user_id: string
  answers: Record<string, string[]> // JSONB: { "question_id": ["A"], ... }
  score: number
  max_score: number
  correct_count: number
  wrong_count: number
  accuracy: number
  time_spent: number
  detailed_results?: any[] // JSONB
  submitted_at: string
}

// ============================================
// 参数类型定义
// ============================================

export interface CreateQuizParams {
  user_id: string
  title?: string
  source_file?: string
  classification?: 'note' | 'question' | 'mixed' | 'unknown'
  subject?: 'math' | 'physics' | 'chemistry' | 'biology' | 'chinese' | 'english' | 'unknown'
  total_questions?: number
  total_score?: number
  question_types?: QuestionTypesDistribution
  score_distribution?: ScoreDistribution
  status?: 'draft' | 'published' | 'archived'
  workflow_id?: string
}

export interface UpdateQuizParams {
  title?: string
  status?: 'draft' | 'published' | 'archived'
  total_questions?: number
  total_score?: number
}

export interface CreateQuizQuestionParams {
  quiz_id: string
  type: 'single_choice' | 'multiple_choice' | 'true_false' | 'unknown'
  question: string
  options: string[]
  answer: string[]
  explanation?: string
  score: number
  difficulty?: 'easy' | 'medium' | 'hard'
  knowledge_point?: string
  order_index: number
}

export interface CreateQuizSubmissionParams {
  quiz_id: string
  user_id: string
  answers: Record<string, string[]>
  score: number
  max_score: number
  correct_count: number
  wrong_count: number
  accuracy: number
  time_spent: number
  detailed_results?: any[]
}

// ============================================
// 缓存 Key 生成函数
// ============================================

const QUIZ_CACHE_KEYS = {
  userQuizzes: (userId: string) => `quizzes:user:${userId}`,
  quizById: (quizId: string) => `quiz:${quizId}`,
  quizQuestions: (quizId: string) => `quiz:${quizId}:questions`,
  userSubmissions: (userId: string) => `quiz:submissions:user:${userId}`,
  quizSubmissions: (quizId: string) => `quiz:${quizId}:submissions`,
}

// ============================================
// 试卷 CRUD 操作
// ============================================

/**
 * 🚀 创建新试卷
 */
export async function createQuiz(
  params: CreateQuizParams,
  client: SupabaseClient = supabase,
): Promise<Quiz | null> {
  try {
    const { data, error } = await client
      .from('quizzes')
      .insert([
        {
          user_id: params.user_id,
          title: params.title || '未命名试卷',
          source_file: params.source_file,
          classification: params.classification || 'unknown',
          subject: params.subject || 'unknown',
          total_questions: params.total_questions || 0,
          total_score: params.total_score || 0,
          question_types: params.question_types,
          score_distribution: params.score_distribution,
          status: params.status || 'draft',
          workflow_id: params.workflow_id,
        },
      ])
      .select()
      .single()

    if (error) {
      logger.error('❌ [Quiz] 创建试卷失败:', error)
      return null
    }

    // 清除用户试卷列表缓存
    const cacheKey = QUIZ_CACHE_KEYS.userQuizzes(params.user_id)
    await deleteCached(cacheKey)

    logger.debug('✅ [Quiz] 创建试卷成功:', data.id)
    return data as Quiz
  }
  catch (error) {
    logger.error('❌ [Quiz] 创建试卷异常:', error)
    return null
  }
}

/**
 * 🔍 根据ID获取试卷
 */
export async function getQuizById(
  quizId: string,
  client: SupabaseClient = supabase,
): Promise<Quiz | null> {
  try {
    // 尝试从缓存获取
    const cacheKey = QUIZ_CACHE_KEYS.quizById(quizId)
    const cached = await getCached<Quiz>(cacheKey)
    if (cached)
      return cached

    const { data, error } = await client
      .from('quizzes')
      .select('*')
      .eq('id', quizId)
      .single()

    if (error || !data) {
      logger.error('❌ [Quiz] 获取试卷失败:', error)
      return null
    }

    // 写入缓存
    await setCached(cacheKey, data, CACHE_TTL.MEDIUM)
    return data as Quiz
  }
  catch (error) {
    logger.error('❌ [Quiz] 获取试卷异常:', error)
    return null
  }
}

/**
 * 🔍 根据ID获取试卷（带权限验证）
 */
export async function getQuizByIdWithAuth(
  quizId: string,
  userId: string,
  client: SupabaseClient = supabase,
): Promise<Quiz | null> {
  try {
    const { data, error } = await client
      .from('quizzes')
      .select('*')
      .eq('id', quizId)
      .eq('user_id', userId)
      .single()

    if (error || !data) {
      logger.warn('⚠️ [Quiz] 试卷不存在或无权限访问:', quizId)
      return null
    }

    return data as Quiz
  }
  catch (error) {
    logger.error('❌ [Quiz] 获取试卷异常:', error)
    return null
  }
}

/**
 * 📋 获取用户所有试卷
 */
export async function getUserQuizzes(
  userId: string,
  options?: { limit?: number, offset?: number, status?: 'draft' | 'published' | 'archived' },
  client: SupabaseClient = supabase,
): Promise<Quiz[]> {
  try {
    // 尝试从缓存获取（仅在无筛选条件时）
    if (!options?.status) {
      const cacheKey = QUIZ_CACHE_KEYS.userQuizzes(userId)
      const cached = await getCached<Quiz[]>(cacheKey)
      if (cached)
        return cached
    }

    let query = client
      .from('quizzes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (options?.status)
      query = query.eq('status', options.status)

    if (options?.limit)
      query = query.limit(options.limit)

    if (options?.offset)
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1)

    const { data, error } = await query

    if (error) {
      logger.error('❌ [Quiz] 获取用户试卷列表失败:', error)
      return []
    }

    // 写入缓存（仅在无筛选条件时）
    if (!options?.status && data) {
      const cacheKey = QUIZ_CACHE_KEYS.userQuizzes(userId)
      await setCached(cacheKey, data, CACHE_TTL.MEDIUM)
    }

    return (data || []) as Quiz[]
  }
  catch (error) {
    logger.error('❌ [Quiz] 获取用户试卷列表异常:', error)
    return []
  }
}

/**
 * ✏️ 更新试卷
 */
export async function updateQuiz(
  quizId: string,
  params: UpdateQuizParams,
  client: SupabaseClient = supabase,
): Promise<boolean> {
  try {
    const { error } = await client
      .from('quizzes')
      .update(params)
      .eq('id', quizId)

    if (error) {
      logger.error('❌ [Quiz] 更新试卷失败:', error)
      return false
    }

    // 清除缓存
    const quiz = await getQuizById(quizId, client)
    if (quiz) {
      await deleteCached(QUIZ_CACHE_KEYS.quizById(quizId))
      await deleteCached(QUIZ_CACHE_KEYS.userQuizzes(quiz.user_id))
    }

    logger.debug('✅ [Quiz] 更新试卷成功:', quizId)
    return true
  }
  catch (error) {
    logger.error('❌ [Quiz] 更新试卷异常:', error)
    return false
  }
}

/**
 * 🗑️ 删除试卷（级联删除题目和提交记录）
 */
export async function deleteQuiz(
  quizId: string,
  client: SupabaseClient = supabase,
): Promise<boolean> {
  try {
    // 先获取试卷信息（用于清除缓存）
    const quiz = await getQuizById(quizId, client)
    if (!quiz)
      return false

    const { error } = await client
      .from('quizzes')
      .delete()
      .eq('id', quizId)

    if (error) {
      logger.error('❌ [Quiz] 删除试卷失败:', error)
      return false
    }

    // 清除相关缓存
    await deleteCached(QUIZ_CACHE_KEYS.quizById(quizId))
    await deleteCached(QUIZ_CACHE_KEYS.userQuizzes(quiz.user_id))
    await deleteCached(QUIZ_CACHE_KEYS.quizQuestions(quizId))
    await deleteCached(QUIZ_CACHE_KEYS.quizSubmissions(quizId))

    logger.debug('✅ [Quiz] 删除试卷成功:', quizId)
    return true
  }
  catch (error) {
    logger.error('❌ [Quiz] 删除试卷异常:', error)
    return false
  }
}

// ============================================
// 试卷题目操作
// ============================================

/**
 * ➕ 添加题目到试卷
 */
export async function addQuizQuestion(
  params: CreateQuizQuestionParams,
  client: SupabaseClient = supabase,
): Promise<QuizQuestion | null> {
  try {
    const { data, error } = await client
      .from('quiz_questions')
      .insert([params])
      .select()
      .single()

    if (error) {
      logger.error('❌ [Quiz] 添加题目失败:', error)
      return null
    }

    // 清除缓存
    await deleteCached(QUIZ_CACHE_KEYS.quizQuestions(params.quiz_id))

    logger.debug('✅ [Quiz] 添加题目成功:', data.id)
    return data as QuizQuestion
  }
  catch (error) {
    logger.error('❌ [Quiz] 添加题目异常:', error)
    return null
  }
}

/**
 * 📦 批量添加题目
 */
export async function addQuizQuestionsBatch(
  quizId: string,
  questions: Omit<CreateQuizQuestionParams, 'quiz_id'>[],
  client: SupabaseClient = supabase,
): Promise<boolean> {
  try {
    const questionsWithQuizId = questions.map(q => ({ ...q, quiz_id: quizId }))

    const { error } = await client
      .from('quiz_questions')
      .insert(questionsWithQuizId)

    if (error) {
      logger.error('❌ [Quiz] 批量添加题目失败:', error)
      return false
    }

    // 清除缓存
    await deleteCached(QUIZ_CACHE_KEYS.quizQuestions(quizId))

    logger.debug(`✅ [Quiz] 批量添加 ${questions.length} 道题目成功`)
    return true
  }
  catch (error) {
    logger.error('❌ [Quiz] 批量添加题目异常:', error)
    return false
  }
}

/**
 * 📋 获取试卷的所有题目
 */
export async function getQuizQuestions(
  quizId: string,
  client: SupabaseClient = supabase,
): Promise<QuizQuestion[]> {
  try {
    // 尝试从缓存获取
    const cacheKey = QUIZ_CACHE_KEYS.quizQuestions(quizId)
    const cached = await getCached<QuizQuestion[]>(cacheKey)
    if (cached)
      return cached

    const { data, error } = await client
      .from('quiz_questions')
      .select('*')
      .eq('quiz_id', quizId)
      .order('order_index', { ascending: true })

    if (error) {
      logger.error('❌ [Quiz] 获取题目列表失败:', error)
      return []
    }

    // 写入缓存
    if (data) {
      await setCached(cacheKey, data, CACHE_TTL.MEDIUM)
    }

    return (data || []) as QuizQuestion[]
  }
  catch (error) {
    logger.error('❌ [Quiz] 获取题目列表异常:', error)
    return []
  }
}

/**
 * 🗑️ 删除题目
 */
export async function deleteQuizQuestion(
  questionId: string,
  quizId: string,
  client: SupabaseClient = supabase,
): Promise<boolean> {
  try {
    const { error } = await client
      .from('quiz_questions')
      .delete()
      .eq('id', questionId)

    if (error) {
      logger.error('❌ [Quiz] 删除题目失败:', error)
      return false
    }

    // 清除缓存
    await deleteCached(QUIZ_CACHE_KEYS.quizQuestions(quizId))

    logger.debug('✅ [Quiz] 删除题目成功:', questionId)
    return true
  }
  catch (error) {
    logger.error('❌ [Quiz] 删除题目异常:', error)
    return false
  }
}

// ============================================
// 答题记录操作
// ============================================

/**
 * 📝 创建答题记录
 */
export async function createQuizSubmission(
  params: CreateQuizSubmissionParams,
  client: SupabaseClient = supabase,
): Promise<QuizSubmission | null> {
  try {
    const { data, error } = await client
      .from('quiz_submissions')
      .insert([params])
      .select()
      .single()

    if (error) {
      logger.error('❌ [Quiz] 创建答题记录失败:', error)
      return null
    }

    // 清除缓存
    await deleteCached(QUIZ_CACHE_KEYS.userSubmissions(params.user_id))
    await deleteCached(QUIZ_CACHE_KEYS.quizSubmissions(params.quiz_id))

    logger.debug('✅ [Quiz] 创建答题记录成功:', data.id)
    return data as QuizSubmission
  }
  catch (error) {
    logger.error('❌ [Quiz] 创建答题记录异常:', error)
    return null
  }
}

/**
 * 📋 获取用户的答题记录
 */
export async function getUserQuizSubmissions(
  userId: string,
  options?: { limit?: number, offset?: number },
  client: SupabaseClient = supabase,
): Promise<QuizSubmission[]> {
  try {
    let query = client
      .from('quiz_submissions')
      .select('*')
      .eq('user_id', userId)
      .order('submitted_at', { ascending: false })

    if (options?.limit)
      query = query.limit(options.limit)

    if (options?.offset)
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1)

    const { data, error } = await query

    if (error) {
      logger.error('❌ [Quiz] 获取用户答题记录失败:', error)
      return []
    }

    return (data || []) as QuizSubmission[]
  }
  catch (error) {
    logger.error('❌ [Quiz] 获取用户答题记录异常:', error)
    return []
  }
}

/**
 * 📋 获取试卷的所有答题记录
 */
export async function getQuizSubmissions(
  quizId: string,
  client: SupabaseClient = supabase,
): Promise<QuizSubmission[]> {
  try {
    const { data, error } = await client
      .from('quiz_submissions')
      .select('*')
      .eq('quiz_id', quizId)
      .order('submitted_at', { ascending: false })

    if (error) {
      logger.error('❌ [Quiz] 获取试卷答题记录失败:', error)
      return []
    }

    return (data || []) as QuizSubmission[]
  }
  catch (error) {
    logger.error('❌ [Quiz] 获取试卷答题记录异常:', error)
    return []
  }
}

/**
 * 🔍 获取用户对某个试卷的答题记录
 */
export async function getUserQuizSubmission(
  userId: string,
  quizId: string,
  client: SupabaseClient = supabase,
): Promise<QuizSubmission | null> {
  try {
    const { data, error } = await client
      .from('quiz_submissions')
      .select('*')
      .eq('user_id', userId)
      .eq('quiz_id', quizId)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      logger.debug('ℹ️ [Quiz] 未找到答题记录')
      return null
    }

    return data as QuizSubmission
  }
  catch (error) {
    logger.error('❌ [Quiz] 获取答题记录异常:', error)
    return null
  }
}

// ============================================
// 导出所有函数
// ============================================

export const quizService = {
  // 试卷操作
  createQuiz,
  getQuizById,
  getQuizByIdWithAuth,
  getUserQuizzes,
  updateQuiz,
  deleteQuiz,

  // 题目操作
  addQuizQuestion,
  addQuizQuestionsBatch,
  getQuizQuestions,
  deleteQuizQuestion,

  // 答题记录操作
  createQuizSubmission,
  getUserQuizSubmissions,
  getQuizSubmissions,
  getUserQuizSubmission,
}
