/**
 * 统一认证中间件
 * 仅支持 Auth0 认证
 */

import type { NextFunction, Request, Response } from 'express'
import { auth0Auth, requireAuth0Admin, requireAuth0 as requireAuth0Only } from './auth0'

// 扩展 Request 类型
interface AuthRequest extends Request {
  userId?: string
  auth?: {
    sub: string
    [key: string]: any
  }
}

// 从环境变量获取 Auth0 配置
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE || 'http://supercocmos.com'
const AUTH0_ROLES_NAMESPACE = `${AUTH0_AUDIENCE}/roles`

/**
 * 统一的认证中间件
 * 仅支持 Auth0 认证
 */
export function unifiedAuth(req: Request, res: Response, next: NextFunction) {
  // 检查是否有 Authorization header
  const authHeader = req.headers.authorization

  if (!authHeader) {
    // 没有 token，继续（由后续中间件判断）
    return next()
  }

  // 使用 Auth0 认证
  auth0Auth[0](req, res, (err: any) => {
    if (err) {
      // Auth0 验证失败
      console.warn('⚠️  [统一认证] Auth0 验证失败')
      return next()
    }

    // Auth0 验证成功，提取用户 ID
    auth0Auth[1](req, res, next)
  })
}

/**
 * 要求用户已认证
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authReq = req as AuthRequest
  if (!authReq.userId) {
    // 调试信息
    if (process.env.NODE_ENV === 'development') {
      const authHeader = req.headers.authorization
      console.error('❌ [RequireAuth] 认证失败:', {
        hasAuthHeader: !!authHeader,
        hasReqAuth: !!authReq.auth,
        hasReqUserId: !!authReq.userId,
        path: req.path,
      })
    }

    return res.status(401).json({
      success: false,
      message: '未授权，请先登录',
    })
  }
  next()
}

/**
 * 要求管理员权限
 * 检查用户是否拥有 Admin 角色
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authReq = req as AuthRequest

  // 首先检查是否已认证
  if (!authReq.userId) {
    return res.status(401).json({
      success: false,
      message: '未授权，请先登录',
    })
  }

  // 检查 Auth0 角色（从 JWT token 的自定义 claims 中获取）
  if (authReq.auth) {
    // Auth0 自定义 claims: 优先使用配置的命名空间，然后尝试 https 和 http 版本
    const httpsNamespace = `https://${AUTH0_AUDIENCE.replace('http://', '').replace('https://', '')}/roles`
    const httpNamespace = `http://${AUTH0_AUDIENCE.replace('http://', '').replace('https://', '')}/roles`

    const roles: string[] = (authReq.auth as any)[AUTH0_ROLES_NAMESPACE]
      || (authReq.auth as any)[httpsNamespace]
      || (authReq.auth as any)[httpNamespace]
      || []

    // 输出调试信息（移除环境检查，确保能看到）
    console.warn('🔍 [RequireAdmin] 角色检查:', {
      userId: authReq.userId,
      roles,
      hasAdmin: roles.includes('Admin'),
      path: req.path,
      authKeys: Object.keys(authReq.auth),
    })

    // 检查是否有 Admin 角色
    if (roles.includes('Admin')) {
      return next()
    }

    return res.status(403).json({
      success: false,
      message: '需要管理员权限',
      data: {
        requiredRole: 'Admin',
        userRoles: roles,
      },
    })
  }

  // 如果没有 auth 对象，返回 403
  return res.status(403).json({
    success: false,
    message: '需要管理员权限',
  })
}

// 导出 Auth0 专用中间件（兼容性）
export { auth0Auth, requireAuth0Admin, requireAuth0Only }
