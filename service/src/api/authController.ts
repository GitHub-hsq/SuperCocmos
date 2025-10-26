/**
 * 认证控制器
 * 支持 Auth0 认证
 */

import type { Request, Response } from 'express'
import { findUserByAuth0Id } from '../db/supabaseUserService'
import { getUserWithRoles } from '../db/userRoleService'

/**
 * Auth0 Webhook 处理器
 */
export async function handleAuth0Webhook(req: Request, res: Response) {
  try {
    console.log('📥 [Auth0 Webhook] 接收到 Auth0 Webhook 请求')
    // TODO: 实现 Auth0 Webhook 处理逻辑
    console.warn('⚠️ [Webhook] Auth0 Webhook 处理逻辑待实现')
    return res.status(200).send({
      status: 'Success',
      message: 'Auth0 Webhook received',
      data: null,
    })
  }
  catch (error: any) {
    console.error('❌ [Auth0 Webhook] 处理失败:', error.message)
    return res.status(500).send({
      status: 'Fail',
      message: error?.message || String(error),
      data: null,
    })
  }
}

/**
 * 获取当前登录用户信息（包含角色）
 */
export async function getCurrentUser(req: Request, res: Response) {
  try {
    const userId = req.userId

    if (!userId) {
      return res.status(401).send({
        status: 'Fail',
        message: '未登录',
        data: null,
      })
    }

    // 从用户 ID 获取用户信息
    const user = await findUserByAuth0Id(userId)
    if (!user) {
      return res.status(404).send({
        status: 'Fail',
        message: '用户不存在',
        data: null,
      })
    }

    // 获取用户角色
    const userWithRoles = await getUserWithRoles(user.user_id)

    // 提取主要角色（优先返回 admin）
    const roles = userWithRoles?.roles || []
    const role = roles.includes('admin') ? 'admin' : (roles[0] || 'user')

    res.send({
      status: 'Success',
      message: '获取用户信息成功',
      data: {
        user: {
          id: user.user_id,
          auth0Id: user.auth0_id, // Auth0 用户 ID
          username: user.username,
          email: user.email,
          phone: user.phone,
          avatarUrl: user.avatar_url,
          provider: user.provider,
          status: user.status,
          role, // 主要角色
          roles, // 所有角色
          createdAt: user.created_at,
          updatedAt: user.updated_at,
          lastLoginAt: user.last_login_at,
        },
      },
    })
  }
  catch (error: any) {
    console.error('❌ [Auth] 获取用户信息失败:', error.message)
    res.status(500).send({
      status: 'Fail',
      message: error?.message || String(error),
      data: null,
    })
  }
}
