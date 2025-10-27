/**
 * Auth0 Controller
 * 处理 Auth0 相关的 API 请求
 */

import type { Request, Response } from 'express'
import { upsertUserFromAuth0 } from '../db/supabaseUserService'

// 从环境变量获取 Auth0 配置
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE || 'http://supercocmos.com'
const AUTH0_ROLES_NAMESPACE = `${AUTH0_AUDIENCE}/roles`

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

    // 提取用户信息
    const authReq = req as any
    let roles: string[] = []
    if (authReq.auth) {
      // 优先使用配置的命名空间，然后尝试 https 和 http 版本
      const httpsNamespace = `https://${AUTH0_AUDIENCE.replace('http://', '').replace('https://', '')}/roles`
      const httpNamespace = `http://${AUTH0_AUDIENCE.replace('http://', '').replace('https://', '')}/roles`

      roles = authReq.auth[AUTH0_ROLES_NAMESPACE]
        || authReq.auth[httpsNamespace]
        || authReq.auth[httpNamespace]
        || []
    }

    // 根据角色优先级确定订阅状态（Admin > Beta > Ultra > Plus > Pro > Free）
    const rolePriority = ['Admin', 'Beta', 'Ultra', 'Plus', 'Pro', 'Free']
    let subscriptionStatus = 'Free' // 默认为 Free（保持和角色名称一致）
    for (const role of rolePriority) {
      if (roles.includes(role)) {
        subscriptionStatus = role // 保持原始大小写
        break
      }
    }

    // 调用 Supabase 用户服务
    const user = await upsertUserFromAuth0({
      auth0_id,
      email,
      username,
      avatar_url,
      email_verified,
      subscription_status: subscriptionStatus,
      roles, // 传递角色数组用于同步到 user_roles 表
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
    console.error('❌ [Auth0Controller] 错误详情:', error)
    console.error('❌ [Auth0Controller] 错误堆栈:', error.stack)
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
