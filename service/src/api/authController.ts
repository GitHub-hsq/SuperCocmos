/**
 * 认证控制器
 * 支持 Auth0 认证
 */

import type { Request, Response } from 'express'
import { findUserByAuth0Id } from '../db/supabaseUserService'
import { getUserWithRoles } from '../db/userRoleService'
import { clearUserLoginCache } from '../cache/userLoginCache'
import { clearJWTCache } from '../cache/jwtCache'

/**
 * 将 Access Token 写入 Cookie（用于 SSE 认证）
 * POST /api/auth/set-token-cookie
 * 前端登录后调用此接口，将 token 存储到 HttpOnly Cookie 中
 */
export async function setTokenCookie(req: Request, res: Response) {
  try {
    const { token } = req.body

    if (!token) {
      return res.status(400).json({
        status: 'Fail',
        message: '缺少 token 参数',
        data: null,
      })
    }

    // 🔥 设置 HttpOnly Cookie（更安全）
    // maxAge: 24小时（与 Auth0 token 过期时间一致）
    res.cookie('access_token', token, {
      httpOnly: true, // 防止 XSS 攻击
      secure: process.env.NODE_ENV === 'production', // 生产环境使用 HTTPS
      sameSite: 'lax', // 防止 CSRF 攻击
      maxAge: 24 * 60 * 60 * 1000, // 24小时
      path: '/', // 全局路径
    })

    return res.json({
      status: 'Success',
      message: 'Token 已设置到 Cookie',
      data: null,
    })
  }
  catch (error: any) {
    console.error('[Auth] ❌ 设置 Cookie 失败:', error)
    return res.status(500).json({
      status: 'Fail',
      message: '设置 Cookie 失败',
      data: null,
    })
  }
}

/**
 * Auth0 Webhook 处理器
 */
export async function handleAuth0Webhook(req: Request, res: Response) {
  try {
    console.warn('📥 [Auth0 Webhook] 接收到 Auth0 Webhook 请求')
    // TODO: 实现 Auth0 Webhook 处理逻辑
    console.warn('⚠️ [Webhook] Auth0 Webhook 处理逻辑待实现')
    return res.status(200).send({
      status: 'Success',
      message: 'Auth0 Webhook received',
      data: null,
    })
  }
  catch (error: any) {
    console.error('❌ [Auth0 Webhook] 处理失败:', error.message)
    return res.status(500).send({
      status: 'Fail',
      message: error?.message || String(error),
      data: null,
    })
  }
}

/**
 * 用户退出登录
 * POST /api/auth/logout
 * 清除用户相关的 Redis 缓存
 */
export async function logout(req: Request, res: Response) {
  try {
    const auth0Id = req.userId

    if (!auth0Id) {
      // 即使没有 userId，也返回成功（可能已经退出登录）
      return res.json({
        status: 'Success',
        message: '退出登录成功',
        data: null,
      })
    }

    // 🔥 清除用户相关的所有 Redis 缓存
    try {
      // 获取 Supabase UUID（用于清除缓存）
      const user = await findUserByAuth0Id(auth0Id)
      if (user?.user_id) {
        // 清除用户登录缓存（配置、角色、会话列表等）
        // 同时传入 Auth0 ID 和 Supabase UUID，确保清除所有相关缓存
        await clearUserLoginCache(user.user_id, auth0Id)
        console.warn(`✅ [Auth] 用户 ${user.user_id} 退出登录，已清除所有缓存`)
      }

      // 清除 JWT 缓存（从多个位置尝试获取 token）
      let token = req.headers.authorization?.replace('Bearer ', '')
      // 如果 Authorization header 中没有，尝试从 Cookie 获取
      if (!token && req.cookies?.access_token) {
        token = req.cookies.access_token
      }
      if (token) {
        await clearJWTCache(token)
        console.warn(`✅ [Auth] 已清除 JWT 缓存`)
      }
      else {
        console.warn(`⚠️ [Auth] 未找到 token，跳过清除 JWT 缓存`)
      }
    }
    catch (cacheError: any) {
      // 缓存清除失败不影响退出登录流程
      console.error('⚠️ [Auth] 清除缓存失败（不影响退出登录）:', cacheError.message)
    }

    // 清除 Cookie（如果存在）
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    })

    return res.json({
      status: 'Success',
      message: '退出登录成功',
      data: null,
    })
  }
  catch (error: any) {
    console.error('❌ [Auth] 退出登录失败:', error.message)
    // 即使出错也返回成功，避免影响前端退出流程
    return res.json({
      status: 'Success',
      message: '退出登录成功',
      data: null,
    })
  }
}

/**
 * 获取当前登录用户信息（包含角色）
 */
export async function getCurrentUser(req: Request, res: Response) {
  try {
    const userId = req.userId

    if (!userId) {
      return res.status(401).send({
        status: 'Fail',
        message: '未登录',
        data: null,
      })
    }

    // 从用户 ID 获取用户信息
    const user = await findUserByAuth0Id(userId)
    if (!user) {
      return res.status(404).send({
        status: 'Fail',
        message: '用户不存在',
        data: null,
      })
    }

    // 获取用户角色
    const userWithRoles = await getUserWithRoles(user.user_id)

    // 提取主要角色（优先返回 admin）
    const roles = userWithRoles?.roles || []
    const role = roles.includes('admin') ? 'admin' : (roles[0] || 'user')

    res.send({
      status: 'Success',
      message: '获取用户信息成功',
      data: {
        user: {
          id: user.user_id,
          auth0Id: user.auth0_id, // Auth0 用户 ID
          username: user.username,
          email: user.email,
          phone: user.phone,
          avatarUrl: user.avatar_url,
          provider: user.provider,
          status: user.status,
          role, // 主要角色
          roles, // 所有角色
          createdAt: user.created_at,
          updatedAt: user.updated_at,
          lastLoginAt: user.last_login_at,
        },
      },
    })
  }
  catch (error: any) {
    console.error('❌ [Auth] 获取用户信息失败:', error.message)
    res.status(500).send({
      status: 'Fail',
      message: error?.message || String(error),
      data: null,
    })
  }
}
