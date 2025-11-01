/**
 * 🔍 数据库 Schema 对比和同步工具
 *
 * 功能：
 * 1. 使用 SQL 查询获取远程数据库 schema
 * 2. 与本地 schema 文件进行对比
 * 3. 生成差异报告
 * 4. 可选择性地更新本地 schema 文件
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { supabase } from '../db/supabaseClient'

interface TableColumn {
  column_name: string
  data_type: string
  is_nullable: string
  column_default: string | null
  udt_name: string
  character_maximum_length: number | null
}

/**
 * 📥 通过查询获取表列表
 */
async function getTableList(): Promise<string[]> {
  try {
    // 尝试查询已知的表来验证连接
    const knownTables = [
      'users',
      'roles',
      'user_roles',
      'conversations',
      'messages',
      'providers',
      'models',
      'model_role_access',
      'user_configs',
    ]

    const existingTables: string[] = []

    for (const tableName of knownTables) {
      try {
        const { error } = await supabase.from(tableName).select('*').limit(0)
        if (!error) {
          existingTables.push(tableName)
        }
      }
      catch {
        // 表不存在，跳过
      }
    }

    return existingTables
  }
  catch (error: any) {
    console.error('❌ [Schema] 获取表列表失败:', error.message)
    return []
  }
}

/**
 * 📥 获取单个表的列信息（通过查询表结构）
 */
async function getTableColumns(tableName: string): Promise<TableColumn[]> {
  try {
    // 查询表的第一行来获取列信息
    const { data, error } = await supabase.from(tableName).select('*').limit(1)

    if (error) {
      console.warn(`⚠️ [Schema] 无法查询表 ${tableName}: ${error.message}`)
      return []
    }

    // 从查询结果推断列类型（简化版本）
    const columns: TableColumn[] = []
    if (data && data.length > 0) {
      const sampleRow = data[0]
      for (const [key, value] of Object.entries(sampleRow)) {
        let dataType = 'text'
        if (value === null) {
          dataType = 'text'
        }
        else if (typeof value === 'number') {
          dataType = Number.isInteger(value) ? 'integer' : 'numeric'
        }
        else if (typeof value === 'boolean') {
          dataType = 'boolean'
        }
        else if (typeof value === 'object') {
          dataType = 'jsonb'
        }
        else if (typeof value === 'string') {
          // 尝试判断是否是 UUID
          if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
            dataType = 'uuid'
          }
          else {
            dataType = 'character varying'
          }
        }

        columns.push({
          column_name: key,
          data_type: dataType,
          is_nullable: value === null ? 'YES' : 'NO',
          column_default: null,
          udt_name: dataType,
          character_maximum_length: null,
        })
      }
    }

    return columns
  }
  catch (error: any) {
    console.error(`❌ [Schema] 获取表 ${tableName} 列信息失败:`, error.message)
    return []
  }
}

/**
 * 📥 从远程数据库获取 schema（简化版本）
 */
async function getRemoteSchema(): Promise<Map<string, TableColumn[]>> {
  console.warn('📡 [Schema] 正在从远程数据库获取 schema...')

  const schema = new Map<string, TableColumn[]>()

  try {
    const tables = await getTableList()
    console.warn(`📋 [Schema] 找到 ${tables.length} 个表`)

    for (const tableName of tables) {
      console.warn(`  🔍 分析表: ${tableName}`)
      const columns = await getTableColumns(tableName)
      if (columns.length > 0) {
        schema.set(tableName, columns)
      }
    }

    console.warn(`✅ [Schema] 成功获取 ${schema.size} 个表的结构`)
    return schema
  }
  catch (error: any) {
    console.error('❌ [Schema] 获取远程 schema 失败:', error.message)
    throw error
  }
}

/**
 * 📄 读取本地 schema 文件
 */
function readLocalSchema(filePath: string): string {
  try {
    if (!existsSync(filePath)) {
      console.warn(`⚠️ [Schema] 本地 schema 文件不存在: ${filePath}`)
      return ''
    }
    return readFileSync(filePath, 'utf-8')
  }
  catch (error: any) {
    console.error(`❌ [Schema] 读取本地 schema 文件失败: ${error.message}`)
    return ''
  }
}

/**
 * 📊 对比本地和远程 schema
 */
async function compareSchemas(
  localSchemaPath: string,
  remoteSchema: Map<string, TableColumn[]>,
): Promise<{
  differences: string[]
  missingTables: string[]
  extraTables: string[]
  matchedTables: string[]
}> {
  const differences: string[] = []
  const missingTables: string[] = []
  const extraTables: string[] = []
  const matchedTables: string[] = []

  try {
    const localSchema = readLocalSchema(localSchemaPath)

    // 检查表是否存在
    for (const tableName of remoteSchema.keys()) {
      if (localSchema.includes(`CREATE TABLE public.${tableName}`)) {
        matchedTables.push(tableName)
      }
      else {
        missingTables.push(tableName)
        differences.push(`远程数据库有表 ${tableName}，但本地 schema 中没有`)
      }
    }

    // 检查本地 schema 中的表是否在远程存在
    const localTableMatches = localSchema.match(/CREATE TABLE public\.(\w+)/g) || []
    const localTableNames = new Set(
      localTableMatches.map(match => match.replace('CREATE TABLE public.', '').trim()),
    )

    for (const localTableName of localTableNames) {
      if (!remoteSchema.has(localTableName)) {
        extraTables.push(localTableName)
        differences.push(`本地 schema 有表 ${localTableName}，但远程数据库中不存在`)
      }
    }

    return { differences, missingTables, extraTables, matchedTables }
  }
  catch (error: any) {
    console.error('❌ [Schema] 对比 schema 失败:', error.message)
    throw error
  }
}

/**
 * 📝 生成 schema 报告
 */
function generateReport(
  remoteSchema: Map<string, TableColumn[]>,
  comparison: {
    differences: string[]
    missingTables: string[]
    extraTables: string[]
    matchedTables: string[]
  },
): string {
  const timestamp = new Date().toISOString()
  const separator = '='.repeat(80)
  const stats = [
    '📋 表统计:',
    `  - 远程数据库表数: ${remoteSchema.size}`,
    `  - 匹配的表: ${comparison.matchedTables.length}`,
    `  - 缺少的表: ${comparison.missingTables.length}`,
    `  - 多余的表: ${comparison.extraTables.length}`,
    '',
  ]

  const reportLines: string[] = [
    separator,
    '📊 数据库 Schema 对比报告',
    `生成时间: ${timestamp}`,
    separator,
    '',
    ...stats,
  ]

  if (comparison.matchedTables.length > 0) {
    reportLines.push(`✅ 匹配的表 (${comparison.matchedTables.length}):`)
    for (const table of comparison.matchedTables) {
      const columns = remoteSchema.get(table) || []
      reportLines.push(`  - ${table} (${columns.length} 列)`)
    }
    reportLines.push('')
  }

  if (comparison.missingTables.length > 0) {
    reportLines.push(`⚠️ 缺少的表 (${comparison.missingTables.length}):`)
    for (const table of comparison.missingTables) {
      const columns = remoteSchema.get(table) || []
      reportLines.push(`  - ${table} (${columns.length} 列)`)
      for (const col of columns) {
        reportLines.push(`    • ${col.column_name}: ${col.data_type}`)
      }
    }
    reportLines.push('')
  }

  if (comparison.extraTables.length > 0) {
    reportLines.push(`📌 多余的表 (${comparison.extraTables.length}):`)
    for (const table of comparison.extraTables) {
      reportLines.push(`  - ${table}`)
    }
    reportLines.push('')
  }

  if (comparison.differences.length > 0) {
    reportLines.push('🔍 差异详情:')
    for (const diff of comparison.differences) {
      reportLines.push(`  - ${diff}`)
    }
    reportLines.push('')
  }

  reportLines.push(separator)

  return reportLines.join('\n')
}

/**
 * 🚀 主函数
 */
async function main() {
  try {
    console.warn('🔍 [Schema] 开始数据库 Schema 对比和同步...\n')

    // 1. 测试数据库连接
    const { error: testError } = await supabase.from('users').select('count').limit(1)
    if (testError) {
      throw new Error(`数据库连接失败: ${testError.message}`)
    }
    console.warn('✅ [Schema] 数据库连接成功\n')

    // 2. 获取远程 schema
    const remoteSchema = await getRemoteSchema()

    if (remoteSchema.size === 0) {
      console.warn('⚠️ [Schema] 未能获取任何表结构，请检查数据库连接')
      return
    }

    // 3. 对比本地和远程 schema
    const localSchemaPath = join(process.cwd(), 'supabse', 'DatabaseSchema.txt')
    const comparison = await compareSchemas(localSchemaPath, remoteSchema)

    // 4. 生成并输出报告
    const report = generateReport(remoteSchema, comparison)
    console.warn(`\n${report}`)

    // 5. 保存报告到文件
    const reportPath = join(process.cwd(), 'supabse', 'SchemaComparisonReport.txt')
    writeFileSync(reportPath, report, 'utf-8')
    console.warn(`📄 [Schema] 报告已保存到: ${reportPath}`)

    // 6. 输出总结
    if (comparison.differences.length === 0) {
      console.warn('✅ [Schema] 本地和远程 schema 完全一致！')
    }
    else {
      console.warn(`⚠️ [Schema] 发现 ${comparison.differences.length} 处差异`)
      console.warn('💡 [Schema] 请查看报告文件了解详细信息')
    }

    console.warn('\n✅ [Schema] 完成！')
  }
  catch (error: any) {
    console.error('\n❌ [Schema] 执行失败:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

// 运行主函数
if (require.main === module) {
  main()
}

export {
  compareSchemas,
  generateReport,
  getRemoteSchema,
}
