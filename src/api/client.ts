/**
 * API Client 层
 * 负责底层的 HTTP 请求逻辑
 */

import axios from 'axios'
import type { AxiosInstance, AxiosRequestConfig } from 'axios'

// 创建 axios 实例
const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_GLOB_API_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    // 可以在这里添加 token
    const token = localStorage.getItem('token')
    if (token)
      config.headers.Authorization = `Bearer ${token}`

    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    // 统一错误处理
    if (error.response) {
      switch (error.response.status) {
        case 401:
          // 未授权，可以跳转到登录页
          console.error('未授权，请先登录')
          break
        case 403:
          console.error('没有权限访问该资源')
          break
        case 404:
          console.error('请求的资源不存在')
          break
        case 500:
          console.error('服务器错误')
          break
        default:
          console.error('请求失败:', error.response.data?.message || error.message)
      }
    }
    else {
      console.error('网络错误:', error.message)
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

