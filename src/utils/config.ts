/**
 * 统一配置管理工具
 */

export interface AppConfig {
  // 防抖配置
  debounce: {
    defaultDelay: number
    stateSaveDelay: number
    scrollThrottleDelay: number
  }

  // UI配置
  ui: {
    modalWidth: string
    sidebarWidth: number
    animationDuration: number
  }

  // 性能配置
  performance: {
    maxConcurrentRequests: number
    cacheExpiration: number
    batchSize: number
  }

  // 开发配置
  development: {
    enableDebugLogs: boolean
    enablePerformanceMonitoring: boolean
  }
}

/**
 * 默认配置
 */
export const defaultConfig: AppConfig = {
  debounce: {
    defaultDelay: 300,
    stateSaveDelay: 300,
    scrollThrottleDelay: 16, // ~60fps
  },

  ui: {
    modalWidth: '60%',
    sidebarWidth: 280,
    animationDuration: 300,
  },

  performance: {
    maxConcurrentRequests: 5,
    cacheExpiration: 5 * 60 * 1000, // 5分钟
    batchSize: 50,
  },

  development: {
    enableDebugLogs: import.meta.env.DEV,
    enablePerformanceMonitoring: import.meta.env.DEV,
  },
}

/**
 * 获取配置值
 * @param path 配置路径，例如 'debounce.defaultDelay'
 * @returns 配置值
 */
export function getConfig<T = any>(path: string): T {
  const keys = path.split('.')
  let value: any = defaultConfig

  for (const key of keys) {
    value = value?.[key]
    if (value === undefined) {
      console.warn(`Configuration path '${path}' not found`)
      return undefined as T
    }
  }

  return value as T
}

/**
 * 更新配置
 * @param path 配置路径
 * @param value 新值
 */
export function updateConfig(path: string, value: any): void {
  const keys = path.split('.')
  const lastKey = keys.pop()!
  let target: any = defaultConfig

  for (const key of keys) {
    if (!target[key]) {
      target[key] = {}
    }
    target = target[key]
  }

  target[lastKey] = value
}

/**
 * 获取开发环境配置
 */
export const isDevelopment = getConfig('development.enableDebugLogs')
export const isPerformanceMonitoring = getConfig('development.enablePerformanceMonitoring')

/**
 * 常用配置快捷访问
 */
export const DEBOUNCE_DELAYS = {
  DEFAULT: getConfig('debounce.defaultDelay'),
  STATE_SAVE: getConfig('debounce.stateSaveDelay'),
  SCROLL: getConfig('debounce.scrollThrottleDelay'),
}

export const UI_CONFIG = {
  MODAL_WIDTH: getConfig('ui.modalWidth'),
  SIDEBAR_WIDTH: getConfig('ui.sidebarWidth'),
  ANIMATION_DURATION: getConfig('ui.animationDuration'),
}

export const PERFORMANCE_CONFIG = {
  MAX_CONCURRENT_REQUESTS: getConfig('performance.maxConcurrentRequests'),
  CACHE_EXPIRATION: getConfig('performance.cacheExpiration'),
  BATCH_SIZE: getConfig('performance.batchSize'),
}
