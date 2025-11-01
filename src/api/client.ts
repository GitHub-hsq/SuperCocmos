/**
 * API Client 层
 * 负责底层的 HTTP 请求逻辑，统一管理授权和错误处理
 */

import type { Auth0VueClient } from '@auth0/auth0-vue'
import type { AxiosInstance, AxiosRequestConfig } from 'axios'
import axios from 'axios'
import { useAuthStore } from '@/store'

// 扩展 AxiosRequestConfig 类型以支持重试标记
interface ExtendedAxiosRequestConfig extends AxiosRequestConfig {
  _retry?: boolean
}

// 创建 axios 实例
const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_GLOB_API_URL || '/api',
  timeout: 120000, // 增加到 120 秒，因为 chatgpt 库处理较慢
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * 设置 API 客户端（配置 Axios 拦截器）
 * ⚠️ 必须在 App.vue 的 setup 中调用，传入 Auth0 实例
 *
 * @param auth0 - Auth0 客户端实例（从 useAuth0() 获取）
 *
 * 💡 通过闭包捕获 auth0 实例，避免使用全局变量
 */
export function setupApiClient(auth0: Auth0VueClient) {
  // 请求拦截器 - 统一处理授权 Token
  apiClient.interceptors.request.use(
    async (config) => {
      const interceptorStart = performance.now()
      try {
        // 🔐 从 Auth0 获取 token
        if (auth0 && auth0.isAuthenticated.value) {
          try {
            const tokenStart = performance.now()
            const token = await auth0.getAccessTokenSilently({
              authorizationParams: {
                audience: import.meta.env.VITE_AUTH0_AUDIENCE,
              },
            })
            const tokenEnd = performance.now()
            const tokenTime = Math.round(tokenEnd - tokenStart)
            // 只在慢速时输出警告
            if (tokenTime > 100) {
              console.warn(`⚠️ [API Client] getAccessTokenSilently 耗时过长: ${tokenTime}ms (URL: ${config.url})`)
            }

            if (token) {
              config.headers.Authorization = `Bearer ${token}`

              // 开发环境下输出调试信息
              if (import.meta.env.DEV && config.url?.includes('/config'))
                console.log(`🔐 [API Client] 附加 token 到请求: ${config.url}`)
            }
            else if (import.meta.env.DEV) {
              console.log(`⚠️ [API Client] 无法获取 token: ${config.url}`)
            }
          }
          catch (tokenError: any) {
            // 静默处理 token 获取失败（可能是 Consent required）
            if (import.meta.env.DEV && !tokenError.message?.includes('Consent required'))
              console.log('⚠️ [API Client] 获取 Auth0 token 失败:', tokenError.message, 'URL:', config.url)
          }
        }
        else if (import.meta.env.DEV && config.url?.includes('/config')) {
          console.log('⚠️ [API Client] Auth0 未认证或未初始化:', config.url)
        }
      }
      catch {
        // Auth0 未初始化，使用备用方案
        const authStore = useAuthStore()
        const token = authStore.token || localStorage.getItem('token')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        else if (import.meta.env.DEV) {
          console.log('⚠️ [API Client] 无可用 token (备用方案也失败):', config.url)
        }
      }

      // 🔥 添加请求时间戳，用于后端计算网络延迟
      config.headers['X-Request-Start-Time'] = Date.now().toString()

      const interceptorEnd = performance.now()
      const interceptorTime = Math.round(interceptorEnd - interceptorStart)
      // 只在慢速时输出警告
      if (interceptorTime > 100) {
        console.warn(`⚠️ [API Client] 请求拦截器耗时过长: ${interceptorTime}ms (URL: ${config.url})`)
      }

      return config
    },
    (error) => {
      return Promise.reject(error)
    },
  )

  // 响应拦截器 - 统一错误处理（通过闭包捕获 auth0 实例）
  apiClient.interceptors.response.use(
    (response) => {
      // 处理业务层面的 Unauthorized 状态
      if (response.data?.status === 'Unauthorized') {
        const authStore = useAuthStore()
        authStore.removeToken()
        console.error('❌ 未授权，即将重新加载页面')
        window.location.reload()
      }
      return response
    },
    async (error) => {
      const originalRequest = error.config as ExtendedAxiosRequestConfig

      // 🔥 处理 401 错误：尝试刷新 token 并重试请求
      if (error.response?.status === 401 && !originalRequest._retry && auth0) {
        originalRequest._retry = true

        try {
          console.log('🔄 [API Client] 检测到 401，尝试刷新 token...')

          // 强制刷新 token（绕过缓存）
          const newToken = await auth0.getAccessTokenSilently({
            authorizationParams: {
              audience: import.meta.env.VITE_AUTH0_AUDIENCE,
            },
            cacheMode: 'off', // 强制从 Auth0 获取新 token（使用 refresh token）
          })

          if (newToken) {
            console.log('✅ [API Client] Token 刷新成功，重试请求')
            // 更新请求头
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`
            }
            // 重试原始请求
            return apiClient(originalRequest)
          }
        }
        catch (refreshError: any) {
          console.error('❌ [API Client] Token 刷新失败:', refreshError.message)
          // Token 刷新失败，可能是 refresh token 也过期了，需要重新登录
          console.log('🔄 [API Client] Refresh token 过期，重定向到登录页...')
          await auth0.loginWithRedirect({
            authorizationParams: {
              redirect_uri: window.location.origin,
              audience: import.meta.env.VITE_AUTH0_AUDIENCE,
            },
          })
          return Promise.reject(refreshError)
        }
      }

      // 🔥 静默处理特定路径的 404 错误（用户未登录时的配置请求）
      const requestUrl = error.config?.url || ''
      const isConfigRequest = requestUrl.includes('/api/config') || requestUrl.includes('/api/user/settings')
      const is404 = error.response?.status === 404

      // 如果是配置相关的 404 错误，静默跳过（用户可能未登录）
      if (is404 && isConfigRequest) {
        return Promise.reject(error)
      }

      // 统一错误处理
      if (error.response) {
        const status = error.response.status
        const message = error.response.data?.message || error.message

        switch (status) {
          case 401:
            console.error('❌ 未授权，请先登录')
            break
          case 403:
            console.error('❌ 没有权限访问该资源')
            break
          case 404:
            console.error('❌ 请求的资源不存在')
            break
          case 500:
            console.error('❌ 服务器错误')
            break
          case 429:
            console.error('❌ 请求过于频繁，请稍后再试')
            break
          default:
            console.error(`❌ 请求失败 [${status}]:`, message)
        }
      }
      else if (error.request) {
        console.error('❌ 网络错误: 请求已发送但未收到响应')
      }
      else {
        console.error('❌ 请求配置错误:', error.message)
      }

      return Promise.reject(error)
    },
  )
}

// 封装请求方法
export const request = {
  get: <T = any>(url: string, config?: AxiosRequestConfig) => {
    return apiClient.get<T>(url, config)
  },
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) => {
    return apiClient.post<T>(url, data, config)
  },
  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) => {
    return apiClient.put<T>(url, data, config)
  },
  delete: <T = any>(url: string, config?: AxiosRequestConfig) => {
    return apiClient.delete<T>(url, config)
  },
  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) => {
    return apiClient.patch<T>(url, data, config)
  },
}

export default apiClient
