<script setup lang='ts'>
import { computed, ref, watch } from 'vue'
import { NModal, NTabPane, NTabs } from 'naive-ui'
import General from './General.vue'
import Advanced from './Advanced.vue'
import About from './About.vue'
import WorkflowModel from './WorkflowModel.vue'
import ProviderConfig from './ProviderConfig.vue'
import { useAuthStore } from '@/store'
import { SvgIcon } from '@/components/common'

interface Props {
  visible: boolean
}

interface Emit {
  (e: 'update:visible', visible: boolean): void
}

const props = defineProps<Props>()

const emit = defineEmits<Emit>()

const authStore = useAuthStore()

const isChatGPTAPI = computed<boolean>(() => !!authStore.isChatGPTAPI)

const active = ref('General')
const aboutRef = ref<InstanceType<typeof About> | null>(null)
const hasLoadedUsage = ref(false)

const show = computed({
  get() {
    return props.visible
  },
  set(visible: boolean) {
    emit('update:visible', visible)
  },
})

// 监听选项卡切换，首次点击API使用量时自动加载
watch(active, (newValue) => {
  if (newValue === 'Config' && !hasLoadedUsage.value && isChatGPTAPI.value) {
    hasLoadedUsage.value = true
    // 延迟执行，确保组件已经渲染
    setTimeout(() => {
      if (aboutRef.value && typeof aboutRef.value.fetchUsage === 'function')
        aboutRef.value.fetchUsage()
    }, 100)
  }
})
</script>

<template>
  <NModal v-model:show="show" :auto-focus="false" preset="card" style="width: 60%; min-width: 600px; max-width: 1200px; max-height: 80vh">
    <div>
      <NTabs v-model:value="active" type="line" animated>
        <NTabPane name="General" tab="General">
          <template #tab>
            <SvgIcon class="text-lg" icon="ri:file-user-line" />
            <span class="ml-2">{{ $t('modelsSetting.general') }}</span>
          </template>
          <div class="min-h-[100px]">
            <General />
          </div>
        </NTabPane>
        <NTabPane v-if="isChatGPTAPI" name="Advanced" tab="Advanced">
          <template #tab>
            <SvgIcon class="text-lg" icon="ri:equalizer-line" />
            <span class="ml-2">{{ $t('modelsSetting.advanced') }}</span>
          </template>
          <div class="min-h-[100px]">
            <Advanced />
          </div>
        </NTabPane>
        <NTabPane name="Config" tab="Config">
          <template #tab>
            <SvgIcon class="text-lg" icon="ri:list-settings-line" />
            <span class="ml-2">{{ $t('modelsSetting.config') }}</span>
          </template>
          <About ref="aboutRef" />
        </NTabPane>
        <NTabPane name="WorkflowModel" tab="WorkflowModel">
          <template #tab>
            <SvgIcon class="text-lg" icon="ri:git-branch-line" />
            <span class="ml-2">{{ $t('modelsSetting.workflowModel') }}</span>
          </template>
          <div class="min-h-[100px]">
            <WorkflowModel />
          </div>
        </NTabPane>
        <NTabPane name="ProviderConfig" tab="ProviderConfig">
          <template #tab>
            <SvgIcon class="text-lg" icon="ri:settings-3-line" />
            <span class="ml-2">{{ $t('modelsSetting.providerConfig') }}</span>
          </template>
          <div class="min-h-[100px]">
            <ProviderConfig :visible="active === 'ProviderConfig'" />
          </div>
        </NTabPane>
      </NTabs>
    </div>
  </NModal>
</template>
