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
      if (this.loaded || this.loading) {
        console.log('ℹ️ [ConfigStore] 配置已加载或正在加载，跳过重复请求')
        return
      }

      this.loading = true
      try {
        console.log('🔄 [ConfigStore] 开始加载用户配置...')
        const response = await fetchUserConfig<Config.UserConfig>()

        if (response.status === 'Success' && response.data) {
          // 从数据库字段映射到前端字段（snake_case -> camelCase）
          this.userSettings = response.data.userSettings || response.data.user_settings || null
          this.chatConfig = response.data.chatConfig || response.data.chat_config || null
          this.workflowConfig = response.data.workflowConfig || response.data.workflow_config || null
          this.loaded = true
          console.log('✅ [ConfigStore] 用户配置加载成功')
        }
      }
      catch (error) {
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

  // 持久化配置（可选）
  persist: {
    enabled: false, // 不持久化，每次从后端获取最新配置
  },
})

