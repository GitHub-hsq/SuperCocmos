/**
 * Redis 缓存键规范
 * 统一管理所有缓存键的生成规则
 */

/**
 * 用户配置相关缓存键
 */
export const USER_CONFIG_KEYS = {
  /**
   * 用户完整配置
   * @param userId 用户ID
   */
  full: (userId: string) => `user:config:${userId}`,

  /**
   * 用户设置
   * @param userId 用户ID
   */
  settings: (userId: string) => `user:config:${userId}:settings`,

  /**
   * 聊天配置
   * @param userId 用户ID
   */
  chat: (userId: string) => `user:config:${userId}:chat`,

  /**
   * 工作流配置
   * @param userId 用户ID
   */
  workflow: (userId: string) => `user:config:${userId}:workflow`,

  /**
   * 用户配置模式（用于批量删除）
   * @param userId 用户ID
   */
  pattern: (userId: string) => `user:config:${userId}*`,
}

/**
 * 供应商和模型相关缓存键
 */
export const PROVIDER_KEYS = {
  /**
   * 所有供应商列表（包含模型）
   */
  list: () => 'providers:list',

  /**
   * 单个供应商详情
   * @param providerId 供应商ID
   */
  detail: (providerId: string) => `provider:${providerId}`,

  /**
   * 供应商的模型列表
   * @param providerId 供应商ID
   */
  models: (providerId: string) => `provider:${providerId}:models`,

  /**
   * 单个模型详情
   * @param modelId 模型ID
   */
  model: (modelId: string) => `model:${modelId}`,

  /**
   * 所有供应商模式（用于批量删除）
   */
  allPattern: () => 'provider*',
}

/**
 * 用户角色相关缓存键
 */
export const ROLE_KEYS = {
  /**
   * 用户角色列表
   * @param userId 用户ID
   */
  userRoles: (userId: string) => `user:${userId}:roles`,

  /**
   * 用户是否有某个角色
   * @param userId 用户ID
   * @param roleName 角色名
   */
  hasRole: (userId: string, roleName: string) => `user:${userId}:role:${roleName}`,

  /**
   * 用户角色模式（用于批量删除）
   * @param userId 用户ID
   */
  pattern: (userId: string) => `user:${userId}:role*`,
}

/**
 * 会话相关缓存键
 */
export const SESSION_KEYS = {
  /**
   * 用户会话
   * @param sessionId 会话ID
   */
  session: (sessionId: string) => `session:${sessionId}`,

  /**
   * 用户会话列表
   * @param userId 用户ID
   */
  userSessions: (userId: string) => `user:${userId}:sessions`,
}

/**
 * API 相关缓存键
 */
export const API_KEYS = {
  /**
   * API 响应缓存
   * @param endpoint 端点
   * @param params 参数（JSON字符串）
   */
  response: (endpoint: string, params?: string) =>
    params ? `api:${endpoint}:${params}` : `api:${endpoint}`,
}

/**
 * 辅助函数：生成带前缀的缓存键
 */
export function prefixKey(prefix: string, key: string): string {
  return `${prefix}:${key}`
}

/**
 * 辅助函数：解析缓存键
 */
export function parseKey(key: string): { prefix: string, parts: string[] } {
  const parts = key.split(':')
  return {
    prefix: parts[0],
    parts: parts.slice(1),
  }
}
