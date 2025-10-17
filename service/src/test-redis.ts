/**
 * Redis 连接测试
 */

/* eslint-disable no-console */
import { closeRedis, redis, testRedisConnection } from './cache/redisClient'

async function testRedis() {
  console.log('🧪 [测试] 开始测试 Redis...\n')

  try {
    // 1. 测试连接
    console.log('1️⃣ 测试连接...')
    const connected = await testRedisConnection()
    if (!connected) {
      console.log('❌ 连接失败，请检查:')
      console.log('   - Redis 是否正在运行: redis-cli ping')
      console.log('   - 端口是否正确: 默认 6379')
      console.log('   - 防火墙是否阻止连接')
      process.exit(1)
    }

    // 2. 测试基本操作
    console.log('\n2️⃣ 测试基本操作...')
    await redis.set('test:hello', 'Hello Redis!')
    const value = await redis.get('test:hello')
    console.log('✅ SET/GET 测试:', value)

    // 3. 测试 JSON 存储
    console.log('\n3️⃣ 测试 JSON 存储...')
    const testData = {
      name: '测试用户',
      age: 25,
      config: {
        theme: 'dark',
        language: 'zh-CN',
      },
    }
    await redis.set('test:json', JSON.stringify(testData))
    const jsonValue = await redis.get('test:json')
    const parsed = JSON.parse(jsonValue!)
    console.log('✅ JSON 存储测试:', parsed)

    // 4. 测试过期时间
    console.log('\n4️⃣ 测试过期时间...')
    await redis.setex('test:expire', 60, 'This will expire in 60 seconds')
    const ttl = await redis.ttl('test:expire')
    console.log('✅ TTL 测试: 剩余', ttl, '秒')

    // 5. 测试批量操作
    console.log('\n5️⃣ 测试批量操作...')
    await redis.mset('test:key1', 'value1', 'test:key2', 'value2', 'test:key3', 'value3')
    const keys = await redis.keys('test:*')
    console.log('✅ 批量操作测试: 找到', keys.length, '个键')
    console.log('   键列表:', keys)

    // 6. 清理测试数据
    console.log('\n6️⃣ 清理测试数据...')
    const deletedCount = await redis.del(...keys)
    console.log('✅ 清理完成: 删除了', deletedCount, '个键')

    // 7. 测试性能
    console.log('\n7️⃣ 测试性能...')
    const startTime = Date.now()
    for (let i = 0; i < 1000; i++) {
      await redis.set(`perf:test:${i}`, `value${i}`)
    }
    const endTime = Date.now()
    console.log(`✅ 性能测试: 写入 1000 个键耗时 ${endTime - startTime}ms`)

    // 清理性能测试数据
    const perfKeys = await redis.keys('perf:test:*')
    await redis.del(...perfKeys)

    console.log('\n🎉 所有测试通过！Redis 已成功集成！')
  }
  catch (error: any) {
    console.error('\n❌ 测试失败:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
  finally {
    // 关闭连接
    await closeRedis()
  }
}

// 运行测试
testRedis()
