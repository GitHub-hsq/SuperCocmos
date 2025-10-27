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

// 根据 AUDIENCE 自动构建角色命名空间（保持协议一致）
const AUTH0_ROLES_NAMESPACE = AUTH0_AUDIENCE ? `${AUTH0_AUDIENCE}/roles` : 'http://supercocmos.com/roles'

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
      return null
    },
  }) as any,
  audience: AUTH0_AUDIENCE,
  issuer: `https://${AUTH0_DOMAIN}/`,
  algorithms: ['RS256'],
  credentialsRequired: false, // 允许未登录访问（由后续中间件判断）
  onExpired: async (_req: any) => {
    console.error('❌ [Auth0] Token 已过期')
  },
})

/**
 * 提取 Auth0 用户 ID 到 req.userId
 */
export async function auth0UserExtractor(req: Request, res: Response, next: NextFunction) {
  try {
    const authReq = req as AuthRequest
    const authHeader = req.headers.authorization

    // 🔍 详细输出 JWT token 内容（调试用）
    // 临时移除环境检查，确保能看到日志
    const separator = '='.repeat(80)
    console.warn(`\n${separator}`)
    console.warn('🔍 [JWT Debug] 请求路径:', req.path)
    console.warn('🔍 [JWT Debug] NODE_ENV:', process.env.NODE_ENV || 'undefined')
    console.warn(separator)

    if (authHeader) {
      console.warn('✅ Authorization Header 存在')
      console.warn('   前缀:', `${authHeader.substring(0, 30)}...`)
    }
    else {
      console.warn('❌ Authorization Header 缺失')
    }

    if (authReq.auth) {
      console.warn('\n📦 JWT Payload 完整内容:')
      console.warn(JSON.stringify(authReq.auth, null, 2))

      // console.warn('\n🔑 关键字段提取:')
      // console.warn('   - sub (用户ID):', authReq.auth.sub || '❌ 缺失')
      // console.warn('   - iss (签发者):', authReq.auth.iss || '❌ 缺失')
      // console.warn('   - aud (受众):', authReq.auth.aud || '❌ 缺失')
      // console.warn('   - exp (过期时间):', authReq.auth.exp ? new Date(authReq.auth.exp * 1000).toISOString() : '❌ 缺失')

      console.warn('\n👥 角色信息检查:')
      // const httpsRoles = (authReq.auth as any)[`https://${AUTH0_AUDIENCE?.replace('http://', '').replace('https://', '')}/roles`]
      // const httpRoles = (authReq.auth as any)[`http://${AUTH0_AUDIENCE?.replace('http://', '').replace('https://', '')}/roles`]
      // const configuredRoles = (authReq.auth as any)[AUTH0_ROLES_NAMESPACE]
      // const permissions = authReq.auth.permissions

      // console.warn(`   - ${AUTH0_ROLES_NAMESPACE}:`, configuredRoles || '❌ 不存在')
      // console.warn(`   - https://.../roles:`, httpsRoles || '❌ 不存在')
      // console.warn(`   - http://.../roles:`, httpRoles || '❌ 不存在')
      // console.warn('   - permissions:', permissions || '❌ 不存在')

      console.warn('\n📋 Payload 中的所有自定义字段:')
      Object.keys(authReq.auth).forEach((key) => {
        if (!['sub', 'iss', 'aud', 'exp', 'iat', 'nbf', 'jti', 'azp', 'scope'].includes(key)) {
          console.warn(`   - ${key}:`, (authReq.auth as any)[key])
        }
      })
    }
    else {
      console.warn('\n❌ req.auth 为空 - JWT 验证可能失败')
    }

    console.warn(`${separator}\n`)

    if (authReq.auth && authReq.auth.sub) {
      // 将 Auth0 用户 ID (sub) 赋值给 req.userId
      authReq.userId = authReq.auth.sub
      console.warn(`✅ [Auth0] 用户已认证: ${authReq.userId}, path: ${req.path}`)
    }
    else {
      // 输出详细的失败信息
      console.warn(`⚠️ [Auth0] 认证失败详情:`, {
        path: req.path,
        hasAuthHeader: !!authHeader,
        authHeaderPrefix: authHeader ? `${authHeader.substring(0, 20)}...` : 'N/A',
        hasReqAuth: !!authReq.auth,
        reqAuthKeys: authReq.auth ? Object.keys(authReq.auth) : [],
        authSub: authReq.auth?.sub || 'no sub',
      })
    }
    next()
  }
  catch (error: any) {
    console.error('❌ [Auth0] 提取用户 ID 失败:', error.message, error.stack)
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
 * 检查是否有管理员权限（基于角色）
 */
export function requireAuth0Admin(req: Request, res: Response, next: NextFunction) {
  const authReq = req as AuthRequest
  if (!authReq.userId) {
    return res.status(401).json({
      success: false,
      message: '未授权，请先登录',
    })
  }

  // 检查 Auth0 角色（从 JWT token 的自定义 claims 中获取）
  // 优先使用配置的命名空间，然后尝试 https 和 http 版本
  const httpsNamespace = `https://${AUTH0_AUDIENCE?.replace('http://', '').replace('https://', '')}/roles`
  const httpNamespace = `http://${AUTH0_AUDIENCE?.replace('http://', '').replace('https://', '')}/roles`

  const roles: string[] = (authReq.auth as any)?.[AUTH0_ROLES_NAMESPACE]
    || (authReq.auth as any)?.[httpsNamespace]
    || (authReq.auth as any)?.[httpNamespace]
    || []

  // 输出调试信息（开发环境）
  if (process.env.NODE_ENV === 'development') {
    console.warn('🔍 [RequireAuth0Admin] 角色检查:', {
      userId: authReq.userId,
      roles,
      hasAdmin: roles.includes('Admin'),
      path: req.path,
    })
  }

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
