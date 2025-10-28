/**
 * SSE 认证中间件
 * 由于 EventSource 不支持自定义 headers，需要从 URL 参数中获取 token
 */

import type { NextFunction, Request, Response } from 'express'
import { expressjwt } from 'express-jwt'
import jwksRsa from 'jwks-rsa'

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE

if (!AUTH0_DOMAIN || !AUTH0_AUDIENCE) {
  console.error('❌ [SSE Auth] 环境变量缺失: AUTH0_DOMAIN 或 AUTH0_AUDIENCE')
}

/**
 * 从 Cookie 或 URL 参数中提取 token 并放入 Authorization header
 * 优先使用 Cookie（更安全），降级到 URL 参数（兼容性）
 */
export function extractTokenFromQuery(req: Request, res: Response, next: NextFunction) {
  // 🔥 优先从 Cookie 读取 token（方案 A）
  let token = req.cookies?.access_token

  if (token) {
    req.headers.authorization = `Bearer ${token}`
    // console.log('[SSE Auth] ✅ 从 Cookie 中提取到 token')
  }
  else {
    // 🔥 降级：从 URL 参数读取（兼容旧版本）
    token = req.query.token as string

    if (token) {
      req.headers.authorization = `Bearer ${token}`
      // console.log('[SSE Auth] ⚠️ 从 URL 参数中提取到 token（不安全，建议使用 Cookie）')
    }
    else {
      console.warn('[SSE Auth] ⚠️ Cookie 和 URL 参数中都没有 token')
    }
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
  if (req.auth) {
    req.user = {
      user_id: req.auth.sub,
      auth0_id: req.auth.sub,
      ...req.auth,
    } as any
    // console.log('[SSE Auth] ✅ 用户认证成功:', req.auth.sub)
  }
  else {
    console.warn('[SSE Auth] ⚠️ JWT 验证成功但 req.auth 为空')
  }

  next()
}

/**
 * SSE 认证中间件数组
 */
export const sseAuth = [
  extractTokenFromQuery, // 1. 从 URL 参数提取 token
  sseJwtAuth, // 2. JWT 验证
  extractSSEUserInfo, // 3. 提取用户信息
]
