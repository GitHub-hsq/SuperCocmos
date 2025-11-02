<script setup lang="ts">
import { NButton, NCard, NDivider, NForm, NFormItem, NInput, NInputNumber, NSpace, NSwitch, useLoadingBar, useMessage } from 'naive-ui'
import { computed, onMounted, reactive, watch } from 'vue'
import { useConfigStore } from '@/store'

const configStore = useConfigStore()
const ms = useMessage()
const loadingBar = useLoadingBar()

// 表单数据
const formData = reactive({
  systemPrompt: '你是由SuperCocmos公司开发的新一代人工智能，你将与用户友好沟通。',
  temperature: 0.7,
  topP: 0.9,
  maxTokens: 4096,
  textIndentEnabled: false, // 🔥 文本缩进开关
})

// 从 store 加载数据
function loadData() {
  const chatConfig = configStore.chatConfig

  if (chatConfig) {
    formData.systemPrompt = chatConfig.systemPrompt || '你是由SuperCocmos公司开发的新一代人工智能，你将与用户友好沟通。'
    formData.temperature = chatConfig.parameters?.temperature || 0.7
    formData.topP = chatConfig.parameters?.topP || 0.9
    formData.maxTokens = chatConfig.parameters?.maxTokens || 4096
    formData.textIndentEnabled = chatConfig.textIndentEnabled ?? false // 🔥 加载文本缩进开关
    console.warn('✅ [ChatConfigPanel] 配置已加载到表单')
  }
  else {
    console.warn('⚠️ [ChatConfigPanel] chatConfig 为空，使用默认值')
  }
}

// 🔥 监听配置变化，配置加载完成后自动更新表单
watch(() => configStore.chatConfig, (newConfig) => {
  if (newConfig) {
    console.warn('🔄 [ChatConfigPanel] 检测到配置更新，重新加载表单')
    loadData()
  }
}, { immediate: true })

// 🔥 组件挂载时确保配置已加载
onMounted(async () => {
  // ✅ 配置已在 AppInitStore 中加载，无需重复加载
  if (configStore.loading) {
    console.warn('⏳ [ChatConfigPanel] 等待配置加载完成...')
  }
})

// 保存状态
const saving = computed(() => configStore.loading)

// 保存设置
async function handleSave() {
  loadingBar.start()
  try {
    // 直接调用 action
    await (configStore as any).updateChatConfig({
      parameters: {
        temperature: formData.temperature,
        topP: formData.topP,
        maxTokens: formData.maxTokens,
      },
      systemPrompt: formData.systemPrompt,
      streamEnabled: true, // 默认启用打字机效果
      textIndentEnabled: formData.textIndentEnabled, // 🔥 保存文本缩进开关
    })
    loadingBar.finish()
    ms.success('聊天配置已保存')
  }
  catch (error: any) {
    loadingBar.error()
    ms.error(`保存失败: ${error?.message || '未知错误'}`)
  }
}

// 重置为默认值
function handleReset() {
  formData.temperature = 0.7
  formData.topP = 0.9
  formData.maxTokens = 4096
  formData.systemPrompt = '你是一个有帮助的AI助手。'
  formData.textIndentEnabled = false // 🔥 重置文本缩进开关
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
    <NCard title="聊天配置" :bordered="false" class="transparent-card">
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
        <!-- 角色设定 -->
        <NDivider title-placement="left">
          🤖 AI 角色设定
        </NDivider>

        <NFormItem label="系统提示词" path="systemPrompt">
          <div class="w-full">
            <NInput
              v-model:value="formData.systemPrompt"
              type="textarea"
              placeholder="给AI设定一个身份或行为准则&#10;例如: '你是一个专业的编程助手'、'你是一个友善的老师'"
              :autosize="{ minRows: 4, maxRows: 10 }"
            />
            <div class="text-xs text-gray-500 mt-1">
              💡 系统提示词会影响AI的回复风格和行为。留空则使用默认设定。
            </div>
          </div>
        </NFormItem>

        <!-- 模型参数 -->
        <NDivider title-placement="left">
          ⚙️ 模型参数
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

        <!-- 文本样式 -->
        <NDivider title-placement="left">
          📝 文本样式
        </NDivider>

        <NFormItem label="段落首行缩进" path="textIndentEnabled">
          <div class="w-full">
            <NSwitch v-model:value="formData.textIndentEnabled" />
            <div class="text-xs text-gray-500 mt-1">
              启用后，AI 回复的每个段落首行会缩进 2rem，类似传统文档排版<br>
              💡 适合需要正式文档风格的场景
            </div>
          </div>
        </NFormItem>

        <!-- 使用说明 -->
        <div class="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div class="text-sm text-blue-600 dark:text-blue-400">
            💡 <strong>配置说明</strong><br>
            • 这些参数会在聊天时自动应用到所有对话<br>
            • 模型会记住你上次使用的，无需设置默认模型<br>
            • 打字机效果已默认启用，提供更流畅的体验<br>
            • 如果你是管理员，你的配置会成为其他新用户的默认配置
          </div>
        </div>
      </NForm>
    </NCard>
  </div>
</template>

<style scoped>
.chat-config-panel {
  max-width: 800px;
  margin: 0 auto;
}

/* 🔥 让 NCard 背景透明 */
.transparent-card {
  --n-color: transparent !important;
  background-color: transparent !important;
}
</style>
