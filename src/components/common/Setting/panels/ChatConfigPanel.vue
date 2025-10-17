<script setup lang="ts">
import { NButton, NCard, NDivider, NForm, NFormItem, NInput, NInputNumber, NSelect, NSpace, NSwitch, useMessage } from 'naive-ui'
import { computed, reactive } from 'vue'
import { useConfigStore, useModelStore } from '@/store'

const configStore = useConfigStore()
const modelStore = useModelStore()
const ms = useMessage()

// 表单数据
const formData = reactive({
  defaultModel: null as { providerId: string, modelId: string } | null,
  temperature: 0.7,
  topP: 0.9,
  maxTokens: 4096,
  systemPrompt: '你是一个有帮助的AI助手。',
  streamEnabled: true,
})

// 从 store 加载数据
function loadData() {
  const chatConfig = configStore.chatConfig
  if (chatConfig) {
    formData.defaultModel = chatConfig.defaultModel || null
    formData.temperature = chatConfig.parameters?.temperature || 0.7
    formData.topP = chatConfig.parameters?.topP || 0.9
    formData.maxTokens = chatConfig.parameters?.maxTokens || 4096
    formData.systemPrompt = chatConfig.systemPrompt || '你是一个有帮助的AI助手。'
    formData.streamEnabled = chatConfig.streamEnabled !== false
  }
}

loadData()

// 模型选项（从 ModelStore 获取）
const modelOptions = computed(() => {
  return modelStore.enabledModels.map((model: any) => ({
    label: `${model.provider} - ${model.displayName}`,
    value: JSON.stringify({ providerId: model.providerId, modelId: model.id }),
  }))
})

// 当前选中的模型值（用于 NSelect）
const selectedModelValue = computed({
  get: () => formData.defaultModel ? JSON.stringify(formData.defaultModel) : null,
  set: (val) => {
    formData.defaultModel = val ? JSON.parse(val) : null
  },
})

// 保存状态
const saving = computed(() => configStore.loading)

// 保存设置
async function handleSave() {
  try {
    // 直接调用 action
    await (configStore as any).updateChatConfig({
      defaultModel: formData.defaultModel,
      parameters: {
        temperature: formData.temperature,
        topP: formData.topP,
        maxTokens: formData.maxTokens,
      },
      systemPrompt: formData.systemPrompt,
      streamEnabled: formData.streamEnabled,
    })
    ms.success('聊天配置已保存')
  }
  catch (error: any) {
    ms.error(`保存失败: ${error?.message || '未知错误'}`)
  }
}

// 重置为默认值
function handleReset() {
  formData.defaultModel = null
  formData.temperature = 0.7
  formData.topP = 0.9
  formData.maxTokens = 4096
  formData.systemPrompt = '你是一个有帮助的AI助手。'
  formData.streamEnabled = true
  ms.info('已重置为默认值')
}

// 预设配置
const presets = [
  { name: '创意模式 🎨', temperature: 1.5, topP: 0.95, description: '发散思维，适合创作、头脑风暴' },
  { name: '平衡模式 ⚖️', temperature: 0.7, topP: 0.9, description: '推荐设置，适合日常对话' },
  { name: '精确模式 🎯', temperature: 0.3, topP: 0.8, description: '严谨一致，适合代码、翻译' },
]

// 应用预设
function applyPreset(preset: typeof presets[0]) {
  formData.temperature = preset.temperature
  formData.topP = preset.topP
  ms.info(`已应用预设：${preset.name}`)
}
</script>

<template>
  <div class="chat-config-panel">
    <NCard title="聊天配置" :bordered="false">
      <template #header-extra>
        <NSpace>
          <NButton secondary @click="handleReset">
            恢复默认
          </NButton>
          <NButton type="primary" :loading="saving" @click="handleSave">
            保存更改
          </NButton>
        </NSpace>
      </template>

      <NForm label-placement="left" label-width="120" :model="formData">
        <!-- 默认模型 -->
        <NDivider title-placement="left">
          默认模型
        </NDivider>

        <NFormItem label="默认模型" path="defaultModel">
          <NSelect
            v-model:value="selectedModelValue"
            :options="modelOptions"
            placeholder="选择对话时默认使用的AI模型"
            filterable
            clearable
          />
        </NFormItem>

        <!-- 模型参数 -->
        <NDivider title-placement="left">
          模型参数
        </NDivider>

        <!-- 预设按钮 -->
        <NFormItem label="快速预设">
          <NSpace>
            <NButton
              v-for="preset in presets"
              :key="preset.name"
              size="small"
              @click="applyPreset(preset)"
            >
              {{ preset.name }}
            </NButton>
          </NSpace>
        </NFormItem>

        <NFormItem label="创造力 🎨" path="temperature">
          <div class="w-full">
            <NInputNumber
              v-model:value="formData.temperature"
              :min="0"
              :max="2"
              :step="0.1"
              placeholder="0-2"
              class="w-full"
            />
            <div class="text-xs text-gray-500 mt-1">
              控制回复的随机性和创造力<br>
              • 0-0.3: 严谨、一致性高 (适合代码、翻译)<br>
              • 0.7-1.0: 平衡 (推荐，适合日常对话)<br>
              • 1.5-2.0: 发散、创意性强 (适合创作、头脑风暴)
            </div>
          </div>
        </NFormItem>

        <NFormItem label="多样性 🎲" path="topP">
          <div class="w-full">
            <NInputNumber
              v-model:value="formData.topP"
              :min="0"
              :max="1"
              :step="0.1"
              placeholder="0-1"
              class="w-full"
            />
            <div class="text-xs text-gray-500 mt-1">
              控制词汇选择的范围<br>
              • 0.1-0.5: 保守，使用常见词汇<br>
              • 0.9-1.0: 丰富，词汇多样化 (推荐)
            </div>
          </div>
        </NFormItem>

        <NFormItem label="回复长度 📏" path="maxTokens">
          <div class="w-full">
            <NInputNumber
              v-model:value="formData.maxTokens"
              :min="100"
              :max="128000"
              :step="1024"
              placeholder="100-128000"
              class="w-full"
            />
            <div class="text-xs text-gray-500 mt-1">
              单次回复的最大字数 (约等于字数×1.5)<br>
              • 1024: 简短回复<br>
              • 4096: 中等长度 (推荐)<br>
              • 16000+: 长文本、代码生成
            </div>
          </div>
        </NFormItem>

        <!-- 角色设定 -->
        <NDivider title-placement="left">
          角色设定
        </NDivider>

        <NFormItem label="系统提示词" path="systemPrompt">
          <div class="w-full">
            <NInput
              v-model:value="formData.systemPrompt"
              type="textarea"
              placeholder="给AI设定一个身份或行为准则&#10;例如: '你是一个专业的编程助手'、'你是一个友善的老师'"
              :autosize="{ minRows: 3, maxRows: 8 }"
            />
            <div class="text-xs text-gray-500 mt-1">
              系统提示词会影响AI的回复风格和行为
            </div>
          </div>
        </NFormItem>

        <!-- 其他设置 -->
        <NDivider title-placement="left">
          其他设置
        </NDivider>

        <NFormItem label="打字机效果" path="streamEnabled">
          <div class="flex items-center space-x-3">
            <NSwitch v-model:value="formData.streamEnabled" />
            <span class="text-sm text-gray-500">
              开启后，AI回复会逐字显示 (更流畅的体验)
            </span>
          </div>
        </NFormItem>
      </NForm>
    </NCard>
  </div>
</template>

<style scoped>
.chat-config-panel {
  max-width: 800px;
  margin: 0 auto;
}
</style>
