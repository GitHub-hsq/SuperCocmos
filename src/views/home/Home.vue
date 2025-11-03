<script setup lang="ts">
import { useAuth0 } from '@auth0/auth0-vue'
import { NButton, NCollapse, NCollapseItem } from 'naive-ui'
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import HomeHeader from '@/components/common/HomeHeader/index.vue'

const router = useRouter()
const { t } = useI18n()
const { loginWithRedirect, isAuthenticated, isLoading } = useAuth0()

// 检查是否是切换账号操作
onMounted(() => {
  const urlParams = new URLSearchParams(window.location.search)
  if (urlParams.has('switchAccount')) {
    // 清理 URL 参数
    window.history.replaceState({}, '', '/')
    // 自动触发登录
    setTimeout(() => {
      goToSignIn()
    }, 500)
  }
})

/**
 * 立即开始 - 跳转到 Auth0 登录或聊天页面
 */
function goToSignIn() {
  // 1. 等待 Auth0 初始化完成
  if (isLoading.value) {
    // 等待初始化完成后再次检查
    const checkInterval = setInterval(() => {
      if (!isLoading.value) {
        clearInterval(checkInterval)
        goToSignIn() // 递归调用，重新检查登录状态
      }
    }, 100)
    return
  }

  // 2. 如果已登录，直接进入聊天页面
  if (isAuthenticated.value) {
    router.push('/chat')
  }
  else {
    // 3. 未登录，跳转到 Auth0 登录页面
    loginWithRedirect({
      appState: {
        target: '/chat', // 登录成功后跳转到聊天页面
      },
      authorizationParams: {
        prompt: 'login', // 🔑 强制显示登录页面，允许切换账号
      },
    })
  }
}

function scrollToSection(sectionId: string) {
  const element = document.getElementById(sectionId)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' })
  }
}

const features = computed(() => [
  {
    icon: t('home.features.feature1.icon'),
    title: t('home.features.feature1.title'),
    description: t('home.features.feature1.description'),
  },
  {
    icon: t('home.features.feature2.icon'),
    title: t('home.features.feature2.title'),
    description: t('home.features.feature2.description'),
  },
  {
    icon: t('home.features.feature3.icon'),
    title: t('home.features.feature3.title'),
    description: t('home.features.feature3.description'),
  },
])

const workflowSteps = computed(() => [
  {
    number: t('home.workflow.step1.number'),
    title: t('home.workflow.step1.title'),
    description: t('home.workflow.step1.description'),
  },
  {
    number: t('home.workflow.step2.number'),
    title: t('home.workflow.step2.title'),
    description: t('home.workflow.step2.description'),
  },
  {
    number: t('home.workflow.step3.number'),
    title: t('home.workflow.step3.title'),
    description: t('home.workflow.step3.description'),
  },
])

const pricingPlans = computed(() => {
  const plans = [
    {
      name: 'Free',
      description: t('home.pricing.free.description'),
      price: t('home.pricing.free.price'),
      period: t('home.pricing.free.period'),
      features: [
        t('home.pricing.free.features.0'),
        t('home.pricing.free.features.1'),
        t('home.pricing.free.features.2'),
        t('home.pricing.free.features.3'),
      ],
      cta: t('home.pricing.free.cta'),
    },
    {
      name: 'Pro',
      description: t('home.pricing.pro.description'),
      price: t('home.pricing.pro.price'),
      period: t('home.pricing.pro.period'),
      features: [
        t('home.pricing.pro.features.0'),
        t('home.pricing.pro.features.1'),
        t('home.pricing.pro.features.2'),
        t('home.pricing.pro.features.3'),
        t('home.pricing.pro.features.4'),
      ],
      cta: t('home.pricing.pro.cta'),
    },
    {
      name: 'Plus',
      description: t('home.pricing.plus.description'),
      price: t('home.pricing.plus.price'),
      period: t('home.pricing.plus.period'),
      features: [
        t('home.pricing.plus.features.0'),
        t('home.pricing.plus.features.1'),
        t('home.pricing.plus.features.2'),
        t('home.pricing.plus.features.3'),
        t('home.pricing.plus.features.4'),
      ],
      cta: t('home.pricing.plus.cta'),
      recommended: true,
      recommendedLabel: t('home.pricing.plus.popularLabel'),
    },
    {
      name: 'Ultra',
      description: t('home.pricing.ultra.description'),
      price: t('home.pricing.ultra.price'),
      period: t('home.pricing.ultra.period'),
      features: [
        t('home.pricing.ultra.features.0'),
        t('home.pricing.ultra.features.1'),
        t('home.pricing.ultra.features.2'),
        t('home.pricing.ultra.features.3'),
        t('home.pricing.ultra.features.4'),
      ],
      cta: t('home.pricing.ultra.cta'),
    },
  ]
  return plans
})

const faqs = computed(() => [
  {
    question: t('home.faq.q1.question'),
    answer: t('home.faq.q1.answer'),
  },
  {
    question: t('home.faq.q2.question'),
    answer: t('home.faq.q2.answer'),
  },
  {
    question: t('home.faq.q3.question'),
    answer: t('home.faq.q3.answer'),
  },
  {
    question: t('home.faq.q4.question'),
    answer: t('home.faq.q4.answer'),
  },
  {
    question: t('home.faq.q5.question'),
    answer: t('home.faq.q5.answer'),
  },
])

const techStackRow1 = [
  { name: 'Vue 3', icon: '📦' },
  { name: 'TypeScript', icon: '📦' },
  { name: 'Vite', icon: '📦' },
  { name: 'Naive UI', icon: '📦' },
  { name: 'Tailwind CSS', icon: '📦' },
  { name: 'Pinia', icon: '📦' },
  { name: 'Vue Router', icon: '📦' },
  { name: 'Vue i18n', icon: '📦' },
]

const techStackRow2 = [
  { name: 'Auth0', icon: '📦' },
  { name: 'Markdown-it', icon: '📦' },
  { name: 'Highlight.js', icon: '📦' },
  { name: 'Mermaid', icon: '📦' },
  { name: 'Katex', icon: '📦' },
  { name: 'Axios', icon: '📦' },
  { name: 'ESLint', icon: '📦' },
  { name: 'Husky', icon: '📦' },
]
</script>

<template>
  <div class="home-wrapper">
    <!-- Header -->
    <HomeHeader />

    <!-- Hero Section -->
    <section class="hero-section">
      <div class="hero-content">
        <div class="hero-text">
          <h1 class="hero-title">
            {{ t('home.hero.title') }}
          </h1>
          <p class="hero-subtitle">
            {{ t('home.hero.subtitle') }}
          </p>
          <p class="hero-description">
            {{ t('home.hero.description') }}
          </p>
          <div class="hero-cta">
            <NButton
              type="primary"
              size="large"
              class="cta-primary"
              @click="goToSignIn"
            >
              {{ t('home.hero.ctaPrimary') }}
            </NButton>
            <NButton
              size="large"
              quaternary
              class="cta-secondary"
              @click="scrollToSection('pricing')"
            >
              {{ t('home.hero.ctaSecondary') }}
            </NButton>
          </div>
        </div>
      </div>

    </section>

    <!-- Features Section -->
    <section id="features" class="features-section">
      <div class="container">
        <div class="section-header">
          <h2 class="section-title">
            {{ t('home.features.title') }}
          </h2>
          <p class="section-subtitle">
            {{ t('home.features.subtitle') }}
          </p>
        </div>
        <div class="features-grid">
          <div
            v-for="(feature, index) in features"
            :key="index"
            class="feature-card"
          >
            <div class="feature-icon">
              {{ feature.icon }}
            </div>
            <h3 class="feature-title">
              {{ feature.title }}
            </h3>
            <p class="feature-description">
              {{ feature.description }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Workflow Section -->
    <section class="workflow-section">
      <div class="container">
        <div class="section-header">
          <h2 class="section-title">
            {{ t('home.workflow.title') }}
          </h2>
          <p class="section-subtitle">
            {{ t('home.workflow.subtitle') }}
          </p>
        </div>
        <div class="workflow-container">
          <div
            v-for="(step, index) in workflowSteps"
            :key="index"
            class="workflow-card"
          >
            <div class="workflow-number">
              {{ step.number }}
            </div>
            <h3 class="workflow-title">
              {{ step.title }}
            </h3>
            <p class="workflow-description">
              {{ step.description }}
            </p>
          </div>
        </div>
        <div class="workflow-cta">
          <NButton
            type="primary"
            size="large"
            class="workflow-cta-button"
            @click="goToSignIn"
          >
            {{ t('home.workflow.cta') }}
          </NButton>
        </div>
      </div>
    </section>

    <!-- Pricing Section -->
    <section id="pricing" class="pricing-section">
      <div class="container">
        <div class="section-header">
          <h2 class="section-title">
            {{ t('home.pricing.title') }}
          </h2>
          <p class="section-subtitle">
            {{ t('home.pricing.subtitle') }}
          </p>
        </div>

        <div class="pricing-grid">
          <div
            v-for="(plan, index) in pricingPlans"
            :key="index"
            class="pricing-card"
            :class="{ 'is-recommended': plan.recommended }"
          >
            <div class="pricing-header">
              <h3 class="plan-name">
                {{ plan.name }}
              </h3>
              <p class="plan-description">
                {{ plan.description }}
              </p>
              <div class="plan-price">
                <span class="price">
                  {{ plan.price }}
                </span>
                <span v-if="plan.period" class="period">
                  {{ plan.period }}
                </span>
              </div>
            </div>
            <ul class="plan-features">
              <li v-for="(feature, fIndex) in plan.features" :key="fIndex">
                <span class="checkmark">
                  ✓
                </span>
                {{ feature }}
              </li>
            </ul>
            <NButton
              :type="plan.recommended ? 'primary' : 'default'"
              block
              size="large"
              class="plan-cta"
              @click="goToSignIn"
            >
              {{ plan.cta }}
            </NButton>
          </div>
        </div>
      </div>
    </section>

    <!-- Tech Stack Section -->
    <section class="trust-section">
      <div class="container">
        <div class="section-header">
          <h2 class="section-title">
            {{ t('home.trust.title') }}
          </h2>
          <p class="section-subtitle">
            {{ t('home.trust.subtitle') }}
          </p>
        </div>
        <div class="tech-stack-container">
          <!-- First Row - Scroll Left -->
          <div class="tech-stack-row scroll-left">
            <div class="tech-stack-track">
              <div
                v-for="(tech, index) in [...techStackRow1, ...techStackRow1]"
                :key="`row1-${index}`"
                class="tech-card"
              >
                <span class="tech-icon">{{ tech.icon }}</span>
                <span class="tech-name">{{ tech.name }}</span>
              </div>
            </div>
          </div>

          <!-- Second Row - Scroll Right -->
          <div class="tech-stack-row scroll-right">
            <div class="tech-stack-track">
              <div
                v-for="(tech, index) in [...techStackRow2, ...techStackRow2]"
                :key="`row2-${index}`"
                class="tech-card"
              >
                <span class="tech-icon">{{ tech.icon }}</span>
                <span class="tech-name">{{ tech.name }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- FAQ Section -->
    <section id="faq" class="faq-section">
      <div class="container">
        <div class="section-header">
          <h2 class="section-title">
            {{ t('home.faq.title') }}
          </h2>
          <p class="section-subtitle">
            {{ t('home.faq.subtitle') }}
          </p>
        </div>
        <div class="faq-container">
          <NCollapse accordion>
            <NCollapseItem
              v-for="(faq, index) in faqs"
              :key="index"
              :title="faq.question"
              :name="String(index)"
            >
              <p class="faq-answer">
                {{ faq.answer }}
              </p>
            </NCollapseItem>
          </NCollapse>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
      <div class="container">
        <div class="footer-grid">
          <div class="footer-column">
            <h4 class="footer-title">
              {{ t('home.footer.product') }}
            </h4>
            <ul class="footer-links">
              <li>
                <a href="#features">
                  {{ t('home.footer.features') }}
                </a>
              </li>
              <li>
                <a href="#pricing">
                  {{ t('home.footer.pricing') }}
                </a>
              </li>
              <li>
                <a href="#" @click.prevent>
                  {{ t('home.footer.docs') }}
                </a>
              </li>
            </ul>
          </div>
          <div class="footer-column">
            <h4 class="footer-title">
              {{ t('home.footer.company') }}
            </h4>
            <ul class="footer-links">
              <li>
                <a href="#" @click.prevent>
                  {{ t('home.footer.about') }}
                </a>
              </li>
              <li>
                <a href="#" @click.prevent>
                  {{ t('home.footer.blog') }}
                </a>
              </li>
              <li>
                <a href="#" @click.prevent>
                  {{ t('home.footer.contact') }}
                </a>
              </li>
            </ul>
          </div>
          <div class="footer-column">
            <h4 class="footer-title">
              {{ t('home.footer.legal') }}
            </h4>
            <ul class="footer-links">
              <li>
                <a href="#" @click.prevent>
                  {{ t('home.footer.privacy') }}
                </a>
              </li>
              <li>
                <a href="#" @click.prevent>
                  {{ t('home.footer.terms') }}
                </a>
              </li>
              <li>
                <a href="https://github.com/your-repo" target="_blank" rel="noopener noreferrer">
                  {{ t('home.footer.github') }}
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div class="footer-bottom">
          <p class="copyright">
            {{ t('home.footer.copyright') }}
          </p>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* Base Styles */
.home-wrapper {
  width: 100%;
  overflow-x: hidden;
  background: var(--bg-color);
  transition: background-color 0.3s;
}

:root {
  --bg-color: #ffffff;
  --bg-secondary: #f8fafc;
  --text-primary: #000000;
  --text-secondary: #666666;
  --border-color: #e5e5e5;
  --card-bg: #ffffff;
  --card-border: #e5e5e5;
  --primary-color: #2563eb;
  --primary-hover: #1d4ed8;
  --accent-color: #7c3aed;
}

.dark .home-wrapper {
  --bg-color: #000000;
  --bg-secondary: #0a0a0a;
  --text-primary: #ffffff;
  --text-secondary: #a0a0a0;
  --border-color: #333333;
  --card-bg: #0a0a0a;
  --card-border: #222222;
  --primary-color: #3b82f6;
  --primary-hover: #2563eb;
  --accent-color: #8b5cf6;
}

.container {
  margin: 0 auto;
  padding: 0 24px;
}

.section-header {
  text-align: center;
  margin-bottom: 40px;
}

.section-title {
  font-size: 48px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 16px;
  letter-spacing: -0.02em;
}

.section-subtitle {
  font-size: 20px;
  color: var(--text-secondary);
  max-width: 600px;
  margin: 0 auto;
}

/* Hero Section */
.hero-section {
  position: relative;
  min-height: calc(100vh - 165px);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: linear-gradient(135deg, var(--bg-color) 0%, var(--bg-secondary) 100%);
}

.hero-content {
  position: relative;
  z-index: 1;
  text-align: center;
  padding: 80px 24px;
}

.hero-text {
  max-width: 900px;
  margin: 0 auto;
}

.hero-title {
  font-size: clamp(36px, 6vw, 64px);
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
  margin-bottom: 24px;
  letter-spacing: -0.03em;
}

.hero-subtitle {
  font-size: clamp(20px, 3vw, 28px);
  font-weight: 600;
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--accent-color) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 16px;
}

.hero-description {
  font-size: 18px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 48px;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.hero-cta {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}

.cta-primary,
.cta-secondary {
  height: 56px;
  padding: 0 40px;
  font-size: 18px;
  font-weight: 600;
  border-radius: 28px;
  letter-spacing: 0.5px;
}

.dark .cta-primary {
  background-color: #ffffff;
  color: #000000;
}

.dark .cta-primary:hover {
  background-color: rgba(255, 255, 255, 0.9);
}

.cta-secondary {
  color: var(--text-primary);
}

/* Features Section */
.features-section {
  padding: 120px 0;
  background: var(--bg-color);
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 32px;
}

.feature-card {
  padding: 40px 32px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 16px;
  transition: all 0.3s;
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
}

.dark .feature-card:hover {
  box-shadow: 0 12px 24px rgba(255, 255, 255, 0.05);
}

.feature-icon {
  font-size: 48px;
  margin-bottom: 24px;
}

.feature-title {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.feature-description {
  font-size: 16px;
  color: var(--text-secondary);
  line-height: 1.6;
}

/* Workflow Section */
.workflow-section {
  padding: 120px 0;
  background: var(--bg-secondary);
}

.workflow-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 48px;
  margin-bottom: 48px;
}

.workflow-card {
  text-align: center;
}

.workflow-number {
  display: inline-block;
  font-size: 64px;
  font-weight: 700;
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--accent-color) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 24px;
  opacity: 0.8;
}

.workflow-title {
  font-size: 28px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.workflow-description {
  font-size: 16px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.workflow-cta {
  text-align: center;
}

.workflow-cta-button {
  height: 56px;
  padding: 0 40px;
  font-size: 18px;
  font-weight: 600;
  border-radius: 28px;
}

/* Pricing Section */
.pricing-section {
  padding: 160px 60px;
  background: var(--bg-color);
}

.pricing-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.pricing-card {
  position: relative;
  padding: 24px 20px;
  background: var(--card-bg);
  border: 2px solid var(--card-border);
  border-radius: 16px;
  transition: all 0.3s;
  display: flex;
  flex-direction: column;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
}

.dark .pricing-card {
  box-shadow: 0 12px 24px rgba(255, 255, 255, 0.05);
}

.pricing-card.is-recommended {
  border: solid 1px rgb(44 39 148 / 40%);
  box-shadow: 0px 4px 20px 3px rgb(114 81 204 / 40%);
}

.dark .pricing-card.is-recommended {
  border: solid 1px rgb(114 81 204 / 40%);
  box-shadow: 0px 4px 20px 3px rgb(114 81 204 / 40%);
}

.pricing-header {
  margin-bottom: 20px;
}

.plan-name {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.plan-description {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 16px;
}

.plan-price {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.price {
  font-size: 48px;
  font-weight: 700;
  color: var(--text-primary);
}

.period {
  font-size: 18px;
  color: var(--text-secondary);
}

.plan-features {
  list-style: none;
  padding: 0;
  margin: 0 0 20px 0;
  flex: 1;
}

.plan-features li {
  padding: 8px 0;
  font-size: 14px;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 10px;
}

.checkmark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background: var(--primary-color);
  color: white;
  border-radius: 50%;
  font-size: 12px;
  flex-shrink: 0;
}

.plan-cta {
  height: 48px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 24px;
}

/* Tech Stack Section */
.trust-section {
  padding: 80px 0;
  background: var(--bg-secondary);
  overflow: hidden;
}

.tech-stack-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-top: 40px;
  background: transparent;
}

.tech-stack-row {
  position: relative;
  width: 100%;
  overflow: hidden;
  background: transparent;
  mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
  -webkit-mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
}

.tech-stack-track {
  display: flex;
  gap: 20px;
  width: fit-content;
}

.scroll-left .tech-stack-track {
  animation: scroll-left 30s linear infinite;
}

.scroll-right .tech-stack-track {
  animation: scroll-right 30s linear infinite;
}

.tech-stack-row:hover .tech-stack-track {
  animation-play-state: paused;
}

.tech-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  background: transparent;
  border: none;
  white-space: nowrap;
  transition: all 0.3s;
}

.tech-card:hover {
  transform: translateY(-2px);
}

.tech-icon {
  font-size: 24px;
}

.tech-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

@keyframes scroll-left {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-50%);
  }
}

@keyframes scroll-right {
  0% {
    transform: translateX(-50%);
  }
  100% {
    transform: translateX(0);
  }
}

/* FAQ Section */
.faq-section {
  padding: 120px 0;
  background: var(--bg-color);
}

.faq-container {
  max-width: 800px;
  margin: 0 auto;
}

.faq-container :deep(.n-collapse-item) {
  margin-bottom: 8px;
}

.faq-container :deep(.n-collapse-item__header) {
  padding: 16px 24px;
  border-radius: 24px;
  transition: background-color 0.3s;
}

.faq-container :deep(.n-collapse-item__header:hover) {
  background-color: #f9f9f9;
}

.dark .faq-container :deep(.n-collapse-item__header:hover) {
  background-color: rgba(255, 255, 255, 0.05);
}

.faq-answer {
  font-size: 15px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0;
  padding: 0 24px;
}

/* Footer */
.footer {
  padding: 80px 0 40px;
  background: var(--card-bg);
  border-top: 1px solid var(--border-color);
}

.footer-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 48px;
  margin-bottom: 48px;
}

.footer-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 16px;
}

.footer-links {
  list-style: none;
  padding: 0;
  margin: 0;
}

.footer-links li {
  margin-bottom: 12px;
}

.footer-links a {
  font-size: 14px;
  color: var(--text-secondary);
  text-decoration: none;
  transition: color 0.3s;
}

.footer-links a:hover {
  color: var(--text-primary);
}

.footer-bottom {
  padding-top: 32px;
  border-top: 1px solid var(--border-color);
  text-align: center;
}

.copyright {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .section-title {
    font-size: 36px;
  }

  .section-subtitle {
    font-size: 18px;
  }

  .hero-content {
    padding: 80px 24px 60px;
  }

  .features-section,
  .workflow-section,
  .pricing-section,
  .trust-section,
  .faq-section {
    padding: 80px 0;
  }

  .section-header {
    margin-bottom: 32px;
  }

  .features-grid {
    grid-template-columns: 1fr;
    gap: 24px;
  }

  .workflow-container {
    grid-template-columns: 1fr;
    gap: 40px;
  }

  .pricing-grid {
    grid-template-columns: 1fr;
  }

  .tech-card {
    padding: 12px 18px;
  }

  .tech-name {
    font-size: 14px;
  }

  .footer-grid {
    grid-template-columns: 1fr;
    gap: 32px;
  }
}
</style>
