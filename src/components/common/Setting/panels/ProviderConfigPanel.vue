<script setup lang="ts">
/**
 * 供应商配置面板包装器
 * 复用现有的 ProviderConfig 组件
 */
import ProviderConfig from '../ProviderConfig.vue'
</script>

<template>
  <div class="provider-config-panel">
    <ProviderConfig :visible="true" />
  </div>
</template>

<style scoped>
.provider-config-panel {
  max-width: 1200px;
  margin: 0 auto;
}
</style>
