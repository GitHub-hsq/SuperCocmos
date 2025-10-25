<script setup lang="ts">
import SignInUi from './SignInUi.vue'
</script>

<template>
  <div class="flex" style="height: 100vh; width: 100%;">
    <!-- 左边登录部分 -->
    <div class="flex h-full w-full flex-col overflow-hidden left-panel">
      <!-- 顶部导航 -->
      <div class="flex w-full items-center justify-between p-5">
        <a
          class="flex items-center"
          title="Home"
          href="/"
        >
          <span
            class="inline-flex items-center justify-center p-0 m-0"
            style="height:42px;width:42px"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="#111"
              aria-hidden="true"
              focusable="false"
              style="fill:#111;height:42px;width:42px"
              viewBox="0 0 24 24"
            >
              <path
                fill="#111"
                d="M16.432 6.326a5 5 0 0 0-.763.061l1.55.682zm.574.264l.869.741l.976-.453a5.2 5.2 0 0 0-1.845-.288m-12.884.138a5.2 5.2 0 0 0-2.59 1.41A5.2 5.2 0 0 0 .136 10.65l.096-.01A5.2 5.2 0 0 0 0 12.184q0 .404.06.795l.185-.122a5.18 5.18 0 0 0 1.462 2.85A5.2 5.2 0 0 0 3.7 16.955l.153-2.614a2.6 2.6 0 0 1-.431-.35a2.78 2.78 0 0 1-.823-1.984c0-.35.065-.692.19-1.011l-.134.075a2.8 2.8 0 0 1 .526-.803l-.241-.053a3 3 0 0 1 .305-.364c.244-.244.539-.437.862-.572l.049.495a3 3 0 0 1 .378-.179a2.9 2.9 0 0 1 1.234-.185h.001c.488.032.955.185 1.35.439q.235.15.432.348l5.94 5.706a5.1 5.1 0 0 0 2.812 1.438l.096.278q.376.055.765.055c.763 0 1.5-.164 2.173-.472l-2.352-1.983a2.9 2.9 0 0 1-1.183-.333l-.114-.327a2.6 2.6 0 0 1-.5-.389l-5.94-5.704a5.1 5.1 0 0 0-1.767-1.152L7.47 7.31a5.3 5.3 0 0 0-1.895-.35c-.495 0-.98.07-1.443.203zm12.444.266a5.2 5.2 0 0 0-3.103 1.501l-1.49 1.432l1.745 1.685l1.441-1.387a2.83 2.83 0 0 1 1.974-.842h.067c.735.01 1.424.3 1.942.82c.53.53.823 1.235.823 1.983a2.8 2.8 0 0 1-.23 1.113l.215-.013a2.8 2.8 0 0 1-.631.967a2.8 2.8 0 0 1-2.181.79l2.368 1.987a5.2 5.2 0 0 0 1.527-1.062a5.2 5.2 0 0 0 1.48-2.963l-.19.01c.089-.56.071-.982.047-1.27l-4.46-4.04l.018-.015l-.032.007zm2.401.196l-.796.513l4.465 4.105a5.2 5.2 0 0 0-1.518-3.318a5.2 5.2 0 0 0-2.15-1.3M3.833 10.31q.045.345.135.68l.548-.104zm19.147 1.96l.116.99a8 8 0 0 0 .4-.784zm-13.967.495L7.58 14.144a2.8 2.8 0 0 1-1.474.776a3 3 0 0 1-.537.05c-.563 0-1.11-.167-1.564-.47l-.164 2.618a5.2 5.2 0 0 0 2.425.247l.514-.611l2.579-.958l1.401-1.344ZM24 13.126l-1.092.857l.844-.282q.146-.28.248-.575m-7.446 1.053l.004.558l.69-.57a5 5 0 0 0-.694.011zm-6.487 1.694l-2.619.983l.569.399a5.2 5.2 0 0 0 1.866-1.205Zm-3.226 1.07l-.575.684a5 5 0 0 0 .68-.136z"
              />
            </svg>
          </span>
        </a>
        <div class="flex gap-3">
          <!-- <button type="button" class="signin-badge">
            <span class="flex items-center gap-1">
              <span>{{ t('auth.signingInto') }} </span>
              <span class="font-medium">SuperCocmos</span>
            </span>
          </button> -->
        </div>
      </div>

      <!-- 中间内容 -->
      <div class="flex h-full flex-grow flex-col items-center justify-center px-5 py-4">
        <SignInUi />
      </div>

      <!-- 底部条款 -->
      <div class="pb-6">
        <div class="p-4">
          <p class="text-xs footer-text text-center">
            <span>继续即表示您同意 </span>
            <a class="footer-link" target="_blank" href="https://openai.com/policies/terms-of-use">服务条款</a>
            <span> 和 </span>
            <a class="footer-link" target="_blank" href="https://openai.com/policies/privacy-policy">隐私政策</a>
          </p>
        </div>
      </div>
    </div>

    <!-- 右边深色背景部分 -->
    <div class="right-panel">
      <!-- SVG Logo -->
      <div class="right-panel-content">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="currentColor"
          viewBox="0 0 24 24"
          class="logo-watermark"
        >
          <path
            fill="currentColor"
            d="M16.432 6.326a5 5 0 0 0-.763.061l1.55.682zm.574.264l.869.741l.976-.453a5.2 5.2 0 0 0-1.845-.288m-12.884.138a5.2 5.2 0 0 0-2.59 1.41A5.2 5.2 0 0 0 .136 10.65l.096-.01A5.2 5.2 0 0 0 0 12.184q0 .404.06.795l.185-.122a5.18 5.18 0 0 0 1.462 2.85A5.2 5.2 0 0 0 3.7 16.955l.153-2.614a2.6 2.6 0 0 1-.431-.35a2.78 2.78 0 0 1-.823-1.984c0-.35.065-.692.19-1.011l-.134.075a2.8 2.8 0 0 1 .526-.803l-.241-.053a3 3 0 0 1 .305-.364c.244-.244.539-.437.862-.572l.049.495a3 3 0 0 1 .378-.179a2.9 2.9 0 0 1 1.234-.185h.001c.488.032.955.185 1.35.439q.235.15.432.348l5.94 5.706a5.1 5.1 0 0 0 2.812 1.438l.096.278q.376.055.765.055c.763 0 1.5-.164 2.173-.472l-2.352-1.983a2.9 2.9 0 0 1-1.183-.333l-.114-.327a2.6 2.6 0 0 1-.5-.389l-5.94-5.704a5.1 5.1 0 0 0-1.767-1.152L7.47 7.31a5.3 5.3 0 0 0-1.895-.35c-.495 0-.98.07-1.443.203zm12.444.266a5.2 5.2 0 0 0-3.103 1.501l-1.49 1.432l1.745 1.685l1.441-1.387a2.83 2.83 0 0 1 1.974-.842h.067c.735.01 1.424.3 1.942.82c.53.53.823 1.235.823 1.983a2.8 2.8 0 0 1-.23 1.113l.215-.013a2.8 2.8 0 0 1-.631.967a2.8 2.8 0 0 1-2.181.79l2.368 1.987a5.2 5.2 0 0 0 1.527-1.062a5.2 5.2 0 0 0 1.48-2.963l-.19.01c.089-.56.071-.982.047-1.27l-4.46-4.04l.018-.015l-.032.007zm2.401.196l-.796.513l4.465 4.105a5.2 5.2 0 0 0-1.518-3.318a5.2 5.2 0 0 0-2.15-1.3M3.833 10.31q.045.345.135.68l.548-.104zm19.147 1.96l.116.99a8 8 0 0 0 .4-.784zm-13.967.495L7.58 14.144a2.8 2.8 0 0 1-1.474.776a3 3 0 0 1-.537.05c-.563 0-1.11-.167-1.564-.47l-.164 2.618a5.2 5.2 0 0 0 2.425.247l.514-.611l2.579-.958l1.401-1.344ZM24 13.126l-1.092.857l.844-.282q.146-.28.248-.575m-7.446 1.053l.004.558l.69-.57a5 5 0 0 0-.694.011zm-6.487 1.694l-2.619.983l.569.399a5.2 5.2 0 0 0 1.866-1.205Zm-3.226 1.07l-.575.684a5 5 0 0 0 .68-.136z"
          />
        </svg>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
// 左侧面板
.left-panel {
  background-color: white;
  max-width: 50%;
}

// 右侧面板
.right-panel {
  display: none;
  background: #080808;
  position: relative;
  overflow: hidden;
}

.right-panel-content {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
  position: relative;
  z-index: 20;
}

.logo-watermark {
  width: 400px;
  height: 400px;
  opacity: 0.3;
  color: white;
  filter: drop-shadow(0 0 40px rgba(255, 255, 255, 0.3));
  animation: logoGlow 4s ease-in-out infinite;
}

@keyframes logoGlow {
  0%,
  100% {
    filter: drop-shadow(0 0 40px rgba(255, 255, 255, 0.3));
    opacity: 0.3;
  }
  50% {
    filter: drop-shadow(0 0 60px rgba(255, 255, 255, 0.5));
    opacity: 0.4;
  }
}

// 行星容器
.planet-container {
  position: absolute;
  right: -100px;
  top: 50%;
  transform: translateY(-50%);
  width: 400px;
  height: 400px;
  z-index: 10;
}

// 行星核心
.planet {
  position: relative;
  width: 100%;
  height: 100%;
  animation: planetFloat 6s ease-in-out infinite;
}

@keyframes planetFloat {
  0%,
  100% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-20px) scale(1.02);
  }
}

// 行星发光层
.planet-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 250px;
  height: 250px;
  border-radius: 50%;
  background: radial-gradient(
    circle at 40% 40%,
    rgba(255, 255, 255, 0.8) 0%,
    rgba(230, 230, 230, 0.6) 20%,
    rgba(200, 200, 200, 0.4) 40%,
    rgba(150, 150, 150, 0.2) 60%,
    transparent 80%
  );
  filter: blur(20px);
  animation: planetPulse 4s ease-in-out infinite;
}

@keyframes planetPulse {
  0%,
  100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.8;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.1);
    opacity: 1;
  }
}

// 行星实体
.planet-core {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 200px;
  height: 200px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #ffffff 0%, #e8e8e8 30%, #d0d0d0 50%, #a0a0a0 70%, #707070 100%);
  box-shadow:
    inset -30px -30px 60px rgba(0, 0, 0, 0.3),
    inset 10px 10px 40px rgba(255, 255, 255, 0.2),
    0 0 80px rgba(255, 255, 255, 0.6),
    0 0 120px rgba(255, 255, 255, 0.4);
  animation: planetRotate 20s linear infinite;
}

@keyframes planetRotate {
  from {
    background-position: 0% 0%;
  }
  to {
    background-position: 200% 0%;
  }
}

@keyframes raysShimmer {
  0%,
  100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
}

// 顶部徽章
.signin-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 16px;
  border-radius: 9999px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  background-color: transparent;
  font-size: 14px;
  color: #333;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }
}

// 按钮基础样式
.auth-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 100%;
  min-height: 40px;
  padding: 8px 16px;
  border-radius: 9999px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid;

  &:focus {
    outline: 2px solid;
    outline-offset: 2px;
  }
}

// 主要按钮（黑色背景）
.primary-btn {
  background-color: #000;
  color: white;
  border-color: #000;

  &:hover {
    background-color: #333;
    border-color: #333;
  }

  &:focus {
    outline-color: #000;
  }
}

// 次要按钮（白色背景，边框）
.secondary-btn {
  background-color: transparent;
  color: #000;
  border-color: rgba(0, 0, 0, 0.15);

  &:hover {
    background-color: rgba(0, 0, 0, 0.05);
  }

  &:focus {
    outline-color: rgba(0, 0, 0, 0.5);
  }
}

// 分割线
.divider-line {
  height: 1px;
  width: 100%;
  border: 0;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

// 底部文本
.footer-text {
  color: rgba(0, 0, 0, 0.6);
}

.footer-link {
  color: #000;
  text-decoration: underline;
  text-underline-offset: 2px;

  &:hover {
    text-decoration: none;
  }
}

// 响应式设计
@media (min-width: 768px) {
  .left-panel {
    max-width: 50%;
  }

  .right-panel {
    display: block;
    flex: 1;
  }
}

@media (max-width: 767px) {
  .left-panel {
    max-width: 100%;
  }
}

// Auth0 组件容器
.auth0-container {
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
}

// 底部切换区域
.auth-footer {
  text-align: center;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

// 加载状态样式
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 60px 20px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-top-color: #000;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-text {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.6);
}

// 调试信息样式
.debug-info {
  padding: 24px;
  background-color: #fff3cd;
  border: 2px solid #ffc107;
  border-radius: 12px;
  margin-bottom: 20px;

  h3 {
    font-size: 18px;
    font-weight: 600;
    color: #856404;
    margin-bottom: 12px;
  }

  p {
    font-size: 14px;
    color: #856404;
    margin: 8px 0;
  }
}

// 已登录提示样式
.signed-in-info {
  padding: 48px 32px;
  background-color: #f8f9fa;
  border-radius: 16px;
  text-align: center;

  h2 {
    font-size: 24px;
    font-weight: 600;
    color: #000;
    margin-bottom: 16px;
  }

  .user-email {
    font-size: 16px;
    color: rgba(0, 0, 0, 0.7);
    margin-bottom: 32px;
    font-weight: 500;
  }

  .action-buttons {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 24px;
  }

  .tip-text {
    font-size: 13px;
    color: rgba(0, 0, 0, 0.5);
    margin-top: 16px;
  }
}
</style>
