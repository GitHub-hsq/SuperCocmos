/* eslint-disable no-console */
/**
 * 会话管理控制器
 * 处理用户会话的 CRUD 操作
 */

import type { Request, Response } from 'express'
import {
  createConversation,
  deleteConversation,
  getConversationById,
  getUserConversations,
  updateConversation,
} from '../db/conversationService'
import {
  createMessage,
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
  const auth0Id = await getAuth0IdFromRequest(req)
  if (!auth0Id) {
    return null
  }

  try {
    const { findUserByAuth0Id } = await import('../db/supabaseUserService')
    const user = await findUserByAuth0Id(auth0Id)
    return user?.user_id || null
  }
  catch (error) {
    console.error('❌ [getUserId] 查询失败:', error)
    return null
  }
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

    res.json({
      status: 'Success',
      message: '获取会话列表成功',
      data: conversations,
    })
  }
  catch (error: any) {
    console.error('❌ [Conversation] 获取会话列表失败:', error)
    res.status(500).json({
      status: 'Fail',
      message: error.message || '获取会话列表失败',
      data: null,
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

    const conversation = await getConversationById(id)

    if (!conversation) {
      return res.status(404).json({
        status: 'Fail',
        message: '会话不存在',
        data: null,
      })
    }

    // 验证会话所有权
    if (conversation.user_id !== userId) {
      return res.status(403).json({
        status: 'Fail',
        message: '无权访问此会话',
        data: null,
      })
    }

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
      userId,
      title: title || '新对话',
      modelId,
      providerId,
      temperature,
      topP,
      maxTokens,
      systemPrompt,
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
    const { title, temperature, topP, maxTokens, systemPrompt } = req.body

    // 验证会话所有权
    const conversation = await getConversationById(id)
    if (!conversation) {
      return res.status(404).json({
        status: 'Fail',
        message: '会话不存在',
        data: null,
      })
    }

    if (conversation.user_id !== userId) {
      return res.status(403).json({
        status: 'Fail',
        message: '无权修改此会话',
        data: null,
      })
    }

    const updated = await updateConversation(id, {
      title,
      temperature,
      topP,
      maxTokens,
      systemPrompt,
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

    // 验证会话所有权
    const conversation = await getConversationById(id)
    if (!conversation) {
      return res.status(404).json({
        status: 'Fail',
        message: '会话不存在',
        data: null,
      })
    }

    // 🔍 添加调试日志，排查403错误
    console.log('🔍 [403调试] 删除会话权限检查:', {
      conversationId: id,
      conversationUserId: conversation.user_id,
      currentUserId: userId,
      说明: 'currentUserId 现在是 Supabase UUID（通过 Auth0 ID 查询得到）',
      isMatch: conversation.user_id === userId,
      userIdType: typeof userId,
      conversationUserIdType: typeof conversation.user_id,
    })

    if (conversation.user_id !== userId) {
      return res.status(403).json({
        status: 'Fail',
        message: '无权删除此会话',
        data: null,
      })
    }

    // 删除会话（会级联删除所有消息）
    const success = await deleteConversation(id)

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
  console.log('='.repeat(80))
  console.log('🔥🔥🔥 [DEBUG] ========== 进入 getConversationMessagesHandler ==========')
  console.log('🔥🔥🔥 [DEBUG] conversationId:', req.params.id)
  console.log('🔥🔥🔥 [DEBUG] query:', req.query)
  console.log('='.repeat(80))
  try {
    console.log('🔍 [DEBUG] 正在获取用户 Supabase UUID...')
    const userId = await getSupabaseUserIdFromRequest(req)
    console.log('🔍 [DEBUG] 获取到的 userId (Supabase UUID):', userId)

    if (!userId) {
      console.log('❌ [DEBUG] 用户未授权，返回 401')
      return res.status(401).json({
        status: 'Fail',
        message: '未授权：用户未登录',
        data: null,
      })
    }

    const { id } = req.params
    const limit = Number.parseInt(req.query.limit as string) || 100
    const offset = Number.parseInt(req.query.offset as string) || 0

    // 🔥 一次查询搞定：获取会话 + 验证 user_id
    const { getConversationByIdWithAuth } = await import('../db/conversationService')
    const conversation = await getConversationByIdWithAuth(id, userId)

    if (!conversation) {
      console.log('❌ [DEBUG] 会话不存在或无权访问')
      return res.status(404).json({
        status: 'Fail',
        message: '会话不存在或无权访问',
        data: null,
      })
    }

    console.log('✅ [DEBUG] 权限验证通过，会话ID:', conversation.id)

    // 🔥 传递 user_id 用于 Redis 缓存 LRU 管理
    const messages = await getConversationMessages(id, userId, { limit, offset })

    // 📊 输出返回的消息条数
    console.log(`📊 [API] 准备返回 ${messages.length} 条消息给前端`)
    console.log(`📊 [API] 消息ID列表: ${messages.map(m => m.id.substring(0, 8)).join(', ')}`)
    if (messages.length > 0) {
      console.log(`📊 [API] 消息角色分布: user=${messages.filter(m => m.role === 'user').length}, assistant=${messages.filter(m => m.role === 'assistant').length}, system=${messages.filter(m => m.role === 'system').length}`)
      console.log(`📊 [API] 消息状态分布: ${messages.filter(m => m.status === 'pending').length} pending, ${messages.filter(m => m.status === 'saved').length} saved, ${messages.filter(m => m.status === 'failed').length} failed, ${messages.filter(m => !m.status).length} 无状态`)
    }

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

    // 验证会话所有权
    const conversation = await getConversationById(id)
    if (!conversation) {
      return res.status(404).json({
        status: 'Fail',
        message: '会话不存在',
        data: null,
      })
    }

    if (conversation.user_id !== userId) {
      return res.status(403).json({
        status: 'Fail',
        message: '无权修改此会话',
        data: null,
      })
    }

    // 批量创建消息
    const messageParams = messages.map((msg: any) => ({
      conversationId: id,
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
