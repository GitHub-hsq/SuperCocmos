/**
 * SSE 控制器
 * 处理 Server-Sent Events 连接和事件推送
 */

import type { Request, Response } from 'express'
import { getSSEStats, registerUserSSEConnection, unregisterUserSSEConnection } from '../services/sseEventBroadcaster'

/**
 * SSE 连接 endpoint
 * GET /api/events/sync
 * 建立 SSE 长连接，用于推送实时事件,目前不处理同步问题，因为是单设备登录，留着sse只是为了后续可能会用到
 */
export async function handleSSEConnection(req: Request, res: Response) {
  // 获取用户 ID（从认证中间件设置）
  const userId = req.user?.user_id

  if (!userId) {
    return res.status(401).json({
      status: 'Fail',
      message: '未认证',
      data: null,
    })
  }

  // 设置 SSE 响应头
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no') // 禁用 Nginx 缓冲

  // 设置 TCP 无延迟
  if (req.socket) {
    req.socket.setNoDelay(true)
    req.socket.setTimeout(0)
  }

  // 立即发送响应头
  res.flushHeaders()

  // 发送连接确认事件
  const connectedEvent = `event: connected\ndata: ${JSON.stringify({
    userId,
    timestamp: Date.now(),
    message: 'SSE 连接已建立',
  })}\n\n`

  res.write(connectedEvent)

  // console.log(`[SSE] ✅ 用户 ${userId} 连接成功`)

  // 注册连接
  registerUserSSEConnection(userId, res)

  // 心跳保持连接（每 30 秒发送一次心跳）
  const heartbeatInterval = setInterval(() => {
    try {
      res.write(`:heartbeat ${Date.now()}\n\n`)
    }
    catch (error) {
      console.error(`[SSE] ❌ 心跳发送失败:`, error)
      clearInterval(heartbeatInterval)
    }
  }, 30000)

  // 客户端断开连接时清理
  req.on('close', () => {
    clearInterval(heartbeatInterval)
    unregisterUserSSEConnection(userId, res)
    res.end()
  })

  // 处理错误
  req.on('error', () => {
    clearInterval(heartbeatInterval)
    unregisterUserSSEConnection(userId, res)
    res.end()
  })
}

/**
 * 获取 SSE 统计信息
 * GET /api/events/stats
 * 需要管理员权限
 */
export async function getSSEStatsHandler(req: Request, res: Response) {
  try {
    const stats = getSSEStats()

    res.json({
      status: 'Success',
      message: '获取 SSE 统计信息成功',
      data: stats,
    })
  }
  catch (error: any) {
    console.error('[SSE Stats] 获取统计失败:', error)
    res.status(500).json({
      status: 'Fail',
      message: '获取统计信息失败',
      data: null,
    })
  }
}
