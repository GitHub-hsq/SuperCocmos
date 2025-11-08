/**
 * SSE 控制器
 * 处理 Server-Sent Events 连接和事件推送
 */

import type { Request, Response } from 'express'
import type { Socket } from 'node:net'
import { getSSEStats, registerUserSSEConnection, unregisterUserSSEConnection } from '../services/sseEventBroadcaster'

// 扩展 Request 类型以包含认证信息和 socket
interface SSERequest extends Omit<Request, 'socket'> {
  user?: {
    user_id: string
    auth0_id: string
    [key: string]: any
  }
  socket?: Socket
}

// 扩展 Response 类型以确保包含所有必要的方法
interface SSEResponse extends Response {
  setHeader: (name: string, value: string | number | string[]) => this
  flushHeaders: () => void
  write: (chunk: any, encoding?: any) => boolean
  end: (chunk?: any, encoding?: any) => this
  status: (code: number) => this
  json: (body: any) => this
}

/**
 * SSE 连接 endpoint
 * GET /api/events/sync
 * 建立 SSE 长连接，用于推送实时事件,目前不处理同步问题，因为是单设备登录，留着sse只是为了后续可能会用到
 */
export async function handleSSEConnection(req: Request, res: Response) {
  const sseReq = req as SSERequest
  const sseRes = res as SSEResponse
  // 获取 Auth0 ID（从认证中间件设置）
  const auth0Id = sseReq.user?.user_id

  if (!auth0Id) {
    return sseRes.status(401).json({
      status: 'Fail',
      message: '未认证',
      data: null,
    })
  }

  // 🔥 从数据库查询真实的 user_id（UUID格式）
  const { findUserByAuth0Id } = await import('../db/supabaseUserService')
  const user = await findUserByAuth0Id(auth0Id)

  if (!user) {
    return sseRes.status(404).json({
      status: 'Fail',
      message: '用户不存在',
      data: null,
    })
  }

  const userId = user.user_id // 使用数据库中的 UUID 格式 user_id

  // 设置 SSE 响应头
  sseRes.setHeader('Content-Type', 'text/event-stream')
  sseRes.setHeader('Cache-Control', 'no-cache, no-transform')
  sseRes.setHeader('Connection', 'keep-alive')
  sseRes.setHeader('X-Accel-Buffering', 'no') // 禁用 Nginx 缓冲

  // 设置 TCP 无延迟
  if (sseReq.socket) {
    sseReq.socket.setNoDelay(true)
    sseReq.socket.setTimeout(0)
  }

  // 立即发送响应头
  sseRes.flushHeaders()

  // 发送连接确认事件
  const connectedEvent = `event: connected\ndata: ${JSON.stringify({
    userId,
    auth0Id,
    timestamp: Date.now(),
    message: 'SSE 连接已建立',
  })}\n\n`

  sseRes.write(connectedEvent)

  // console.warn(`[SSE] ✅ 用户 ${userId} (Auth0: ${auth0Id}) 连接成功`)

  // 🔥 使用数据库 UUID 格式 user_id 注册连接
  registerUserSSEConnection(userId, sseRes)

  // 心跳保持连接（每 30 秒发送一次心跳）
  const heartbeatInterval = setInterval(() => {
    try {
      sseRes.write(`:heartbeat ${Date.now()}\n\n`)
    }
    catch (error) {
      console.error(`[SSE] ❌ 心跳发送失败:`, error)
      clearInterval(heartbeatInterval)
    }
  }, 30000)

  // 客户端断开连接时清理
  sseReq.on('close', () => {
    clearInterval(heartbeatInterval)
    unregisterUserSSEConnection(userId, sseRes)
    sseRes.end()
  })

  // 处理错误
  sseReq.on('error', () => {
    clearInterval(heartbeatInterval)
    unregisterUserSSEConnection(userId, sseRes)
    sseRes.end()
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
