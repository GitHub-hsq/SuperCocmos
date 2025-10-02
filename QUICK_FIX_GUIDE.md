# 🔧 快速修复指南 - API 404 问题

## 问题原因

所有模型管理API缺少 `/api` 前缀，导致无法通过Vite代理访问后端。

## ✅ 已修复

所有模型管理API已添加 `/api` 前缀：

- ✅ `GET /api/models` - 获取模型列表
- ✅ `POST /api/models/add` - 添加模型
- ✅ `POST /api/models/update` - 更新模型
- ✅ `POST /api/models/delete` - 删除模型
- ✅ `POST /api/models/test` - 测试模型

## 🚀 立即执行

### 1. 重启前端服务（必须！）

```bash
# 停止当前前端服务 (Ctrl+C)
# 然后重新启动
pnpm dev
```

> **重要：** 必须重启前端服务才能加载新的API配置

### 2. 清除浏览器缓存（可选）

按 `Ctrl + Shift + R` 强制刷新浏览器

### 3. 测试功能

1. 打开设置 → 供应商配置
2. 点击"刷新"按钮 - 应该能看到模型列表
3. 点击"新增模型" - 填写信息
4. 点击"测试连接" - 应该能测试成功
5. 添加模型 - 应该成功

## 📋 请求流程

```
浏览器: /api/models/test
   ↓
Vite代理: /models/test (去掉 /api 前缀)
   ↓
后端: http://127.0.0.1:3002/models/test
   ↓
Express: app.use('', router) + router.post('/models/test')
   ↓
匹配成功 ✅
```

## 🔍 验证方法

### 浏览器开发者工具 (F12)

打开 Network 标签，应该看到：

```
Request URL: http://192.168.1.29:1002/api/models/test
Status: 200 OK
```

### 直接测试后端

```bash
# 测试后端是否正常
curl -X POST http://127.0.0.1:3002/models/test \
  -H "Content-Type: application/json" \
  -d '{"modelId":"gpt-4o"}'
```

## ❓ 仍然404？

### 检查清单：

1. ✅ 前端服务已重启？
2. ✅ 后端服务正在运行？
3. ✅ 浏览器缓存已清除？
4. ✅ 检查Network标签中的实际请求URL

### 检查后端服务

```bash
# 后端应该在端口3002运行
cd service
pnpm start
```

看到：
```
Server is running on port 3002
```

### 检查端口占用

```bash
# Windows
netstat -ano | findstr :3002
netstat -ano | findstr :1002
```

## 📝 相关文件

- ✅ `src/api/index.ts` - 已修复
- ✅ `vite.config.ts` - 代理配置正确
- ✅ `service/src/index.ts` - 后端路由正确

所有代码已修复，只需重启前端服务即可！

