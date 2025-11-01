/**
 * SSE 连接管理器
 * 用于管理与后端的 Server-Sent Events 连接
 */

/**
 * SSE 连接管理器类
 */
class SSEConnectionManager {
  private eventSource: EventSource | null = null
  private reconnectTimer: NodeJS.Timeout | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 3000
  private isManualDisconnect = false

  /**
   * 建立 SSE 连接
   */
  async connect(): Promise<void> {
    // 检查网络状态
    if (!navigator.onLine) {
      console.warn('[SSE] ⚠️ 网络离线，跳过连接')
      return
    }

    // 动态导入 store，避免循环依赖
    const { useAuthStore } = await import('@/store/modules/auth')
    const authStore = useAuthStore()

    if (!authStore.userInfo?.id) {
      console.warn('[SSE] ⚠️ 未登录，跳过连接')
      return
    }

    // 如果已有连接，先断开
    if (this.eventSource) {
      this.disconnect()
    }

    this.isManualDisconnect = false

    try {
      // 构建 SSE URL
      // VITE_APP_API_BASE_URL 可能是完整 URL（如 https://supercocmos.me/api）或空字符串
      const baseURL = import.meta.env.VITE_APP_API_BASE_URL || ''
      let url: string
      if (!baseURL) {
        // 开发环境：使用相对路径
        url = '/api/events/sync'
      }
      else if (baseURL.endsWith('/api')) {
        // 生产环境：baseURL 已包含 /api，直接拼接路径
        url = `${baseURL}/events/sync`
      }
      else {
        // 如果 baseURL 不包含 /api，则添加
        url = `${baseURL}/api/events/sync`
      }

      // 🔥 创建 EventSource（使用 Cookie 认证）
      // withCredentials: true 会自动发送 Cookie
      this.eventSource = new EventSource(url, {
        withCredentials: true,
      })

      // 设置事件监听器
      await this.setupEventListeners()
    }
    catch (error) {
      console.error('[SSE] ❌ 连接失败:', error)
      this.scheduleReconnect()
    }
  }

  /**
   * 断开 SSE 连接
   */
  disconnect(): void {
    this.isManualDisconnect = true

    if (this.eventSource) {
      console.warn('[SSE] 🔌 断开连接')
      this.eventSource.close()
      this.eventSource = null
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    this.reconnectAttempts = 0
  }

  /**
   * 重新连接
   */
  reconnect(): void {
    console.warn('[SSE] 🔄 手动重连...')
    this.disconnect()
    this.connect()
  }

  /**
   * 设置事件监听器
   */
  private async setupEventListeners(): Promise<void> {
    if (!this.eventSource)
      return

    // 动态导入 chatStore，避免循环依赖
    const { useChatStore } = await import('@/store/modules/chat')
    const chatStore = useChatStore()

    // ==================== 连接成功 ====================
    this.eventSource.addEventListener('connected', (event) => {
      const data = JSON.parse(event.data)
      console.warn('[SSE] ✅ 连接确认:', data)
      this.reconnectAttempts = 0
    })

    // ==================== 新建会话事件 ====================
    this.eventSource.addEventListener('conversation_created', (event) => {
      const data = JSON.parse(event.data)
      console.warn('[SSE] 📝 新会话创建:', data)

      // 添加到会话列表
      if (data.conversation) {
        chatStore.addConversationFromSSE(data.conversation)
      }
    })

    // ==================== 会话更新事件 ====================
    this.eventSource.addEventListener('conversation_updated', (event) => {
      const data = JSON.parse(event.data)
      console.warn('[SSE] 📝 会话更新:', data)

      // 更新会话信息
      if (data.conversationId && data.updates) {
        chatStore.updateConversationFromSSE(data.conversationId, data.updates)
      }
    })

    // ==================== 删除会话事件 ====================
    this.eventSource.addEventListener('conversation_deleted', (event) => {
      const data = JSON.parse(event.data)
      console.warn('[SSE] 🗑️ 会话删除:', data)

      // 从列表移除
      if (data.conversationId) {
        chatStore.removeConversationFromSSE(data.conversationId)
      }
    })

    // ==================== 新消息事件 ====================
    this.eventSource.addEventListener('new_message', (event) => {
      const data = JSON.parse(event.data)
      console.warn('[SSE] 💬 新消息:', data)

      // 只更新当前激活的会话
      if (data.conversationId === chatStore.active && data.message) {
        chatStore.addMessageFromSSE(data.conversationId, data.message)
      }
      else if (data.conversationId) {
        // 其他会话只标记未读
        chatStore.markConversationUnread(data.conversationId)
      }
    })

    // ==================== 消息更新事件 ====================
    this.eventSource.addEventListener('message_updated', (event) => {
      const data = JSON.parse(event.data)
      console.warn('[SSE] 💬 消息更新:', data)

      if (data.conversationId && data.messageId && data.updates) {
        chatStore.updateMessageFromSSE(
          data.conversationId,
          data.messageId,
          data.updates,
        )
      }
    })

    // ==================== 需要同步事件 ====================
    this.eventSource.addEventListener('sync_required', (event) => {
      const data = JSON.parse(event.data)
      console.warn('[SSE] 🔄 需要同步:', data)

      // 触发完整同步
      chatStore.syncFromBackend()
    })

    // ==================== 配置更新事件（已禁用）====================
    // ℹ️ 配置同步功能已移除
    // 原因：项目设计为单设备登录，配置只需在登录时从数据库读取
    // 未来计划：SSE 将用于实现单设备登录（踢掉其他设备）
    //
    // 实现思路：
    // 1. 用户登录时，生成 session_id，存储到 Redis
    // 2. 新设备登录时，删除旧 session，通过 SSE 发送 'force_logout' 事件
    // 3. 旧设备收到 'force_logout' 后，强制退出登录并跳转到登录页
    //
    // 原代码（已注释）：
    // this.eventSource.addEventListener('config_updated', async (event) => {
    //   const data = JSON.parse(event.data)
    //   console.log('[SSE] ⚙️ 配置更新:', data)
    //   const { useConfigStore } = await import('@/store/modules/config')
    //   const configStore = useConfigStore()
    //   if (data.type === 'user_settings' || data.type === 'all') {
    //     await configStore.loadUserSettings()
    //   }
    //   // ... 其他配置类型
    // })

    // ==================== 错误处理 ====================
    this.eventSource.onerror = (error) => {
      console.error('[SSE] ❌ 连接错误222:', error)

      // 检查连接状态
      if (this.eventSource?.readyState === EventSource.CLOSED) {
        console.warn('[SSE] 连接已关闭')

        // 如果不是手动断开，尝试重连
        if (!this.isManualDisconnect) {
          this.scheduleReconnect()
        }
      }
    }

    // ==================== 开启事件（浏览器默认） ====================
    this.eventSource.onopen = () => {
      console.warn('[SSE] 🌐 连接已打开')
    }
  }

  /**
   * 安排重连
   */
  private scheduleReconnect(): void {
    if (this.isManualDisconnect) {
      console.warn('[SSE] 手动断开，不重连')
      return
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[SSE] ❌ 超过最大重连次数，停止重连')
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * 2 ** (this.reconnectAttempts - 1)

    console.warn(
      `[SSE] 🔄 ${delay}ms 后尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
    )

    this.reconnectTimer = setTimeout(() => {
      this.connect()
    }, delay)
  }

  /**
   * 获取连接状态
   */
  getStatus(): {
    connected: boolean
    reconnectAttempts: number
    readyState: number | null
  } {
    return {
      connected: this.eventSource?.readyState === EventSource.OPEN,
      reconnectAttempts: this.reconnectAttempts,
      readyState: this.eventSource?.readyState ?? null,
    }
  }
}

// 导出单例
export const sseManager = new SSEConnectionManager()

// 监听网络状态变化
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.warn('[SSE] 🌐 网络恢复，尝试重连')
    sseManager.reconnect()
  })

  window.addEventListener('offline', () => {
    console.warn('[SSE] ⚠️ 网络断开，断开 SSE 连接')
    sseManager.disconnect()
  })

  // 🔥 页面卸载时主动断开连接（避免后端报错）
  window.addEventListener('beforeunload', () => {
    console.warn('[SSE] 🔄 页面卸载，主动断开连接')
    sseManager.disconnect()
  })
}
