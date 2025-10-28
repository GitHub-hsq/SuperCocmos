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
 * 用户信息相关缓存键
 */
export const USER_INFO_KEYS = {
  /**
   * 用户基本信息（通过 auth0_id 索引）
   * @param auth0Id Auth0 用户ID
   */
  byAuth0Id: (auth0Id: string) => `user:info:auth0:${auth0Id}`,

  /**
   * 用户基本信息（通过 user_id 索引）
   * @param userId 用户UUID
   */
  byUserId: (userId: string) => `user:info:uuid:${userId}`,
}

/**
 * 角色相关缓存键（全局角色数据）
 */
export const ROLE_CACHE_KEYS = {
  /**
   * 所有角色列表
   */
  list: () => 'roles:list',

  /**
   * 单个角色（通过ID）
   * @param roleId 角色ID
   */
  byId: (roleId: number) => `role:${roleId}`,

  /**
   * 单个角色（通过名称）
   * @param roleName 角色名称
   */
  byName: (roleName: string) => `role:name:${roleName}`,

  /**
   * 所有角色缓存模式（用于批量删除）
   */
  pattern: () => 'role*',
}

/**
 * 用户角色相关缓存键（用户角色关联）
 */
export const USER_ROLE_KEYS = {
  /**
   * 用户角色列表（完整数据）
   * @param userId 用户ID
   */
  userRoles: (userId: string) => `user:${userId}:roles`,

  /**
   * 用户角色ID列表
   * @param userId 用户ID
   */
  roleIds: (userId: string) => `user:${userId}:role_ids`,

  /**
   * 用户角色名称列表
   * @param userId 用户ID
   */
  roleNames: (userId: string) => `user:${userId}:role_names`,

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
 * @deprecated 使用 USER_ROLE_KEYS 替代
 */
export const ROLE_KEYS = USER_ROLE_KEYS

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
 * 会话相关缓存键
 */
export const CONVERSATION_KEYS = {
  /**
   * 用户会话列表
   * @param userId 用户ID（Auth0 ID 或 UUID）
   */
  userConversations: (userId: string) => `user:${userId}:conversations`,

  /**
   * 会话消息列表
   * @param conversationId 会话ID（后端UUID）
   */
  messages: (conversationId: string) => `conversation:${conversationId}:messages`,

  /**
   * 用户当前缓存的会话ID（只保留最新1个）
   * 用于管理用户的会话消息缓存，避免内存占用过多
   * @param userId 用户ID（Auth0 ID）
   */
  userCurrentCached: (userId: string) => `user:${userId}:current_cached_conversation`,

  /**
   * 会话消息缓存模式（用于批量删除）
   * @param conversationId 会话ID
   */
  pattern: (conversationId: string) => `conversation:${conversationId}*`,
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
