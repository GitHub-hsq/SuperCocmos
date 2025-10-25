/**
 * Auth0 Controller
 * 处理 Auth0 相关的 API 请求
 */

import type { Request, Response } from 'express'
import { upsertUserFromAuth0 } from '../db/supabaseUserService'

/**
 * 同步 Auth0 用户到 Supabase
 * POST /api/auth/sync-auth0-user
 */
export async function syncAuth0User(req: Request, res: Response) {
  try {
    const { auth0_id, email, username, avatar_url, email_verified } = req.body

    // 验证必需字段
    if (!auth0_id || !email) {
      return res.status(400).json({
        success: false,
        message: '缺少必需字段: auth0_id 和 email',
      })
    }

    console.log(`🔄 [Auth0Controller] 同步用户: ${email} (${auth0_id})`)

    // 调用 Supabase 用户服务
    const user = await upsertUserFromAuth0({
      auth0_id,
      email,
      username,
      avatar_url,
      email_verified,
    })

    return res.json({
      success: true,
      message: '用户同步成功',
      data: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        avatar_url: user.avatar_url,
        status: user.status,
        created_at: user.created_at,
        last_login_at: user.last_login_at,
      },
    })
  }
  catch (error: any) {
    console.error('❌ [Auth0Controller] 同步用户失败:', error.message)
    return res.status(500).json({
      success: false,
      message: '同步用户失败',
      error: error.message,
    })
  }
}

/**
 * 根据 Auth0 ID 获取用户信息
 * GET /api/auth/user/:auth0_id
 */
export async function getAuth0User(req: Request, res: Response) {
  try {
    const { auth0_id } = req.params

    if (!auth0_id) {
      return res.status(400).json({
        success: false,
        message: '缺少 auth0_id 参数',
      })
    }

    const { findUserByAuth0Id } = await import('../db/supabaseUserService')
    const user = await findUserByAuth0Id(auth0_id)

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在',
      })
    }

    return res.json({
      success: true,
      data: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        avatar_url: user.avatar_url,
        status: user.status,
        created_at: user.created_at,
        last_login_at: user.last_login_at,
      },
    })
  }
  catch (error: any) {
    console.error('❌ [Auth0Controller] 获取用户失败:', error.message)
    return res.status(500).json({
      success: false,
      message: '获取用户失败',
      error: error.message,
    })
  }
}

