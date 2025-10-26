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

    console.warn(`🔄 [Auth0Controller] 同步用户: ${email} (${auth0_id})`)
    console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    // 1. 输出原始 Authorization Header
    const authHeader = req.headers.authorization
    console.warn('🔐 [Token] Authorization Header:', authHeader ? `${authHeader.substring(0, 50)}...` : '无')

    // 2. 输出前端传递的完整数据
    console.warn('📋 [Token] 前端传递的用户数据:', JSON.stringify({
      auth0_id,
      email,
      username,
      avatar_url,
      email_verified,
    }, null, 2))

    // 3. 输出 JWT token 解析后的完整内容（req.auth）
    const authReq = req as any
    if (authReq.auth) {
      console.warn('🔑 [Token] JWT 解析后的完整内容:')
      console.warn(JSON.stringify(authReq.auth, null, 2))
      console.warn('📌 [Token] Token 关键字段:')
      console.warn(`   - sub (用户ID): ${authReq.auth.sub}`)
      console.warn(`   - iss (签发者): ${authReq.auth.iss}`)
      console.warn(`   - aud (受众): ${authReq.auth.aud}`)
      console.warn(`   - exp (过期时间): ${authReq.auth.exp} (${new Date(authReq.auth.exp * 1000).toISOString()})`)
      console.warn(`   - iat (签发时间): ${authReq.auth.iat} (${new Date(authReq.auth.iat * 1000).toISOString()})`)
      if (authReq.auth.permissions)
        console.warn(`   - permissions: ${JSON.stringify(authReq.auth.permissions)}`)

      if (authReq.auth['https://supercocmos.com/roles'])
        console.warn(`   - roles: ${JSON.stringify(authReq.auth['https://supercocmos.com/roles'])}`)
    }
    else {
      console.warn('⚠️ [Token] 未找到 JWT 解析内容（req.auth 为空）')
    }

    // 4. 输出所有自定义 claims
    if (authReq.auth) {
      const standardClaims = ['sub', 'iss', 'aud', 'exp', 'iat', 'azp', 'scope']
      const customClaims = Object.keys(authReq.auth).filter(key => !standardClaims.includes(key))
      if (customClaims.length > 0) {
        console.warn('🎯 [Token] 自定义 Claims:')
        customClaims.forEach((key) => {
          console.warn(`   - ${key}: ${JSON.stringify(authReq.auth[key])}`)
        })
      }
    }

    console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    // 5. 从 token 中提取角色信息
    let roles: string[] = []
    if (authReq.auth) {
      // 尝试两种可能的命名空间
      roles = authReq.auth['http://supercocmos.com/roles']
        || authReq.auth['https://supercocmos.com/roles']
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

    console.warn(`📊 [Token] 用户角色:`, roles)
    console.warn(`📊 [Token] 订阅状态:`, subscriptionStatus)

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
