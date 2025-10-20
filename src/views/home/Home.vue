<script setup lang="ts">
import { NButton, NCollapse, NCollapseItem } from 'naive-ui'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

const router = useRouter()
const { t } = useI18n()

function goToSignIn() {
  router.push('/signin')
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

const partnerLogos = [
  { name: 'GitHub', icon: 'i-carbon-logo-github' },
  { name: 'Notion', icon: 'i-simple-icons-notion' },
  { name: 'Vercel', icon: 'i-simple-icons-vercel' },
  { name: 'OpenAI', icon: 'i-simple-icons-openai' },
]
</script>

<template>
  <div class="home-wrapper">
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
              @click="scrollToSection('features')"
            >
              {{ t('home.hero.ctaSecondary') }}
            </NButton>
          </div>
        </div>
      </div>

      <!-- Scroll Indicator -->
      <div class="scroll-indicator">
        <div class="scroll-arrow" />
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

    <!-- Trust/Partners Section -->
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
        <div class="partners-grid">
          <div
            v-for="partner in partnerLogos"
            :key="partner.name"
            class="partner-logo"
          >
            <span class="partner-name">{{ partner.name }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- FAQ Section -->
    <section class="faq-section">
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
  min-height: 100vh;
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
  padding: 120px 24px 80px;
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

.cta-secondary {
  color: var(--text-primary);
}

.scroll-indicator {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1;
}

.scroll-arrow {
  width: 24px;
  height: 24px;
  border-left: 2px solid var(--text-secondary);
  border-bottom: 2px solid var(--text-secondary);
  transform: rotate(-45deg);
  animation: bounce 2s infinite;
}

@keyframes bounce {
  0%,
  20%,
  50%,
  80%,
  100% {
    transform: translateY(0) rotate(-45deg);
  }
  40% {
    transform: translateY(10px) rotate(-45deg);
  }
  60% {
    transform: translateY(5px) rotate(-45deg);
  }
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
  padding: 60px 0;
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
}

.pricing-card:hover {
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
}

.dark .pricing-card:hover {
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

/* Trust/Partners Section */
.trust-section {
  padding: 80px 0;
  background: var(--bg-secondary);
}

.partners-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 32px;
  max-width: 900px;
  margin: 0 auto;
}

.partner-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  transition: all 0.3s;
}

.partner-logo:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}

.dark .partner-logo:hover {
  box-shadow: 0 8px 16px rgba(255, 255, 255, 0.05);
}

.partner-name {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
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

.faq-answer {
  font-size: 15px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin: 0;
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

  .partners-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .footer-grid {
    grid-template-columns: 1fr;
    gap: 32px;
  }
}
</style>
