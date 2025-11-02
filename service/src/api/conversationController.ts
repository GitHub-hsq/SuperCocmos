/**
 * 会话管理控制器
 * 处理用户会话的 CRUD 操作
 */

import type { Request, Response } from 'express'
import {
  createConversation,
  deleteConversation,
  getUserConversations,
  updateConversation,
} from '../db/conversationService'
import {
  createMessages,
  getConversationMessages,
} from '../db/messageService'

/**
 * 从 Auth0 token 中获取 Auth0 ID
 */
async function getAuth0IdFromRequest(req: Request): Promise<string | null> {
  // 🔥 从 Auth0 中间件设置的 userId 获取（优先）
  const userId = (req as any).userId
  if (userId) {
    return userId
  }

  // 从 Auth0 token 中获取
  const auth = (req as any).auth
  if (auth?.sub) {
    return auth.sub
  }

  // 从 session 中获取（兼容旧版本）
  const session = (req as any).session
  if (session?.userId) {
    return session.userId
  }

  return null
}

/**
 * 🔥 从 Auth0 ID 获取 Supabase 用户 UUID（用于数据库查询）
 */
async function getSupabaseUserIdFromRequest(req: Request): Promise<string | null> {
  const stepStart = performance.now()

  const auth0Id = await getAuth0IdFromRequest(req)
  if (!auth0Id) {
    return null
  }

  try {
    const { findUserByAuth0Id } = await import('../db/supabaseUserService')
    const user = await findUserByAuth0Id(auth0Id)
    const stepTime = performance.now() - stepStart

    if (user) {
      console.warn(`✅ [getSupabaseUserIdFromRequest] 查询用户成功，耗时: ${stepTime.toFixed(0)}ms`)
    }
    else {
      console.warn(`❌ [getSupabaseUserIdFromRequest] 用户不存在，耗时: ${stepTime.toFixed(0)}ms`)
    }

    return user?.user_id || null
  }
  catch (error) {
    const stepTime = performance.now() - stepStart
    console.error(`❌ [getUserId] 查询失败，耗时: ${stepTime.toFixed(0)}ms`, error)
    return null
  }
}

/**
 * 🔥 辅助函数：通过前端 UUID 或后端 UUID 获取会话
 * 支持前端 UUID（nanoid）和后端 UUID（标准 UUID 格式）
 */
async function getConversationByIdOrFrontendUuid(
  id: string,
  userId: string,
): Promise<{ conversation: any, backendId: string } | null> {
  const stepStart = performance.now()

  // UUID 格式验证（PostgreSQL UUID 格式）
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  const isBackendUuid = uuidRegex.test(id)

  console.warn(`🔍 [getConversationByIdOrFrontendUuid] 开始查找会话:`, {
    id,
    userId: `${userId.substring(0, 8)}...`,
    isBackendUuid,
  })

  let conversation = null

  // 🔥 优化：优先使用后端 UUID 查找（因为有缓存），前端 UUID 作为降级方案
  if (isBackendUuid) {
    // 步骤1: 如果是后端 UUID，直接查找（有缓存，快）
    const step1Start = performance.now()
    const { getConversationByIdWithAuth } = await import('../db/conversationService')
    conversation = await getConversationByIdWithAuth(id, userId)
    const step1Time = performance.now() - step1Start

    if (conversation) {
      console.warn(`✅ [getConversationByIdOrFrontendUuid] 通过后端 UUID 找到会话: ${conversation.id}, 耗时: ${step1Time.toFixed(0)}ms`)
    }
    else {
      console.warn(`❌ [getConversationByIdOrFrontendUuid] 通过后端 UUID 未找到会话, 耗时: ${step1Time.toFixed(0)}ms`)
    }
  }
  else {
    // 步骤2: 如果是前端 UUID，先尝试前端查找
    const step2Start = performance.now()
    const { getConversationByFrontendUuid } = await import('../db/conversationService')
    conversation = await getConversationByFrontendUuid(id, userId)
    const step2Time = performance.now() - step2Start

    if (conversation) {
      console.warn(`✅ [getConversationByIdOrFrontendUuid] 通过 frontend_uuid 找到会话: ${conversation.id}, 耗时: ${step2Time.toFixed(0)}ms`)
    }
    else {
      console.warn(`❌ [getConversationByIdOrFrontendUuid] 通过 frontend_uuid 未找到会话, 耗时: ${step2Time.toFixed(0)}ms`)
    }
  }

  if (!conversation) {
    const totalTime = performance.now() - stepStart
    console.warn(`❌ [getConversationByIdOrFrontendUuid] 会话查找失败，总耗时: ${totalTime.toFixed(0)}ms`)
    return null
  }

  const totalTime = performance.now() - stepStart
  console.warn(`✅ [getConversationByIdOrFrontendUuid] 会话查找成功，总耗时: ${totalTime.toFixed(0)}ms`)
  return { conversation, backendId: conversation.id }
}

/**
 * 获取用户的所有会话列表
 * GET /api/conversations
 */
export async function getUserConversationsHandler(req: Request, res: Response) {
  try {
    const userId = await getSupabaseUserIdFromRequest(req)
    if (!userId) {
      return res.status(401).json({
        status: 'Fail',
        message: '未授权：用户未登录',
        data: null,
      })
    }

    const limit = Number.parseInt(req.query.limit as string) || 50
    const offset = Number.parseInt(req.query.offset as string) || 0

    const conversations = await getUserConversations(userId, { limit, offset })

    // 🔥 确保返回数组（即使为空），新用户没有会话是正常情况
    res.json({
      status: 'Success',
      message: '获取会话列表成功',
      data: conversations || [], // 确保返回数组，即使为空
    })
  }
  catch (error: any) {
    console.error('❌ [Conversation] 获取会话列表失败:', error)
    // 🔥 即使出错也返回空数组，不返回 500，让前端能正常处理
    res.json({
      status: 'Success',
      message: '获取会话列表成功',
      data: [], // 降级处理：返回空数组
    })
  }
}

/**
 * 获取指定会话的详细信息
 * GET /api/conversations/:id
 */
export async function getConversationByIdHandler(req: Request, res: Response) {
  try {
    const userId = await getSupabaseUserIdFromRequest(req)
    if (!userId) {
      return res.status(401).json({
        status: 'Fail',
        message: '未授权：用户未登录',
        data: null,
      })
    }

    const { id } = req.params

    // 🔥 支持前端 UUID 和后端 UUID
    const result = await getConversationByIdOrFrontendUuid(id, userId)
    if (!result) {
      return res.status(404).json({
        status: 'Fail',
        message: '会话不存在或无权访问',
        data: null,
      })
    }

    const { conversation } = result

    res.json({
      status: 'Success',
      message: '获取会话详情成功',
      data: conversation,
    })
  }
  catch (error: any) {
    console.error('❌ [Conversation] 获取会话详情失败:', error)
    res.status(500).json({
      status: 'Fail',
      message: error.message || '获取会话详情失败',
      data: null,
    })
  }
}

/**
 * 创建新会话
 * POST /api/conversations
 */
export async function createConversationHandler(req: Request, res: Response) {
  try {
    const userId = await getSupabaseUserIdFromRequest(req)
    if (!userId) {
      return res.status(401).json({
        status: 'Fail',
        message: '未授权：用户未登录',
        data: null,
      })
    }

    const { title, modelId, providerId, temperature, topP, maxTokens, systemPrompt } = req.body

    if (!modelId || !providerId) {
      return res.status(400).json({
        status: 'Fail',
        message: '缺少必要参数：modelId 和 providerId',
        data: null,
      })
    }

    const conversation = await createConversation({
      user_id: userId,
      title: title || '新对话',
      model_id: modelId,
      provider_id: providerId,
      temperature,
      top_p: topP,
      max_tokens: maxTokens,
      system_prompt: systemPrompt,
    })

    if (!conversation) {
      return res.status(500).json({
        status: 'Fail',
        message: '创建会话失败',
        data: null,
      })
    }

    res.json({
      status: 'Success',
      message: '创建会话成功',
      data: conversation,
    })
  }
  catch (error: any) {
    console.error('❌ [Conversation] 创建会话失败:', error)
    res.status(500).json({
      status: 'Fail',
      message: error.message || '创建会话失败',
      data: null,
    })
  }
}

/**
 * 更新会话信息
 * PATCH /api/conversations/:id
 */
export async function updateConversationHandler(req: Request, res: Response) {
  try {
    const userId = await getSupabaseUserIdFromRequest(req)
    if (!userId) {
      return res.status(401).json({
        status: 'Fail',
        message: '未授权：用户未登录',
        data: null,
      })
    }

    const { id } = req.params
    const { title } = req.body

    // 🔥 支持前端 UUID 和后端 UUID
    const result = await getConversationByIdOrFrontendUuid(id, userId)
    if (!result) {
      return res.status(404).json({
        status: 'Fail',
        message: '会话不存在或无权访问',
        data: null,
      })
    }

    const { backendId } = result
    // 🔥 UpdateConversationParams 只支持 title, total_tokens, message_count
    const updated = await updateConversation(backendId, {
      title,
    })

    if (!updated) {
      return res.status(500).json({
        status: 'Fail',
        message: '更新会话失败',
        data: null,
      })
    }

    res.json({
      status: 'Success',
      message: '更新会话成功',
      data: updated,
    })
  }
  catch (error: any) {
    console.error('❌ [Conversation] 更新会话失败:', error)
    res.status(500).json({
      status: 'Fail',
      message: error.message || '更新会话失败',
      data: null,
    })
  }
}

/**
 * 删除会话
 * DELETE /api/conversations/:id
 */
export async function deleteConversationHandler(req: Request, res: Response) {
  try {
    const userId = await getSupabaseUserIdFromRequest(req)
    if (!userId) {
      return res.status(401).json({
        status: 'Fail',
        message: '未授权：用户未登录',
        data: null,
      })
    }

    const { id } = req.params

    // 🔥 支持前端 UUID 和后端 UUID
    const result = await getConversationByIdOrFrontendUuid(id, userId)
    if (!result) {
      return res.status(404).json({
        status: 'Fail',
        message: '会话不存在或无权访问',
        data: null,
      })
    }

    const { backendId } = result

    // 删除会话（会级联删除所有消息）
    const success = await deleteConversation(backendId)

    if (!success) {
      return res.status(500).json({
        status: 'Fail',
        message: '删除会话失败',
        data: null,
      })
    }

    res.json({
      status: 'Success',
      message: '删除会话成功',
      data: { id },
    })
  }
  catch (error: any) {
    console.error('❌ [Conversation] 删除会话失败:', error)
    res.status(500).json({
      status: 'Fail',
      message: error.message || '删除会话失败',
      data: null,
    })
  }
}

/**
 * 获取会话的所有消息
 * GET /api/conversations/:id/messages
 */
export async function getConversationMessagesHandler(req: Request, res: Response) {
  const startTime = performance.now()
  console.warn('='.repeat(80))
  console.warn('🔥🔥🔥 [DEBUG] ========== 进入 getConversationMessagesHandler ==========')
  console.warn('🔥🔥🔥 [DEBUG] conversationId:', req.params.id)
  console.warn('🔥🔥🔥 [DEBUG] query:', req.query)
  console.warn('='.repeat(80))
  try {
    // 📊 步骤1: 获取用户ID
    const step1Start = performance.now()
    console.warn('🔍 [DEBUG] 正在获取用户 Supabase UUID...')
    const userId = await getSupabaseUserIdFromRequest(req)
    const step1Time = performance.now() - step1Start
    console.warn(`🔍 [DEBUG] 获取到的 userId (Supabase UUID): ${userId}, 耗时: ${step1Time.toFixed(0)}ms`)

    if (!userId) {
      console.warn('❌ [DEBUG] 用户未授权，返回 401')
      return res.status(401).json({
        status: 'Fail',
        message: '未授权：用户未登录',
        data: null,
      })
    }

    const { id } = req.params
    const limit = Number.parseInt(req.query.limit as string) || 100
    const offset = Number.parseInt(req.query.offset as string) || 0

    // 📊 步骤2: 查找会话
    const step2Start = performance.now()
    const result = await getConversationByIdOrFrontendUuid(id, userId)
    const step2Time = performance.now() - step2Start
    console.warn(`📊 [Performance] 步骤2-查找会话耗时: ${step2Time.toFixed(0)}ms`)

    if (!result) {
      console.warn('❌ [DEBUG] 会话不存在或无权访问')
      return res.status(404).json({
        status: 'Fail',
        message: '会话不存在或无权访问',
        data: null,
      })
    }

    const { conversation, backendId } = result
    console.warn('✅ [DEBUG] 权限验证通过，会话ID:', conversation.id)

    // 📊 步骤3: 查询消息
    const step3Start = performance.now()
    const messages = await getConversationMessages(backendId, userId, { limit, offset })
    const step3Time = performance.now() - step3Start
    console.warn(`📊 [Performance] 步骤3-查询消息耗时: ${step3Time.toFixed(0)}ms`)

    // 📊 输出返回的消息条数和性能统计
    const totalTime = performance.now() - startTime
    console.warn(`📊 [API] 准备返回 ${messages.length} 条消息给前端`)
    console.warn(`📊 [API] 消息ID列表: ${messages.map(m => m.id.substring(0, 8)).join(', ')}`)
    if (messages.length > 0) {
      console.warn(`📊 [API] 消息角色分布: user=${messages.filter(m => m.role === 'user').length}, assistant=${messages.filter(m => m.role === 'assistant').length}, system=${messages.filter(m => m.role === 'system').length}`)
      console.warn(`📊 [API] 消息状态分布: ${messages.filter(m => m.status === 'pending').length} pending, ${messages.filter(m => m.status === 'saved').length} saved, ${messages.filter(m => m.status === 'failed').length} failed, ${messages.filter(m => !m.status).length} 无状态`)
    }

    // 📊 性能统计汇总
    console.warn(`📊 [Performance] ========== 性能统计汇总 ==========`)
    console.warn(`📊 [Performance] 步骤1-获取用户ID: ${step1Time.toFixed(0)}ms (${(step1Time / totalTime * 100).toFixed(1)}%)`)
    console.warn(`📊 [Performance] 步骤2-查找会话: ${step2Time.toFixed(0)}ms (${(step2Time / totalTime * 100).toFixed(1)}%)`)
    console.warn(`📊 [Performance] 步骤3-查询消息: ${step3Time.toFixed(0)}ms (${(step3Time / totalTime * 100).toFixed(1)}%)`)
    console.warn(`📊 [Performance] 总耗时: ${totalTime.toFixed(0)}ms`)
    console.warn(`📊 [Performance] ========================================`)

    res.json({
      status: 'Success',
      message: '获取消息列表成功',
      data: {
        conversation,
        messages,
      },
    })
  }
  catch (error: any) {
    console.error('❌ [Conversation] 获取消息列表失败:', error)
    res.status(500).json({
      status: 'Fail',
      message: error.message || '获取消息列表失败',
      data: null,
    })
  }
}

/**
 * 批量保存消息到会话
 * POST /api/conversations/:id/messages
 */
export async function saveMessagesHandler(req: Request, res: Response) {
  try {
    const userId = await getSupabaseUserIdFromRequest(req)
    if (!userId) {
      return res.status(401).json({
        status: 'Fail',
        message: '未授权：用户未登录',
        data: null,
      })
    }

    const { id } = req.params
    const { messages } = req.body

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        status: 'Fail',
        message: '消息列表不能为空',
        data: null,
      })
    }

    // 🔥 支持前端 UUID 和后端 UUID
    const result = await getConversationByIdOrFrontendUuid(id, userId)
    if (!result) {
      return res.status(404).json({
        status: 'Fail',
        message: '会话不存在或无权访问',
        data: null,
      })
    }

    const { backendId } = result

    // 批量创建消息
    const messageParams = messages.map((msg: any) => ({
      conversation_id: backendId,
      role: msg.role,
      content: msg.content,
      tokens: msg.tokens || 0,
    }))

    const savedMessages = await createMessages(messageParams)

    res.json({
      status: 'Success',
      message: '消息保存成功',
      data: savedMessages,
    })
  }
  catch (error: any) {
    console.error('❌ [Conversation] 保存消息失败:', error)
    res.status(500).json({
      status: 'Fail',
      message: error.message || '保存消息失败',
      data: null,
    })
  }
}
