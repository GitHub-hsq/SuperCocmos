<script setup>
import { useAuth0 } from '@auth0/auth0-vue'
import Error from './components/Error.vue'
import NavBar from './components/NavBar.vue'

// 从 Auth0 获取加载状态
const { isLoading } = useAuth0()
</script>

<template>
  <div id="app" class="d-flex flex-column h-100">
    <NavBar />

    <div class="container flex-grow-1">
      <Error />

      <!-- Auth0 加载状态控制：防止闪屏 -->
      <div v-if="isLoading" class="loading-screen mt-5 text-center">
        <h4>正在登录中，请稍候...</h4>
        <h4>正在登录中，请稍候...</h4>
        <h4>正在登录中，请稍候...</h4>
        <h4>正在登录中，请稍候...</h4>
        <h4>正在登录中，请稍候...</h4>
      </div>

      <div v-else class="mt-5">
        <router-view />
      </div>
    </div>

    <footer class="bg-light text-center p-3">
      <div class="logo" />
      <p>
        Sample project provided by
        <a href="https://auth0.com" target="_blank">Auth0</a>
      </p>
    </footer>
  </div>
</template>

<style scoped>
.loading-screen {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 50vh;
  color: #555;
  font-size: 1.2rem;
}
</style>
