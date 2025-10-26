import type { NextFunction, Request, Response } from 'express'
import { expressjwt } from 'express-jwt'
import jwksRsa from 'jwks-rsa'
/**
 * Auth0 认证中间件
 * 验证 Auth0 JWT Token 并提取用户信息
 */
// 加载环境变量 - 必须在所有其他导入之前
import 'dotenv/config'

// 扩展 Request 类型（Auth0 JWT 和用户 ID）
interface AuthRequest extends Request {
  auth?: {
    sub: string // Auth0 用户 ID
    permissions?: string[]
    [key: string]: any
  }
  userId?: string // 用户 ID（Auth0 sub）
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
    jwksRequestsPerMinute: 10,
    jwksUri: `https://${AUTH0_DOMAIN}/.well-known/jwks.json`,
    timeout: 30000, // 30秒超时
    handleSigningKeyError: (err: Error) => {
      console.error('❌ [Auth0] JWKS 签名密钥错误:', err.message)
      // 返回 null 会导致验证失败，但不会崩溃
      return null
    },
  }) as any,
  audience: AUTH0_AUDIENCE,
  issuer: `https://${AUTH0_DOMAIN}/`,
  algorithms: ['RS256'],
  credentialsRequired: false, // 允许未登录访问（由后续中间件判断）
})

/**
 * 提取 Auth0 用户 ID 到 req.userId
 */
export async function auth0UserExtractor(req: Request, res: Response, next: NextFunction) {
  try {
    const authReq = req as AuthRequest

    // 调试：输出 Authorization Header
    const authHeader = req.headers.authorization
    if (process.env.NODE_ENV === 'development' && authHeader)
      console.warn(`🔍 [Auth0Middleware] Authorization Header: ${authHeader.substring(0, 50)}...`)

    // 调试：输出 req.auth 内容
    if (process.env.NODE_ENV === 'development') {
      if (authReq.auth) {
        console.warn('🔍 [Auth0Middleware] req.auth 内容:', JSON.stringify(authReq.auth, null, 2))
      }
      else {
        console.warn('⚠️ [Auth0Middleware] req.auth 为空')
        if (authHeader)
          console.warn('   ℹ️ Token 存在但未被解析，可能是验证失败（已忽略，因为 credentialsRequired=false）')
        else
          console.warn('   ℹ️ 请求未携带 Authorization Header')
      }
    }

    if (authReq.auth && authReq.auth.sub) {
      // 将 Auth0 用户 ID (sub) 赋值给 req.userId
      authReq.userId = authReq.auth.sub

      // ℹ️ 注意：不在中间件中同步用户
      // Access Token 只包含 sub 和自定义 claims（如 roles）
      // 完整的用户信息（email、name、picture）在 ID Token 中
      // 用户同步由前端在 App.vue 中通过 syncAuth0UserToSupabase 主动触发

      if (process.env.NODE_ENV === 'development')
        console.warn(`✅ [Auth0] 用户已认证: ${authReq.userId}`)
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
 * 包含：JWT 验证 -> 用户 ID 提取
 */
export const auth0Auth = [auth0Middleware, auth0UserExtractor]

/**
 * 检查是否已认证
 */
export function requireAuth0(req: Request, res: Response, next: NextFunction) {
  const authReq = req as AuthRequest
  if (!authReq.userId) {
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
  const authReq = req as AuthRequest
  if (!authReq.userId) {
    return res.status(401).json({
      success: false,
      message: '未授权，请先登录',
    })
  }

  // 检查权限
  const permissions = authReq.auth?.permissions || []
  const hasAdminPermission = permissions.includes('read:admin') || permissions.includes('write:admin')

  if (!hasAdminPermission) {
    return res.status(403).json({
      success: false,
      message: '需要管理员权限',
    })
  }

  next()
}
