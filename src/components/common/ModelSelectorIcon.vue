<script setup lang="ts">
import { computed } from 'vue'
import { MODEL_SELECTOR_ICON_PATH } from '@/utils/icons'

interface Props {
  class?: string
  size?: string | number
}

const props = withDefaults(defineProps<Props>(), {
  size: '1em',
})

const iconSize = computed(() => {
  if (typeof props.size === 'number')
    return `${props.size}px`
  return props.size
})
</script>

<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    xmlns:xlink="http://www.w3.org/1999/xlink"
    aria-hidden="true"
    role="img"
    :class="props.class"
    :width="iconSize"
    :height="iconSize"
    viewBox="0 0 24 24"
  >
    <path :d="MODEL_SELECTOR_ICON_PATH" fill="currentColor" />
  </svg>
</template>
