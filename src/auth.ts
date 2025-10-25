// src/auth.ts
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

/**
 * 创建 Auth0 插件（参考官方示例 - 保持简单）
 *
 * ⚠️ 注意：useAuth0() 只能在 Vue setup 中调用
 * 如需在其他地方使用 Auth0 实例，应在 App.vue 中调用 useAuth0() 后传递实例
 */
export const auth0 = createAuth0({
  domain: import.meta.env.VITE_AUTH0_DOMAIN,
  clientId: import.meta.env.VITE_AUTH0_CLIENT_ID,
  authorizationParams: {
    redirect_uri: import.meta.env.VITE_AUTH0_REDIRECT_URI || window.location.origin,
    audience: import.meta.env.VITE_AUTH0_AUDIENCE,
  },
})

export default auth0
