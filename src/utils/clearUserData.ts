import { createLocalStorage } from '@/utils/storage'

/**
 * 🔥 清除所有用户相关的本地存储数据
 * 用于退出登录时清理用户数据
 */
export function clearAllUserData(): void {
  try {
    // 使用 createLocalStorage 实例来清除（确保正确清除 JSON 格式的数据）
    const ss = createLocalStorage({ expire: null })

    // 清除认证存储
    ss.remove('authStorage')

    // 清除聊天偏好设置
    ss.remove('chatPreferences')

    // 清除会话列表缓存
    ss.remove('conversations_cache')
    ss.remove('conversations_cache_timestamp')

    // 清除当前模型ID
    ss.remove('current_model_id')

    // 🔥 清除 Auth0 相关的存储
    // Auth0 SDK 使用特定的 key 格式存储 token
    // 格式通常是：@@auth0spajs@@::{clientId}::::{audience}::default::openid profile email offline_access
    const auth0Keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (key.includes('@@auth0spajs@@') || key.startsWith('auth0'))) {
        auth0Keys.push(key)
      }
    }
    auth0Keys.forEach(key => localStorage.removeItem(key))

    // 清除窗口缓存标记
    const w = window as any
    w.__permission_notification_shown__ = false
    w.__user_permissions_cache__ = null

    if (import.meta.env.DEV) {
      console.warn('✅ [清除数据] 已清除所有用户相关的本地存储数据')
    }
  }
  catch (error) {
    console.error('❌ [清除数据] 清除用户数据失败:', error)
  }
}

