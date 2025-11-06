<script setup lang="ts">
/**
 * 供应商配置面板包装器
 * 复用现有的 ProviderConfig 组件
 */
import ProviderConfig from '../ProviderConfig.vue'
</script>

<template>
  <div class="provider-config-panel h-full">
    <ProviderConfig :visible="true" />
  </div>
</template>

<style scoped>
.provider-config-panel {
  margin: 0 auto;
  height: 100%;
}
</style>
