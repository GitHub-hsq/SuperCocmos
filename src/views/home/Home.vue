<script setup lang="ts">
import { useRouter } from 'vue-router'
import Particles from '@/components/ui/Particles.vue'

const router = useRouter()

function goToLogin() {
  router.push('/login')
}
</script>

<template>
  <div class="home-container">
    <!-- 粒子背景效果 -->
    <Particles 
      class="absolute inset-0 z-0"
      :quantity="100"
      :staticity="80"
      :ease="80"
      :size="0.6"
      color="#ffffff"
      :vx="0.05"
      :vy="0.05"
      :colors="['#ffffff']"
    />
    
    <!-- 登录按钮 -->
    <div class="cta">
      <button @click="goToLogin">
        Log in
        <i class="fa-solid fa-arrow-right" />
      </button>
    </div>
  </div>
</template>

<style scoped>
/**引入Google Fonts - Inter 字体 和 cdn加载 Font Awesome 图标库 */
@import url('https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap');
@import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css');

.home-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  background-color: #000000;
  overflow: hidden;
}


.cta {
  position: absolute;
  bottom: 50%;
  left: 50%;
  transform: translate(-50%, 50%);
  display: flex;
  justify-content: center;
  width: 100%;
  z-index: 5;
}

.cta button {
  font-size: 18px;
  font-weight: 400;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.8);
  background-color: transparent;
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 50px;
  height: 50px;
  width: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
  cursor: pointer;
}

.cta button:hover {
  background-color: rgba(255, 255, 255, 0.8);
  color: rgb(53, 53, 53);
}
</style>
