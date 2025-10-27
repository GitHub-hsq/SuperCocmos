/**
 * SSE 重连管理
 * 使用闭包模式捕获 Auth0 实例，处理页面刷新后的 SSE 重连
 */

import type { Auth0VueClient } from '@auth0/auth0-vue'
import { onMounted } from 'vue'
import { setTokenCookie } from '@/api/services/authService'
import { sseManager } from './sseService'

/**
 * 设置 SSE 自动重连
 * 参考 setupAuthGuard 和 setupApiClient 的闭包模式
 *
 * @param auth0 Auth0 客户端实例（从 setup 中传入）
 */
export function setupSSEReconnect(auth0: Auth0VueClient) {
  console.log('[SSE Reconnect] 🔧 初始化 SSE 重连管理器')

  // 🔥 页面加载后检查 SSE 连接（处理页面刷新）
  onMounted(() => {
    if (auth0.isAuthenticated.value) {
      console.log('[SSE Reconnect] 🔍 页面已加载，检查 SSE 连接状态...')

      // 延迟 1 秒，确保 initializeApp 完成（包括设置 Cookie）
      setTimeout(async () => {
        const status = sseManager.getStatus()

        console.log('[SSE Reconnect] 🔍 SSE 当前状态:', {
          connected: status.connected,
          readyState: status.readyState,
          reconnectAttempts: status.reconnectAttempts,
        })

        if (!status.connected) {
          console.log('[SSE Reconnect] 🔄 SSE 未连接，尝试重连...')

          // 🔥 如果 Cookie 可能过期，先刷新 token
          try {
            const token = await auth0.getAccessTokenSilently({
              authorizationParams: {
                audience: import.meta.env.VITE_AUTH0_AUDIENCE,
              },
            })

            if (token) {
              await setTokenCookie(token)
              console.log('[SSE Reconnect] ✅ Token 已刷新到 Cookie')
            }
          }
          catch (tokenError) {
            console.warn('[SSE Reconnect] ⚠️ 刷新 token 失败，尝试直接重连:', tokenError)
          }

          // 重连 SSE
          sseManager.connect().catch((error) => {
            console.error('[SSE Reconnect] ❌ SSE 重连失败:', error)
          })
        }
        else {
          console.log('[SSE Reconnect] ✅ SSE 已连接')
        }
      }, 1000)
    }
  })

  // 🔥 页面可见性变化时重连 SSE（从后台标签切换回来时）
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', async () => {
      if (document.visibilityState === 'visible' && auth0.isAuthenticated.value) {
        console.log('[SSE Reconnect] 📱 页面恢复可见，检查 SSE 连接...')
        const status = sseManager.getStatus()

        if (!status.connected) {
          console.log('[SSE Reconnect] 🔄 SSE 未连接，尝试重连...')

          // 刷新 token（可能过期了）
          try {
            const token = await auth0.getAccessTokenSilently({
              authorizationParams: {
                audience: import.meta.env.VITE_AUTH0_AUDIENCE,
              },
            })

            if (token) {
              await setTokenCookie(token)
              console.log('[SSE Reconnect] ✅ Token 已刷新到 Cookie')
            }
          }
          catch (tokenError) {
            console.warn('[SSE Reconnect] ⚠️ 刷新 token 失败，尝试直接重连:', tokenError)
          }

          sseManager.reconnect()
        }
      }
    })
  }
}
