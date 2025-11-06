/**
 * Pino 日志工具
 * 提供结构化、高性能的日志输出
 */

import pino from 'pino'

const NODE_ENV = process.env.NODE_ENV || 'development'
// 🔥 优化：开发环境也使用 info 级别，减少冗余日志
const LOG_LEVEL = process.env.LOG_LEVEL || 'info'

// 检测是否为 Windows 环境
const isWindows = process.platform === 'win32'

// 创建 Pino logger
export const logger = pino({
  level: LOG_LEVEL,
  transport: NODE_ENV === 'development'
    ? {
        target: 'pino-pretty',
        options: {
          colorize: !isWindows, // Windows 下禁用颜色
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname,env',
          singleLine: true, // 单行输出，避免格式问题
          messageFormat: '{msg}',
          // Windows 下使用 ASCII 字符
          customColors: isWindows ? undefined : 'info:blue,warn:yellow,error:red',
        },
      }
    : undefined,
  formatters: {
    level: (label: string) => {
      return { level: label.toUpperCase() }
    },
  },
  base: {
    env: NODE_ENV,
  },
})

/**
 * 性能监测装饰器
 * 用于监测函数执行时间
 */
export function measurePerformance<T>(
  name: string,
  fn: () => Promise<T>,
  slowThreshold = 1000,
): Promise<T> {
  const start = performance.now()

  return fn().then(
    (result) => {
      const duration = performance.now() - start

      if (duration > slowThreshold) {
        logger.warn(`[SLOW] ${name}: ${duration.toFixed(0)}ms`)
      }
      else if (duration > 500) {
        logger.info(`[PERF] ${name}: ${duration.toFixed(0)}ms`)
      }
      // 🔥 不输出快速操作的日志，减少冗余

      return result
    },
    (error) => {
      const duration = performance.now() - start
      logger.error(`[ERROR] ${name} 失败: ${error.message} (${duration.toFixed(0)}ms)`)
      throw error
    },
  )
}
