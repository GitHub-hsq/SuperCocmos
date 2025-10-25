/**
 * 统一认证中间件
 * 仅支持 Auth0 认证
 */

import type { NextFunction, Request, Response } from 'express'
import { auth0Auth, requireAuth0 as requireAuth0Only, requireAuth0Admin } from './auth0'

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
  if (!req.userId) {
    return res.status(401).json({
      success: false,
      message: '未授权，请先登录',
    })
  }
  next()
}

/**
 * 要求管理员权限
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  // 首先检查是否已认证
  if (!req.userId) {
    return res.status(401).json({
      success: false,
      message: '未授权，请先登录',
    })
  }

  // 检查 Auth0 权限
  if (req.auth) {
    const permissions = req.auth.permissions || []
    const hasAdminPermission = permissions.includes('read:admin') || permissions.includes('write:admin')

    if (!hasAdminPermission) {
      return res.status(403).json({
        success: false,
        message: '需要管理员权限',
      })
    }
  }

  next()
}

// 导出 Auth0 专用中间件（兼容性）
export { auth0Auth, requireAuth0Only, requireAuth0Admin }

