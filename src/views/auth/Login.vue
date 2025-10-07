<script setup lang='ts'>
import { ref } from 'vue'
import EmailSignupForm from './components/EmailSignupForm.vue'
import EmailLoginForm from './components/EmailLoginForm.vue'
import { t } from '@/locales'

const isLogin = ref(true) // true: 登录模式, false: 注册模式
const currentView = ref<'methods' | 'email-login' | 'email-signup'>('methods') // 当前视图

// 切换登录/注册模式
function toggleMode() {
  isLogin.value = !isLogin.value
  currentView.value = 'methods' // 重置到方法选择页面
}

// 显示邮箱登录表单
function showEmailLogin() {
  currentView.value = 'email-login'
}

// 显示邮箱注册表单
function showEmailSignup() {
  currentView.value = 'email-signup'
}

// 返回方法选择页面
function backToMethods() {
  currentView.value = 'methods'
}

// 从登录切换到注册
function switchToSignup() {
  currentView.value = 'email-signup'
}
</script>

<template>
  <div class="flex" style="height: 100vh; width: 100%;">
    <!-- 左边登录部分 -->
    <div class="flex h-full w-full flex-col overflow-y-auto left-panel">
      <!-- 顶部导航 -->
      <div class="flex w-full items-center justify-between p-5">
        <a class="flex items-center" title="Home" href="/">
          <span class="inline-flex items-center justify-center p-0 m-0" style="height:42px;width:42px">
            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" aria-hidden="true" focusable="false"
              style="fill:currentColor;height:42px;width:42px" viewBox="0 0 24 24">
              <path fill="currentColor"
                d="M16.432 6.326a5 5 0 0 0-.763.061l1.55.682zm.574.264l.869.741l.976-.453a5.2 5.2 0 0 0-1.845-.288m-12.884.138a5.2 5.2 0 0 0-2.59 1.41A5.2 5.2 0 0 0 .136 10.65l.096-.01A5.2 5.2 0 0 0 0 12.184q0 .404.06.795l.185-.122a5.18 5.18 0 0 0 1.462 2.85A5.2 5.2 0 0 0 3.7 16.955l.153-2.614a2.6 2.6 0 0 1-.431-.35a2.78 2.78 0 0 1-.823-1.984c0-.35.065-.692.19-1.011l-.134.075a2.8 2.8 0 0 1 .526-.803l-.241-.053a3 3 0 0 1 .305-.364c.244-.244.539-.437.862-.572l.049.495a3 3 0 0 1 .378-.179a2.9 2.9 0 0 1 1.234-.185h.001c.488.032.955.185 1.35.439q.235.15.432.348l5.94 5.706a5.1 5.1 0 0 0 2.812 1.438l.096.278q.376.055.765.055c.763 0 1.5-.164 2.173-.472l-2.352-1.983a2.9 2.9 0 0 1-1.183-.333l-.114-.327a2.6 2.6 0 0 1-.5-.389l-5.94-5.704a5.1 5.1 0 0 0-1.767-1.152L7.47 7.31a5.3 5.3 0 0 0-1.895-.35c-.495 0-.98.07-1.443.203zm12.444.266a5.2 5.2 0 0 0-3.103 1.501l-1.49 1.432l1.745 1.685l1.441-1.387a2.83 2.83 0 0 1 1.974-.842h.067c.735.01 1.424.3 1.942.82c.53.53.823 1.235.823 1.983a2.8 2.8 0 0 1-.23 1.113l.215-.013a2.8 2.8 0 0 1-.631.967a2.8 2.8 0 0 1-2.181.79l2.368 1.987a5.2 5.2 0 0 0 1.527-1.062a5.2 5.2 0 0 0 1.48-2.963l-.19.01c.089-.56.071-.982.047-1.27l-4.46-4.04l.018-.015l-.032.007zm2.401.196l-.796.513l4.465 4.105a5.2 5.2 0 0 0-1.518-3.318a5.2 5.2 0 0 0-2.15-1.3M3.833 10.31q.045.345.135.68l.548-.104zm19.147 1.96l.116.99a8 8 0 0 0 .4-.784zm-13.967.495L7.58 14.144a2.8 2.8 0 0 1-1.474.776a3 3 0 0 1-.537.05c-.563 0-1.11-.167-1.564-.47l-.164 2.618a5.2 5.2 0 0 0 2.425.247l.514-.611l2.579-.958l1.401-1.344ZM24 13.126l-1.092.857l.844-.282q.146-.28.248-.575m-7.446 1.053l.004.558l.69-.57a5 5 0 0 0-.694.011zm-6.487 1.694l-2.619.983l.569.399a5.2 5.2 0 0 0 1.866-1.205Zm-3.226 1.07l-.575.684a5 5 0 0 0 .68-.136z" />
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
        <!-- 视图1: 方法选择 -->
        <div v-if="currentView === 'methods'" class="mx-auto flex w-full flex-col gap-6" style="max-width: 320px;">
          <h1 class="tracking-tight text-2xl sm:text-3xl mb-6 text-center">
            {{ isLogin ? t('auth.login') : t('auth.createAccount') }}
          </h1>

          <!-- X 登录按钮 -->
          <button type="button" class="auth-btn primary-btn">
            <span class="inline-flex items-center justify-center p-0 m-0 w-5 h-5">
              <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"
                focusable="false" style="fill:currentColor">
                <path
                  d="M8 2H1l8.26 11.015L1.45 22H4.1l6.388-7.349L16 22h7l-8.608-11.478L21.8 2h-2.65l-5.986 6.886zm9 18L5 4h2l12 16z" />
              </svg>
            </span>
            <span>{{ isLogin ? t('auth.signInWithX') : t('auth.signUpWithX') }}</span>
          </button>

          <!-- 分割线 -->
          <div class="px-8 sm:px-12">
            <hr class="divider-line">
          </div>

          <!-- 其他登录方式 -->
          <div class="grid gap-4">
            <!-- 邮箱注册/登录 - 切换到邮箱表单组件 -->
            <button type="button" class="auth-btn secondary-btn"
              @click="isLogin ? showEmailLogin() : showEmailSignup()">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              <span>{{ isLogin ? t('auth.signInWithEmail') : t('auth.signUpWithEmail') }}</span>
            </button>

            <button type="button" class="auth-btn secondary-btn">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 22.773 24.773"
                fill="currentColor">
                <path
                  d="M15.769 0h.162c.13 1.606-.483 2.806-1.228 3.675-.731.863-1.732 1.7-3.351 1.573-.108-1.583.506-2.694 1.25-3.561C13.292.879 14.557.16 15.769 0M20.67 16.716v.045c-.455 1.378-1.104 2.559-1.896 3.655-.723.995-1.609 2.334-3.191 2.334-1.367 0-2.275-.879-3.676-.903-1.482-.024-2.297.735-3.652.926h-.462c-.995-.144-1.798-.932-2.383-1.642-1.725-2.098-3.058-4.808-3.306-8.276v-1.019c.105-2.482 1.311-4.5 2.914-5.478.846-.52 2.009-.963 3.304-.765.555.086 1.122.276 1.619.464.471.181 1.06.502 1.618.485.378-.011.754-.208 1.135-.347 1.116-.403 2.21-.865 3.652-.648 1.733.262 2.963 1.032 3.723 2.22-1.466.933-2.625 2.339-2.427 4.74.176 2.181 1.444 3.457 3.028 4.209" />
              </svg>
              <span>{{ isLogin ? t('auth.signInWithApple') : t('auth.signUpWithApple') }}</span>
            </button>

            <button type="button" class="auth-btn secondary-btn">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 32 32">
                <defs>
                  <path id="google-logo_svg__a"
                    d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4" />
                </defs>
                <clipPath id="google-logo_svg__b">
                  <use xlink:href="#google-logo_svg__a" />
                </clipPath>
                <path fill="#fbbc05" d="M0 37V11l17 13z" clip-path="url(#google-logo_svg__b)"
                  transform="matrix(.72727 0 0 .72727 -.955 -1.455)" />
                <path fill="#ea4335" d="m0 11 17 13 7-6.1L48 14V0H0z" clip-path="url(#google-logo_svg__b)"
                  transform="matrix(.72727 0 0 .72727 -.955 -1.455)" />
                <path fill="#34a853" d="m0 37 30-23 7.9 1L48 0v48H0z" clip-path="url(#google-logo_svg__b)"
                  transform="matrix(.72727 0 0 .72727 -.955 -1.455)" />
                <path fill="#4285f4" d="M48 48 17 24l-4-3 35-10z" clip-path="url(#google-logo_svg__b)"
                  transform="matrix(.72727 0 0 .72727 -.955 -1.455)" />
              </svg>
              <span>{{ isLogin ? t('auth.signInWithGoogle') : t('auth.signUpWithGoogle') }}</span>
            </button>
          </div>

          <!-- 切换登录/注册 -->
          <div class="text-center">
            <p class="text-sm footer-text">
              {{ isLogin ? t('auth.noAccount') : t('auth.hasAccount') }}
              <a class="footer-link" href="javascript:void(0)" @click="toggleMode">
                {{ isLogin ? t('auth.register') : t('auth.login') }}
              </a>
            </p>
          </div>
        </div>

        <!-- 视图2: 邮箱登录表单 -->
        <EmailLoginForm v-else-if="currentView === 'email-login'" @back="backToMethods"
          @switch-to-signup="switchToSignup" />

        <!-- 视图3: 邮箱注册表单 -->
        <EmailSignupForm v-else-if="currentView === 'email-signup'" @back="backToMethods" />
      </div>

      <!-- 底部条款 -->
      <div class="pb-6">
        <div class="p-4">
          <p class="text-xs footer-text text-center">
            <span>{{ t('auth.byContinuing') }} </span>
            <a class="footer-link" target="_blank" href="https://openai.com/policies/terms-of-use">{{
              t('auth.termsOfService') }}</a>
            <span> {{ t('auth.and') }} </span>
            <a class="footer-link" target="_blank" href="https://openai.com/policies/privacy-policy">{{
              t('auth.privacyPolicy') }}</a>
          </p>
        </div>
      </div>
    </div>

    <!-- 右边深色背景部分 -->
    <div class="right-panel">
      <div class="right-panel-content">
        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" class="logo-watermark">
          <path fill="currentColor"
            d="M16.432 6.326a5 5 0 0 0-.763.061l1.55.682zm.574.264l.869.741l.976-.453a5.2 5.2 0 0 0-1.845-.288m-12.884.138a5.2 5.2 0 0 0-2.59 1.41A5.2 5.2 0 0 0 .136 10.65l.096-.01A5.2 5.2 0 0 0 0 12.184q0 .404.06.795l.185-.122a5.18 5.18 0 0 0 1.462 2.85A5.2 5.2 0 0 0 3.7 16.955l.153-2.614a2.6 2.6 0 0 1-.431-.35a2.78 2.78 0 0 1-.823-1.984c0-.35.065-.692.19-1.011l-.134.075a2.8 2.8 0 0 1 .526-.803l-.241-.053a3 3 0 0 1 .305-.364c.244-.244.539-.437.862-.572l.049.495a3 3 0 0 1 .378-.179a2.9 2.9 0 0 1 1.234-.185h.001c.488.032.955.185 1.35.439q.235.15.432.348l5.94 5.706a5.1 5.1 0 0 0 2.812 1.438l.096.278q.376.055.765.055c.763 0 1.5-.164 2.173-.472l-2.352-1.983a2.9 2.9 0 0 1-1.183-.333l-.114-.327a2.6 2.6 0 0 1-.5-.389l-5.94-5.704a5.1 5.1 0 0 0-1.767-1.152L7.47 7.31a5.3 5.3 0 0 0-1.895-.35c-.495 0-.98.07-1.443.203zm12.444.266a5.2 5.2 0 0 0-3.103 1.501l-1.49 1.432l1.745 1.685l1.441-1.387a2.83 2.83 0 0 1 1.974-.842h.067c.735.01 1.424.3 1.942.82c.53.53.823 1.235.823 1.983a2.8 2.8 0 0 1-.23 1.113l.215-.013a2.8 2.8 0 0 1-.631.967a2.8 2.8 0 0 1-2.181.79l2.368 1.987a5.2 5.2 0 0 0 1.527-1.062a5.2 5.2 0 0 0 1.48-2.963l-.19.01c.089-.56.071-.982.047-1.27l-4.46-4.04l.018-.015l-.032.007zm2.401.196l-.796.513l4.465 4.105a5.2 5.2 0 0 0-1.518-3.318a5.2 5.2 0 0 0-2.15-1.3M3.833 10.31q.045.345.135.68l.548-.104zm19.147 1.96l.116.99a8 8 0 0 0 .4-.784zm-13.967.495L7.58 14.144a2.8 2.8 0 0 1-1.474.776a3 3 0 0 1-.537.05c-.563 0-1.11-.167-1.564-.47l-.164 2.618a5.2 5.2 0 0 0 2.425.247l.514-.611l2.579-.958l1.401-1.344ZM24 13.126l-1.092.857l.844-.282q.146-.28.248-.575m-7.446 1.053l.004.558l.69-.57a5 5 0 0 0-.694.011zm-6.487 1.694l-2.619.983l.569.399a5.2 5.2 0 0 0 1.866-1.205Zm-3.226 1.07l-.575.684a5 5 0 0 0 .68-.136z" />
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
  background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%);
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
}

.logo-watermark {
  width: 400px;
  height: 400px;
  opacity: 0.1;
  color: white;
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
</style>
