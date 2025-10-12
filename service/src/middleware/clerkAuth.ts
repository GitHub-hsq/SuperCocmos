/* eslint-disable no-console */
/**
 * Clerk 认证中间件
 * 用于验证 Clerk JWT Token
 * 使用最新的 @clerk/express SDK
 */

import { clerkMiddleware, getAuth, requireAuth as clerkRequireAuth } from '@clerk/express'
import type { Request, Response, NextFunction } from 'express'

/**
 * Clerk 认证中间件
 * 将 Clerk 的认证信息添加到 req.auth
 * 使用新的 clerkMiddleware
 */
export const clerkAuth = clerkMiddleware({
  // 从环境变量读取配置
  publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY,
  secretKey: process.env.CLERK_SECRET_KEY,
})

/**
 * 要求用户已登录的中间件
 * 必须在 clerkAuth 之后使用
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = getAuth(req)

  if (!auth?.userId) {
    return res.status(401).send({
      status: 'Fail',
      message: '未授权：需要登录',
      data: null,
    })
  }

  next()
}

/**
 * 要求用户是管理员的中间件
 * 必须在 clerkAuth 之后使用
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const auth = getAuth(req)

  if (!auth?.userId) {
    return res.status(401).send({
      status: 'Fail',
      message: '未授权：需要登录',
      data: null,
    })
  }

  try {
    // 从 Supabase 检查用户角色
    const { userHasRole } = await import('../db/userRoleService')
    const { findUserByClerkId } = await import('../db/supabaseUserService')

    const user = await findUserByClerkId(auth.userId)
    if (!user) {
      return res.status(403).send({
        status: 'Fail',
        message: '用户不存在',
        data: null,
      })
    }

    const isAdmin = await userHasRole(user.user_id, 'admin')
    if (!isAdmin) {
      return res.status(403).send({
        status: 'Fail',
        message: '需要管理员权限',
        data: null,
      })
    }

    next()
  }
  catch (error: any) {
    console.error('❌ [ClerkAuth] 检查管理员权限失败:', error.message)
    return res.status(500).send({
      status: 'Fail',
      message: '权限检查失败',
      data: null,
    })
  }
}

// 导出 getAuth 供其他地方使用
export { getAuth }
