/**
 * Redis 客户端
 * 用于缓存和会话管理
 */

import Redis from 'ioredis'

// Redis 配置
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: Number(process.env.REDIS_DB) || 0,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000)
    return delay
  },
  maxRetriesPerRequest: 3,
}

console.warn('[Redis] 配置:', {
  host: redisConfig.host,
  port: redisConfig.port,
  db: redisConfig.db,
})

// 创建 Redis 客户端
export const redis = new Redis(redisConfig)

// 监听连接事件
redis.on('connect', () => {
  console.warn('[Redis] OK - 已连接到 Redis 服务器')
})

redis.on('error', (error) => {
  console.error('[Redis] ERROR - Redis 错误:', error.message)
})

redis.on('close', () => {
  console.warn('[Redis] WARN - Redis 连接已关闭')
})

// 测试连接
export async function testRedisConnection(): Promise<boolean> {
  try {
    const result = await redis.ping()
    console.warn('[Redis] OK - PING 测试成功:', result)
    return true
  }
  catch (error: any) {
    console.error('[Redis] ERROR - 连接测试失败:', error.message)
    return false
  }
}

// 优雅关闭
export async function closeRedis(): Promise<void> {
  try {
    await redis.quit()
    console.warn('[Redis] OK - 连接已关闭')
  }
  catch (error: any) {
    console.error('[Redis] ERROR - 关闭连接失败:', error.message)
  }
}
