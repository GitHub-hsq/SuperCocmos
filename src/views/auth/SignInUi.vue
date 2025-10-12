<script setup lang="ts">
import { SignIn } from '@clerk/vue'

const forceRedirectUrl = import.meta.env.VITE_CLERK_SIGN_IN_FORCE_REDIRECT_URL
</script>

<style>
/* 自定义样式类 - 用于 :appearance 配置 - SignIn 页面专用 */

/* 容器 */
.signin-root-box {
  width: 100%;
  max-width: 100%;
}

.signin-card {
  padding-left: 10px;
  padding-right: 10px;
  padding-bottom: 16px;
}

.signin-card-box,
.signin-card {
  background: transparent;
  box-shadow: none;
  border: none;
  padding-top: 0;
}

.signin-footer {
  background: transparent;
  border-top: none;
  box-shadow: none;
}

/* 标题 */
.signin-header-title {
  font-size: 0;
  font-weight: 500;
  color: #111827;
  text-align: center;
  margin-bottom: 2.5rem;
}

.signin-header-title::before {
  content: "Log into your account" !important;
  font-size: 1.875rem;
  display: block;
  letter-spacing: -0.025em;
}

.signin-header-subtitle {
  display: none;
}

/* 社交按钮容器 - 垂直排列 */
.signin-social-buttons-root {
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
.signin-social-button {
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

.signin-social-button:hover {
  background-color: rgba(0, 0, 0, 0.05);
  box-shadow: none !important;
}

.signin-social-button:focus {
  box-shadow: none !important;
}

.signin-social-button-text {
  font-weight: 400;
  font-size: 0.875rem;
}

/* 主按钮 - Continue 按钮为黑色背景 */
.signin-primary-button {
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

.signin-primary-button:hover {
  background-color: #1a1a1a;
  box-shadow: none !important;
}

.signin-primary-button:focus {
  box-shadow: none !important;
}

/* 隐藏 Continue 文字并用 Next 替换 */
.signin-primary-button span {
  font-size: 0 !important;
}

.signin-primary-button span::after {
  content: "Next";
  font-size: 0.95rem;
  font-weight: 500;
  letter-spacing: 0.08em;
}

/* 输入框 */
.signin-input {
  border: 1px solid #d1d5db;
  border-radius: 0;
  padding: 8px 12px;
  height: 35px;
  box-sizing: border-box;
}

.signin-input:focus {
  outline: none;
  border-color: #000000;
  box-shadow: 0 0 0 1.5px rgba(0, 0, 0, 0.1);
}

/* 分隔线 */
.signin-divider-line {
  background-color: #e5e7eb;
  height: 1px;
}

.signin-divider-text {
  color: #9ca3af;
  font-size: 0.875rem;
  padding: 0 1rem;
}

/* 标签 */
.signin-field-label {
  color: #374151;
  font-weight: 500;
  font-size: 0.875rem;
}

/* Footer 链接和文字 */
.signin-footer-link {
  font-size: 0.875rem;
  color: #000000;
  font-weight: 500;
  text-decoration: underline;
  text-decoration-color: transparent;
  transition: text-decoration-color 0.2s;
}

.signin-footer-link:hover {
  text-decoration-color: #000000;
}

.signin-footer-text {
  color: #6b7280;
  font-size: 0.875rem;
}

/* 编辑和重发按钮 */
.signin-link-button {
  color: #000000;
  font-weight: 500;
}

.signin-link-button:hover {
  text-decoration: underline;
}

/* 隐藏 Clerk 底部品牌 */
.cl-internal-1dauvpw {
  display: none;
}

/* 图标样式 */
.signin-github-icon,
.signin-social-icon {
  width: 20px;
  height: 20px;
  object-fit: contain;
  min-height: 20px;
  min-width: 20px;
}

.signin-github-text,
.signin-social-text {
  font-size: 0.875rem;
  font-weight: 400;
}

/* 最后登录提示样式 */
.signin-identity-preview {
  text-align: center;
  color: #6b7280;
  font-size: 0.875rem;
  margin-top: 1rem;
}

/* 错误提示 */
.signin-alert {
  border-radius: 0.5rem;
}

/* 隐藏箭头图标 */
svg.signin-button-arrow-icon,
.cl-buttonArrowIcon {
  display: none !important;
}

.signin-form-field-label-row {
  margin-bottom: 0;
}

.signin-footer-action {
  padding-top: 0;
}

.signin {
  display: none;
}

</style>

<template>
  <div class="flex items-center justify-center" style="background-color: #fff;">
    <div class="w-full max-w-md" style="width: 400px; min-width: 300px;">
            <!-- 尽量不要动下面这个，样式我改了三天！！ -->
      <SignIn
        :forceRedirectUrl="forceRedirectUrl"
        :appearance="{
          elements: {
            rootBox: 'signin-root-box',
            cardBox: 'signin-card-box',
            card: 'signin-card',
            footer: 'signin-footer',
            headerTitle: 'signin-header-title',
            headerSubtitle: 'signin-header-subtitle',
            socialButtonsRoot: 'signin-social-buttons-root',
            socialButtonsProviderIcon: 'signin-social-icon',
            socialButtonsBlockButtonText__github: 'signin-social-text',
            socialButtonsBlockButtonText__google: 'signin-social-text',
            socialButtonsBlockButtonText__oauth_apple: 'signin-social-text',
            formFieldLabelRow: 'signin-form-field-label-row',
            socialButtonsBlockButton: 'signin-social-button',
            socialButtonsBlockButtonText: 'signin-social-button-text',
            formButtonPrimary: 'signin-primary-button',
            formFieldInput: 'signin-input',
            dividerLine: 'signin-divider-line',
            dividerText: 'signin-divider-text',
            formFieldLabel: 'signin-field-label',
            footerActionLink: 'signin-footer-link',
            footerActionText: 'signin-footer-text',
            identityPreviewEditButton: 'signin-link-button',
            identityPreviewText: 'signin-identity-preview',
            formResendCodeLink: 'signin-link-button',
            otpCodeFieldInput: 'signin-input',
            buttonArrowIcon: 'signin-button-arrow-icon',
            footerAction: 'signin-footer-action',
            alert: 'signin-alert',
          },
        }"
      />
    </div>
  </div>
</template>
