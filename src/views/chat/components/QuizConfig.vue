<script setup lang="ts">
import { computed, ref } from 'vue'
import { NButton, NCard, NInputNumber, NSpace, NSpin, NText } from 'naive-ui'
import { SvgIcon } from '@/components/common'

interface QuizConfigProps {
  loading?: boolean
}

interface QuizConfigEmits {
  (e: 'submit', config: { single_choice: number; multiple_choice: number; true_false: number }): void
}

defineProps<QuizConfigProps>()
const emit = defineEmits<QuizConfigEmits>()

// 题目数量配置
const singleChoiceCount = ref(5)
const multipleChoiceCount = ref(3)
const trueFalseCount = ref(2)

function handleSubmit() {
  emit('submit', {
    single_choice: singleChoiceCount.value,
    multiple_choice: multipleChoiceCount.value,
    true_false: trueFalseCount.value,
  })
}

const totalCount = computed(() =>
  singleChoiceCount.value + multipleChoiceCount.value + trueFalseCount.value,
)
</script>

<template>
  <NCard
    title="配置题目"
    class="mt-4"
    :bordered="false"
  >
    <template #header-extra>
      <NText depth="3">
        共 {{ totalCount }} 题
      </NText>
    </template>

    <NSpin :show="loading" description="正在生成题目...">
      <NSpace vertical :size="16">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <SvgIcon icon="ri:checkbox-circle-line" class="text-xl text-blue-500" />
            <span class="font-medium">单选题</span>
          </div>
          <NInputNumber
            v-model:value="singleChoiceCount"
            :min="0"
            :max="50"
            :disabled="loading"
            class="w-32"
          />
        </div>

        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <SvgIcon icon="ri:checkbox-multiple-line" class="text-xl text-green-500" />
            <span class="font-medium">多选题</span>
          </div>
          <NInputNumber
            v-model:value="multipleChoiceCount"
            :min="0"
            :max="50"
            :disabled="loading"
            class="w-32"
          />
        </div>

        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <SvgIcon icon="ri:question-answer-line" class="text-xl text-orange-500" />
            <span class="font-medium">判断题</span>
          </div>
          <NInputNumber
            v-model:value="trueFalseCount"
            :min="0"
            :max="50"
            :disabled="loading"
            class="w-32"
          />
        </div>

        <NButton
          type="primary"
          block
          :loading="loading"
          :disabled="totalCount === 0"
          @click="handleSubmit"
        >
          <template #icon>
            <SvgIcon icon="ri:sparkling-line" />
          </template>
          生成题目
        </NButton>
      </NSpace>
    </NSpin>
  </NCard>
</template>

<style scoped>
.n-card {
  max-width: 500px;
  margin: 0 auto;
}
</style>
