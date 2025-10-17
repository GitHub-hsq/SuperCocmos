/**
 * API Client 层
 * 负责底层的 HTTP 请求逻辑，统一管理授权和错误处理
 */

import type { AxiosInstance, AxiosRequestConfig } from 'axios'
import axios from 'axios'
import { useAuthStore } from '@/store'

// 创建 axios 实例
const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_GLOB_API_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器 - 统一处理 Clerk 和传统 Token 授权
apiClient.interceptors.request.use(
  async (config) => {
    // 优先从 Clerk 获取 token（如果已登录）
    if (window.Clerk?.session) {
      try {
        const clerkToken = await window.Clerk.session.getToken()
        if (clerkToken) {
          config.headers.Authorization = `Bearer ${clerkToken}`
          if (import.meta.env.DEV)
            console.log('✅ 使用 Clerk token')
          return config
        }
      }
      catch (error) {
        console.error('❌ 获取 Clerk token 失败:', error)
      }
    }

    // 降级：使用传统 token 存储（兼容性）
    const authStore = useAuthStore()
    const token = authStore.token || localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
      if (import.meta.env.DEV)
        console.log('⚠️ 使用传统 token 存储')
    }
    else {
      if (import.meta.env.DEV)
        console.warn('⚠️ 未找到认证 token')
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// 响应拦截器 - 统一错误处理
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
  (error) => {
    // 统一错误处理
    if (error.response) {
      const status = error.response.status
      const message = error.response.data?.message || error.message

      switch (status) {
        case 401:
          console.error('❌ 未授权，请先登录')
          // 可选：自动跳转到登录页
          // const authStore = useAuthStore()
          // authStore.removeToken()
          // window.location.href = '/login'
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
