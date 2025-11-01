/**
 * Upstash Redis 客户端（推荐用于 Vercel 部署）
 *
 * 使用方式：
 * 1. 安装依赖：pnpm add @upstash/redis
 * 2. 配置环境变量：
 *    UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
 *    UPSTASH_REDIS_REST_TOKEN=xxx
 * 3. 在 service/src/index.ts 中替换导入：
 *    import { redis } from './cache/redisClient.upstash'
 *
 * 🔥 API 兼容性说明：
 * 此文件创建了一个适配层，确保 @upstash/redis 的 API 与 ioredis 兼容
 */

import { Redis as UpstashRedis } from '@upstash/redis'

// Upstash Redis 配置（REST API，适合 Serverless 环境）
const upstashRedis = new UpstashRedis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

console.warn('🔧 [Redis] 使用 Upstash Redis REST API')

// 🔥 创建适配器，确保 API 与 ioredis 兼容
export const redis = {
  // 基本操作
  async get(key: string): Promise<string | null> {
    const result = await upstashRedis.get(key)
    if (result === null) {
      return null
    }
    // 🔥 确保返回字符串格式（防止对象类型）
    return typeof result === 'string' ? result : JSON.stringify(result)
  },

  async set(key: string, value: string): Promise<'OK'> {
    // 🔥 确保值始终是字符串（防止 "[object Object]" 问题）
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value)
    await upstashRedis.set(key, stringValue)
    return 'OK'
  },

  // 🔥 适配 setex：使用 set 配合 ex 选项
  async setex(key: string, seconds: number, value: string): Promise<'OK'> {
    // 🔥 确保值始终是字符串（防止 "[object Object]" 问题）
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value)
    await upstashRedis.set(key, stringValue, { ex: seconds })
    return 'OK'
  },

  // 删除操作（支持多个键）
  async del(...keys: string[]): Promise<number> {
    if (keys.length === 0) {
      return 0
    }
    if (keys.length === 1) {
      const result = await upstashRedis.del(keys[0])
      return result === null ? 0 : 1
    }
    // 多个键需要逐个删除（Upstash 不支持批量删除）
    let deleted = 0
    for (const key of keys) {
      const result = await upstashRedis.del(key)
      if (result !== null) {
        deleted++
      }
    }
    return deleted
  },

  // 键匹配（返回字符串数组）
  async keys(pattern: string): Promise<string[]> {
    // Upstash 使用 scan 命令进行模式匹配
    const result: string[] = []
    let cursor = 0
    do {
      const [nextCursor, keys] = await upstashRedis.scan(cursor, { match: pattern, count: 100 })
      cursor = nextCursor
      result.push(...(keys as string[]))
    } while (cursor !== 0)
    return result
  },

  // 检查键是否存在（返回 1 或 0）
  async exists(key: string): Promise<number> {
    const result = await upstashRedis.exists(key)
    return result === null ? 0 : (result ? 1 : 0)
  },

  // 获取 TTL（返回秒数，-1 表示没有过期时间，-2 表示键不存在）
  async ttl(key: string): Promise<number> {
    const result = await upstashRedis.ttl(key)
    return result === null ? -2 : result
  },

  // 设置过期时间
  async expire(key: string, seconds: number): Promise<number> {
    const result = await upstashRedis.expire(key, seconds)
    return result === null ? 0 : (result ? 1 : 0)
  },

  // 清空所有数据
  async flushall(): Promise<'OK'> {
    await upstashRedis.flushall()
    return 'OK'
  },

  // Ping 测试
  async ping(): Promise<'PONG'> {
    const result = await upstashRedis.ping()
    return result === 'PONG' ? 'PONG' : (result as 'PONG')
  },
}

// 测试连接
export async function testRedisConnection(): Promise<boolean> {
  try {
    const result = await redis.ping()
    console.warn('✅ [Redis] PING 测试成功:', result)
    return true
  }
  catch (error: any) {
    console.error('❌ [Redis] 连接测试失败:', error.message)
    return false
  }
}

// Upstash Redis 使用 HTTP 连接，无需关闭
export async function closeRedis(): Promise<void> {
  console.warn('ℹ️ [Redis] Upstash Redis 使用 HTTP 连接，无需手动关闭')
}
