<script setup lang="ts">
defineProps({
  size: { type: Number, default: 16 },
  color: { type: String, default: 'currentColor' },
  direction: { type: String, default: 'right' }, // right, down
})
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    :class="`chevron-${direction}`"
  >
    <path
      d="M9 6l6 6-6 6"
      :stroke="color"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>

<style scoped>
svg {
  transition: transform 0.3s ease;
}

.chevron-right {
  transform: rotate(0deg);
}

.chevron-down {
  transform: rotate(90deg);
}
</style>
