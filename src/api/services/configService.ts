/**
 * 用户配置相关 API 服务
 */

import { get, patch, post } from '@/utils/request'

/**
 * 获取用户完整配置
 */
export function fetchUserConfig<T = Config.UserConfig>() {
  return get<T>({ url: '/config' })
}

/**
 * 获取用户设置（个人信息 + 界面偏好）
 */
export function fetchUserSettings<T = Config.UserSettings>() {
  return get<T>({ url: '/config/user-settings' })
}

/**
 * 获取聊天配置
 */
export function fetchChatConfig<T = Config.ChatConfig>() {
  return get<T>({ url: '/config/chat' })
}

/**
 * 获取工作流配置
 */
export function fetchWorkflowConfig<T = Config.WorkflowConfig>() {
  return get<T>({ url: '/config/workflow' })
}

/**
 * 更新用户设置
 * @param data 用户设置（部分更新）
 */
export function updateUserSettings<T = Config.UserSettings>(
  data: Partial<Config.UserSettings>,
) {
  return patch<T>({
    url: '/config/user-settings',
    data,
  })
}

/**
 * 更新聊天配置
 * @param data 聊天配置（部分更新）
 */
export function updateChatConfig<T = Config.ChatConfig>(
  data: Partial<Config.ChatConfig>,
) {
  return patch<T>({
    url: '/config/chat',
    data,
  })
}

/**
 * 更新工作流配置
 * @param data 工作流配置（部分更新）
 */
export function updateWorkflowConfig<T = Config.WorkflowConfig>(
  data: Partial<Config.WorkflowConfig>,
) {
  return patch<T>({
    url: '/config/workflow',
    data,
  })
}

/**
 * 更新单个工作流节点配置
 * @param nodeType 节点类型
 * @param nodeConfig 节点配置（部分更新）
 */
export function updateWorkflowNode<T = Config.WorkflowNodeConfig>(
  nodeType: Config.WorkflowNodeType,
  nodeConfig: Partial<Config.WorkflowNodeConfig>,
) {
  return patch<T>({
    url: `/config/workflow/${nodeType}`,
    data: nodeConfig,
  })
}

/**
 * 重置用户配置为默认值
 * @param configType 配置类型（可选，不传则重置所有）
 */
export function resetConfig<T = Config.UserConfig>(
  configType?: 'user-settings' | 'chat' | 'workflow',
) {
  const url = configType ? `/config/${configType}/reset` : '/config/reset'
  return post<T>({ url })
}

/**
 * 初始化用户配置（首次登录时调用）
 */
export function initUserConfig<T = Config.UserConfig>() {
  return post<T>({ url: '/config/init' })
}

/**
 * 导出用户配置（JSON格式）
 */
export function exportUserConfig() {
  return get<Config.UserConfig>({ url: '/config/export' })
}

/**
 * 导入用户配置
 * @param config 配置数据
 */
export function importUserConfig<T = Config.UserConfig>(config: Config.UserConfig) {
  return post<T>({
    url: '/config/import',
    data: config,
  })
}
