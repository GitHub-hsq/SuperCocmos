/**
 * 应用初始化控制器
 * 提供一个统一的初始化接口,并行处理用户同步、配置加载和会话列表获取
 * 优化首次登录的加载速度
 *
 * 🔥 优化原理：
 * - 所有查询操作基于 auth0_id（从 token 中获取），无需等待用户同步
 * - 用户同步异步执行，不阻塞其他操作
 * - 配置、会话、角色并行加载
 */

import type { Request, Response } from 'express'
import { findUserByAuth0Id, upsertUserFromAuth0 } from '../db/supabaseUserService'
import { getUserWithRolesByAuth0Id } from '../db/userRoleService'
import { addPerfCheckpoint } from '../middleware/performanceLogger'
import { logger, measurePerformance } from '../utils/logger'

/**
 * 应用初始化接口
 * POST /api/init
 *
 * 并行执行以下操作：
 * 1. 同步 Auth0 用户到 Supabase
 * 2. 获取用户配置
 * 3. 获取用户会话列表
 *
 * 请求体：
 * {
 *   auth0_id: string
 *   email: string
 *   username: string
 *   avatar_url?: string
 *   email_verified?: boolean
 * }
 *
 * 响应：
 * {
 *   status: 'Success' | 'Fail',
 *   message: string,
 *   data: {
 *     user: { ... },
 *     config: { ... },
 *     conversations: [ ... ]
 *   }
 * }
 */
export async function initializeApp(req: Request, res: Response) {
  const totalStartTime = performance.now()

  try {
    const { auth0_id, email, username, avatar_url, email_verified } = req.body

    if (!auth0_id || !email) {
      return res.status(400).json({
        status: 'Fail',
        message: '缺少必需参数：auth0_id 和 email',
        data: null,
      })
    }

    logger.info(`[Init] 开始应用初始化: ${email}`)

    // 🔥 步骤 1: 先同步用户（必须完成，确保用户在数据库中存在）
    const user = await measurePerformance(
      '用户同步 (upsertUserFromAuth0)',
      async () => {
        try {
          return await upsertUserFromAuth0({
            auth0_id,
            email,
            username: username || email.split('@')[0],
            avatar_url,
            email_verified,
          })
        }
        catch (error: any) {
          logger.error(`[Init] 用户同步失败，尝试查询已存在用户: ${error.message}`)
          // 尝试从数据库查询已存在的用户
          return await findUserByAuth0Id(auth0_id)
        }
      },
      2000, // 超过2秒视为慢操作
    )

    if (!user) {
      logger.error('❌ [Init] 用户同步失败且用户不存在')
      return res.status(500).json({
        status: 'Fail',
        message: '用户同步失败',
        data: null,
      })
    }

    // 用户同步成功由 measurePerformance 自动记录

    // 🔥 步骤 2: 用户同步完成后，并行加载配置、会话列表和角色
    const userId = user.user_id

    const [configResult, conversationsResult, rolesResult] = await measurePerformance(
      '并行加载 (配置+会话+角色)',
      async () => {
        return await Promise.allSettled([
          // 2.1 获取用户配置
          measurePerformance('获取用户配置', async () => {
            try {
              const { getUserConfig } = await import('../db/configService')
              return await getUserConfig(userId)
            }
            catch (error: any) {
              logger.error(`[Init] 配置加载失败: ${error.message}`)
              return null
            }
          }, 1000),

          // 2.2 获取会话列表
          measurePerformance('获取会话列表', async () => {
            try {
              const { getUserConversations } = await import('../db/conversationService')
              const conversations = await getUserConversations(userId, { limit: 50, offset: 0 })
              return conversations || []
            }
            catch (error: any) {
              logger.error(`[Init] 会话列表加载失败: ${error.message}`)
              return []
            }
          }, 1000),

          // 2.3 获取用户角色
          measurePerformance('获取用户角色', async () => {
            try {
              const userWithRoles = await getUserWithRolesByAuth0Id(auth0_id)
              return userWithRoles
            }
            catch (error: any) {
              logger.error(`[Init] 角色加载失败: ${error.message}`)
              return null
            }
          }, 1000),
        ])
      },
      3000, // 并行加载超过3秒视为慢操作
    )

    // 处理结果
    const config = configResult.status === 'fulfilled' ? configResult.value : null
    const conversations = conversationsResult.status === 'fulfilled' ? conversationsResult.value : []
    const userWithRoles = rolesResult.status === 'fulfilled' ? rolesResult.value : null

    // 提取主要角色（过滤 null 值）
    const roles = (userWithRoles?.roles || []).filter(r => r != null)
    const role = roles.includes('admin') ? 'admin' : (roles[0] || 'user')

    // 构建响应
    const totalDuration = performance.now() - totalStartTime
    addPerfCheckpoint(req, `Total: ${totalDuration.toFixed(0)}ms`)

    logger.info(`[Init] 初始化完成: ${totalDuration.toFixed(0)}ms, ${conversations.length} 个会话`)

    return res.json({
      status: 'Success',
      message: '初始化成功',
      data: {
        user: {
          id: user.user_id,
          auth0Id: user.auth0_id,
          username: user.username,
          email: user.email,
          phone: user.phone,
          avatarUrl: user.avatar_url,
          provider: user.provider,
          status: user.status,
          role,
          roles,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
          lastLoginAt: user.last_login_at,
        },
        config: config || null,
        conversations: conversations || [],
      },
    })
  }
  catch (error: any) {
    const totalDuration = performance.now() - totalStartTime
    logger.error(`[Init] 初始化失败 (${totalDuration.toFixed(0)}ms): ${error.message}`)

    return res.status(500).json({
      status: 'Fail',
      message: `初始化失败: ${error.message}`,
      data: null,
    })
  }
}
