/**
 * API 使用量控制器
 * 处理用户 API 使用量查询请求
 */

import type { Request, Response } from 'express'
import { findUserByAuth0Id } from '../db/supabaseUserService'
import { getUserUsageStats } from '../db/usageService'
import { logger } from '../utils/logger'

// 扩展 Request 类型以包含 userId
interface AuthRequest extends Request {
  userId?: string
}

/**
 * 获取当前用户的 API 使用量
 * POST /api/usage
 * 需要 Auth0 认证
 */
export async function getUsage(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest
    const auth0UserId = authReq.userId

    if (!auth0UserId) {
      return res.status(401).json({
        status: 'Fail',
        message: '未授权',
        data: null,
      })
    }

    // 获取 Supabase 用户信息
    const user = await findUserByAuth0Id(auth0UserId)
    if (!user) {
      return res.status(404).json({
        status: 'Fail',
        message: '用户不存在',
        data: null,
      })
    }

    // 获取用户使用量统计
    const usageStats = await getUserUsageStats(user.user_id)

    if (!usageStats) {
      return res.status(404).json({
        status: 'Fail',
        message: '使用量信息不存在',
        data: null,
      })
    }

    logger.debug(`✅ [Usage] 获取用户使用量成功: ${user.user_id.substring(0, 8)}...`)

    // 返回格式与前端期望的格式一致
    res.json({
      status: 'Success',
      message: '获取使用量成功',
      data: {
        code: true,
        data: {
          model_limits_enabled: usageStats.model_limits_enabled,
          total_available: usageStats.total_available,
          total_granted: usageStats.total_granted,
          total_used: usageStats.total_used,
        },
        message: 'ok',
      },
    })
  }
  catch (error: any) {
    logger.error(`❌ [Usage] 获取使用量失败: ${error.message}`)
    res.status(500).json({
      status: 'Fail',
      message: error.message || '获取使用量失败',
      data: null,
    })
  }
}

