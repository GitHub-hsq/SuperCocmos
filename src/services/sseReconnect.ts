/**
 * SSE 重连管理
 * 使用闭包模式捕获 Auth0 实例，处理页面刷新后的 SSE 重连
 */

import type { Auth0VueClient } from '@auth0/auth0-vue'
import { onMounted } from 'vue'
import { setTokenCookie } from '@/api/services/authService'
import { sseManager } from './sseService'

/**
 * 🔥 临时禁用标志：服务器部署后 SSE 连接不稳定，暂时禁用，保留代码以便后续恢复
 */
const SSE_ENABLED = false

/**
 * 设置 SSE 自动重连
 * 参考 setupAuthGuard 和 setupApiClient 的闭包模式
 *
 * @param auth0 Auth0 客户端实例（从 setup 中传入）
 */
export function setupSSEReconnect(auth0: Auth0VueClient) {
  // 🔥 临时禁用：如果 SSE 被禁用，直接返回
  if (!SSE_ENABLED) {
    console.warn('[SSE] ⚠️ SSE 重连已禁用（临时禁用，保留代码以便后续恢复）')
    return
  }
  // 🔥 页面加载后检查 SSE 连接（处理页面刷新）
  onMounted(() => {
    if (auth0.isAuthenticated.value) {
      // 🔥 延迟 3 秒，确保 AppInit 完成（包括 SSE 首次连接）
      setTimeout(async () => {
        const status = sseManager.getStatus()

        // 🔥 只在连接断开时重连（不主动建立首次连接）
        if (!status.connected && status.reconnectAttempts > 0) {
          // 如果 Cookie 可能过期，先刷新 token
          try {
            const token = await auth0.getAccessTokenSilently({
              authorizationParams: {
                audience: import.meta.env.VITE_AUTH0_AUDIENCE,
              },
            })

            if (token) {
              await setTokenCookie(token)
            }
          }
          catch {
            // 静默处理 token 刷新失败
          }

          // 重连 SSE
          sseManager.reconnect()
        }
      }, 3000)
    }
  })

  // 🔥 页面可见性变化时重连 SSE（从后台标签切换回来时）
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', async () => {
      if (document.visibilityState === 'visible' && auth0.isAuthenticated.value) {
        const status = sseManager.getStatus()

        if (!status.connected) {
          // 刷新 token（可能过期了）
          try {
            const token = await auth0.getAccessTokenSilently({
              authorizationParams: {
                audience: import.meta.env.VITE_AUTH0_AUDIENCE,
              },
            })

            if (token) {
              await setTokenCookie(token)
            }
          }
          catch {
            // 静默处理 token 刷新失败
          }

          sseManager.reconnect()
        }
      }
    })
  }
}
