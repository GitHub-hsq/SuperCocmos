/**
 * 🚀 优化版 Auth0 鉴权中间件（带 Redis 缓存）
 *
 * 性能优化：
 * - 首次验证：RS256 + 缓存结果（~300ms）
 * - 后续请求：从缓存读取（~2ms）
 * - 性能提升：99%
 *
 * 使用方式：
 * ```typescript
 * import { auth, requireAuth, requireAdmin } from './middleware/authCached'
 *
 * router.get('/api/resource', auth, requireAuth, handler)
 * router.delete('/api/admin', auth, requireAdmin, handler)
 * ```
 */

import type { NextFunction, Request, Response } from 'express'
import { expressjwt } from 'express-jwt'
import jwksRsa from 'jwks-rsa'
import { cacheJWTVerification, getJWTFromCache } from '../cache/jwtCache'

interface AuthRequest extends Request {
  auth?: {
    sub: string
    [key: string]: any
  }
  userId?: string
  userRoles?: string[]
}

// 环境变量
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE
const AUTH0_ROLES_NAMESPACE = AUTH0_AUDIENCE
  ? `${AUTH0_AUDIENCE}/roles`
  : 'http://supercocmos.com/roles'

if (!AUTH0_DOMAIN || !AUTH0_AUDIENCE) {
  console.error('❌ [Auth缓存] 缺少 AUTH0_DOMAIN 或 AUTH0_AUDIENCE 环境变量')
}

/**
 * 原始的 Auth0 JWT 验证中间件（慢速路径）
 */
const auth0MiddlewareSlow = expressjwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 10,
    jwksUri: `https://${AUTH0_DOMAIN}/.well-known/jwks.json`,
    cacheMaxAge: 24 * 60 * 60 * 1000, // 缓存24小时
  }) as any,
  audience: AUTH0_AUDIENCE,
  issuer: `https://${AUTH0_DOMAIN}/`,
  algorithms: ['RS256'],
  credentialsRequired: false,
})

/**
 * 从 Authorization header 提取 token
 */
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  return authHeader.substring(7) // 去掉 "Bearer "
}

/**
 * 🚀 优化版 Auth0 验证中间件（带缓存）
 *
 * 流程：
 * 1. 尝试从 Redis 缓存获取验证结果（快速路径）
 * 2. 如果命中，直接设置 req.userId 和 req.userRoles
 * 3. 如果未命中，执行 RS256 验证，然后缓存结果
 */
export async function auth(req: Request, res: Response, next: NextFunction) {
  const authReq = req as AuthRequest
  const start = performance.now()

  try {
    // 提取 token
    const token = extractToken(req)
    if (!token) {
      // 没有 token，允许继续（由 requireAuth 决定是否拒绝）
      return next()
    }

    // 🔥 快速路径：尝试从缓存获取
    const cached = await getJWTFromCache(token)
    if (cached) {
      // 命中缓存，直接设置用户信息
      authReq.userId = cached.userId
      authReq.userRoles = cached.roles || []

      const duration = performance.now() - start
      console.log(`✅ [JWT缓存] 命中 (${duration.toFixed(1)}ms, userId: ${cached.userId})`)

      return next()
    }

    // 🐢 慢速路径：缓存未命中，执行 RS256 验证
    console.log(`⚠️ [JWT缓存] 未命中，执行 RS256 验证...`)

    auth0MiddlewareSlow(req, res, async (err?: any) => {
      if (err) {
        // JWT 验证失败
        console.error(`❌ [JWT验证] 失败:`, err.message)
        return next(err)
      }

      // 验证成功，提取用户信息
      if (authReq.auth?.sub) {
        authReq.userId = authReq.auth.sub

        // 提取角色
        const roles: string[] = (authReq.auth as any)?.[AUTH0_ROLES_NAMESPACE] || []
        authReq.userRoles = roles

        // 🔥 缓存验证结果
        await cacheJWTVerification(token, {
          userId: authReq.userId,
          email: authReq.auth.email,
          roles,
          iat: authReq.auth.iat || Math.floor(Date.now() / 1000),
          exp: authReq.auth.exp || Math.floor(Date.now() / 1000) + 3600,
        })
      }

      const duration = performance.now() - start
      console.log(`✅ [JWT验证] RS256验证完成 (${duration.toFixed(0)}ms)`)

      next()
    })
  }
  catch (error: any) {
    console.error('❌ [Auth中间件] 错误:', error)
    next(error)
  }
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
        hasUserId: !!authReq.userId,
        path: req.path,
        method: req.method,
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
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const authReq = req as AuthRequest

  if (!authReq.userId) {
    return res.status(401).json({
      success: false,
      message: '未授权，请先登录',
    })
  }

  const roles = authReq.userRoles || []
  if (roles.includes('Admin') || roles.includes('admin')) {
    return next()
  }

  return res.status(403).json({
    success: false,
    message: '需要管理员权限',
    data: { userRoles: roles },
  })
}

/**
 * 检查是否有特定角色
 */
export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthRequest

    if (!authReq.userId) {
      return res.status(401).json({
        success: false,
        message: '未授权，请先登录',
      })
    }

    const roles = authReq.userRoles || []
    if (roles.includes(role)) {
      return next()
    }

    return res.status(403).json({
      success: false,
      message: `需要角色: ${role}`,
      data: { userRoles: roles },
    })
  }
}
