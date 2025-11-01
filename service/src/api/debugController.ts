/**
 * 调试工具 - 清除会话缓存
 */
import type { Request, Response } from 'express'
import { CONVERSATION_KEYS } from '../cache/cacheKeys'
import { deleteCached } from '../cache/cacheService'

/**
 * 清除指定会话的消息缓存
 * DELETE /api/debug/cache/conversation/:id
 */
export async function clearConversationCache(req: Request, res: Response) {
  try {
    const { id } = req.params

    const cacheKey = CONVERSATION_KEYS.messages(id)
    await deleteCached(cacheKey)

    console.warn(`🧹 [Debug] 已清除会话缓存: ${id}`)

    res.json({
      status: 'Success',
      message: '缓存已清除',
      data: { conversationId: id, cacheKey },
    })
  }
  catch (error: any) {
    console.error('❌ [Debug] 清除缓存失败:', error)
    res.status(500).json({
      status: 'Fail',
      message: error.message || '清除缓存失败',
      data: null,
    })
  }
}
