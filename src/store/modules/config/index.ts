/**
 * 用户配置 Store V2
 * 管理用户设置、聊天配置、工作流配置
 */

import { defineStore } from 'pinia'
import { fetchChatConfig, fetchUserConfig, fetchUserSettings, fetchWorkflowConfig, updateChatConfig, updateUserSettings, updateWorkflowConfig } from '@/api/services/configService'

interface ConfigState {
  // 用户设置
  userSettings: Config.UserSettings | null

  // 聊天配置
  chatConfig: Config.ChatConfig | null

  // 工作流配置
  workflowConfig: Config.WorkflowConfig | null

  // 是否已加载
  loaded: boolean

  // 加载状态
  loading: boolean
}

export const useConfigStore = defineStore('config', {
  state: (): ConfigState => ({
    userSettings: null,
    chatConfig: null,
    workflowConfig: null,
    loaded: false,
    loading: false,
  }),

  getters: {
    /**
     * 获取特定工作流节点配置
     */
    getWorkflowNodeConfig: state => (nodeType: Config.WorkflowNodeType): Config.WorkflowNodeConfig | null => {
      return state.workflowConfig?.[nodeType] || null
    },
  },

  actions: {
    /**
     * 加载所有配置（防重复加载）
     */
    async loadAllConfig() {
      // 🔥 如果已加载或正在加载，直接返回
      if (this.loaded || this.loading)
        return

      this.loading = true
      try {
        const response = await fetchUserConfig<any>()

        if (response.status === 'Success' && response.data) {
          // 🔥 从数据库字段映射到前端字段（snake_case -> camelCase）
          const data = response.data

          // 处理 user_settings -> userSettings
          this.userSettings = data.userSettings || data.user_settings || null

          // 处理 chat_config -> chatConfig
          this.chatConfig = data.chatConfig || data.chat_config || null

          // 处理 workflow_config -> workflowConfig
          this.workflowConfig = data.workflowConfig || data.workflow_config || null

          this.loaded = true

          // ✅ 日志已统一到 AppInitStore，此处不再重复输出
          // console.log('✅ [ConfigStore] 配置加载成功:', { ... })
        }
      }
      catch (error: any) {
        // 静默处理 404 错误（用户未登录或配置不存在）
        if (error?.response?.status === 404 || error?.message?.includes('404')) {
          // 未登录或配置不存在，静默跳过
          return
        }
        // 其他错误才打印日志
        console.error('❌ [ConfigStore] 加载配置失败:', error)
      }
      finally {
        this.loading = false
      }
    },

    /**
     * 加载用户设置
     */
    async loadUserSettings() {
      try {
        const response = await fetchUserSettings<Config.UserSettings>()

        if (response.status === 'Success' && response.data)
          this.userSettings = response.data
      }
      catch (error) {
        console.error('[ConfigStore] 加载用户设置失败:', error)
      }
    },

    /**
     * 加载聊天配置
     */
    async loadChatConfig() {
      try {
        const response = await fetchChatConfig<Config.ChatConfig>()

        if (response.status === 'Success' && response.data)
          this.chatConfig = response.data
      }
      catch (error) {
        console.error('[ConfigStore] 加载聊天配置失败:', error)
      }
    },

    /**
     * 加载工作流配置
     */
    async loadWorkflowConfig() {
      try {
        const response = await fetchWorkflowConfig<Config.WorkflowConfig>()

        if (response.status === 'Success' && response.data)
          this.workflowConfig = response.data
      }
      catch (error) {
        console.error('[ConfigStore] 加载工作流配置失败:', error)
      }
    },

    /**
     * 更新用户设置
     */
    async updateUserSettings(data: Partial<Config.UserSettings>) {
      try {
        const response = await updateUserSettings(data)

        if (response.status === 'Success' && response.data) {
          // 合并更新
          this.userSettings = {
            ...this.userSettings,
            ...response.data,
          } as Config.UserSettings
        }

        return response
      }
      catch (error) {
        console.error('[ConfigStore] 更新用户设置失败:', error)
        throw error
      }
    },

    /**
     * 更新聊天配置
     */
    async updateChatConfig(data: Partial<Config.ChatConfig>) {
      try {
        const response = await updateChatConfig(data)

        if (response.status === 'Success' && response.data) {
          // 深度合并更新
          this.chatConfig = {
            ...this.chatConfig,
            ...response.data,
            parameters: {
              ...this.chatConfig?.parameters,
              ...response.data.parameters,
            },
          } as Config.ChatConfig
        }

        return response
      }
      catch (error) {
        console.error('[ConfigStore] 更新聊天配置失败:', error)
        throw error
      }
    },

    /**
     * 更新工作流配置
     */
    async updateWorkflowConfig(data: Partial<Config.WorkflowConfig>) {
      try {
        const response = await updateWorkflowConfig(data)

        if (response.status === 'Success' && response.data) {
          // 深度合并更新
          this.workflowConfig = {
            ...this.workflowConfig,
            ...response.data,
          } as Config.WorkflowConfig
        }

        return response
      }
      catch (error) {
        console.error('[ConfigStore] 更新工作流配置失败:', error)
        throw error
      }
    },

    /**
     * 更新单个工作流节点配置
     */
    updateWorkflowNodeConfig(
      nodeType: Config.WorkflowNodeType,
      nodeConfig: Partial<Config.WorkflowNodeConfig>,
    ) {
      if (!this.workflowConfig)
        return

      this.workflowConfig[nodeType] = {
        ...this.workflowConfig[nodeType],
        ...nodeConfig,
        parameters: {
          ...this.workflowConfig[nodeType].parameters,
          ...nodeConfig.parameters,
        },
      }
    },

    /**
     * 重置配置
     */
    resetConfig() {
      this.userSettings = null
      this.chatConfig = null
      this.workflowConfig = null
      this.loaded = false
    },
  },
})
