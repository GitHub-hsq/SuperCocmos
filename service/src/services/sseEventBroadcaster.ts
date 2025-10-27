/**
 * SSE 事件广播器
 * 用于向用户的所有连接设备推送实时事件
 */

import type { Response } from 'express'

// SSE 事件类型
export type SSEEventType =
  | 'connected'              // 连接建立
  | 'conversation_created'   // 新建会话
  | 'conversation_updated'   // 会话更新
  | 'conversation_deleted'   // 删除会话
  | 'new_message'            // 新消息
  | 'message_updated'        // 消息更新
  | 'sync_required'          // 需要完整同步
  | 'config_updated'         // 配置更新

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
