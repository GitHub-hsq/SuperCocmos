import type { Model } from '@/typings/model'
import { ss } from '@/utils/storage'

const LOCAL_NAME = 'workflowConfig'

// 默认工作流节点配置
export function getDefaultWorkflowNodes(): Model.WorkflowNodeConfig[] {
  return [
    {
      nodeType: 'classify',
      modelId: 'gpt-4o-mini', // 默认使用 GPT-4o Mini
      config: {
        temperature: 0,
        top_p: 1,
      },
    },
    {
      nodeType: 'parse_questions',
      modelId: 'gpt-4o', // 默认
      config: {
        temperature: 0.3,
        top_p: 0.9,
      },
      subjectSpecific: {},
    },
    {
      nodeType: 'generate_questions',
      modelId: 'gpt-4o', // 默认
      config: {
        temperature: 0.7,
        top_p: 0.9,
      },
      subjectSpecific: {},
    },
    {
      nodeType: 'revise',
      modelId: 'gpt-4o',
      config: {
        temperature: 0.5,
        top_p: 0.9,
      },
    },
  ]
}

export function defaultModelState(): Model.ModelState {
  return {
    currentModelId: 'gpt-4o',
    currentProviderId: 'openai',
    providers: [], // 不再设置默认providers，从后端获取
    workflowNodes: getDefaultWorkflowNodes(),
  }
}

// 只从本地存储读取工作流配置
export function getLocalWorkflowConfig(): Model.WorkflowNodeConfig[] | null {
  const localConfig = ss.get(LOCAL_NAME)
  return localConfig || null
}

// 只保存工作流配置到本地存储
export function setLocalWorkflowConfig(workflowNodes: Model.WorkflowNodeConfig[]): void {
  ss.set(LOCAL_NAME, workflowNodes)
}

// 兼容旧代码的方法
export function getLocalModelState(): Model.ModelState {
  return defaultModelState()
}

export function setLocalModelState(state: Model.ModelState): void {
  // 只保存工作流配置
  setLocalWorkflowConfig(state.workflowNodes)
}
