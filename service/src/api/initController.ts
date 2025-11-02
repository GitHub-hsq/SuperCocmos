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
import { logger } from '../utils/logger'

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

    logger.info(`🚀 [Init] 开始应用初始化: ${auth0_id.substring(0, 20)}...`)

    // 🔥 步骤 1: 先同步用户（必须完成，确保用户在数据库中存在）
    const syncStart = performance.now()
    let user = null
    try {
      user = await upsertUserFromAuth0({
        auth0_id,
        email,
        username: username || email.split('@')[0],
        avatar_url,
        email_verified,
      })
    }
    catch (error: any) {
      logger.error('❌ [Init] 用户同步失败:', error.message)
      // 尝试从数据库查询已存在的用户
      user = await findUserByAuth0Id(auth0_id)
    }

    if (!user) {
      logger.error('❌ [Init] 用户同步失败且用户不存在')
      return res.status(500).json({
        status: 'Fail',
        message: '用户同步失败',
        data: null,
      })
    }

    const syncDuration = performance.now() - syncStart
    addPerfCheckpoint(req, `User Sync: ${syncDuration.toFixed(0)}ms`)
    logger.info(`✅ [Init] 用户同步成功: ${user.user_id.substring(0, 8)}... (${syncDuration.toFixed(0)}ms)`)

    // 🔥 步骤 2: 用户同步完成后，并行加载配置、会话列表和角色
    const parallelStartTime = performance.now()
    const userId = user.user_id

    const [configResult, conversationsResult, rolesResult] = await Promise.allSettled([
      // 2.1 获取用户配置
      (async () => {
        try {
          const configStart = performance.now()
          const { getUserConfig } = await import('../db/configService')
          const config = await getUserConfig(userId)
          const configDuration = performance.now() - configStart
          addPerfCheckpoint(req, `Config Load: ${configDuration.toFixed(0)}ms`)
          logger.info(`✅ [Init] 配置加载成功 (${configDuration.toFixed(0)}ms)`)
          return config
        }
        catch (error: any) {
          logger.error('❌ [Init] 配置加载失败:', error.message)
          return null
        }
      })(),

      // 2.2 获取会话列表
      (async () => {
        try {
          const conversationsStart = performance.now()
          const { getUserConversations } = await import('../db/conversationService')
          const conversations = await getUserConversations(userId, { limit: 50, offset: 0 })
          const conversationsDuration = performance.now() - conversationsStart
          addPerfCheckpoint(req, `Conversations Load: ${conversationsDuration.toFixed(0)}ms`)
          logger.info(`✅ [Init] 会话列表加载成功: ${conversations?.length || 0} 条 (${conversationsDuration.toFixed(0)}ms)`)
          return conversations || []
        }
        catch (error: any) {
          logger.error('❌ [Init] 会话列表加载失败:', error.message)
          return []
        }
      })(),

      // 2.3 获取用户角色
      (async () => {
        try {
          const rolesStart = performance.now()
          const userWithRoles = await getUserWithRolesByAuth0Id(auth0_id)
          const rolesDuration = performance.now() - rolesStart
          addPerfCheckpoint(req, `Roles Load: ${rolesDuration.toFixed(0)}ms`)
          logger.info(`✅ [Init] 角色加载成功: ${userWithRoles?.roles?.length || 0} 个 (${rolesDuration.toFixed(0)}ms)`)
          return userWithRoles
        }
        catch (error: any) {
          logger.error('❌ [Init] 角色加载失败:', error.message)
          return null
        }
      })(),
    ])

    const parallelDuration = performance.now() - parallelStartTime
    logger.info(`⚡ [Init] 并行加载完成 (${parallelDuration.toFixed(0)}ms)`)

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

    logger.info(`🎉 [Init] 初始化完成: 总耗时 ${totalDuration.toFixed(0)}ms`)

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
        performance: {
          userSync: `${syncDuration.toFixed(0)}ms`,
          parallel: `${parallelDuration.toFixed(0)}ms`,
          total: `${totalDuration.toFixed(0)}ms`,
        },
      },
    })
  }
  catch (error: any) {
    const totalDuration = performance.now() - totalStartTime
    logger.error(`❌ [Init] 初始化失败 (${totalDuration.toFixed(0)}ms):`, error.message)

    return res.status(500).json({
      status: 'Fail',
      message: `初始化失败: ${error.message}`,
      data: null,
    })
  }
}
