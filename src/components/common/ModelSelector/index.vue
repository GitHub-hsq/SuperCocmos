<script setup lang="ts">
import { NButton, NEmpty, NInput, NModal, NScrollbar, NTag } from 'naive-ui'
import { computed, ref, watch } from 'vue'
import { SvgIcon } from '@/components/common'
import { useBasicLayout } from '@/hooks/useBasicLayout'
import { useModelStore } from '@/store'

interface Props {
  visible: boolean
}

interface Emit {
  (e: 'update:visible', visible: boolean): void
  (e: 'select', modelId: string, provider: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emit>()

const modelStore = useModelStore()
const { isMobile } = useBasicLayout()

const show = computed({
  get() {
    return props.visible
  },
  set(visible: boolean) {
    emit('update:visible', visible)
  },
})

// 从ModelStore获取已启用的模型
const enabledModels = computed(() => {
  return modelStore.enabledModels.filter((m: any) => m.enabled !== false).map((m: any) => ({
    ...m,
    displayName: m.displayName || m.name || m.modelId,
    name: m.name || m.modelId || m.displayName,
  }))
})

// 供应商列表（按模型数量统计）
const providers = computed(() => {
  const providerMap = new Map<string, { name: string, displayName: string, count: number }>()

  enabledModels.value.forEach((model: any) => {
    const providerId = model.provider
    const existing = providerMap.get(providerId)
    if (existing) {
      existing.count++
    }
    else {
      // 从providers中获取显示名称
      const provider = modelStore.providers.find((p: any) => p.id === providerId)
      providerMap.set(providerId, {
        name: providerId,
        displayName: provider?.displayName || providerId,
        count: 1,
      })
    }
  })

  return Array.from(providerMap.entries()).map(([id, data]) => ({
    id,
    name: data.displayName,
    count: data.count,
  }))
})

// 当前选中的供应商
const selectedProvider = ref<string>('')

// 搜索关键词
const searchKeyword = ref('')

// 当前供应商的模型列表（过滤后）
const currentModels = computed(() => {
  let models = enabledModels.value.filter((model: any) => {
    // 移动端显示所有供应商的模型，PC端根据选中的供应商过滤
    if (!isMobile.value && selectedProvider.value && model.provider !== selectedProvider.value)
      return false
    return true
  })

  // 搜索过滤
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    models = models.filter((model: any) =>
      model.name.toLowerCase().includes(keyword)
      || model.displayName.toLowerCase().includes(keyword)
      || model.provider.toLowerCase().includes(keyword),
    )
  }

  return models
})

// 当前选中的模型
const selectedModel = ref<string>('')

// 供应商颜色映射
const providerColorMap: Record<string, 'default' | 'error' | 'info' | 'success' | 'warning' | 'primary'> = {
  openai: 'success',
  anthropic: 'info',
  google: 'warning',
  deepseek: 'error',
}

// 选择供应商
function selectProvider(providerId: string) {
  selectedProvider.value = providerId
  searchKeyword.value = '' // 清空搜索
  // 如果该供应商有模型，自动选中第一个
  const models = enabledModels.value.filter((m: any) => m.provider === providerId)
  if (models.length > 0)
    selectedModel.value = models[0].id
}

// 选择模型
function selectModel(modelId: string) {
  selectedModel.value = modelId
}

// 确认选择
function handleConfirm() {
  if (selectedModel.value) {
    const model = enabledModels.value.find((m: any) => m.id === selectedModel.value)
    if (model) {
      // 更新 ModelStore
      modelStore.setCurrentModel(model.id)
      emit('select', model.id, model.provider)
    }
  }
  show.value = false
}

// 当前选中的模型显示名称
const currentModelDisplayName = computed(() => {
  if (!selectedModel.value)
    return ''
  const model = enabledModels.value.find((m: any) => m.id === selectedModel.value)
  return model ? (model.displayName || model.name) : ''
})

// 监听对话框打开，初始化选择
watch(() => props.visible, (visible) => {
  if (visible) {
    // 使用当前选中的模型
    if (modelStore.currentModelId) {
      selectedModel.value = modelStore.currentModelId
      const currentModel = enabledModels.value.find((m: any) => m.id === modelStore.currentModelId)
      if (currentModel)
        selectedProvider.value = currentModel.provider
    }
    else if (providers.value.length > 0) {
      // 默认选择第一个供应商
      selectProvider(providers.value[0].id)
    }
  }
})
</script>

<template>
  <NModal
    v-model:show="show"
    :auto-focus="false"
    preset="card"
    title="Model"
    :style="isMobile ? 'width: 95%; max-width: 95vw' : 'width: 90%; max-width: 900px'"
    class="model-selector-modal"
  >
    <div class="flex gap-4" :style="isMobile ? 'height: 60vh' : 'height: 500px'">
      <!-- 左侧：供应商列表 (仅PC端显示) -->
      <div v-if="!isMobile" class="w-1/3 flex flex-col pr-4">
        <div class="mb-3 text-sm font-semibold text-gray-600 dark:text-gray-400">
          供应商
        </div>

        <div v-if="providers.length === 0" class="flex-1 flex items-center justify-center">
          <NEmpty description="没有可用的供应商">
            <template #extra>
              <div class="text-sm text-gray-500">
                请先在设置中配置模型
              </div>
            </template>
          </NEmpty>
        </div>

        <NScrollbar v-else class="flex-1">
          <div class="space-y-2">
            <div
              v-for="provider in providers"
              :key="provider.id"
              class="provider-item p-4 rounded-lg cursor-pointer transition-all"
              :class="{
                'bg-primary-light dark:bg-primary-dark border-2 border-primary': selectedProvider === provider.id,
                'bg-gray-50 dark:bg-neutral-800 hover:bg-gray-100 dark:hover:bg-neutral-700 border-2 border-transparent': selectedProvider !== provider.id,
              }"
              @mouseenter="selectProvider(provider.id)"
            >
              <div class="flex items-center justify-between">
                <div class="font-medium">
                  {{ provider.name }}
                </div>
                <NTag
                  :type="providerColorMap[provider.id] || 'default'"
                  size="small"
                  round
                >
                  {{ provider.count }}
                </NTag>
              </div>
            </div>
          </div>
        </NScrollbar>
      </div>

      <!-- 右侧：模型列表 + 搜索 (移动端占满全宽) -->
      <div class="flex-1 flex flex-col" :class="{ 'mobile-model-list': isMobile }">
        <div class="mb-3 flex items-center justify-between">
          <span class="text-sm font-semibold text-gray-600 dark:text-gray-400">
            {{ isMobile ? '搜索并选择模型' : '模型' }}
          </span>
          <span v-if="currentModelDisplayName" class="text-xs text-gray-500 dark:text-gray-500 truncate max-w-[50%]">
            当前: {{ currentModelDisplayName }}
          </span>
        </div>

        <!-- 搜索框 -->
        <div class="mb-3">
          <NInput
            v-model:value="searchKeyword"
            :placeholder="isMobile ? '搜索模型或供应商...' : '搜索模型名称...'"
            clearable
            size="large"
          >
            <template #prefix>
              <SvgIcon icon="ri:search-line" class="search-icon" />
            </template>
          </NInput>
        </div>

        <!-- 模型列表 -->
        <div v-if="currentModels.length === 0" class="flex-1 flex items-center justify-center">
          <NEmpty :description="searchKeyword ? '没有找到匹配的模型' : (providers.length === 0 ? '请先在设置中配置模型' : '没有可用模型')" />
        </div>

        <NScrollbar v-else class="flex-1">
          <div class="space-y-2">
            <div
              v-for="model in currentModels"
              :key="model.id"
              class="model-item p-3 rounded-lg cursor-pointer transition-all"
              :class="{
                'bg-primary-light dark:bg-primary-dark border-2 border-primary selected': selectedModel === model.id,
                'bg-gray-50 dark:bg-neutral-800 hover:bg-gray-100 dark:hover:bg-neutral-700 border-2 border-transparent': selectedModel !== model.id,
              }"
              @click="selectModel(model.id)"
            >
              <div class="flex items-center justify-between gap-3 w-full">
                <div class="flex-1 min-w-0">
                  <div class="font-medium text-sm truncate model-name">
                    {{ model.displayName || model.name }}
                  </div>
                  <!-- 移动端显示供应商标签 -->
                  <div v-if="isMobile" class="mt-1">
                    <NTag
                      :type="providerColorMap[model.provider] || 'default'"
                      size="small"
                      round
                    >
                      {{ modelStore.providers.find((p: any) => p.id === model.provider)?.displayName || model.provider }}
                    </NTag>
                  </div>
                </div>
                <SvgIcon
                  v-if="selectedModel === model.id"
                  class="text-primary text-xl flex-shrink-0 check-icon"
                  icon="ri:checkbox-circle-fill"
                />
              </div>
            </div>
          </div>
        </NScrollbar>
      </div>
    </div>

    <!-- 底部按钮 -->
    <template #footer>
      <div class="flex justify-end items-center footer-content">
        <NButton
          class="confirm-button"
          :block="isMobile"
          :size="isMobile ? 'large' : 'medium'"
          type="primary"
          :disabled="!selectedModel"
          @click="handleConfirm"
        >
          确认选择
        </NButton>
      </div>
    </template>
  </NModal>
</template>

<style scoped>
/* 🎨 主题色定义 */
.bg-primary-light {
  background-color: rgba(22, 22, 24, 0.08) !important;
}

.bg-primary-dark {
  background-color: rgba(22, 22, 24, 0.3) !important;
}

.border-primary {
  border-color: #161618 !important;
}

.text-primary {
  color: #161618 !important;
}

.dark .text-primary {
  color: #ffffff !important;
}

/* 隐藏滚动条 - 已移至全局样式 */

/* 🎨 移动端优化 */
.mobile-model-list {
  width: 100%;
}

/* 移动端模型项增加内边距 */
.model-item {
  min-height: 60px;
  display: flex;
  align-items: center;
}

.model-item.selected {
  box-shadow: 0 2px 8px rgba(22, 22, 24, 0.15);
}

.dark .model-item.selected {
  box-shadow: 0 2px 8px rgba(255, 255, 255, 0.1);
}

.model-name {
  font-size: 15px;
  line-height: 1.4;
}

.check-icon {
  animation: checkIn 0.3s ease;
}

@keyframes checkIn {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.search-icon {
  font-size: 18px;
}

/* 供应商项悬停效果 */
.provider-item {
  user-select: none;
}

.provider-item:active {
  transform: scale(0.98);
}

/* 模型项点击效果 */
.model-item:active {
  transform: scale(0.98);
}

/* 🍎 iOS 风格 - 暗黑模式 - Naive UI 组件样式已移至全局样式 */

/* 标题文本 */
.dark .text-gray-600 {
  color: #aeaeb2 !important; /* iOS 次文本 */
}

/* 供应商/模型列表项 - 默认状态 */
.dark .bg-gray-50 {
  background-color: #2c2c2e !important; /* iOS 次级背景 */
  border-color: #38383a !important;
}

.dark .hover\:bg-gray-100:hover {
  background-color: #3a3a3c !important; /* iOS 三级背景 */
}

/* 供应商/模型列表项 - 选中状态 (已通过 .bg-primary-dark 和 .border-primary 类处理) */

/* 文本颜色 */
.dark .font-medium {
  color: var(--dark-text-primary) !important;
}

.dark .text-sm {
  color: var(--dark-text-primary) !important;
}

.dark .text-gray-400 {
  color: #aeaeb2 !important;
}

/* 暗黑模式 Naive UI 组件样式已移至全局样式 */

/* 滚动条已全局隐藏 */

/* 选中图标颜色 (已通过 .text-primary 类处理) */

/* 列表项圆角和过渡效果 */
.dark .rounded-lg {
  border-radius: 10px; /* iOS 大圆角 */
}

/* Hover 效果增强 */
.dark .cursor-pointer:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

/* 🌞 iOS 风格 - 浅色模式增强 - Naive UI 组件样式已移至全局样式 */

/* 浅色模式列表项 */
.bg-gray-50 {
  background-color: #f5f5f5 !important;
}

.hover\:bg-gray-100:hover {
  background-color: #e8e8ed !important;
}

/* 已通过 .bg-primary-light 和 .border-primary 类处理 */

/* 📱 移动端特定优化 */
@media (max-width: 768px) {
  .model-item {
    min-height: 72px;
    padding: 16px !important;
  }

  .model-name {
    font-size: 16px;
  }

  /* 移动端搜索图标 */
  .search-icon {
    font-size: 20px;
  }

  /* 移动端选中图标 */
  .check-icon {
    font-size: 24px !important;
  }
}

/* 触摸设备优化 */
@media (hover: none) {
  .provider-item:hover {
    transform: none;
  }

  .model-item:hover {
    transform: none;
  }

  .cursor-pointer:hover {
    transform: none !important;
  }
}
</style>

<style scoped>
/* ========== Naive UI 组件全局样式 ========== */

/* 隐藏滚动条 */
.n-scrollbar-rail {
  display: none !important;
}

.n-scrollbar-content {
  padding-right: 0px;
}

/* ========== Modal 卡片样式 ========== */
.n-card {
  border-radius: 1.25rem;
  background-color: #ffffff !important;
}

.n-card-header {
  background-color: #ffffff !important;
  border-bottom: none !important;
  padding: 16px 20px;
}

.n-card-header__main {
  font-weight: 600;
  font-size: 17px;
}

.n-card__footer {
  background-color: #ffffff !important;
  border-top: none !important;
  padding: 16px 20px;
}

/* ========== 搜索框样式 ========== */
.model-selector-modal .n-input {
  background-color: #f5f5f5 !important;
  border-color: transparent !important;
  border-radius: 10px;
  transition: all 0.2s ease;
}

.model-selector-modal .n-input:hover {
  background-color: #e8e8ed !important;
}

.model-selector-modal .n-input--focus {
  border-color: #161618 !important;
  background-color: #ffffff !important;
  box-shadow: 0 0 0 3px rgba(22, 22, 24, 0.1);
}

/* ========== 按钮样式 ========== */
.n-button {
  border-radius: 10px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.n-button--default-type {
  background-color: #f5f5f5 !important;
  border-color: transparent !important;
  color: #000000 !important;
}

.n-button--default-type:hover {
  background-color: #e8e8ed !important;
}

.n-button--default-type:active {
  transform: scale(0.98);
}

.n-button--primary-type {
  background-color: #161618 !important;
  border-color: #161618 !important;
  color: #ffffff !important;
}

.n-button--primary-type:hover {
  background-color: #2c2c2e !important;
}

.n-button--primary-type:active {
  transform: scale(0.98);
}

.n-button--primary-type:disabled {
  background-color: #f5f5f5 !important;
  border-color: transparent !important;
  color: #c7c7cc !important;
  opacity: 0.6;
}

/* ========== Tag 标签样式 ========== */
.n-tag {
  border-radius: 12px;
  font-weight: 500;
}

/* ========== 暗黑模式样式 ========== */
.dark .n-card {
  background-color: #1c1c1e !important;
  color: var(--dark-text-primary) !important;
}

.dark .n-card-header {
  background-color: #1c1c1e !important;
  border-bottom: none !important;
}

.dark .n-card-header__main {
  color: var(--dark-text-primary) !important;
  font-weight: 600;
}

.dark .n-card__content {
  background-color: #1c1c1e !important;
}

.dark .n-card__footer {
  background-color: #1c1c1e !important;
  border-top: none !important;
}

/* 暗黑模式搜索框 */
.dark .model-selector-modal .n-input {
  background-color: #3a3a3c !important;
  border-color: transparent !important;
  color: var(--dark-text-primary) !important;
  border-radius: 10px;
}

.dark .model-selector-modal .n-input:hover {
  background-color: #48484a !important;
}

.dark .model-selector-modal .n-input__input-el {
  color: var(--dark-text-primary) !important;
}

.dark .model-selector-modal .n-input__placeholder {
  color: #aeaeb2 !important;
}

.dark .model-selector-modal .n-input--focus {
  border-color: #ffffff !important;
  background-color: #48484a !important;
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.1);
}

/* 暗黑模式 Tag */
.dark .n-tag {
  background-color: #3a3a3c !important;
  color: var(--dark-text-primary) !important;
  border-color: #48484a !important;
}

/* 暗黑模式按钮 */
.dark .n-button {
  background-color: #2c2c2e !important;
  border-color: #38383a !important;
  color: var(--dark-text-primary) !important;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.dark .n-button:hover {
  background-color: #3a3a3c !important;
  transform: scale(1.02);
}

.dark .n-button--primary-type {
  background-color: #ffffff !important;
  border-color: #ffffff !important;
  color: #161618 !important;
}

.dark .n-button--primary-type:hover {
  background-color: #e8e8ed !important;
}

.dark .n-button--primary-type:disabled {
  background-color: #3a3a3c !important;
  border-color: #48484a !important;
  color: #636366 !important;
  opacity: 0.5;
}

/* 暗黑模式空状态 */
.dark .n-empty {
  color: #aeaeb2 !important;
}

.dark .n-empty__description {
  color: #aeaeb2 !important;
}

/* ========== 移动端样式 ========== */
@media (max-width: 768px) {
  .n-modal {
    padding: 12px;
  }

  .n-card {
    border-radius: 1.25rem;
    max-height: 85vh;
  }

  .n-card-header {
    padding: 16px;
  }

  .n-card__footer {
    padding: 16px;
  }

  .model-selector-modal .n-input {
    font-size: 16px; /* 防止 iOS 自动缩放 */
  }

  .n-button {
    font-size: 16px;
    padding: 12px 20px;
    min-height: 48px;
  }
}
</style>

<style>
.n-card {
  border-radius: 1.25rem;
  background-color: #ffffff !important;
}
</style>
