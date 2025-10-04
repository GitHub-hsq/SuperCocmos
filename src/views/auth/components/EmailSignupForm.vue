<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { useAuthStore } from '@/store'
import { t } from '@/locales'

// 定义 emit
const emit = defineEmits<{
  (e: 'back'): void
}>()
const router = useRouter()
const ms = useMessage()
const authStore = useAuthStore()

// 当前步骤: 'email' | 'code' | 'info'
const currentStep = ref<'email' | 'code' | 'info'>('email')
const loading = ref(false)

// 表单数据
const email = ref('')
const verificationCode = ref('')
const nickname = ref('')
const password = ref('')
const passwordVisible = ref(false)

// 错误信息
const emailError = ref('')
const codeError = ref('')
const nicknameError = ref('')
const passwordError = ref('')

// 前端模拟：存储验证码
let generatedCode = ''

// 邮箱验证
function validateEmail(value: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(value)
}

// 密码验证：至少8位，至少1个大写字母，1个小写字母，1个数字，1个特殊字符
function validatePassword(value: string): boolean {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
  return passwordRegex.test(value)
}

// 昵称验证：至少2位，不能有特殊字符
function validateNickname(value: string): boolean {
  const nicknameRegex = /^[\u4E00-\u9FA5A-Za-z0-9]{2,}$/
  return nicknameRegex.test(value)
}

// 步骤1: 提交邮箱（前端模拟发送验证码）
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

  // 前端模拟：生成6位数字验证码
  generatedCode = Math.floor(100000 + Math.random() * 900000).toString()

  // 模拟网络延迟
  setTimeout(() => {
    // 在控制台输出验证码
    // console.log('========================================')
    // console.log('📧 验证码发送模拟')
    // console.log('========================================')
    // console.log(`收件人邮箱: ${email.value}`)
    // console.log(`验证码: ${generatedCode}`)
    // console.log('有效期: 5分钟')
    // console.log('========================================')

    ms.success(`${t('auth.verificationCodeSent')} (请查看控制台)`)
    currentStep.value = 'code'
    loading.value = false

    // 自动聚焦验证码输入框
    setTimeout(() => {
      const codeInput = document.querySelector('input[name="code"]') as HTMLInputElement
      codeInput?.focus()
    }, 100)
  }, 1000)
}

// 步骤2: 验证码自动验证（当输入6位时）
function handleCodeInput(value: string) {
  verificationCode.value = value
  codeError.value = ''

  if (value.length === 6) {
    loading.value = true

    // 模拟网络延迟
    setTimeout(() => {
      // 前端验证
      if (value === generatedCode) {
        // console.log('✅ 验证码验证成功!')
        ms.success(t('auth.verificationSuccess'))
        currentStep.value = 'info'
      }
      else {
        // console.log(`❌ 验证码错误! 输入: ${value}, 正确: ${generatedCode}`)
        codeError.value = t('auth.verificationFailed')
        verificationCode.value = ''
      }
      loading.value = false
    }, 500)
  }
}

// 步骤3: 完成注册（前端模拟）
async function handleCompleteSignup() {
  nicknameError.value = ''
  passwordError.value = ''

  if (!nickname.value) {
    nicknameError.value = t('auth.nicknameRequired')
    return
  }

  if (!validateNickname(nickname.value)) {
    nicknameError.value = t('auth.nicknameInvalid')
    return
  }

  if (!password.value) {
    passwordError.value = t('auth.passwordRequired')
    return
  }

  if (!validatePassword(password.value)) {
    passwordError.value = t('auth.passwordInvalid')
    return
  }

  loading.value = true

  // 模拟注册过程
  setTimeout(() => {
    // console.log('========================================')
    // console.log('🎉 注册成功!')
    // console.log('========================================')
    // console.log(`邮箱: ${email.value}`)
    // console.log(`昵称: ${nickname.value}`)
    // console.log(`密码: ${'*'.repeat(password.value.length)}`)
    // console.log('========================================')

    // 模拟用户数据
    const mockUser = {
      id: `user_${Date.now()}`,
      email: email.value,
      nickname: nickname.value,
      createdAt: new Date().toISOString(),
    }

    const mockToken = btoa(`${mockUser.id}-${Date.now()}`)

    ms.success(t('auth.signupComplete'))

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
  if (currentStep.value === 'code') {
    currentStep.value = 'email'
    verificationCode.value = ''
    codeError.value = ''
  }
  else if (currentStep.value === 'info') {
    // 从信息填写步骤直接返回到邮箱输入步骤
    currentStep.value = 'email'
    nickname.value = ''
    password.value = ''
    verificationCode.value = ''
    nicknameError.value = ''
    passwordError.value = ''
    codeError.value = ''
  }
  else if (currentStep.value === 'email') {
    // 触发父组件切换回方法选择
    emit('back')
  }
}
</script>

<template>
  <div class="email-signup-form">
    <!-- 步骤1: 邮箱输入 -->
    <div v-if="currentStep === 'email'" class="form-step">
      <h1 class="form-title">
        {{ t('auth.signUpWithEmail') }}
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
            {{ loading ? t('common.loading') : t('auth.continue') }}
          </button>
          <button type="button" class="auth-btn secondary-btn" @click="goBack">
            {{ t('auth.goBack') }}
          </button>
        </div>
      </form>
    </div>

    <!-- 步骤2: 验证码输入 -->
    <div v-else-if="currentStep === 'code'" class="form-step">
      <div class="form-header">
        <h1 class="form-title">
          {{ t('auth.verifyEmail') }}
        </h1>
        <p class="form-subtitle">
          <span>{{ t('auth.verifyEmailHint') }} </span>
          <span class="highlight">{{ email }}</span>
          <span>{{ t('auth.enterCodeBelow') }}</span>
        </p>
      </div>
      <form>
        <div class="code-input-wrapper">
          <input
            v-model="verificationCode"
            class="code-input"
            type="text"
            name="code"
            autocomplete="one-time-code"
            maxlength="6"
            pattern="[0-9]*"
            inputmode="numeric"
            :placeholder="t('auth.codePlaceholder')"
            @input="e => handleCodeInput((e.target as HTMLInputElement).value)"
          >
        </div>
        <p class="error-message center">
          {{ codeError }}
        </p>
        <div class="form-actions">
          <button type="button" class="auth-btn secondary-btn" @click="goBack">
            {{ t('auth.goBack') }}
          </button>
        </div>
      </form>
    </div>

    <!-- 步骤3: 信息填写 -->
    <div v-else-if="currentStep === 'info'" class="form-step">
      <div class="form-header">
        <h1 class="form-title">
          {{ t('auth.completeSignup') }}
        </h1>
        <div class="email-badge">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect width="20" height="16" x="2" y="4" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
          <span>{{ email }}</span>
        </div>
      </div>
      <form @submit.prevent="handleCompleteSignup">
        <div class="form-fields">
          <!-- 昵称 -->
          <div class="form-field">
            <label class="form-label">{{ t('auth.nicknameLabel') }}</label>
            <input
              v-model="nickname"
              class="form-input"
              type="text"
              name="nickname"
              :placeholder="t('auth.nicknamePlaceholder')"
            >
            <p class="error-message">
              {{ nicknameError }}
            </p>
          </div>

          <!-- 密码 -->
          <div class="form-field">
            <label class="form-label">{{ t('auth.passwordLabel') }}</label>
            <div class="input-with-icon">
              <input
                v-model="password"
                class="form-input"
                :type="passwordVisible ? 'text' : 'password'"
                name="password"
                autocomplete="new-password"
                :placeholder="t('auth.passwordPlaceholder')"
              >
              <button type="button" class="password-toggle" tabindex="-1" @click="passwordVisible = !passwordVisible">
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
            <p class="password-hint">
              {{ t('auth.passwordHint') }}
            </p>
          </div>
        </div>

        <div class="form-actions">
          <button type="submit" class="auth-btn primary-btn" :disabled="loading">
            {{ loading ? t('common.loading') : t('auth.completeSignupButton') }}
          </button>
          <button type="button" class="auth-btn secondary-btn" @click="goBack">
            {{ t('auth.goBack') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped lang="less">
.email-signup-form {
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

.form-subtitle {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.6);
  text-align: center;
  margin-top: 8px;
}

.highlight {
  font-weight: 600;
  color: #000;
}

.form-header {
  text-align: center;
}

.email-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 9999px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  background-color: white;
  font-size: 14px;
  color: #000;
  margin-top: 16px;
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

  &:hover {
    border-color: rgba(0, 0, 0, 0.25);
  }

  &:focus {
    outline: none;
    border-color: #000;
    box-shadow: 0 0 0 1px #000;
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
  outline: none;

  &:hover {
    color: rgba(0, 0, 0, 0.8);
  }

  &:focus {
    outline: none;
  }
}

// 禁用浏览器默认的密码显示/隐藏按钮
input[type="password"]::-ms-reveal,
input[type="password"]::-ms-clear {
  display: none;
}

input[type="password"]::-webkit-credentials-auto-fill-button,
input[type="password"]::-webkit-caps-lock-indicator {
  display: none;
}

.code-input-wrapper {
  display: flex;
  justify-content: center;
  margin: 24px 0;
}

.code-input {
  width: 200px;
  height: 48px;
  padding: 12px;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 6px;
  font-size: 24px;
  font-family: monospace;
  text-align: center;
  letter-spacing: 8px;
  color: #000;
  background-color: white;

  &:focus {
    outline: none;
    border-color: #000;
    box-shadow: 0 0 0 1px #000;
  }

  &::placeholder {
    color: rgba(0, 0, 0, 0.3);
    letter-spacing: normal;
    font-size: 14px;
    font-family: system-ui;
  }
}

.error-message {
  font-size: 12px;
  color: #dc2626;
  min-height: 20px;

  &.center {
    text-align: center;
  }
}

.password-hint {
  font-size: 11px;
  color: rgba(0, 0, 0, 0.5);
  line-height: 1.4;
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
</style>
