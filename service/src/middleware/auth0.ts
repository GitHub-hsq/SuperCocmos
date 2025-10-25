import type { NextFunction, Request, Response } from 'express'
import { expressjwt } from 'express-jwt'
import jwksRsa from 'jwks-rsa'
/**
 * Auth0 认证中间件
 * 验证 Auth0 JWT Token 并提取用户信息
 */
// 加载环境变量 - 必须在所有其他导入之前
import 'dotenv/config'

// 扩展 Request 类型
declare global {
  namespace Express {
    interface Request {
      auth?: {
        sub: string // Auth0 用户 ID
        permissions?: string[]
        [key: string]: any
      }
      userId?: string // 用户 ID（统一字段，兼容 Clerk）
    }
  }
}

// 从环境变量获取配置
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE
if (!AUTH0_DOMAIN || !AUTH0_AUDIENCE) {
  console.error('❌ [Auth0 Middleware] 缺少必要的环境变量: AUTH0_DOMAIN 和 AUTH0_AUDIENCE')
}

/**
 * Auth0 JWT 验证中间件
 * 使用 express-jwt 和 jwks-rsa 验证 Auth0 token
 */
export const auth0Middleware = expressjwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${AUTH0_DOMAIN}/.well-known/jwks.json`,
  }) as any,
  audience: AUTH0_AUDIENCE,
  issuer: `https://${AUTH0_DOMAIN}/`,
  algorithms: ['RS256'],
  credentialsRequired: false, // 允许未登录访问（由后续中间件判断）
})

/**
 * 提取 Auth0 用户 ID 到 req.userId
 * 统一接口，兼容 Clerk 中间件
 */
export function auth0UserExtractor(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.auth && req.auth.sub) {
      // 将 Auth0 用户 ID (sub) 赋值给 req.userId
      req.userId = req.auth.sub
      console.warn(`✅ [Auth0] 用户已认证: ${req.userId}`)
    }
    next()
  }
  catch (error: any) {
    console.error('❌ [Auth0] 提取用户 ID 失败:', error.message)
    next(error)
  }
}

/**
 * 组合的 Auth0 认证中间件
 * 等效于 Clerk 的 clerkAuth
 */
export const auth0Auth = [auth0Middleware, auth0UserExtractor]

/**
 * 检查是否已认证
 */
export function requireAuth0(req: Request, res: Response, next: NextFunction) {
  if (!req.userId) {
    return res.status(401).json({
      success: false,
      message: '未授权，请先登录',
    })
  }
  next()
}

/**
 * 检查是否有管理员权限
 */
export function requireAuth0Admin(req: Request, res: Response, next: NextFunction) {
  if (!req.userId) {
    return res.status(401).json({
      success: false,
      message: '未授权，请先登录',
    })
  }

  // 检查权限
  const permissions = req.auth?.permissions || []
  const hasAdminPermission = permissions.includes('read:admin') || permissions.includes('write:admin')

  if (!hasAdminPermission) {
    return res.status(403).json({
      success: false,
      message: '需要管理员权限',
    })
  }

  next()
}
