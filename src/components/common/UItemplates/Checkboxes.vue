<script setup lang="ts">
import { computed } from 'vue'

interface CheckboxesProps {
  label?: string
  modelValue?: boolean
  disabled?: boolean
  size?: 'small' | 'medium' | 'large'
}

interface CheckboxesEmits {
  (e: 'update:modelValue', value: boolean): void
}

const props = withDefaults(defineProps<CheckboxesProps>(), {
  label: '',
  modelValue: false,
  disabled: false,
  size: 'medium',
})

const emit = defineEmits<CheckboxesEmits>()

const handleChange = (e: Event) => {
  if (!props.disabled) {
    const target = e.target as HTMLInputElement
    emit('update:modelValue', target.checked)
  }
}

const sizeMap = {
  small: '1.5em',
  medium: '2em',
  large: '2.5em',
}

const svgSize = computed(() => sizeMap[props.size])
</script>

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

  .container input {
    display: none;
  }

  .container svg {
    overflow: visible;
    flex-shrink: 0;
  }

  .path {
    fill: none;
    stroke: #333333;
    stroke-width: 6;
    stroke-linecap: round;
    stroke-linejoin: round;
    transition: stroke-dasharray 0.5s ease, stroke-dashoffset 0.5s ease;
    stroke-dasharray: 241 9999999;
    stroke-dashoffset: 0;
  }

  :deep(.dark) .path {
    stroke: #ffffff;
  }

  .container input:checked ~ svg .path {
    stroke-dasharray: 70.5096664428711 9999999;
    stroke-dashoffset: -262.2723388671875;
  }

  .label-text {
    font-size: 14px;
    color: #333;
  }

  :deep(.dark) .label-text {
    color: #e5e5e5;
  }
</style>

<template>
  <label class="container" :class="{ disabled }">
    <input
      type="checkbox"
      :checked="modelValue"
      :disabled="disabled"
      @change="handleChange"
    >
    <svg viewBox="0 0 64 64" :height="svgSize" :width="svgSize">
      <path d="M 0 16 V 56 A 8 8 90 0 0 8 64 H 56 A 8 8 90 0 0 64 56 V 8 A 8 8 90 0 0 56 0 H 8 A 8 8 90 0 0 0 8 V 16 L 32 48 L 64 16 V 8 A 8 8 90 0 0 56 0 H 8 A 8 8 90 0 0 0 8 V 56 A 8 8 90 0 0 8 64 H 56 A 8 8 90 0 0 64 56 V 16" pathLength="575.0541381835938" class="path" />
    </svg>
    <span v-if="label" class="label-text">{{ label }}</span>
    <span v-else class="label-text"><slot /></span>
  </label>
</template>
