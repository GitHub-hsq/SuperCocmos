import type { NextFunction, Request, Response } from 'express'
import https from 'node:https'
import { expressjwt } from 'express-jwt'
import jwksRsa from 'jwks-rsa'

/**
 * =====================================================
 * 🔐 Auth0 JWT 中间件 & 健康监控模块（优化版）
 * =====================================================
 */

interface AuthRequest extends Request {
  auth?: {
    sub: string
    permissions?: string[]
    [key: string]: any
  }
  userId?: string
}

// 环境变量
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE
const AUTH0_ROLES_NAMESPACE = AUTH0_AUDIENCE
  ? `${AUTH0_AUDIENCE}/roles`
  : 'http://supercocmos.com/roles'

if (!AUTH0_DOMAIN || !AUTH0_AUDIENCE) {
  console.error('❌ [Auth0] 缺少 AUTH0_DOMAIN 或 AUTH0_AUDIENCE 环境变量')
}

/* -----------------------------------------------
 * 🌐 通用 HTTPS 请求封装
 * --------------------------------------------- */
function fetchHttpsJSON(hostname: string, path: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      { hostname, port: 443, path, method: 'GET', timeout: 15000 },
      (res) => {
        let data = ''
        res.on('data', chunk => (data += chunk))
        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              resolve(JSON.parse(data))
            }
            catch {
              reject(new Error('Invalid JSON response'))
            }
          }
          else {
            reject(new Error(`HTTP ${res.statusCode}`))
          }
        })
      },
    )
    req.on('error', reject)
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('Timeout'))
    })
    req.end()
  })
}

/* -----------------------------------------------
 * 🩺 健康检查
 * --------------------------------------------- */
async function checkAuth0Connection() {
  if (!AUTH0_DOMAIN)
    return
  try {
    await fetchHttpsJSON(AUTH0_DOMAIN, '/.well-known/jwks.json')
    console.log(`✅ [Auth0 Health] 连接正常: ${AUTH0_DOMAIN}`)
  }
  catch (err: any) {
    console.warn(`⚠️ [Auth0 Health] 连接异常: ${err.message}`)
  }
}

/* -----------------------------------------------
 * 🔑 预加载 JWKS 密钥
 * --------------------------------------------- */
async function preloadJWKSKeys() {
  if (!AUTH0_DOMAIN)
    return
  try {
    const keys = await fetchHttpsJSON(AUTH0_DOMAIN, '/.well-known/jwks.json')
    console.log(`✅ [Auth0 JWKS] 预加载成功 (${keys.keys?.length || 0} 个密钥)`)
  }
  catch (err: any) {
    console.warn(`⚠️ [Auth0 JWKS] 预加载失败: ${err.message}`)
  }
}

/* -----------------------------------------------
 * 🧠 初始化（延迟 3 秒）
 * --------------------------------------------- */
setTimeout(() => {
  preloadJWKSKeys()
    .then(() => checkAuth0Connection())
    .catch(() => console.warn('⚠️ [Auth0] 初始化失败，但不影响服务启动'))
}, 3000)

/* -----------------------------------------------
 * 🧩 Auth0 JWT 验证中间件
 * --------------------------------------------- */
export const auth0Middleware = expressjwt({
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

/* -----------------------------------------------
 * 🧾 用户信息提取（带性能监控）
 * --------------------------------------------- */
export async function auth0UserExtractor(req: Request, _res: Response, next: NextFunction) {
  const authReq = req as AuthRequest
  const start = performance.now()

  if (authReq.auth?.sub) {
    authReq.userId = authReq.auth.sub
  }

  const dur = performance.now() - start

  // 🔥 添加性能检查点
  const { addPerfCheckpoint } = require('./performanceLogger')
  addPerfCheckpoint(req, `User Extraction: ${dur.toFixed(1)}ms`)

  if (dur > 50) {
    console.warn(`⚠️ [JWT] 验证耗时 ${dur.toFixed(0)}ms (${req.method} ${req.path})`)
  }

  next()
}

/* -----------------------------------------------
 * 🔍 JWT 验证性能监控包装器
 * --------------------------------------------- */
function jwtPerformanceWrapper(req: Request, res: Response, next: NextFunction) {
  const start = performance.now()

  auth0Middleware(req, res, (err?: any) => {
    const duration = performance.now() - start

    // 🔥 添加性能检查点
    const { addPerfCheckpoint } = require('./performanceLogger')
    addPerfCheckpoint(req, `JWT Verification: ${duration.toFixed(0)}ms`)

    // 🔥 只在慢速时输出警告（超过 100ms）
    if (duration > 100) {
      console.warn(`⚠️ [JWT-Middleware] expressjwt 耗时过长: ${duration.toFixed(0)}ms (${req.method} ${req.path})`)
    }

    next(err)
  })
}

/* -----------------------------------------------
 * 🧩 组合中间件
 * --------------------------------------------- */
export const auth0Auth = [jwtPerformanceWrapper, auth0UserExtractor]

/* -----------------------------------------------
 * 🧭 权限检查中间件
 * --------------------------------------------- */
export function requireAuth0(req: Request, res: Response, next: NextFunction) {
  const authReq = req as AuthRequest
  if (!authReq.userId)
    return res.status(401).json({ success: false, message: '未授权，请先登录' })
  next()
}

export function requireAuth0Admin(req: Request, res: Response, next: NextFunction) {
  const authReq = req as AuthRequest
  const roles: string[]
    = (authReq.auth as any)?.[AUTH0_ROLES_NAMESPACE]
      || (authReq.auth as any)?.[`https://${AUTH0_AUDIENCE}/roles`]
      || []

  if (roles.includes('Admin'))
    return next()
  return res.status(403).json({
    success: false,
    message: '需要管理员权限',
    data: { userRoles: roles },
  })
}
