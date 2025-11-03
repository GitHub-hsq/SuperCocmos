<script setup lang="ts">
import { CheckmarkOutline } from '@vicons/ionicons5'
import { NButton, NIcon, NInput, NLayout, NLayoutContent, NLayoutHeader, NLayoutSider, NList, NListItem, NPopover, NScrollbar } from 'naive-ui'
import { SvgIcon } from '@/components/common'
import { useModelStore } from '@/store'
import { useModelSelector } from '../../composables/useModelSelector'

// ===== 使用 ModelSelector composable =====
const modelSelector = useModelSelector()
const {
  showModelSelector,
  currentSelectedModel,
  activeVendor,
  modelSearch,
  availableVendors,
  currentVendorModels,
  handleVendorHover,
  loadCurrentModel,
  handleSelectModel,
  selectedModelFromPopover,
} = modelSelector

// ===== 需要 modelStore 来显示当前模型 =====
const modelStore = useModelStore()
</script>

<template>
  <NPopover
    v-model:show="showModelSelector"
    trigger="click"
    placement="bottom-start"
    :show-arrow="false"
    :width="500"
    @update:show="(show) => show && loadCurrentModel()"
  >
    <template #trigger>
      <NButton quaternary round style="padding-left: 8px; padding-right: 8px;">
        {{ currentSelectedModel ? currentSelectedModel.displayName : (modelStore.currentModel ? modelStore.currentModel.displayName : '请选择模型') }}
        <span style="display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; margin-left: 4px; flex-shrink: 0; vertical-align: middle;">
          <SvgIcon icon="ic:keyboard-arrow-down" style="font-size: 20px; width: 1em; height: 1em; display: inline-block; flex-shrink: 0; line-height: 1; vertical-align: middle;" />
        </span>
      </NButton>
    </template>

    <!-- 弹出内容 -->
    <div v-if="availableVendors.length > 0" class="model-selector-popup">
      <NLayout has-sider style="height: 400px">
        <!-- 左侧供应商列表 -->
        <NLayoutSider :width="180" bordered class="vendor-sidebar">
          <NScrollbar style="height: 100%">
            <div class="vendor-list">
              <div
                v-for="vendor in availableVendors"
                :key="vendor.key"
                class="vendor-item"
                :class="{ active: activeVendor === vendor.key }"
                @mouseenter="handleVendorHover(vendor.key)"
              >
                <span class="vendor-name">{{ vendor.label }}</span>
              </div>
            </div>
          </NScrollbar>
        </NLayoutSider>

        <!-- 右侧模型列表 -->
        <NLayout class="model-content">
          <NLayoutHeader bordered class="search-header" style="padding: 8px;">
            <NInput
              v-model:value="modelSearch"
              placeholder=" 搜索模型名称..."
              clearable
              size="small"
            >
              <template #prefix>
                <SvgIcon icon="mdi-light:magnify" />
              </template>
            </NInput>
          </NLayoutHeader>
          <NLayoutContent>
            <NScrollbar style="height: 100%">
              <div v-if="currentVendorModels.length === 0" class="empty-state">
                {{ modelSearch ? '没有找到匹配的模型' : '该供应商暂无可用模型' }}
              </div>
              <NList v-else bordered>
                <NListItem
                  v-for="model in currentVendorModels"
                  :key="model.id"
                  class="model-item"
                  :class="{ selected: selectedModelFromPopover === model.id }"
                  @click="handleSelectModel(model)"
                >
                  <div class="model-item-content">
                    <div class="model-info">
                      <span class="model-name">{{ model.displayName }}</span>
                    </div>
                    <NIcon v-if="selectedModelFromPopover === model.id" color="#333333" class="dark:text-white" size="20">
                      <CheckmarkOutline />
                    </NIcon>
                  </div>
                </NListItem>
              </NList>
            </NScrollbar>
          </NLayoutContent>
        </NLayout>
      </NLayout>
    </div>
    <div v-else class="empty-vendor">
      <p>暂无可用模型</p>
      <p class="text-sm text-gray-500 mt-2">
        请先在设置中配置模型
      </p>
    </div>
  </NPopover>
</template>

<style scoped>
/* 组件内部不需要额外样式，所有样式都在全局定义 */
</style>
