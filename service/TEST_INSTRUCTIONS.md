# 测试指令

## 测试 Redis

```bash
# 方法 1：使用 pnpm script（推荐）
cd service
pnpm test:redis

# 方法 2：直接使用 esno
cd service
pnpm esno src/test-redis.ts
```

## 测试 Clerk 认证（稍后创建）

```bash
cd service
pnpm test:clerk
```

## 测试数据库

```bash
cd service
pnpm test:db
```

---

## 预期结果

### Redis 测试成功
```
🧪 [测试] 开始测试 Redis...

1️⃣ 测试连接...
✅ [Redis] PING 测试成功: PONG

2️⃣ 测试基本操作...
✅ SET/GET 测试: Hello Redis!

3️⃣ 测试 JSON 存储...
✅ JSON 存储测试: { name: '测试用户', age: 25, config: { theme: 'dark', language: 'zh-CN' } }

4️⃣ 测试过期时间...
✅ TTL 测试: 剩余 60 秒

5️⃣ 测试批量操作...
✅ 批量操作测试: 找到 4 个键

6️⃣ 清理测试数据...
✅ 清理完成: 删除了 4 个键

7️⃣ 测试性能...
✅ 性能测试: 写入 1000 个键耗时 XXXms

🎉 所有测试通过！Redis 已成功集成！
✅ [Redis] 连接已关闭
```

### Redis 测试失败
```
❌ [Redis] 连接测试失败: connect ECONNREFUSED 127.0.0.1:6379
❌ 连接失败，请检查:
   - Redis 是否正在运行: redis-cli ping
   - 端口是否正确: 默认 6379
   - 防火墙是否阻止连接
```

**解决方案**:
```bash
# 检查 Redis 是否运行
redis-cli ping
# 应该返回: PONG

# 如果没有运行，启动 Redis（Docker方式）
docker ps -a | grep redis
docker start redis-dev

# 或者新建容器
docker run -d --name redis-dev -p 6379:6379 redis:latest
```

---

## 手动测试 Redis

如果自动测试失败，可以手动测试：

```bash
# 打开 Redis CLI
redis-cli

# 在 CLI 中执行
ping
# 应该返回: PONG

# 测试写入
SET test "Hello Redis"
# 返回: OK

# 测试读取
GET test
# 返回: "Hello Redis"

# 退出
exit
```
