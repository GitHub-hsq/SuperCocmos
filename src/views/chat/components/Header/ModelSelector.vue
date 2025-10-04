<script setup>
import { computed, ref } from 'vue'
import { NButton, NDrawer, NDrawerContent, NIcon, NInput, NLayout, NLayoutContent, NLayoutHeader, NLayoutSider, NList, NListItem, NMenu, NScrollbar } from 'naive-ui'
import { CheckmarkOutline } from '@vicons/ionicons5'

// 厂商和模型数据
const vendorModels = {
  openai: ['gpt-4-turbo', 'gpt-3.5-turbo', 'text-davinci-003'],
  anthropic: ['claude-3-opus', 'claude-3-sonnet'],
  google: ['gemini-1.5-pro', 'gemini-1.5-flash'],
  xAI: ['grok-4'],
  deepseek: ['deepseek-v3', 'deepseek-r1'],
  doubao: ['doubao-seed-1.6-flash', 'doubao-seed-1.6-thinking'],
  qwen: ['qwen3-v1', 'qwen3-next'],
}

// 左侧菜单配置
const vendorOptions = Object.keys(vendorModels).map(vendor => ({
  label: vendor,
  key: vendor,
}))

// 状态
const show = ref(false)
const activeVendor = ref('openai')
const search = ref('')
const selectedModel = ref(null)

const models = computed(() => vendorModels[activeVendor.value] || [])
const filteredModels = computed(() =>
  models.value.filter(m => m.toLowerCase().includes(search.value.toLowerCase())),
)

// 方法
function handleSelectVendor(vendor) {
  activeVendor.value = vendor
}

function selectModel(model) {
  selectedModel.value = model
  // eslint-disable-next-line no-console
  console.log('✅ 已选择模型:', model)
  show.value = false // 选择后自动关闭
}
</script>

<template>
  <NDrawer v-model:show="show" placement="right" width="800">
    <NDrawerContent title="模型选择器">
      <NLayout has-sider style="height: 600px;">
        <!-- 左侧厂商 -->
        <NLayoutSider width="200" bordered>
          <NMenu
            v-model:value="activeVendor"
            :options="vendorOptions"
            @update:value="handleSelectVendor"
          />
        </NLayoutSider>

        <!-- 右侧模型区 -->
        <NLayout>
          <NLayoutHeader bordered>
            <NInput
              v-model:value="search"
              placeholder="🔍 搜索模型名称..."
              clearable
            />
          </NLayoutHeader>
          <NLayoutContent>
            <NScrollbar style="height: 100%">
              <NList bordered>
                <NListItem
                  v-for="model in filteredModels"
                  :key="model"
                  class="cursor-pointer hover:bg-gray-100"
                  @click="selectModel(model)"
                >
                  <div class="flex justify-between items-center w-full">
                    <span>{{ model }}</span>
                    <NIcon v-if="model === selectedModel" color="#18a058">
                      <CheckmarkOutline />
                    </NIcon>
                  </div>
                </NListItem>
              </NList>
            </NScrollbar>
          </NLayoutContent>
        </NLayout>
      </NLayout>
    </NDrawerContent>
  </NDrawer>

  <!-- 悬浮按钮 -->
  <NButton
    circle
    trigger="click"
    style="position: fixed; bottom: 20px; right: 20px;"
    @click="show = true"
  >
    模型
  </NButton>
</template>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}
.hover\:bg-gray-100:hover {
  background-color: #f5f5f5;
}
</style>
