/**
 * SSE 认证中间件
 * 从 Cookie 中提取 token 并验证 JWT
 */

import type { NextFunction, Request, Response } from 'express'
import { expressjwt } from 'express-jwt'
import jwksRsa from 'jwks-rsa'

// 扩展 Request 类型
interface AuthRequest extends Request {
  auth?: {
    sub: string
    [key: string]: any
  }
  user?: {
    user_id: string
    auth0_id: string
    [key: string]: any
  }
}

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE

if (!AUTH0_DOMAIN || !AUTH0_AUDIENCE) {
  console.error('❌ 缺少环境变量: AUTH0_DOMAIN 或 AUTH0_AUDIENCE')
}

/**
 * 从 Cookie 中提取 token 并放入 Authorization header
 */
export function extractTokenFromCookie(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.access_token

  if (token) {
    req.headers.authorization = `Bearer ${token}`
  }

  next()
}

/**
 * JWT 验证中间件（用于 SSE）
 */
export const sseJwtAuth = expressjwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${AUTH0_DOMAIN}/.well-known/jwks.json`,
  }) as any,
  audience: AUTH0_AUDIENCE,
  issuer: `https://${AUTH0_DOMAIN}/`,
  algorithms: ['RS256'],
})

/**
 * 提取用户信息到 req.user
 */
export function extractSSEUserInfo(req: Request, res: Response, next: NextFunction) {
  const authReq = req as AuthRequest

  if (authReq.auth) {
    authReq.user = {
      user_id: authReq.auth.sub,
      auth0_id: authReq.auth.sub,
      ...authReq.auth,
    }
  }

  next()
}

/**
 * SSE 认证中间件数组
 */
export const sseAuth = [
  extractTokenFromCookie, // 1. 从 Cookie 提取 token
  sseJwtAuth, // 2. JWT 验证
  extractSSEUserInfo, // 3. 提取用户信息
]
