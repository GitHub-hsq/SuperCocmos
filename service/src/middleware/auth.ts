/**
 * 临时认证中间件（替代 Clerk）
 * TODO: 集成 Auth0 后更新此文件
 */

import type { NextFunction, Request, Response } from 'express'

// 扩展 Express Request 类型
declare global {
  // eslint-disable-next-line ts/no-namespace
  namespace Express {
    interface Request {
      userId?: string // 用户 ID
      dbUserId?: string // 数据库 user_id (UUID)
    }
  }
}

/**
 * 临时认证中间件
 * TODO: 替换为 Auth0 认证
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // TODO: 实现 Auth0 认证逻辑
  // 临时：跳过认证（开发阶段）
  console.warn('⚠️ [Auth] 临时跳过认证检查（Auth0 待集成）')
  next()
}

/**
 * 要求用户已登录的中间件
 * TODO: 替换为 Auth0 认证
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    // TODO: 从 Auth0 获取用户信息
    // 临时：允许所有请求通过
    console.warn('⚠️ [Auth] 临时跳过登录检查（Auth0 待集成）')
    
    // 临时：使用模拟用户 ID
    req.userId = 'temp-user-id'
    
    next()
  }
  catch (error: any) {
    console.error('❌ [Auth] 认证失败:', error.message)
    return res.status(401).json({
      status: 'Fail',
      message: '认证失败',
      data: null,
    })
  }
}

/**
 * 要求用户已登录 + 加载数据库用户信息
 * TODO: 替换为 Auth0 认证
 */
export async function requireAuthWithUser(req: Request, res: Response, next: NextFunction) {
  try {
    // TODO: 从 Auth0 获取用户信息并查询数据库
    console.warn('⚠️ [Auth] 临时跳过用户加载（Auth0 待集成）')
    
    req.userId = 'temp-user-id'
    req.dbUserId = 'temp-db-user-id'
    
    next()
  }
  catch (error: any) {
    console.error('❌ [Auth] 认证失败:', error.message)
    return res.status(401).json({
      status: 'Fail',
      message: '认证失败',
      data: null,
    })
  }
}

/**
 * 要求用户是管理员的中间件
 * TODO: 替换为 Auth0 认证
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  try {
    // TODO: 从 Auth0 获取用户信息并检查角色
    console.warn('⚠️ [Auth] 临时跳过管理员检查（Auth0 待集成）')
    
    req.userId = 'temp-admin-id'
    req.dbUserId = 'temp-db-admin-id'
    
    next()
  }
  catch (error: any) {
    console.error('❌ [Auth] 权限检查失败:', error.message)
    return res.status(500).json({
      status: 'Fail',
      message: '权限检查失败',
      data: null,
    })
  }
}
