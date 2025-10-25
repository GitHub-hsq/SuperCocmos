// src/auth.ts
import type { Auth0VueClient } from '@auth0/auth0-vue'
import { createAuth0 } from '@auth0/auth0-vue'

/**
 * Auth0 插件配置
 *
 * 🔐 配置说明：
 * - domain: Auth0 租户域名
 * - clientId: 应用的 Client ID
 * - audience: API Identifier（用于权限管理）
 * - redirect_uri: 登录成功后的回调地址
 *
 * 📋 环境变量配置在 .env 文件中
 */

// 验证必需的环境变量
if (!import.meta.env.VITE_AUTH0_DOMAIN) {
  throw new Error('缺少环境变量: VITE_AUTH0_DOMAIN')
}
if (!import.meta.env.VITE_AUTH0_CLIENT_ID) {
  throw new Error('缺少环境变量: VITE_AUTH0_CLIENT_ID')
}
if (!import.meta.env.VITE_AUTH0_AUDIENCE) {
  throw new Error('缺少环境变量: VITE_AUTH0_AUDIENCE')
}

// 创建 Auth0 插件（参考官方示例 - 保持简单）
export const auth0 = createAuth0({
  domain: import.meta.env.VITE_AUTH0_DOMAIN,
  clientId: import.meta.env.VITE_AUTH0_CLIENT_ID,
  authorizationParams: {
    redirect_uri: import.meta.env.VITE_AUTH0_REDIRECT_URI || window.location.origin,
    audience: import.meta.env.VITE_AUTH0_AUDIENCE,
  },
})

// Auth0 客户端实例（在应用安装插件后设置）
let auth0Client: Auth0VueClient | null = null

/**
 * 设置 Auth0 客户端实例
 * 在 App.vue 中调用 useAuth0() 后保存实例，供路由守卫使用
 */
export function setAuth0Client(client: Auth0VueClient) {
  auth0Client = client
}

/**
 * 获取 Auth0 客户端实例
 * 在路由守卫中使用
 */
export function getAuth0Client(): Auth0VueClient {
  if (!auth0Client) {
    throw new Error('Auth0 client 未初始化，请确保在 App.vue 中调用了 setAuth0Client')
  }
  return auth0Client
}

export default auth0
