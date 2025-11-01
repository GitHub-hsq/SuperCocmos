/**
 * 日志工具
 * 根据环境变量控制日志输出级别
 */

const LOG_LEVEL = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'warn' : 'debug')
const NODE_ENV = process.env.NODE_ENV || 'development'

// 只在开发环境或设置为 debug 时输出详细日志
const isDebugMode = NODE_ENV === 'development' || LOG_LEVEL === 'debug'
const isInfoMode = LOG_LEVEL === 'info' || LOG_LEVEL === 'debug'
const isWarnMode = LOG_LEVEL !== 'error' && LOG_LEVEL !== 'silent'
const isErrorMode = LOG_LEVEL !== 'silent'

/**
 * 调试日志（仅在开发环境或 debug 模式）
 */
function debug(...args: any[]) {
  if (isDebugMode) {
    console.warn('[DEBUG]', ...args)
  }
}

/**
 * 信息日志（生产环境默认不输出）
 */
function info(...args: any[]) {
  if (isInfoMode) {
    console.warn('[INFO]', ...args)
  }
}

/**
 * 警告日志（生产环境默认输出）
 */
function warn(...args: any[]) {
  if (isWarnMode) {
    console.warn('[WARN]', ...args)
  }
}

/**
 * 错误日志（始终输出）
 */
function error(...args: any[]) {
  if (isErrorMode) {
    console.error('[ERROR]', ...args)
  }
}

/**
 * 成功日志（仅在开发环境或 debug 模式）
 */
function success(...args: any[]) {
  if (isDebugMode) {
    console.warn('[OK]', ...args)
  }
}

export const logger = {
  debug,
  info,
  warn,
  error,
  success,
}
