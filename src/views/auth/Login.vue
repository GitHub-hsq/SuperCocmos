<script setup lang='ts'>
import { ref } from 'vue'
import { t } from '@/locales'
import EmailSignupForm from './components/EmailSignupForm.vue'
import EmailLoginForm from './components/EmailLoginForm.vue'

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
          <span class="inline-flex items-center justify-center p-0 m-0" style="height:28px;width:28px">
            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false" style="fill:currentColor;height:28px;width:28px">
              <path d="m3.005 8.858 8.783 12.544h3.904L6.908 8.858zM6.905 15.825 3 21.402h3.907l1.951-2.788zM16.585 2l-6.75 9.64 1.953 2.79L20.492 2zM17.292 7.965v13.437h3.2V3.395z" />
            </svg>
          </span>
        </a>
        <div class="flex gap-3">
          <button type="button" class="signin-badge">
            <span class="flex items-center gap-1">
              <span>{{ t('auth.signingInto') }} </span>
              <span class="font-medium">ChatGPT</span>
            </span>
          </button>
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
              <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false" style="fill:currentColor">
                <path d="M8 2H1l8.26 11.015L1.45 22H4.1l6.388-7.349L16 22h7l-8.608-11.478L21.8 2h-2.65l-5.986 6.886zm9 18L5 4h2l12 16z" />
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
            <button type="button" class="auth-btn secondary-btn" @click="isLogin ? showEmailLogin() : showEmailSignup()">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              <span>{{ isLogin ? t('auth.signInWithEmail') : t('auth.signUpWithEmail') }}</span>
            </button>

            <button type="button" class="auth-btn secondary-btn">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 22.773 24.773" fill="currentColor">
                <path d="M15.769 0h.162c.13 1.606-.483 2.806-1.228 3.675-.731.863-1.732 1.7-3.351 1.573-.108-1.583.506-2.694 1.25-3.561C13.292.879 14.557.16 15.769 0M20.67 16.716v.045c-.455 1.378-1.104 2.559-1.896 3.655-.723.995-1.609 2.334-3.191 2.334-1.367 0-2.275-.879-3.676-.903-1.482-.024-2.297.735-3.652.926h-.462c-.995-.144-1.798-.932-2.383-1.642-1.725-2.098-3.058-4.808-3.306-8.276v-1.019c.105-2.482 1.311-4.5 2.914-5.478.846-.52 2.009-.963 3.304-.765.555.086 1.122.276 1.619.464.471.181 1.06.502 1.618.485.378-.011.754-.208 1.135-.347 1.116-.403 2.21-.865 3.652-.648 1.733.262 2.963 1.032 3.723 2.22-1.466.933-2.625 2.339-2.427 4.74.176 2.181 1.444 3.457 3.028 4.209" />
              </svg>
              <span>{{ isLogin ? t('auth.signInWithApple') : t('auth.signUpWithApple') }}</span>
            </button>

            <button type="button" class="auth-btn secondary-btn">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 32 32">
                <defs>
                  <path id="google-logo_svg__a" d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4" />
                </defs>
                <clipPath id="google-logo_svg__b">
                  <use xlink:href="#google-logo_svg__a" />
                </clipPath>
                <path fill="#fbbc05" d="M0 37V11l17 13z" clip-path="url(#google-logo_svg__b)" transform="matrix(.72727 0 0 .72727 -.955 -1.455)" />
                <path fill="#ea4335" d="m0 11 17 13 7-6.1L48 14V0H0z" clip-path="url(#google-logo_svg__b)" transform="matrix(.72727 0 0 .72727 -.955 -1.455)" />
                <path fill="#34a853" d="m0 37 30-23 7.9 1L48 0v48H0z" clip-path="url(#google-logo_svg__b)" transform="matrix(.72727 0 0 .72727 -.955 -1.455)" />
                <path fill="#4285f4" d="M48 48 17 24l-4-3 35-10z" clip-path="url(#google-logo_svg__b)" transform="matrix(.72727 0 0 .72727 -.955 -1.455)" />
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
        <EmailLoginForm 
          v-else-if="currentView === 'email-login'" 
          @back="backToMethods"
          @switch-to-signup="switchToSignup"
        />

        <!-- 视图3: 邮箱注册表单 -->
        <EmailSignupForm 
          v-else-if="currentView === 'email-signup'" 
          @back="backToMethods"
        />
      </div>

      <!-- 底部条款 -->
      <div class="pb-6">
        <div class="p-4">
          <p class="text-xs footer-text text-center">
            <span>{{ t('auth.byContinuing') }} </span>
            <a class="footer-link" target="_blank" href="https://openai.com/policies/terms-of-use">{{ t('auth.termsOfService') }}</a>
            <span> {{ t('auth.and') }} </span>
            <a class="footer-link" target="_blank" href="https://openai.com/policies/privacy-policy">{{ t('auth.privacyPolicy') }}</a>
          </p>
        </div>
      </div>
    </div>

    <!-- 右边深色背景部分 -->
    <div class="right-panel">
      <div class="right-panel-content">
        <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" class="logo-watermark">
          <path d="m3.005 8.858 8.783 12.544h3.904L6.908 8.858zM6.905 15.825 3 21.402h3.907l1.951-2.788zM16.585 2l-6.75 9.64 1.953 2.79L20.492 2zM17.292 7.965v13.437h3.2V3.395z" />
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
