/**
 * 用户配置 API 控制器
 */

import type { Request, Response } from 'express'
import {
  getAdditionalConfig,
  getChatConfig,
  getUserConfig,
  getUserSettings,
  getWorkflowConfig,
  resetUserConfig,
  updateAdditionalConfig,
  updateChatConfig,
  updateUserSettings,
  updateWorkflowConfig,
} from '../db/configService'
import { findUserByAuth0Id } from '../db/supabaseUserService'
import { broadcastToUser } from '../services/sseEventBroadcaster'
import { addPerfCheckpoint } from '../middleware/performanceLogger'

/**
 * 获取当前用户的数据库 user_id
 */
async function getUserIdFromRequest(req: Request): Promise<string | null> {
  // TODO: 使用 Auth0 认证
  const userId = req.userId
  if (!userId) {
    return null
  }

  try {
    const start = performance.now()
    const user = await findUserByAuth0Id(userId)
    const duration = performance.now() - start
    addPerfCheckpoint(req, `Get UserId: ${duration.toFixed(0)}ms`)
    return user?.user_id || null
  }
  catch (error: any) {
    console.error('❌ [ConfigController] 获取用户ID失败:', error.message)
    return null
  }
}

/**
 * 获取用户完整配置
 * GET /api/config
 */
export async function getConfig(req: Request, res: Response) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return res.status(401).json({
        status: 'Fail',
        message: '未授权：用户未登录',
        data: null,
      })
    }

    const start = performance.now()
    const config = await getUserConfig(userId)
    const duration = performance.now() - start
    addPerfCheckpoint(req, `Get Config: ${duration.toFixed(0)}ms`)

    res.json({
      status: 'Success',
      message: '获取配置成功',
      data: config,
    })
  }
  catch (error: any) {
    console.error('❌ [ConfigController] 获取配置失败:', error.message)
    res.status(500).json({
      status: 'Fail',
      message: `获取配置失败: ${error.message}`,
      data: null,
    })
  }
}

/**
 * 获取用户设置
 * GET /api/config/user-settings
 */
export async function getUserSettingsHandler(req: Request, res: Response) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return res.status(401).json({
        status: 'Fail',
        message: '未授权：用户未登录',
        data: null,
      })
    }

    const settings = await getUserSettings(userId)

    res.json({
      status: 'Success',
      message: '获取用户设置成功',
      data: settings,
    })
  }
  catch (error: any) {
    console.error('❌ [ConfigController] 获取用户设置失败:', error.message)
    res.status(500).json({
      status: 'Fail',
      message: `获取用户设置失败: ${error.message}`,
      data: null,
    })
  }
}

/**
 * 更新用户设置
 * PATCH /api/config/user-settings
 */
export async function patchUserSettings(req: Request, res: Response) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return res.status(401).json({
        status: 'Fail',
        message: '未授权：用户未登录',
        data: null,
      })
    }

    const updates = req.body
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({
        status: 'Fail',
        message: '无效的请求体',
        data: null,
      })
    }

    const result = await updateUserSettings(userId, updates)

    // ℹ️ SSE 配置同步已移除
    // 原因：项目设计为单设备登录，只需在登录时从数据库读取最新配置
    // 未来计划：使用 SSE 实现单设备登录（踢掉其他设备）
    //
    // 实现思路：
    // 1. 用户登录时，生成 session_id，存储到 Redis
    // 2. 新设备登录时，删除旧 session，通过 SSE 通知旧设备下线
    // 3. 旧设备收到下线通知后，强制退出登录
    //
    // 原代码（已注释）：
    // const auth0Id = req.userId
    // if (auth0Id) {
    //   broadcastToUser(auth0Id, {
    //     event: 'config_updated',
    //     data: { type: 'user_settings', updates: result, timestamp: Date.now() }
    //   })
    // }

    res.json({
      status: 'Success',
      message: '更新用户设置成功',
      data: result,
    })
  }
  catch (error: any) {
    console.error('❌ [ConfigController] 更新用户设置失败:', error.message)
    res.status(500).json({
      status: 'Fail',
      message: `更新用户设置失败: ${error.message}`,
      data: null,
    })
  }
}

/**
 * 获取聊天配置
 * GET /api/config/chat
 */
export async function getChatConfigHandler(req: Request, res: Response) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return res.status(401).json({
        status: 'Fail',
        message: '未授权：用户未登录',
        data: null,
      })
    }

    const config = await getChatConfig(userId)

    res.json({
      status: 'Success',
      message: '获取聊天配置成功',
      data: config,
    })
  }
  catch (error: any) {
    console.error('❌ [ConfigController] 获取聊天配置失败:', error.message)
    res.status(500).json({
      status: 'Fail',
      message: `获取聊天配置失败: ${error.message}`,
      data: null,
    })
  }
}

/**
 * 更新聊天配置
 * PATCH /api/config/chat
 */
export async function patchChatConfig(req: Request, res: Response) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return res.status(401).json({
        status: 'Fail',
        message: '未授权：用户未登录',
        data: null,
      })
    }

    const updates = req.body
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({
        status: 'Fail',
        message: '无效的请求体',
        data: null,
      })
    }

    const result = await updateChatConfig(userId, updates)

    res.json({
      status: 'Success',
      message: '更新聊天配置成功',
      data: result,
    })
  }
  catch (error: any) {
    console.error('❌ [ConfigController] 更新聊天配置失败:', error.message)
    res.status(500).json({
      status: 'Fail',
      message: `更新聊天配置失败: ${error.message}`,
      data: null,
    })
  }
}

/**
 * 获取工作流配置
 * GET /api/config/workflow
 */
export async function getWorkflowConfigHandler(req: Request, res: Response) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return res.status(401).json({
        status: 'Fail',
        message: '未授权：用户未登录',
        data: null,
      })
    }

    const config = await getWorkflowConfig(userId)

    res.json({
      status: 'Success',
      message: '获取工作流配置成功',
      data: config,
    })
  }
  catch (error: any) {
    console.error('❌ [ConfigController] 获取工作流配置失败:', error.message)
    res.status(500).json({
      status: 'Fail',
      message: `获取工作流配置失败: ${error.message}`,
      data: null,
    })
  }
}

/**
 * 更新工作流配置
 * PATCH /api/config/workflow
 */
export async function patchWorkflowConfig(req: Request, res: Response) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return res.status(401).json({
        status: 'Fail',
        message: '未授权：用户未登录',
        data: null,
      })
    }

    const updates = req.body
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({
        status: 'Fail',
        message: '无效的请求体',
        data: null,
      })
    }

    const result = await updateWorkflowConfig(userId, updates)

    res.json({
      status: 'Success',
      message: '更新工作流配置成功',
      data: result,
    })
  }
  catch (error: any) {
    console.error('❌ [ConfigController] 更新工作流配置失败:', error.message)
    res.status(500).json({
      status: 'Fail',
      message: `更新工作流配置失败: ${error.message}`,
      data: null,
    })
  }
}

/**
 * 获取额外配置
 * GET /api/config/additional
 */
export async function getAdditionalConfigHandler(req: Request, res: Response) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return res.status(401).json({
        status: 'Fail',
        message: '未授权：用户未登录',
        data: null,
      })
    }

    const config = await getAdditionalConfig(userId)

    res.json({
      status: 'Success',
      message: '获取额外配置成功',
      data: config,
    })
  }
  catch (error: any) {
    console.error('❌ [ConfigController] 获取额外配置失败:', error.message)
    res.status(500).json({
      status: 'Fail',
      message: `获取额外配置失败: ${error.message}`,
      data: null,
    })
  }
}

/**
 * 更新额外配置
 * PATCH /api/config/additional
 */
export async function patchAdditionalConfig(req: Request, res: Response) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return res.status(401).json({
        status: 'Fail',
        message: '未授权：用户未登录',
        data: null,
      })
    }

    const updates = req.body
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({
        status: 'Fail',
        message: '无效的请求体',
        data: null,
      })
    }

    const result = await updateAdditionalConfig(userId, updates)

    res.json({
      status: 'Success',
      message: '更新额外配置成功',
      data: result,
    })
  }
  catch (error: any) {
    console.error('❌ [ConfigController] 更新额外配置失败:', error.message)
    res.status(500).json({
      status: 'Fail',
      message: `更新额外配置失败: ${error.message}`,
      data: null,
    })
  }
}

/**
 * 重置用户配置为默认值
 * POST /api/config/reset
 */
export async function resetConfig(req: Request, res: Response) {
  try {
    const userId = await getUserIdFromRequest(req)
    if (!userId) {
      return res.status(401).json({
        status: 'Fail',
        message: '未授权：用户未登录',
        data: null,
      })
    }

    const config = await resetUserConfig(userId)

    res.json({
      status: 'Success',
      message: '重置配置成功',
      data: config,
    })
  }
  catch (error: any) {
    console.error('❌ [ConfigController] 重置配置失败:', error.message)
    res.status(500).json({
      status: 'Fail',
      message: `重置配置失败: ${error.message}`,
      data: null,
    })
  }
}
