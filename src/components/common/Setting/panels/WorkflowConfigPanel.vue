<script setup lang="ts">
import { NButton, NCard, NCollapse, NCollapseItem, NDivider, NForm, NFormItem, NInput, NInputNumber, NSelect, NSpace, useMessage } from 'naive-ui'
import { computed, reactive } from 'vue'
import { useConfigStore, useModelStore } from '@/store'

const configStore = useConfigStore()
const modelStore = useModelStore()
const ms = useMessage()

// 工作流节点定义
const workflowNodes = [
  {
    key: 'classify',
    icon: '📋',
    name: '题目分类',
    description: '识别题目所属学科（数学、物理等）',
    recommendedParams: { temperature: 0.3, topP: 0.8, maxTokens: 2048 },
  },
  {
    key: 'parse_questions',
    icon: '🔍',
    name: '题目解析',
    description: '提取题目中的关键信息和考点',
    recommendedParams: { temperature: 0.5, topP: 0.9, maxTokens: 4096 },
  },
  {
    key: 'generate_questions',
    icon: '✍️',
    name: '题目生成',
    description: '根据要求生成新的练习题',
    recommendedParams: { temperature: 0.8, topP: 0.95, maxTokens: 8192 },
  },
  {
    key: 'revise',
    icon: '✅',
    name: '结果审核',
    description: '检查和修正生成的题目质量',
    recommendedParams: { temperature: 0.3, topP: 0.8, maxTokens: 4096 },
  },
]

// 表单数据
const formData = reactive<Record<string, any>>({})

// 从 store 加载数据
function loadData() {
  const workflowConfig = configStore.workflowConfig
  if (workflowConfig) {
    workflowNodes.forEach((node) => {
      const nodeConfig = workflowConfig[node.key as Config.WorkflowNodeType]
      if (nodeConfig) {
        formData[node.key] = {
          modelId: nodeConfig.modelId || null,
          temperature: nodeConfig.parameters?.temperature || node.recommendedParams.temperature,
          topP: nodeConfig.parameters?.topP || node.recommendedParams.topP,
          maxTokens: nodeConfig.parameters?.maxTokens || node.recommendedParams.maxTokens,
          systemPrompt: nodeConfig.systemPrompt || '',
        }
      }
      else {
        // 使用默认推荐参数
        formData[node.key] = {
          modelId: null,
          ...node.recommendedParams,
          systemPrompt: '',
        }
      }
    })
  }
  else {
    // 初始化默认值
    workflowNodes.forEach((node) => {
      formData[node.key] = {
        modelId: null,
        ...node.recommendedParams,
        systemPrompt: '',
      }
    })
  }
}

loadData()

// 模型选项
const modelOptions = computed(() => {
  return modelStore.enabledModels.map((model: any) => ({
    label: `${model.provider} - ${model.displayName}`,
    value: model.id,
  }))
})

// 保存状态
const saving = computed(() => configStore.loading)

// 保存设置
async function handleSave() {
  try {
    const updates: Record<string, any> = {}
    workflowNodes.forEach((node) => {
      const nodeData = formData[node.key]
      updates[node.key] = {
        displayName: node.name,
        description: node.description,
        modelId: nodeData.modelId,
        parameters: {
          temperature: nodeData.temperature,
          topP: nodeData.topP,
          maxTokens: nodeData.maxTokens,
        },
        systemPrompt: nodeData.systemPrompt || undefined,
      }
    })

    await configStore.updateWorkflowConfig(updates as Config.WorkflowConfig)
    ms.success('工作流配置已保存')
  }
  catch (error: any) {
    ms.error(`保存失败: ${error?.message || '未知错误'}`)
  }
}

// 重置单个节点为推荐值
function resetNode(nodeKey: string) {
  const node = workflowNodes.find(n => n.key === nodeKey)
  if (node) {
    formData[nodeKey] = {
      modelId: null,
      ...node.recommendedParams,
      systemPrompt: '',
    }
    ms.info(`已重置 ${node.name} 为推荐值`)
  }
}

// 复制配置到其他节点
function copyToOthers(fromKey: string) {
  const sourceData = formData[fromKey]
  workflowNodes.forEach((node) => {
    if (node.key !== fromKey) {
      formData[node.key] = {
        ...sourceData,
      }
    }
  })
  ms.success('配置已复制到所有其他节点')
}

// 节点状态指示
function getNodeStatus(nodeKey: string) {
  const nodeData = formData[nodeKey]
  if (!nodeData)
    return '⚠️ 未配置'
  if (nodeData.modelId)
    return '✅ 已配置'
  return '⚠️ 使用默认'
}
</script>

<template>
  <div class="workflow-config-panel">
    <NCard title="工作流配置" :bordered="false">
      <template #header-extra>
        <NSpace>
          <NButton type="primary" :loading="saving" @click="handleSave">
            保存更改
          </NButton>
        </NSpace>
      </template>

      <div class="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <div class="text-sm text-blue-600 dark:text-blue-400">
          💡 提示：工作流用于自动生成题目，每个节点负责不同的任务。<br>
          您可以为每个节点指定不同的AI模型和参数，以获得最佳效果。
        </div>
      </div>

      <NCollapse>
        <NCollapseItem
          v-for="node in workflowNodes"
          :key="node.key"
          :name="node.key"
        >
          <template #header>
            <div class="flex items-center justify-between w-full pr-4">
              <div class="flex items-center space-x-3">
                <span class="text-2xl">{{ node.icon }}</span>
                <div>
                  <div class="font-medium">
                    {{ node.name }}
                  </div>
                  <div class="text-xs text-gray-500">
                    {{ node.description }}
                  </div>
                </div>
              </div>
              <span class="text-sm">{{ getNodeStatus(node.key) }}</span>
            </div>
          </template>

          <template #header-extra>
            <NSpace>
              <NButton size="small" secondary @click.stop="copyToOthers(node.key)">
                复制到其他
              </NButton>
              <NButton size="small" secondary @click.stop="resetNode(node.key)">
                恢复推荐
              </NButton>
            </NSpace>
          </template>

          <NForm label-placement="left" label-width="120" :model="formData[node.key]">
            <NFormItem label="使用的模型" :path="`${node.key}.modelId`">
              <NSelect
                v-model:value="formData[node.key].modelId"
                :options="modelOptions"
                placeholder="选择执行此步骤的AI模型 (推荐准确率高的模型)"
                filterable
                clearable
              />
            </NFormItem>

            <NDivider title-placement="left">
              模型参数
            </NDivider>

            <NFormItem label="创造力" :path="`${node.key}.temperature`">
              <NInputNumber
                v-model:value="formData[node.key].temperature"
                :min="0"
                :max="2"
                :step="0.1"
                class="w-full"
              />
            </NFormItem>

            <NFormItem label="多样性" :path="`${node.key}.topP`">
              <NInputNumber
                v-model:value="formData[node.key].topP"
                :min="0"
                :max="1"
                :step="0.1"
                class="w-full"
              />
            </NFormItem>

            <NFormItem label="最大输出" :path="`${node.key}.maxTokens`">
              <NInputNumber
                v-model:value="formData[node.key].maxTokens"
                :min="100"
                :max="32000"
                :step="1024"
                class="w-full"
              />
            </NFormItem>

            <NFormItem label="专属提示词" :path="`${node.key}.systemPrompt`">
              <NInput
                v-model:value="formData[node.key].systemPrompt"
                type="textarea"
                placeholder="(可选) 为此节点定制专门的提示词"
                :autosize="{ minRows: 2, maxRows: 6 }"
              />
            </NFormItem>

            <div class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
              <div class="font-medium mb-2">
                💡 推荐参数
              </div>
              <div class="text-gray-600 dark:text-gray-400">
                Temperature: {{ node.recommendedParams.temperature }} |
                Top P: {{ node.recommendedParams.topP }} |
                Max Tokens: {{ node.recommendedParams.maxTokens }}
              </div>
            </div>
          </NForm>
        </NCollapseItem>
      </NCollapse>
    </NCard>
  </div>
</template>

<style scoped>
.workflow-config-panel {
  max-width: 900px;
  margin: 0 auto;
}
</style>
