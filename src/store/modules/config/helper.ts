/**
 * 配置 Store Helper
 */

import { useConfigStore } from './index'

export function useConfig() {
  return useConfigStore()
}

/**
 * 获取用户设置
 */
export function useUserSettings() {
  const configStore = useConfigStore()
  return configStore.userSettings
}

/**
 * 获取聊天配置
 */
export function useChatConfig() {
  const configStore = useConfigStore()
  return configStore.chatConfig
}

/**
 * 获取工作流配置
 */
export function useWorkflowConfig() {
  const configStore = useConfigStore()
  return configStore.workflowConfig
}

/**
 * 默认配置值
 */
export const DEFAULT_USER_SETTINGS: Config.UserSettings = {
  avatar: '',
  name: '',
  theme: 'auto',
  language: 'zh-CN',
}

export const DEFAULT_CHAT_CONFIG: Config.ChatConfig = {
  defaultModel: null,
  parameters: {
    temperature: 0.7,
    topP: 0.9,
    maxTokens: 4096,
  },
  systemPrompt: '你是一个有帮助的AI助手。',
  streamEnabled: true,
}

export const DEFAULT_WORKFLOW_CONFIG: Config.WorkflowConfig = {
  classify: {
    displayName: '题目分类',
    description: '识别题目所属学科',
    modelId: null,
    parameters: {
      temperature: 0.3,
      topP: 0.8,
      maxTokens: 2048,
    },
    systemPrompt: null,
  },
  parse_questions: {
    displayName: '题目解析',
    description: '提取题目关键信息',
    modelId: null,
    parameters: {
      temperature: 0.5,
      topP: 0.9,
      maxTokens: 4096,
    },
    systemPrompt: null,
    subjectSpecific: {},
  },
  generate_questions: {
    displayName: '题目生成',
    description: '生成新的练习题',
    modelId: null,
    parameters: {
      temperature: 0.8,
      topP: 0.95,
      maxTokens: 8192,
    },
    systemPrompt: null,
    subjectSpecific: {},
  },
  revise: {
    displayName: '结果审核',
    description: '检查题目质量',
    modelId: null,
    parameters: {
      temperature: 0.3,
      topP: 0.8,
      maxTokens: 4096,
    },
    systemPrompt: null,
  },
}

/**
 * 配置预设
 */
export const CHAT_PRESETS: Config.ChatPresets = {
  creative: {
    name: '创意模式',
    description: '发散思维，适合创作、头脑风暴',
    icon: '🎨',
    parameters: {
      temperature: 1.5,
      topP: 0.95,
      maxTokens: 4096,
    },
  },
  balanced: {
    name: '平衡模式',
    description: '推荐设置，适合日常对话',
    icon: '⚖️',
    parameters: {
      temperature: 0.7,
      topP: 0.9,
      maxTokens: 4096,
    },
  },
  precise: {
    name: '精确模式',
    description: '严谨一致，适合代码、翻译',
    icon: '🎯',
    parameters: {
      temperature: 0.3,
      topP: 0.8,
      maxTokens: 4096,
    },
  },
}
