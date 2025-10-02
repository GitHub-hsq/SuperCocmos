<script setup lang="ts">
import { computed, ref } from 'vue'
import { NButton, NCard, NCollapse, NCollapseItem, NDivider, NInputNumber, NSelect, NSpace, useMessage } from 'naive-ui'
import { useModelStore } from '@/store'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const message = useMessage()
const modelStore = useModelStore()

// 工作流节点配置
const workflowNodes = computed(() => modelStore.workflowNodes)

// 获取已启用的模型（只包含enabled为true的）
const enabledModels = computed(() => {
  return modelStore.enabledModels.filter(model => model.enabled !== false)
})

// 模型选项（只显示已启用的模型）
const modelOptions = computed(() => {
  return enabledModels.value.map(model => ({
    label: `${model.displayName} (${model.provider})`,
    value: model.id,
  }))
})

// 学科选项
const subjects: Model.Subject[] = ['math', 'physics', 'chemistry', 'biology', 'chinese', 'english']

// 获取节点类型的显示名称
function getNodeTypeName(nodeType: Model.WorkflowNodeType): string {
  const names: Record<Model.WorkflowNodeType, string> = {
    classify: t('model.classify'),
    parse_questions: t('model.parseQuestions'),
    generate_questions: t('model.generateQuestions'),
    revise: t('model.revise'),
  }
  return names[nodeType] || nodeType
}

// 获取学科的显示名称
function getSubjectName(subject: Model.Subject): string {
  const names: Record<Model.Subject, string> = {
    math: t('model.math'),
    physics: t('model.physics'),
    chemistry: t('model.chemistry'),
    biology: t('model.biology'),
    chinese: t('model.chinese'),
    english: t('model.english'),
  }
  return names[subject] || subject
}

// 更新节点模型
function updateNodeModel(nodeType: Model.WorkflowNodeType, modelId: string) {
  modelStore.updateWorkflowNodeConfig(nodeType, { modelId })
}

// 更新节点配置
function updateNodeConfig(nodeType: Model.WorkflowNodeType, key: keyof Model.ModelConfig, value: number) {
  const node = modelStore.getNodeConfig(nodeType)
  if (node) {
    const config = { ...node.config, [key]: value }
    modelStore.updateWorkflowNodeConfig(nodeType, { config })
  }
}

// 更新学科专属模型
function updateSubjectModel(nodeType: Model.WorkflowNodeType, subject: Model.Subject, modelId: string) {
  const node = modelStore.getNodeConfig(nodeType)
  if (node) {
    const subjectSpecific = { ...node.subjectSpecific, [subject]: modelId }
    modelStore.updateWorkflowNodeConfig(nodeType, { subjectSpecific })
  }
}

// 重置为默认配置
function resetToDefault() {
  modelStore.resetToDefault()
  message.success(t('model.resetToDefault'))
}

// 保存配置
function saveConfig() {
  modelStore.recordState()
  message.success(t('model.configSaved'))
}
</script>

<template>
  <div class="p-4 space-y-4">
    <div class="flex justify-between items-center mb-4">
      <div class="text-lg font-semibold">{{ $t('modelsSetting.workflowModel') }}</div>
      <NSpace>
        <NButton secondary @click="resetToDefault">
          {{ $t('model.resetToDefault') }}
        </NButton>
        <NButton type="primary" @click="saveConfig">
          {{ $t('model.saveConfig') }}
        </NButton>
      </NSpace>
    </div>

    <NCollapse>
      <NCollapseItem
        v-for="node in workflowNodes"
        :key="node.nodeType"
        :title="getNodeTypeName(node.nodeType)"
        :name="node.nodeType"
      >
        <div class="space-y-4">
          <!-- 默认模型选择 -->
          <div>
            <div class="mb-2 text-sm font-semibold">{{ $t('model.defaultModel') }}</div>
            <NSelect
              :value="node.modelId"
              :options="modelOptions"
              @update:value="(value) => updateNodeModel(node.nodeType, value)"
            />
          </div>

          <NDivider />

          <!-- 模型参数配置 -->
          <div class="space-y-3">
            <div class="text-sm font-semibold">{{ $t('model.nodeConfig') }}</div>
            
            <div class="grid grid-cols-2 gap-4">
              <div>
                <div class="mb-1 text-xs text-gray-600 dark:text-gray-400">Temperature</div>
                <NInputNumber
                  :value="node.config?.temperature ?? 0.7"
                  :min="0"
                  :max="2"
                  :step="0.1"
                  @update:value="(value) => updateNodeConfig(node.nodeType, 'temperature', value)"
                  class="w-full"
                />
              </div>
              
              <div>
                <div class="mb-1 text-xs text-gray-600 dark:text-gray-400">Top P</div>
                <NInputNumber
                  :value="node.config?.top_p ?? 0.9"
                  :min="0"
                  :max="1"
                  :step="0.1"
                  @update:value="(value) => updateNodeConfig(node.nodeType, 'top_p', value)"
                  class="w-full"
                />
              </div>

              <div>
                <div class="mb-1 text-xs text-gray-600 dark:text-gray-400">Max Tokens</div>
                <NInputNumber
                  :value="node.config?.max_tokens ?? 4096"
                  :min="1"
                  :max="128000"
                  :step="1024"
                  @update:value="(value) => updateNodeConfig(node.nodeType, 'max_tokens', value)"
                  class="w-full"
                />
              </div>

              <div>
                <div class="mb-1 text-xs text-gray-600 dark:text-gray-400">Presence Penalty</div>
                <NInputNumber
                  :value="node.config?.presence_penalty ?? 0"
                  :min="-2"
                  :max="2"
                  :step="0.1"
                  @update:value="(value) => updateNodeConfig(node.nodeType, 'presence_penalty', value)"
                  class="w-full"
                />
              </div>
            </div>
          </div>

          <!-- 学科专属配置（仅对 parse_questions 和 generate_questions 显示） -->
          <template v-if="node.nodeType === 'parse_questions' || node.nodeType === 'generate_questions'">
            <NDivider />
            <div class="space-y-3">
              <div class="text-sm font-semibold">{{ $t('model.subjectSpecific') }}</div>
              <div class="space-y-2">
                <div v-for="subject in subjects" :key="subject" class="flex items-center gap-2">
                  <div class="w-20 text-xs text-gray-600 dark:text-gray-400">
                    {{ getSubjectName(subject) }}
                  </div>
                  <NSelect
                    :value="node.subjectSpecific?.[subject] || node.modelId"
                    :options="modelOptions"
                    @update:value="(value) => updateSubjectModel(node.nodeType, subject, value)"
                    class="flex-1"
                    size="small"
                  />
                </div>
              </div>
            </div>
          </template>
        </div>
      </NCollapseItem>
    </NCollapse>
  </div>
</template>

<style scoped>
/* 自定义样式 */
</style>

