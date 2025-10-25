/**
 * 会话管理控制器
 * 处理用户会话的 CRUD 操作
 */

import type { Request, Response } from 'express'
import {
  createConversation,
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
 * 从 Auth0 token 或 session 中获取用户ID
 */
async function getUserIdFromRequest(req: Request): Promise<string | null> {
  // 从 Auth0 token 中获取
  const auth0User = (req as any).auth0User
  if (auth0User?.sub) {
    return auth0User.sub
  }

  // 从 session 中获取
  const session = (req as any).session
  if (session?.userId) {
    return session.userId
  }

  return null
}

/**
 * 获取用户的所有会话列表
 * GET /api/conversations
 */
export async function getUserConversationsHandler(req: Request, res: Response) {
  try {
    const userId = await getUserIdFromRequest(req)
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
    const userId = await getUserIdFromRequest(req)
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
    const userId = await getUserIdFromRequest(req)
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
    const userId = await getUserIdFromRequest(req)
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
 * 获取会话的所有消息
 * GET /api/conversations/:id/messages
 */
export async function getConversationMessagesHandler(req: Request, res: Response) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return res.status(401).json({
        status: 'Fail',
        message: '未授权：用户未登录',
        data: null,
      })
    }

    const { id } = req.params
    const limit = Number.parseInt(req.query.limit as string) || 100
    const offset = Number.parseInt(req.query.offset as string) || 0

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
        message: '无权访问此会话',
        data: null,
      })
    }

    const messages = await getConversationMessages(id, { limit, offset })

    res.json({
      status: 'Success',
      message: '获取消息列表成功',
      data: messages,
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
    const userId = await getUserIdFromRequest(req)
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

