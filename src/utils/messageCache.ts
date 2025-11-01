/**
 * 🗑️ 消息缓存清理工具
 * 🔥 前端消息缓存已完全移除，此文件仅用于清理旧的缓存数据
 */

const MESSAGE_CACHE_PREFIX = 'msg_cache_'

/**
 * 🗑️ 清除所有旧的消息缓存（msg_cache_*）
 * 用于清理迁移前遗留的缓存数据
 */
export function clearAllMessageCaches(): void {
  try {
    const storage = localStorage
    const keysToRemove: string[] = []

    // 找出所有消息缓存 key（包括旧的 StorageData 格式）
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i)
      if (key && (key.startsWith(MESSAGE_CACHE_PREFIX) || key.includes('msg_cache_'))) {
        keysToRemove.push(key)
      }
    }

    // 删除所有消息缓存
    keysToRemove.forEach((key) => {
      try {
        storage.removeItem(key)
      }
      catch {
        // 忽略删除失败
      }
    })
  }
  catch (error) {
    console.error('❌ [缓存清理] 清除所有消息缓存失败:', error)
  }
}
