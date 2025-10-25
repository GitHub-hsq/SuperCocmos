<script setup>
import { useAuth0 } from '@auth0/auth0-vue'

const { isLoading } = useAuth0()
</script>

<template>
  <div v-if="isLoading" class="loading-screen">
    正在登录中...
  </div>
  <router-view v-else />
</template>
