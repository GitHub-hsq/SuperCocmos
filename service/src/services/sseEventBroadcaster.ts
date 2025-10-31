/**
 * SSE 事件广播器
 * 用于向用户的所有连接设备推送实时事件
 *
 * ==================== 🔥 未来功能：单设备登录 ====================
 *
 * 设计目标：
 * - 同一账号同时只允许一个设备登录
 * - 新设备登录时，自动踢掉旧设备
 * - 旧设备实时收到下线通知并强制退出
 *
 * 实现方案：
 *
 * 1️⃣ 【登录阶段】用户登录成功后：
 *    - 生成唯一的 session_id（使用 nanoid 或 UUID）
 *    - 将 session 信息存储到 Redis：
 *      Key: `user_session:${auth0Id}`
 *      Value: {
 *        session_id: "a8f9b2...",
 *        device: "Chrome Windows",
 *        login_time: "2025-10-27T12:00:00",
 *        expires_at: "2025-10-28T12:00:00"
 *      }
 *      TTL: 24小时（根据 JWT token 过期时间）
 *
 * 2️⃣ 【中间件验证】每次请求时：
 *    - auth0 中间件验证 JWT token 是否有效
 *    - 异步验证 session_id 是否与 Redis 中的活跃 session 匹配
 *    - 不匹配 → 返回 401 + { code: 'SESSION_EXPIRED' }
 *
 * 3️⃣ 【新登录处理】新设备登录时：
 *    - 查询 Redis 中是否存在旧 session
 *    - 如果存在：
 *      a. 通过 SSE 发送 'force_logout' 事件给旧设备
 *      b. 删除旧 session
 *      c. 写入新 session
 *      d. 返回新 JWT token 和 session_id
 *
 * 4️⃣ 【SSE 事件】旧设备收到 'force_logout' 后：
 *    - 清空本地 token 和用户信息
 *    - 断开 SSE 连接
 *    - 显示通知："您的账号已在其他设备登录"
 *    - 跳转到登录页
 *
 * Redis 数据结构示例：
 * ```
 * Key: user_session:auth0|68fe4701bd9b8a1be3e53a3a
 * Value: {
 *   "session_id": "a8f9b2c3d4e5f6...",
 *   "device": "Chrome 120 on Windows 10",
 *   "ip": "192.168.1.100",
 *   "login_time": "2025-10-27T12:00:00.000Z",
 *   "expires_at": "2025-10-28T12:00:00.000Z"
 * }
 * TTL: 86400 (24小时)
 * ```
 *
 * SSE 事件格式：
 * ```
 * event: force_logout
 * data: {
 *   "reason": "new_login",
 *   "message": "您的账号已在其他设备登录",
 *   "new_device": "Chrome Windows",
 *   "timestamp": 1698412800000
 * }
 * ```
 *
 * 实现文件：
 * - service/src/middleware/sessionManager.ts (新建)：Session 管理
 * - service/src/middleware/auth0.ts：添加 session 验证
 * - service/src/api/authController.ts：登录/登出逻辑
 * - src/services/sseService.ts：添加 force_logout 事件监听
 *
 * ============================================================
 */

import type { Response } from 'express'

// SSE 事件类型
export type SSEEventType
  = | 'connected' // 连接建立
    | 'conversation_created' // 新建会话
    | 'conversation_updated' // 会话更新
    | 'conversation_deleted' // 删除会话
    | 'new_message' // 新消息
    | 'message_updated' // 消息更新
    | 'sync_required' // 需要完整同步
    | 'config_updated' // 配置更新

// SSE 事件数据结构
export interface SSEEvent {
  event: SSEEventType
  data: {
    conversationId?: string
    conversation?: any
    message?: any
    updates?: any
    metadata?: any
    timestamp: number
  }
}

// 用户连接管理：userId -> Set<Response>
const userConnections = new Map<string, Set<Response>>()

/**
 * 注册用户的 SSE 连接
 */
export function registerUserSSEConnection(userId: string, res: Response): void {
  if (!userConnections.has(userId)) {
    userConnections.set(userId, new Set())
  }

  userConnections.get(userId)!.add(res)

  const connectionCount = userConnections.get(userId)!.size
  console.log(`[SSE] ✅ 用户 ${userId} 连接数: ${connectionCount}`)
}

/**
 * 取消注册用户的 SSE 连接
 */
export function unregisterUserSSEConnection(userId: string, res: Response): void {
  const connections = userConnections.get(userId)

  if (connections) {
    connections.delete(res)

    const connectionCount = connections.size
    console.log(`[SSE] ❌ 用户 ${userId} 断开连接，剩余: ${connectionCount}`)

    // 如果没有连接了，清理 Map
    if (connectionCount === 0) {
      userConnections.delete(userId)
    }
  }
}

/**
 * 获取用户的连接数
 */
export function getUserConnectionCount(userId: string): number {
  return userConnections.get(userId)?.size || 0
}

/**
 * 获取所有在线用户数
 */
export function getOnlineUserCount(): number {
  return userConnections.size
}

/**
 * 广播事件到用户的所有设备
 */
export function broadcastToUser(userId: string, event: SSEEvent): boolean {
  const connections = userConnections.get(userId)

  if (!connections || connections.size === 0) {
    console.log(`[SSE] ⚠️ 用户 ${userId} 没有活动连接`)
    return false
  }

  // 格式化 SSE 数据
  const eventData = `event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`

  let successCount = 0
  const deadConnections: Response[] = []

  // 向所有连接发送数据
  connections.forEach((res) => {
    try {
      res.write(eventData)
      successCount++
    }
    catch (error) {
      console.error(`[SSE] ❌ 发送失败:`, error)
      deadConnections.push(res)
    }
  })

  // 清理失败的连接
  deadConnections.forEach((res) => {
    connections.delete(res)
  })

  console.log(`[SSE] 📡 广播事件 "${event.event}" 到用户 ${userId} 的 ${successCount} 个设备`)

  return successCount > 0
}

/**
 * 广播：会话创建
 */
export function broadcastConversationCreated(
  userId: string,
  conversation: any,
): boolean {
  return broadcastToUser(userId, {
    event: 'conversation_created',
    data: {
      conversation,
      timestamp: Date.now(),
    },
  })
}

/**
 * 广播：会话更新
 */
export function broadcastConversationUpdated(
  userId: string,
  conversationId: string,
  updates: any,
): boolean {
  return broadcastToUser(userId, {
    event: 'conversation_updated',
    data: {
      conversationId,
      updates,
      timestamp: Date.now(),
    },
  })
}

/**
 * 广播：会话删除
 */
export function broadcastConversationDeleted(
  userId: string,
  conversationId: string,
): boolean {
  return broadcastToUser(userId, {
    event: 'conversation_deleted',
    data: {
      conversationId,
      timestamp: Date.now(),
    },
  })
}

/**
 * 广播：新消息
 */
export function broadcastNewMessage(
  userId: string,
  conversationId: string,
  message: any,
): boolean {
  return broadcastToUser(userId, {
    event: 'new_message',
    data: {
      conversationId,
      message,
      timestamp: Date.now(),
    },
  })
}

/**
 * 广播：消息更新
 */
export function broadcastMessageUpdated(
  userId: string,
  conversationId: string,
  messageId: string,
  updates: any,
): boolean {
  return broadcastToUser(userId, {
    event: 'message_updated',
    data: {
      conversationId,
      messageId,
      updates,
      timestamp: Date.now(),
    },
  })
}

/**
 * 广播：需要同步
 */
export function broadcastSyncRequired(userId: string, reason?: string): boolean {
  return broadcastToUser(userId, {
    event: 'sync_required',
    data: {
      metadata: { reason },
      timestamp: Date.now(),
    },
  })
}

/**
 * 获取统计信息
 */
export function getSSEStats() {
  const stats = {
    onlineUsers: userConnections.size,
    totalConnections: 0,
    userDetails: [] as { userId: string, connections: number }[],
  }

  userConnections.forEach((connections, userId) => {
    stats.totalConnections += connections.size
    stats.userDetails.push({
      userId,
      connections: connections.size,
    })
  })

  return stats
}
