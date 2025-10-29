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
 */

import { Redis } from '@upstash/redis'

// Upstash Redis 配置（REST API，适合 Serverless 环境）
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

console.warn('🔧 [Redis] 使用 Upstash Redis REST API')

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

// 使用示例：
// const value = await redis.get('key')
// await redis.set('key', 'value')
// await redis.setex('key', 3600, 'value') // 设置 1 小时过期
