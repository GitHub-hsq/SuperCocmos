# 数据库 Schema 对比和同步工具

## 功能

这个工具可以：
1. 🔍 通过 Supabase API 获取远程数据库的 schema
2. 📊 与本地 schema 文件进行对比
3. 📝 生成详细的差异报告
4. 💾 可选：更新本地 schema 文件

## 使用方法

### 方法 1: 使用 npm 脚本（推荐）

```bash
cd service
pnpm test:schema
```

### 方法 2: 直接运行

```bash
cd service
esno ./src/utils/schemaSync.ts
```

## 环境要求

确保在 `service/.env` 文件中配置了以下环境变量：

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 工作流程

1. **连接数据库**：使用配置的 Supabase 凭据连接远程数据库
2. **获取表列表**：通过查询已知表验证连接，获取所有存在的表
3. **分析表结构**：对每个表查询第一行数据，推断列类型和结构
4. **对比本地文件**：与 `supabse/DatabaseSchema.txt` 进行对比
5. **生成报告**：生成详细的差异报告并保存到 `supabse/SchemaComparisonReport.txt`

## 输出文件

- **SchemaComparisonReport.txt**：包含详细的对比报告
  - 表统计信息
  - 匹配的表列表
  - 缺少的表（远程有但本地没有）
  - 多余的表（本地有但远程没有）
  - 差异详情

## 注意事项

⚠️ **限制**：
- 当前版本通过查询表的第一行数据来推断列类型，可能不够精确
- 对于空表，无法获取列信息
- 约束和索引信息需要手动检查

💡 **建议**：
- 对于更精确的 schema 导出，可以使用 `service/src/db/export-schema.sql` 在 Supabase SQL Editor 中执行
- 定期运行此工具保持本地和远程 schema 同步

## 高级用法

如果需要更新本地 schema 文件，可以修改脚本添加 `--update` 参数支持（当前版本暂不支持自动更新）。

## 故障排除

如果遇到连接问题：
1. 检查环境变量是否正确配置
2. 确认 Supabase 项目是否正常运行
3. 检查网络连接
4. 确认 SERVICE_ROLE_KEY 权限是否足够
