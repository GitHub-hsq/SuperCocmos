<script setup lang="ts">
import { computed } from 'vue'

interface RadioProps {
  label?: string
  modelValue?: boolean
  disabled?: boolean
  size?: 'small' | 'medium' | 'large'
  value?: string
}

interface RadioEmits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'change', value: string): void
}

const props = withDefaults(defineProps<RadioProps>(), {
  label: '',
  modelValue: false,
  disabled: false,
  size: 'medium',
  value: '',
})

const emit = defineEmits<RadioEmits>()

function handleChange() {
  if (!props.disabled && !props.modelValue) {
    emit('update:modelValue', true)
    if (props.value)
      emit('change', props.value)
  }
}

const sizeMap = {
  small: '1.5em',
  medium: '2em',
  large: '2.5em',
}

const svgSize = computed(() => sizeMap[props.size])
</script>

<template>
  <label class="container" :class="{ disabled, checked: modelValue }" @click="handleChange">
    <svg viewBox="0 0 64 64" :height="svgSize" :width="svgSize">
      <circle cx="32" cy="32" r="28" class="radio-circle" />
      <circle cx="32" cy="32" r="16" class="radio-dot" />
    </svg>
    <span v-if="label" class="label-text">{{ label }}</span>
    <span v-else class="label-text"><slot /></span>
  </label>
</template>

<style scoped>
  .container {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  user-select: none;
}

.container.disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.container svg {
  overflow: visible;
  flex-shrink: 0;
}

.radio-circle {
  fill: none;
  stroke: #333333;
  stroke-width: 3;
  transition: all 0.3s ease;
}

:deep(.dark) .radio-circle {
  stroke: #ffffff;
}

.radio-dot {
  fill: #333333;
  transform-origin: center;
  transition: all 0.3s ease;
  transform: scale(0);
}

:deep(.dark) .radio-dot {
  fill: #ffffff;
}

.container.checked .radio-dot {
  transform: scale(1);
}

.label-text {
  font-size: 14px;
  color: #333;
}

:deep(.dark) .label-text {
  color: #e5e5e5;
}
</style>
