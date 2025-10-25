// src/utils/permissions.ts
import { jwtDecode } from 'jwt-decode'

// JWT Payload 接口定义
interface JWTPayload {
  permissions?: string[]
  [key: string]: any
}

// getAccessTokenSilently 方法的选项类型
// 注意：@auth0/auth0-vue 内部依赖 @auth0/auth0-spa-js，无需手动安装
interface TokenOptions {
  authorizationParams?: {
    audience?: string
    scope?: string
    [key: string]: any
  }
  cacheMode?: 'on' | 'off' | 'cache-only'
  detailedResponse?: boolean
  [key: string]: any
}

/**
 * 获取用户权限列表
 *
 * @param getAccessTokenSilently - Auth0 的 getAccessTokenSilently 方法（从 useAuth0() 获取）
 * @returns 权限字符串数组
 *
 * ⚠️ 重要：不能在此工具函数中直接调用 useAuth0()
 * useAuth0() 只能在 Vue 组件的 setup() 或路由守卫中调用
 * 所以我们将 getAccessTokenSilently 作为参数传入
 *
 * @example
 * ```typescript
 * // 在组件中使用
 * import { useAuth0 } from '@auth0/auth0-vue'
 * import { getUserPermissions } from '@/utils/permissions'
 *
 * const { getAccessTokenSilently } = useAuth0()
 * const permissions = await getUserPermissions(getAccessTokenSilently)
 * ```
 */
export async function getUserPermissions(
  getAccessTokenSilently: (options?: TokenOptions) => Promise<string>,
): Promise<string[]> {
  try {
    if (!getAccessTokenSilently) {
      console.warn('⚠️ getAccessTokenSilently 方法不可用')
      return []
    }

    // 获取 Access Token
    const token = await getAccessTokenSilently({
      authorizationParams: {
        audience: import.meta.env.VITE_AUTH0_AUDIENCE,
      },
    })

    if (!token) {
      console.warn('⚠️ Token 为空')
      return []
    }

    // 使用 jwt-decode 安全解码 JWT token
    try {
      const payload = jwtDecode<JWTPayload>(token)

      // 优先从标准 permissions 字段获取
      const permissions = payload.permissions || []

      // 如果使用自定义命名空间，取消下面的注释并修改命名空间 URL
      // const permissions = payload['https://your-namespace/permissions'] || payload.permissions || [];

      if (Array.isArray(permissions)) {
        return permissions
      }

      console.warn('⚠️ Permissions 字段不是数组类型')
      return []
    }
    catch (decodeError) {
      console.error('❌ Token 解码失败:', decodeError)
      return []
    }
  }
  catch (error: any) {
    // 特殊处理：Consent Required 错误（静默处理）
    if (error?.message?.includes('Consent required') || error?.error === 'consent_required') {
      // 静默处理，不输出日志（这是预期的行为）
      return []
    }

    console.error('❌ 获取权限失败:', error)
    return []
  }
}

/**
 * 检查用户是否拥有指定权限
 *
 * @param getAccessTokenSilently - Auth0 的 getAccessTokenSilently 方法
 * @param requiredPermissions - 需要的权限列表
 * @returns 是否拥有权限
 */
export async function hasPermission(
  getAccessTokenSilently: (options?: TokenOptions) => Promise<string>,
  requiredPermissions: string | string[],
): Promise<boolean> {
  const userPermissions = await getUserPermissions(getAccessTokenSilently)

  if (typeof requiredPermissions === 'string') {
    return userPermissions.includes(requiredPermissions)
  }

  // 检查用户是否至少拥有其中一个权限
  return requiredPermissions.some(perm => userPermissions.includes(perm))
}

/**
 * 检查用户是否拥有所有指定权限
 *
 * @param getAccessTokenSilently - Auth0 的 getAccessTokenSilently 方法
 * @param requiredPermissions - 需要的权限列表
 * @returns 是否拥有所有权限
 */
export async function hasAllPermissions(
  getAccessTokenSilently: (options?: TokenOptions) => Promise<string>,
  requiredPermissions: string[],
): Promise<boolean> {
  const userPermissions = await getUserPermissions(getAccessTokenSilently)

  // 检查用户是否拥有所有权限
  return requiredPermissions.every(perm => userPermissions.includes(perm))
}

export default getUserPermissions
