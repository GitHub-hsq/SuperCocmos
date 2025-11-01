/**
 * Redis 客户端自动选择器
 * 
 * 根据环境变量自动选择使用 ioredis（本地开发）或 @upstash/redis（Vercel 部署）
 * 
 * 优先级：
 * 1. 如果设置了 UPSTASH_REDIS_REST_URL 和 UPSTASH_REDIS_REST_TOKEN，使用 Upstash Redis
 * 2. 否则使用 ioredis（传统 TCP 连接）
 * 
 * 使用方式：
 * 在 service/src/index.ts 中导入：
 * import { redis } from './cache/redisClient.auto'
 */

// 检查是否配置了 Upstash Redis
const useUpstash = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)

// 🔥 使用条件导入，避免条件导出导致的构建错误
let redis: any
let testRedisConnection: () => Promise<boolean>
let closeRedis: () => Promise<void>

if (useUpstash) {
  // 🔥 使用 Upstash Redis（Vercel 部署）
  console.warn('✅ [Redis] 检测到 Upstash 配置，使用 Upstash Redis REST API')
  const upstashClient = require('./redisClient.upstash')
  redis = upstashClient.redis
  testRedisConnection = upstashClient.testRedisConnection
  closeRedis = upstashClient.closeRedis
} else {
  // 🔥 使用 ioredis（本地开发）
  console.warn('✅ [Redis] 使用 ioredis（本地开发模式）')
  const ioredisClient = require('./redisClient')
  redis = ioredisClient.redis
  testRedisConnection = ioredisClient.testRedisConnection
  closeRedis = ioredisClient.closeRedis
}

export { redis, testRedisConnection, closeRedis }

