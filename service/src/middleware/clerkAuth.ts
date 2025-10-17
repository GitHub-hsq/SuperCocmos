/**
 * Clerk 认证中间件
 * 用于验证 Clerk JWT Token
 * 使用最新的 @clerk/express SDK
 */

import type { NextFunction, Request, Response } from 'express'
import { clerkMiddleware, getAuth } from '@clerk/express'

// 扩展 Express Request 类型
declare global {
  // eslint-disable-next-line ts/no-namespace
  namespace Express {
    interface Request {
      userId?: string // Clerk user ID
      dbUserId?: string // 数据库 user_id (UUID)
    }
  }
}

/**
 * Clerk 认证中间件
 * 将 Clerk 的认证信息添加到 req.auth
 * 使用新的 clerkMiddleware
 */
export const clerkAuth = clerkMiddleware({
  // 从环境变量读取配置
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  secretKey: process.env.CLERK_SECRET_KEY,
})

/**
 * 要求用户已登录的中间件
 * 必须在 clerkAuth 之后使用
 * ✅ 将 userId (Clerk ID) 附加到 req
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = getAuth(req)

    if (!auth?.userId) {
      return res.status(401).json({
        status: 'Fail',
        message: '未授权：需要登录',
        data: null,
      })
    }

    // ✅ 将 Clerk userId 附加到 req
    req.userId = auth.userId

    next()
  }
  catch (error: any) {
    console.error('❌ [ClerkAuth] 认证失败:', error.message)
    return res.status(401).json({
      status: 'Fail',
      message: '认证失败',
      data: null,
    })
  }
}

/**
 * 要求用户已登录 + 加载数据库用户信息
 * 必须在 clerkAuth 之后使用
 * ✅ 将 userId (Clerk ID) 和 dbUserId (数据库 UUID) 附加到 req
 */
export async function requireAuthWithUser(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = getAuth(req)

    if (!auth?.userId) {
      return res.status(401).json({
        status: 'Fail',
        message: '未授权：需要登录',
        data: null,
      })
    }

    // ✅ 将 Clerk userId 附加到 req
    req.userId = auth.userId

    // 从数据库查询用户信息
    const { findUserByClerkId } = await import('../db/supabaseUserService')
    const user = await findUserByClerkId(auth.userId)

    if (!user) {
      return res.status(404).json({
        status: 'Fail',
        message: '用户不存在',
        data: null,
      })
    }

    // ✅ 将数据库 user_id 附加到 req
    req.dbUserId = user.user_id

    next()
  }
  catch (error: any) {
    console.error('❌ [ClerkAuth] 认证失败:', error.message)
    return res.status(401).json({
      status: 'Fail',
      message: '认证失败',
      data: null,
    })
  }
}

/**
 * 要求用户是管理员的中间件
 * 必须在 clerkAuth 之后使用
 * ✅ 将 userId 和 dbUserId 附加到 req
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    const auth = getAuth(req)

    if (!auth?.userId) {
      return res.status(401).json({
        status: 'Fail',
        message: '未授权：需要登录',
        data: null,
      })
    }

    // ✅ 将 Clerk userId 附加到 req
    req.userId = auth.userId

    // 从 Supabase 检查用户角色
    const { userHasRole } = await import('../db/userRoleService')
    const { findUserByClerkId } = await import('../db/supabaseUserService')

    const user = await findUserByClerkId(auth.userId)
    if (!user) {
      return res.status(403).json({
        status: 'Fail',
        message: '用户不存在',
        data: null,
      })
    }

    // ✅ 将数据库 user_id 附加到 req
    req.dbUserId = user.user_id

    const isAdmin = await userHasRole(user.user_id, 'admin')
    if (!isAdmin) {
      return res.status(403).json({
        status: 'Fail',
        message: '需要管理员权限',
        data: null,
      })
    }

    next()
  }
  catch (error: any) {
    console.error('❌ [ClerkAuth] 权限检查失败:', error.message)
    return res.status(500).json({
      status: 'Fail',
      message: '权限检查失败',
      data: null,
    })
  }
}

// 导出 getAuth 供其他地方使用
export { getAuth }
