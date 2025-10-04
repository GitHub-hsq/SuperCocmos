<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { useAuthStore } from '@/store'
import { t } from '@/locales'

// 定义 emit
const emit = defineEmits<{
  (e: 'back'): void
  (e: 'switchToSignup'): void
}>()
const router = useRouter()
const ms = useMessage()
const authStore = useAuthStore()

// 当前步骤: 'email' | 'password'
const currentStep = ref<'email' | 'password'>('email')
const loading = ref(false)

// 表单数据
const email = ref('')
const password = ref('')
const passwordVisible = ref(false)

// 错误信息
const emailError = ref('')
const passwordError = ref('')

// 邮箱验证
function validateEmail(value: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(value)
}

// 步骤1: 提交邮箱（前端模拟验证邮箱是否存在）
async function handleEmailSubmit() {
  emailError.value = ''

  if (!email.value) {
    emailError.value = t('auth.emailRequired')
    return
  }

  if (!validateEmail(email.value)) {
    emailError.value = t('auth.emailInvalid')
    return
  }

  loading.value = true

  // 前端模拟：检查邮箱是否已注册
  // TODO: 调用后端 API 验证邮箱是否存在
  // const response = await fetch('/api/check-email', { method: 'POST', body: JSON.stringify({ email: email.value }) })

  setTimeout(() => {
    // 模拟验证成功
    // console.log('========================================')
    // console.log('✅ 邮箱验证')
    // console.log('========================================')
    // console.log(`邮箱: ${email.value}`)
    // console.log('状态: 已注册')
    // console.log('========================================')

    ms.success(t('auth.emailVerified'))
    currentStep.value = 'password'
    loading.value = false

    // 自动聚焦密码输入框
    setTimeout(() => {
      const passwordInput = document.querySelector('input[name="password"]') as HTMLInputElement
      passwordInput?.focus()
    }, 100)
  }, 1000)
}

// 步骤2: 密码登录
async function handlePasswordSubmit() {
  passwordError.value = ''

  if (!password.value) {
    passwordError.value = t('auth.passwordRequired')
    return
  }

  loading.value = true

  // 前端模拟：密码登录
  // TODO: 调用后端 API 进行登录验证
  // const response = await fetch('/api/login', { method: 'POST', body: JSON.stringify({ email, password }) })

  setTimeout(() => {
    // console.log('========================================')
    // console.log('🎉 登录成功!')
    // console.log('========================================')
    // console.log(`邮箱: ${email.value}`)
    // console.log(`密码: ${'*'.repeat(password.value.length)}`)
    // console.log('========================================')

    // 模拟用户数据
    const mockUser = {
      id: `user_${Date.now()}`,
      email: email.value,
      nickname: email.value.split('@')[0],
      createdAt: new Date().toISOString(),
    }

    const mockToken = btoa(`${mockUser.id}-${Date.now()}`)

    ms.success(t('auth.loginSuccess'))

    // 保存用户信息
    authStore.setUserInfo(mockUser as any)
    authStore.setToken(mockToken)

    loading.value = false

    // 跳转到聊天页面
    router.push('/chat')
  }, 1000)
}

// 返回上一步
function goBack() {
  if (currentStep.value === 'password') {
    currentStep.value = 'email'
    password.value = ''
    passwordError.value = ''
  }
  else {
    // 触发父组件切换回方法选择
    emit('back')
  }
}

// 切换到注册页面
function goToSignup() {
  emit('switchToSignup')
}
</script>

<template>
  <div class="email-login-form">
    <!-- 步骤1: 邮箱输入 -->
    <div v-if="currentStep === 'email'" class="form-step">
      <h1 class="form-title">
        {{ t('auth.loginWithEmail') }}
      </h1>
      <form @submit.prevent="handleEmailSubmit">
        <div class="form-field">
          <label class="form-label">{{ t('auth.emailLabel') }}</label>
          <input
            v-model="email"
            class="form-input"
            type="email"
            name="email"
            autocomplete="email"
            :placeholder="t('auth.emailPlaceholder')"
          >
          <p class="error-message">
            {{ emailError }}
          </p>
        </div>
        <div class="form-actions">
          <button type="submit" class="auth-btn primary-btn" :disabled="loading">
            {{ loading ? t('common.loading') : t('auth.next') }}
          </button>
          <button type="button" class="auth-btn secondary-btn" @click="goBack">
            {{ t('auth.goBack') }}
          </button>
        </div>
      </form>
      <div class="text-center">
        <p class="text-sm footer-text">
          {{ t('auth.noAccount') }}
          <a class="footer-link" href="javascript:void(0)" @click="goToSignup">
            {{ t('auth.register') }}
          </a>
        </p>
      </div>
    </div>

    <!-- 步骤2: 密码输入 -->
    <div v-else-if="currentStep === 'password'" class="form-step">
      <h1 class="form-title">
        {{ t('auth.loginWithEmail') }}
      </h1>
      <form @submit.prevent="handlePasswordSubmit">
        <div class="form-fields">
          <!-- 邮箱（只读） -->
          <div class="form-field">
            <label class="form-label">{{ t('auth.emailLabel') }}</label>
            <input
              v-model="email"
              class="form-input"
              type="email"
              name="email"
              autocomplete="email"
              readonly
            >
          </div>

          <!-- 密码 -->
          <div class="form-field">
            <label class="form-label">
              <div class="flex items-center justify-between">
                <span>{{ t('auth.passwordLabel') }}</span>
                <a href="javascript:void(0)" tabindex="-1" class="text-xs footer-text hover:underline">
                  {{ t('auth.forgotPassword') }}
                </a>
              </div>
            </label>
            <div class="input-with-icon">
              <input
                v-model="password"
                class="form-input"
                :type="passwordVisible ? 'text' : 'password'"
                name="password"
                autocomplete="current-password"
                :placeholder="t('auth.passwordPlaceholder')"
              >
              <button type="button" class="password-toggle" @click="passwordVisible = !passwordVisible">
                <svg v-if="!passwordVisible" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.883 19.297A10.95 10.95 0 0 1 12 21c-5.392 0-9.878-3.88-10.818-9A11 11 0 0 1 4.52 5.935L1.394 2.808l1.414-1.414 19.799 19.798-1.414 1.415zM5.936 7.35A8.97 8.97 0 0 0 3.223 12a9.005 9.005 0 0 0 13.201 5.838l-2.028-2.028A4.5 4.5 0 0 1 8.19 9.604zm6.978 6.978-3.242-3.241a2.5 2.5 0 0 0 3.241 3.241m7.893 2.265-1.431-1.431A8.9 8.9 0 0 0 20.778 12 9.005 9.005 0 0 0 9.552 5.338L7.974 3.76C9.221 3.27 10.58 3 12 3c5.392 0 9.878 3.88 10.819 9a10.95 10.95 0 0 1-2.012 4.593m-9.084-9.084Q11.86 7.5 12 7.5a4.5 4.5 0 0 1 4.492 4.778z" />
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 5c-7.633 0-9.927 6.617-9.948 6.684L1.946 12l.105.316C2.073 12.383 4.367 19 12 19s9.927-6.617 9.948-6.684l.106-.316-.105-.316C21.927 11.617 19.633 5 12 5zm0 11c-2.206 0-4-1.794-4-4s1.794-4 4-4 4 1.794 4 4-1.794 4-4 4z" />
                  <path d="M12 10c-1.084 0-2 .916-2 2s.916 2 2 2 2-.916 2-2-.916-2-2-2z" />
                </svg>
              </button>
            </div>
            <p class="error-message">
              {{ passwordError }}
            </p>
          </div>
        </div>

        <div class="form-actions">
          <button type="submit" class="auth-btn primary-btn" :disabled="loading">
            {{ loading ? t('common.loading') : t('auth.login') }}
          </button>
          <button type="button" class="auth-btn secondary-btn" @click="goBack">
            {{ t('auth.goBack') }}
          </button>
        </div>
      </form>
      <div class="text-center">
        <p class="text-sm footer-text">
          {{ t('auth.noAccount') }}
          <a class="footer-link" href="javascript:void(0)" @click="goToSignup">
            {{ t('auth.register') }}
          </a>
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.email-login-form {
  width: 100%;
  max-width: 320px;
  margin: 0 auto;
}

.form-step {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-title {
  font-size: 24px;
  font-weight: 600;
  text-align: center;
  margin-bottom: 32px;
  color: #000;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-fields {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-label {
  font-size: 14px;
  font-weight: 400;
  color: #000;
}

.form-input {
  width: 100%;
  height: 40px;
  padding: 8px 12px;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 6px;
  font-size: 14px;
  color: #000;
  background-color: white;
  transition: all 0.2s;

  &:hover:not(:read-only) {
    border-color: rgba(0, 0, 0, 0.25);
  }

  &:focus {
    outline: none;
    border-color: #000;
    box-shadow: 0 0 0 1px #000;
  }

  &:read-only {
    background-color: rgba(0, 0, 0, 0.05);
    cursor: not-allowed;
  }

  &::placeholder {
    color: rgba(0, 0, 0, 0.4);
  }
}

.input-with-icon {
  position: relative;

  .form-input {
    padding-right: 40px;
  }
}

.password-toggle {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  cursor: pointer;
  color: rgba(0, 0, 0, 0.5);
  padding: 0;
  border: none;
  background: none;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: rgba(0, 0, 0, 0.8);
  }
}

.error-message {
  font-size: 12px;
  color: #dc2626;
  min-height: 20px;
}

.form-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
}

.auth-btn {
  width: 100%;
  min-height: 40px;
  padding: 8px 16px;
  border-radius: 9999px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.primary-btn {
  background-color: #000;
  color: white;
  border-color: #000;

  &:hover:not(:disabled) {
    background-color: #333;
  }
}

.secondary-btn {
  background-color: transparent;
  color: #000;
  border-color: rgba(0, 0, 0, 0.15);

  &:hover:not(:disabled) {
    background-color: rgba(0, 0, 0, 0.05);
  }
}

.footer-text {
  color: rgba(0, 0, 0, 0.6);
}

.footer-link {
  color: #000;
  text-decoration: none;
  font-weight: 500;

  &:hover {
    text-decoration: underline;
  }
}

.text-center {
  text-align: center;
}

.text-sm {
  font-size: 14px;
}

.text-xs {
  font-size: 12px;
}

.flex {
  display: flex;
}

.items-center {
  align-items: center;
}

.justify-between {
  justify-content: space-between;
}
</style>
