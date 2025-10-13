<script setup lang="ts">
import { SignUp } from '@clerk/vue'

const forceRedirectUrl = import.meta.env.VITE_CLERK_SIGN_UP_FORCE_REDIRECT_URL
</script>

<template>
  <div class="flex items-center justify-center" style="background-color: #fff;">
    <div class="w-full max-w-md" style="width: 400px; min-width: 300px;">
      <!-- 尽量不要动下面这个，样式我改了三天！！ -->
      <SignUp
        :force-redirect-url="forceRedirectUrl"
        :appearance="{
          elements: {
            rootBox: 'signup-root-box',
            cardBox: 'signup-card-box',
            card: 'signup-card',
            footer: 'signup-footer',
            headerTitle: 'signup-header-title',
            headerSubtitle: 'signup-header-subtitle',
            socialButtonsRoot: 'signup-social-buttons-root',
            socialButtonsProviderIcon: 'signup-social-icon',
            socialButtonsBlockButtonText__github: 'signup-social-text',
            socialButtonsBlockButtonText__google: 'signup-social-text',
            socialButtonsBlockButtonText__oauth_apple: 'signup-social-text',
            formFieldLabelRow: 'signup-form-field-label-row',
            socialButtonsBlockButton: 'signup-social-button',
            socialButtonsBlockButtonText: 'signup-social-button-text',
            formButtonPrimary: 'signup-primary-button',
            formFieldInput: 'signup-input',
            dividerLine: 'signup-divider-line',
            dividerText: 'signup-divider-text',
            formFieldLabel: 'signup-field-label',
            footerActionLink: 'signup-footer-link',
            footerActionText: 'signup-footer-text',
            identityPreviewEditButton: 'signup-link-button',
            identityPreviewText: 'signup-identity-preview',
            formResendCodeLink: 'signup-link-button',
            otpCodeFieldInput: 'signup-input',
            buttonArrowIcon: 'signup-button-arrow-icon',
            footerAction: 'signup-footer-action',
            alert: 'signup-alert',
          },
        }"
      />
    </div>
  </div>
</template>

<style>
/* 自定义样式类 - 用于 :appearance 配置 - SignUp 页面专用 */

/* 容器 */
.signup-root-box {
  width: 100%;
  max-width: 100%;
}

.signup-card {
  padding-left: 10px;
  padding-right: 10px;
  padding-bottom: 16px;
}

.signup-card-box,
.signup-card {
  background: transparent;
  box-shadow: none;
  border: none;
  padding-top: 0;
}

.signup-footer {
  background: transparent;
  border-top: none;
  box-shadow: none;
}

/* 标题 */
.signup-header-title {
  font-size: 0;
  font-weight: 500;
  color: #111827;
  text-align: center;
  margin-bottom: 2.5rem;
}

.signup-header-title::before {
  content: 'Create your account';
  font-size: 1.875rem;
  display: block;
  letter-spacing: -0.025em;
}

.signup-header-subtitle {
  display: none;
}

/* 社交按钮容器 - 垂直排列 */
.signup-social-buttons-root {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
}

/* 强制覆盖 Clerk 的社交按钮容器样式 */
.cl-socialButtons {
  display: flex !important;
  flex-direction: column !important;
  gap: 0.75rem !important;
  width: 100% !important;
}

/* 社交按钮 - 通用样式 */
.signup-social-button {
  border: 1px solid rgba(0, 0, 0, 0.15);
  background-color: transparent;
  color: #111827;
  font-weight: 500;
  padding: 0.625rem 1rem;
  border-radius: 9999px;
  transition: all 0.2s;
  min-height: 2.5rem;
  box-shadow: none !important;
  filter: none !important;
  width: 100%;
}

.signup-social-button:hover {
  background-color: rgba(0, 0, 0, 0.05);
  box-shadow: none !important;
}

.signup-social-button:focus {
  box-shadow: none !important;
}

.signup-social-button-text {
  font-weight: 400;
  font-size: 0.875rem;
}

/* 主按钮 - Continue 按钮为黑色背景 */
.signup-primary-button {
  background-color: #080808;
  color: white;
  font-weight: 500;
  font-size: 0.95rem;
  padding: 0.625rem 1rem;
  border-radius: 9999px;
  transition: all 0.2s;
  min-height: 2.5rem;
  box-shadow: none !important;
  border: none;
}

.signup-primary-button:hover {
  background-color: #1a1a1a;
  box-shadow: none !important;
}

.signup-primary-button:focus {
  box-shadow: none !important;
}

/* 隐藏 Continue 文字并用 Next 替换 */
.signup-primary-button span {
  font-size: 0 !important;
}

.signup-primary-button span::after {
  content: 'Next';
  font-size: 0.95rem;
  font-weight: 500;
  letter-spacing: 0.08em;
}

/* 输入框 */
.signup-input {
  border: 1px solid #d1d5db;
  border-radius: 0;
  padding: 8px 12px;
  height: 35px;
  box-sizing: border-box;
}

.signup-input:focus {
  outline: none;
  border-color: #000000;
  box-shadow: 0 0 0 1.5px rgba(0, 0, 0, 0.1);
}

/* 分隔线 */
.signup-divider-line {
  background-color: #e5e7eb;
  height: 1px;
}

.signup-divider-text {
  color: #9ca3af;
  font-size: 0.875rem;
  padding: 0 1rem;
}

/* 标签 */
.signup-field-label {
  color: #374151;
  font-weight: 500;
  font-size: 0.875rem;
}

/* Footer 链接和文字 */
.signup-footer-link {
  font-size: 0.875rem;
  color: #000000;
  font-weight: 500;
  text-decoration: underline;
  text-decoration-color: transparent;
  transition: text-decoration-color 0.2s;
}

.signup-footer-link:hover {
  text-decoration-color: #000000;
}

.signup-footer-text {
  color: #6b7280;
  font-size: 0.875rem;
}

/* 编辑和重发按钮 */
.signup-link-button {
  color: #000000;
  font-weight: 500;
}

.signup-link-button:hover {
  text-decoration: underline;
}

/* 隐藏 Clerk 底部品牌 */
.cl-internal-1dauvpw {
  display: none;
}

/* 图标样式 */
.signup-github-icon,
.signup-social-icon {
  width: 20px;
  height: 20px;
  object-fit: contain;
  min-height: 20px;
  min-width: 20px;
}

.signup-github-text,
.signup-social-text {
  font-size: 0.875rem;
  font-weight: 400;
}

/* 最后登录提示样式 */
.signup-identity-preview {
  text-align: center;
  color: #6b7280;
  font-size: 0.875rem;
  margin-top: 1rem;
}

/* 错误提示 */
.signup-alert {
  border-radius: 0.5rem;
}

/* 隐藏箭头图标 */
svg.signup-button-arrow-icon,
.cl-buttonArrowIcon {
  display: none !important;
}

.signup-form-field-label-row {
  margin-bottom: 0;
}

.signup-footer-action {
  padding-top: 0;
}

.signin {
  display: none;
}
</style>
