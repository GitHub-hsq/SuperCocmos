// 这个函数接收 Auth0 实例作为参数，而不是在内部调用 useAuth0()
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
 * @param getAccessTokenSilently - Auth0 的 getAccessTokenSilently 方法（从 useAuth0() 获取）
 * @returns 权限字符串数组
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
        audience: 'http://supercocmos.com',
      },
    })

    if (!token) {
      console.warn('⚠️ Token 为空')
      return []
    }

    // 使用 jwt-decode 安全解码 JWT token
    try {
      const payload = jwtDecode<JWTPayload>(token)

      // 调试输出：查看完整的 payload 结构
      console.log('🔍 JWT Payload:', payload)

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
  catch (error) {
    console.error('❌ 获取权限失败:', error)
    return []
  }
}

export default getUserPermissions
