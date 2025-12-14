<script setup lang="ts">
import { useAuth0 } from '@auth0/auth0-vue'
import { Icon } from '@iconify/vue'
import { NButton, NCard, NCollapse, NCollapseItem, NTabPane, NTabs } from 'naive-ui'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import HomeHeader from '@/components/common/HomeHeader/index.vue'

const router = useRouter()
const { t, locale } = useI18n()
const { loginWithRedirect, isAuthenticated, isLoading } = useAuth0()

// Quiz workflow tab state
const quizActiveTab = ref('classify')

// 检查是否是切换账号操作或登录回调
onMounted(() => {
  const urlParams = new URLSearchParams(window.location.search)

  // 1. 处理切换账号
  if (urlParams.has('switchAccount')) {
    // 清理 URL 参数
    window.history.replaceState({}, '', '/')
    // 自动触发登录
    setTimeout(() => {
      goToSignIn()
    }, 500)
    return
  }

  // 2. 处理登录回调：如果 URL 包含 code/state 且用户已认证，自动跳转到 /chat
  const isFromAuth0 = urlParams.has('code') || urlParams.has('state')
  if (isFromAuth0) {
    console.warn('🔍 [Home] 检测到 Auth0 回调参数，等待认证完成...')

    // 等待 Auth0 初始化完成
    const checkAuth = setInterval(() => {
      if (!isLoading.value) {
        clearInterval(checkAuth)

        if (isAuthenticated.value) {
          console.warn('✅ [Home] 用户已认证，自动跳转到 /chat')
          router.push('/chat')
        }
        else {
          console.warn('⚠️ [Home] Auth0 回调但用户未认证，保持在首页')
        }
      }
    }, 100)

    // 超时保护（5秒）
    setTimeout(() => {
      clearInterval(checkAuth)
    }, 5000)
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

const aiChatFeatures = computed(() => [
  t('home.aiChat.features.feature1'),
  t('home.aiChat.features.feature2'),
  t('home.aiChat.features.feature3'),
  t('home.aiChat.features.feature4'),
  t('home.aiChat.features.feature5'),
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
  { name: 'Vue 3', icon: 'logos:vue' },
  { name: 'TypeScript', icon: 'vscode-icons:file-type-typescript' },
  { name: 'Vite', icon: 'devicon:vitejs' },
  { name: 'Naive UI', icon: 'logos:naiveui' },
  { name: 'Tailwind CSS', icon: 'logos:tailwindcss-icon' },
  { name: 'Pinia', icon: 'logos:pinia' },
]

const techStackRow2 = [
  { name: 'Vue i18n', icon: 'meteor-icons:language' },
  { name: 'Auth0', icon: 'logos:auth0-icon' },
  { name: 'Markdown-it', icon: 'vscode-icons:file-type-markdown' },
  { name: 'Axios', icon: 'devicon-plain:axios-wordmark' },
  { name: 'ESLint', icon: 'devicon:eslint' },
  { name: 'Husky', icon: 'vscode-icons:folder-type-husky-opened' },
]

const chineseNumbers = ['一', '二', '三', '四']

const novelWorkflowSteps = computed(() => [
  {
    title: t('home.novel.workflow1.title'),
    description: t('home.novel.workflow1.description'),
    tags: [t('home.novel.workflow1.tag1'), t('home.novel.workflow1.tag2')],
  },
  {
    title: t('home.novel.workflow2.title'),
    description: t('home.novel.workflow2.description'),
    tags: [t('home.novel.workflow2.tag1'), t('home.novel.workflow2.tag2')],
  },
  {
    title: t('home.novel.workflow3.title'),
    description: t('home.novel.workflow3.description'),
    tags: [t('home.novel.workflow3.tag1'), t('home.novel.workflow3.tag2')],
  },
  {
    title: t('home.novel.workflow4.title'),
    description: t('home.novel.workflow4.description'),
    tags: [t('home.novel.workflow4.tag1'), t('home.novel.workflow4.tag2')],
  },
])

const novelAITeam = computed(() => [
  {
    icon: '🎬',
    name: t('home.novel.ai1.name'),
    role: t('home.novel.ai1.role'),
    description: t('home.novel.ai1.description'),
  },
  {
    icon: '🎨',
    name: t('home.novel.ai2.name'),
    role: t('home.novel.ai2.role'),
    description: t('home.novel.ai2.description'),
  },
  {
    icon: '📋',
    name: t('home.novel.ai3.name'),
    role: t('home.novel.ai3.role'),
    description: t('home.novel.ai3.description'),
  },
  {
    icon: '✍️',
    name: t('home.novel.ai4.name'),
    role: t('home.novel.ai4.role'),
    description: t('home.novel.ai4.description'),
  },
  {
    icon: '🔍',
    name: t('home.novel.ai5.name'),
    role: t('home.novel.ai5.role'),
    description: t('home.novel.ai5.description'),
  },
])

const quizWorkflowNodes = computed(() => [
  {
    icon: '📁',
    title: t('home.quiz.node1.title'),
    description: t('home.quiz.node1.description'),
  },
  {
    icon: '🔍',
    title: t('home.quiz.node2.title'),
    description: t('home.quiz.node2.description'),
  },
  {
    icon: '⚡',
    title: t('home.quiz.node3.title'),
    description: t('home.quiz.node3.description'),
  },
  {
    icon: '👤',
    title: t('home.quiz.node4.title'),
    description: t('home.quiz.node4.description'),
  },
  {
    icon: '💾',
    title: t('home.quiz.node5.title'),
    description: t('home.quiz.node5.description'),
  },
])

const quizExamples = computed(() => {
  const isChinese = locale.value === 'zh-CN'

  return {
    classify: {
      input: isChinese
        ? '# 力学基础\n\n## 牛顿第一定律\n物体在不受外力作用时，保持静止或匀速直线运动状态...\n\n## 牛顿第二定律\n物体的加速度与所受合外力成正比，与质量成反比...'
        : '# Mechanics Basics\n\n## Newton\'s First Law\nAn object at rest stays at rest and an object in motion stays in motion...\n\n## Newton\'s Second Law\nThe acceleration of an object is proportional to the net force...',
      output: `{
  "classification": "note",
  "subject": "physics",
  "confidence": 0.95
}`,
    },
    generate: {
      input: isChinese
        ? '# 牛顿第二定律\n\n牛顿第二定律指出：物体的加速度与所受合外力成正比，与质量成反比。\n公式：F = ma\n其中 F 是合外力，m 是质量，a 是加速度。'
        : '# Newton\'s Second Law\n\nNewton\'s second law states: The acceleration of an object is proportional to the net force and inversely proportional to its mass.\nFormula: F = ma\nWhere F is net force, m is mass, a is acceleration.',
      output: isChinese
        ? `{
  "questions": [
    {
      "type": "single_choice",
      "question": "根据牛顿第二定律，物体的加速度与什么成正比？",
      "options": [
        "A. 质量",
        "B. 合外力",
        "C. 速度",
        "D. 时间"
      ],
      "answer": ["B"],
      "explanation": "根据牛顿第二定律 F=ma，加速度 a=F/m，因此加速度与合外力 F 成正比。"
    }
  ]
}`
        : `{
  "questions": [
    {
      "type": "single_choice",
      "question": "According to Newton's second law, acceleration is proportional to what?",
      "options": [
        "A. Mass",
        "B. Net force",
        "C. Velocity",
        "D. Time"
      ],
      "answer": ["B"],
      "explanation": "According to Newton's second law F=ma, acceleration a=F/m, so acceleration is proportional to net force F."
    }
  ]
}`,
    },
    parse: {
      input: isChinese
        ? '1. 下列关于力的说法正确的是（  ）\nA. 力是物体对物体的作用\nB. 力可以离开物体而独立存在\nC. 只有相互接触的物体才有力的作用\nD. 力的大小可以用天平测量\n\n答案：A'
        : '1. Which of the following statements about force is correct? (  )\nA. Force is the interaction between objects\nB. Force can exist independently without objects\nC. Only objects in contact can have force\nD. Force can be measured with a balance\n\nAnswer: A',
      output: isChinese
        ? `{
  "questions": [
    {
      "type": "single_choice",
      "question": "下列关于力的说法正确的是（  ）",
      "options": [
        "A. 力是物体对物体的作用",
        "B. 力可以离开物体而独立存在",
        "C. 只有相互接触的物体才有力的作用",
        "D. 力的大小可以用天平测量"
      ],
      "answer": ["A"],
      "explanation": "力是物体对物体的相互作用，不能离开物体而独立存在。"
    }
  ]
}`
        : `{
  "questions": [
    {
      "type": "single_choice",
      "question": "Which of the following statements about force is correct? (  )",
      "options": [
        "A. Force is the interaction between objects",
        "B. Force can exist independently without objects",
        "C. Only objects in contact can have force",
        "D. Force can be measured with a balance"
      ],
      "answer": ["A"],
      "explanation": "Force is the mutual interaction between objects and cannot exist independently without objects."
    }
  ]
}`,
    },
    result: {
      output: isChinese
        ? `<h1>2025年物理期末试卷</h1>
<h2>总分：100分 | 时间：90分钟</h2>

<h3>一、选择题（每题4分，共40分）</h3>

<div class="question-item">
  <div class="question-text">1. 根据牛顿第二定律，物体的加速度与什么成正比？</div>
  <div class="options">
    <div class="option">A. 质量</div>
    <div class="option">B. 合外力</div>
    <div class="option">C. 速度</div>
    <div class="option">D. 时间</div>
  </div>
</div>

<div class="question-item">
  <div class="question-text">2. 下列关于力的说法正确的是（  ）</div>
  <div class="options">
    <div class="option">A. 力是物体对物体的作用</div>
    <div class="option">B. 力可以离开物体而独立存在</div>
    <div class="option">C. 只有相互接触的物体才有力的作用</div>
    <div class="option">D. 力的大小可以用天平测量</div>
  </div>
</div>

<div class="question-item">
  <div class="question-text">3. 物体做匀速直线运动时，下列说法正确的是（  ）</div>
  <div class="options">
    <div class="option">A. 物体不受任何力的作用</div>
    <div class="option">B. 物体受到的合外力为零</div>
    <div class="option">C. 物体的速度一定很小</div>
    <div class="option">D. 物体的加速度不为零</div>
  </div>
</div>

<div class="question-item">
  <div class="question-text">4. 关于惯性，下列说法正确的是（  ）</div>
  <div class="options">
    <div class="option">A. 物体只有在静止时才有惯性</div>
    <div class="option">B. 物体的质量越大，惯性越大</div>
    <div class="option">C. 物体的速度越大，惯性越大</div>
    <div class="option">D. 惯性是一种力</div>
  </div>
</div>

<div class="question-item">
  <div class="question-text">5. 在国际单位制中，力的单位是（  ）</div>
  <div class="options">
    <div class="option">A. 千克（kg）</div>
    <div class="option">B. 牛顿（N）</div>
    <div class="option">C. 焦耳（J）</div>
    <div class="option">D. 瓦特（W）</div>
  </div>
</div>

<h3>二、判断题（每题3分，共15分）</h3>

<div class="question-item">
  <div class="question-text">6. 物体在不受外力作用时，保持静止或匀速直线运动状态。（  ）</div>
</div>

<div class="question-item">
  <div class="question-text">7. 摩擦力的方向总是与物体运动方向相反。（  ）</div>
</div>

<div class="question-item">
  <div class="question-text">8. 作用力和反作用力大小相等、方向相反、作用在同一物体上。（  ）</div>
</div>

<div class="question-item">
  <div class="question-text">9. 重力的方向总是竖直向下的。（  ）</div>
</div>

<div class="question-item">
  <div class="question-text">10. 弹力的方向总是垂直于接触面。（  ）</div>
</div>

<div class="exam-footer">
  --- 试卷结束，请仔细检查 ---
</div>`
        : `<h1>2025 Physics Final Exam</h1>
<h2>Total Score: 100 | Time: 90 minutes</h2>

<h3>Part I: Multiple Choice (4 points each, 40 points total)</h3>

<div class="question-item">
  <div class="question-text">1. According to Newton's second law, acceleration is proportional to what?</div>
  <div class="options">
    <div class="option">A. Mass</div>
    <div class="option">B. Net force</div>
    <div class="option">C. Velocity</div>
    <div class="option">D. Time</div>
  </div>
</div>

<div class="question-item">
  <div class="question-text">2. Which of the following statements about force is correct? (  )</div>
  <div class="options">
    <div class="option">A. Force is the interaction between objects</div>
    <div class="option">B. Force can exist independently without objects</div>
    <div class="option">C. Only objects in contact can have force</div>
    <div class="option">D. Force can be measured with a balance</div>
  </div>
</div>

<div class="question-item">
  <div class="question-text">3. When an object moves at constant velocity, which statement is correct? (  )</div>
  <div class="options">
    <div class="option">A. The object experiences no forces</div>
    <div class="option">B. The net force on the object is zero</div>
    <div class="option">C. The object's velocity must be small</div>
    <div class="option">D. The object's acceleration is not zero</div>
  </div>
</div>

<div class="question-item">
  <div class="question-text">4. Regarding inertia, which statement is correct? (  )</div>
  <div class="options">
    <div class="option">A. Objects only have inertia when at rest</div>
    <div class="option">B. Greater mass means greater inertia</div>
    <div class="option">C. Greater velocity means greater inertia</div>
    <div class="option">D. Inertia is a type of force</div>
  </div>
</div>

<div class="question-item">
  <div class="question-text">5. In the SI system, the unit of force is (  )</div>
  <div class="options">
    <div class="option">A. Kilogram (kg)</div>
    <div class="option">B. Newton (N)</div>
    <div class="option">C. Joule (J)</div>
    <div class="option">D. Watt (W)</div>
  </div>
</div>

<h3>Part II: True/False (3 points each, 15 points total)</h3>

<div class="question-item">
  <div class="question-text">6. An object at rest stays at rest and an object in motion stays in motion when no external force acts on it. (  )</div>
</div>

<div class="question-item">
  <div class="question-text">7. The direction of friction is always opposite to the direction of motion. (  )</div>
</div>

<div class="question-item">
  <div class="question-text">8. Action and reaction forces are equal in magnitude, opposite in direction, and act on the same object. (  )</div>
</div>

<div class="question-item">
  <div class="question-text">9. The direction of gravity is always vertically downward. (  )</div>
</div>

<div class="question-item">
  <div class="question-text">10. The direction of elastic force is always perpendicular to the contact surface. (  )</div>
</div>

<div class="exam-footer">
  --- End of Exam, Please Review Your Answers ---
</div>`,
    },
  }
})
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

    <!-- AI Chat Section -->
    <section id="ai-chat" class="ai-chat-section">
      <div class="container">
        <div class="ai-chat-content">
          <!-- Left: Description -->
          <div class="ai-chat-description">
            <h2 class="ai-chat-title">
              {{ t('home.aiChat.title') }}
            </h2>
            <p class="ai-chat-subtitle">
              {{ t('home.aiChat.subtitle') }}
            </p>
            <div class="ai-chat-features">
              <div
                v-for="(feature, index) in aiChatFeatures"
                :key="index"
                class="ai-chat-feature-item"
              >
                <div class="feature-item-icon">
                  ✓
                </div>
                <div class="feature-item-text">
                  {{ feature }}
                </div>
              </div>
            </div>
            <NButton
              type="primary"
              size="large"
              class="ai-chat-cta"
              @click="goToSignIn"
            >
              {{ t('home.aiChat.cta') }}
            </NButton>
          </div>

          <!-- Right: YouTube Video -->
          <div class="ai-chat-video">
            <a
              href="https://www.youtube.com/watch?v=bSvTVREwSNw"
              target="_blank"
              rel="noopener noreferrer"
              class="video-link"
            >
              <div class="video-thumbnail">
                <img
                  src="https://img.youtube.com/vi/bSvTVREwSNw/maxresdefault.jpg"
                  alt="AI Assistant Demo"
                  class="video-image"
                >
                <div class="video-play-button">
                  <svg width="68" height="48" viewBox="0 0 68 48">
                    <path d="M66.52,7.74c-0.78-2.93-2.49-5.41-5.42-6.19C55.79,.13,34,0,34,0S12.21,.13,6.9,1.55 C3.97,2.33,2.27,4.81,1.48,7.74C0.06,13.05,0,24,0,24s0.06,10.95,1.48,16.26c0.78,2.93,2.49,5.41,5.42,6.19 C12.21,47.87,34,48,34,48s21.79-0.13,27.1-1.55c2.93-0.78,4.64-3.26,5.42-6.19C67.94,34.95,68,24,68,24S67.94,13.05,66.52,7.74z" fill="#f00" />
                    <path d="M 45,24 27,14 27,34" fill="#fff" />
                  </svg>
                </div>
                <div class="video-duration">4:32</div>
              </div>
              <div class="video-info">
                <h3 class="video-title">{{ t('home.aiChat.videoTitle') }}</h3>
                <p class="video-description">{{ t('home.aiChat.videoDescription') }}</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- Quiz Workflow Section -->
    <section id="quiz" class="quiz-section">
      <div class="container">
        <div class="section-header">
          <h2 class="section-title">
            {{ t('home.quiz.title') }}
          </h2>
          <p class="section-subtitle">
            {{ t('home.quiz.subtitle') }}
          </p>
        </div>
        <div class="quiz-content">
          <!-- Left: Workflow Nodes -->
          <div class="quiz-workflow">
            <h3 class="subsection-title">
              {{ t('home.quiz.workflowTitle') }}
            </h3>
            <div class="workflow-nodes">
              <div
                v-for="(node, index) in quizWorkflowNodes"
                :key="index"
                class="workflow-node"
              >
                <div class="node-indicator">
                  <span class="node-icon">{{ node.icon }}</span>
                  <div v-if="index < quizWorkflowNodes.length - 1" class="node-line" />
                </div>
                <div class="node-content">
                  <h4 class="node-title">
                    {{ node.title }}
                  </h4>
                  <p class="node-description">
                    {{ node.description }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Right: Examples with Tabs -->
          <div class="quiz-examples">
            <h3 class="subsection-title">
              {{ t('home.quiz.examplesTitle') }}
            </h3>
            <NTabs v-model:value="quizActiveTab" type="line" animated>
              <NTabPane name="classify" :tab="t('home.quiz.tabs.classify')">
                <div class="example-content">
                  <div class="example-section">
                    <h4 class="example-label">
                      {{ t('home.quiz.inputLabel') }}
                    </h4>
                    <NCard size="small" class="example-card">
                      <pre class="example-text">{{ quizExamples.classify.input }}</pre>
                    </NCard>
                  </div>
                  <div class="example-arrow">
                    →
                  </div>
                  <div class="example-section">
                    <h4 class="example-label">
                      {{ t('home.quiz.outputLabel') }}
                    </h4>
                    <NCard size="small" class="example-card output">
                      <pre class="example-code">{{ quizExamples.classify.output }}</pre>
                    </NCard>
                  </div>
                </div>
              </NTabPane>
              <NTabPane name="generate" :tab="t('home.quiz.tabs.generate')">
                <div class="example-content">
                  <div class="example-section">
                    <h4 class="example-label">
                      {{ t('home.quiz.inputLabel') }}
                    </h4>
                    <NCard size="small" class="example-card">
                      <pre class="example-text">{{ quizExamples.generate.input }}</pre>
                    </NCard>
                  </div>
                  <div class="example-arrow">
                    →
                  </div>
                  <div class="example-section">
                    <h4 class="example-label">
                      {{ t('home.quiz.outputLabel') }}
                    </h4>
                    <NCard size="small" class="example-card output">
                      <pre class="example-code">{{ quizExamples.generate.output }}</pre>
                    </NCard>
                  </div>
                </div>
              </NTabPane>
              <NTabPane name="parse" :tab="t('home.quiz.tabs.parse')">
                <div class="example-content">
                  <div class="example-section">
                    <h4 class="example-label">
                      {{ t('home.quiz.inputLabel') }}
                    </h4>
                    <NCard size="small" class="example-card">
                      <pre class="example-text">{{ quizExamples.parse.input }}</pre>
                    </NCard>
                  </div>
                  <div class="example-arrow">
                    →
                  </div>
                  <div class="example-section">
                    <h4 class="example-label">
                      {{ t('home.quiz.outputLabel') }}
                    </h4>
                    <NCard size="small" class="example-card output">
                      <pre class="example-code">{{ quizExamples.parse.output }}</pre>
                    </NCard>
                  </div>
                </div>
              </NTabPane>
              <NTabPane name="result" :tab="t('home.quiz.tabs.result')">
                <div class="example-content single">
                  <div class="example-section full">
                    <h4 class="example-label">
                      {{ t('home.quiz.outputLabel') }}
                    </h4>
                    <NCard size="small" class="example-card output exam-paper">
                      <div class="exam-content" v-html="quizExamples.result.output" />
                    </NCard>
                  </div>
                </div>
              </NTabPane>
            </NTabs>
          </div>
        </div>

        <!-- CTA Button -->
        <div class="quiz-cta">
          <NButton
            type="primary"
            size="large"
            class="quiz-cta-button"
            @click="goToSignIn"
          >
            {{ t('home.quiz.cta') }}
          </NButton>
        </div>
      </div>
    </section>

    <!-- Novel Writing Workflow Section -->
    <section id="novel" class="novel-section">
      <div class="container">
        <div class="section-header">
          <h2 class="section-title">
            {{ t('home.novel.title') }}
          </h2>
          <p class="section-subtitle">
            {{ t('home.novel.subtitle') }}
          </p>
        </div>
        <div class="novel-content">
          <!-- Left: Workflow Steps -->
          <div class="novel-workflow">
            <h3 class="subsection-title">
              {{ t('home.novel.workflowTitle') }}
            </h3>
            <div class="workflow-steps">
              <div
                v-for="(step, index) in novelWorkflowSteps"
                :key="index"
                class="workflow-step"
              >
                <div class="step-indicator">
                  <span class="step-number">{{ chineseNumbers[index] }}</span>
                  <div v-if="index < novelWorkflowSteps.length - 1" class="step-line" />
                </div>
                <div class="step-content">
                  <h4 class="step-title">
                    {{ step.title }}
                  </h4>
                  <p class="step-description">
                    {{ step.description }}
                  </p>
                  <div class="step-tags">
                    <span
                      v-for="(tag, tagIndex) in step.tags"
                      :key="tagIndex"
                      class="step-tag"
                    >
                      {{ tag }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Right: AI Team -->
          <div class="novel-ai-team">
            <h3 class="subsection-title">
              {{ t('home.novel.aiTeamTitle') }}
            </h3>
            <div class="ai-team-grid">
              <div
                v-for="(ai, index) in novelAITeam"
                :key="index"
                class="ai-card"
              >
                <div class="ai-icon">
                  {{ ai.icon }}
                </div>
                <h4 class="ai-name">
                  {{ ai.name }}
                </h4>
                <p class="ai-role">
                  {{ ai.role }}
                </p>
                <p class="ai-description">
                  {{ ai.description }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- CTA Button -->
        <div class="novel-cta">
          <NButton
            type="primary"
            size="large"
            class="novel-cta-button"
            @click="goToSignIn"
          >
            {{ t('home.novel.cta') }}
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
        </div>
        <div class="tech-stack-container">
          <!-- First Row - Scroll Left -->
          <div class="tech-stack-row scroll-left">
            <div class="tech-stack-track">
              <div
                v-for="(tech, index) in [...techStackRow1, ...techStackRow1, ...techStackRow1, ...techStackRow1]"
                :key="`row1-${index}`"
                class="tech-card"
              >
                <span class="tech-icon">
                  <Icon v-if="tech.icon.includes(':')" :icon="tech.icon" width="36" height="36" />
                  <span v-else>{{ tech.icon }}</span>
                </span>
                <span class="tech-name">{{ tech.name }}</span>
              </div>
            </div>
          </div>

          <!-- Second Row - Scroll Right -->
          <div class="tech-stack-row scroll-right">
            <div class="tech-stack-track">
              <div
                v-for="(tech, index) in [...techStackRow2, ...techStackRow2, ...techStackRow2, ...techStackRow2]"
                :key="`row2-${index}`"
                class="tech-card"
              >
                <span class="tech-icon">
                  <Icon v-if="tech.icon.includes(':')" :icon="tech.icon" width="36" height="36" />
                  <span v-else>{{ tech.icon }}</span>
                </span>
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
  padding-top: 64px; /* Header height */
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
  min-height: calc(100vh - 64px); /* 100vh - header height */
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
  margin-top: -40px;
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
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
  white-space: nowrap;
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

/* AI Chat Section */
.ai-chat-section {
  padding: 120px 0;
  background: var(--bg-color);
}

.ai-chat-content {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 80px;
  align-items: stretch;
}

.ai-chat-description {
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-top: 10px;
  justify-content: space-between;
}

.ai-chat-title {
  font-size: clamp(32px, 4vw, 48px);
  font-weight: 700;
  color: var(--text-primary);
  line-height: 1.2;
  margin-bottom: 8px;
}

.ai-chat-subtitle {
  font-size: 18px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 16px;
}

.ai-chat-features {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 16px;
}

.ai-chat-feature-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.feature-item-icon {
  width: 24px;
  height: 24px;
  color: #161618;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
  flex-shrink: 0;
}

.dark .feature-item-icon {
  color: #ffffff;
}

.feature-item-text {
  font-size: 16px;
  color: var(--text-primary);
  line-height: 1.5;
}

.ai-chat-cta {
  height: 56px;
  padding: 0 40px;
  font-size: 18px;
  font-weight: 600;
  border-radius: 28px;
  width: 100%;
}

.dark .ai-chat-cta {
  background-color: #ffffff;
  color: #000000;
}

.dark .ai-chat-cta:hover {
  background-color: rgba(255, 255, 255, 0.9);
}

.ai-chat-video {
  position: relative;
}

.video-link {
  display: block;
  text-decoration: none;
  color: inherit;
  transition: all 0.3s;
}

.video-link:hover .video-thumbnail {
  transform: translateY(-4px);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.2);
}

.dark .video-link:hover .video-thumbnail {
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5);
}

.video-thumbnail {
  position: relative;
  width: 100%;
  border-radius: 16px;
  overflow: hidden;
  background: var(--card-bg);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  transition: all 0.3s;
  cursor: pointer;
}

.video-image {
  width: 100%;
  height: auto;
  display: block;
  aspect-ratio: 16 / 9;
  object-fit: cover;
}

.video-play-button {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 68px;
  height: 48px;
  transition: all 0.3s;
}

.video-link:hover .video-play-button {
  transform: translate(-50%, -50%) scale(1.1);
}

.video-duration {
  position: absolute;
  bottom: 12px;
  right: 12px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.video-info {
  margin-top: 16px;
}

.video-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
  line-height: 1.4;
}

.video-description {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.5;
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
  color: #161618;
  font-size: 14px;
  font-weight: 700;
  flex-shrink: 0;
}

.dark .checkmark {
  color: #ffffff;
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
  gap: 60px;
  margin-top: 80px;
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
  font-size: 36px;
}

.tech-name {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
}

@keyframes scroll-left {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-25%);
  }
}

@keyframes scroll-right {
  0% {
    transform: translateX(-25%);
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

/* Novel Writing Workflow Section */
.novel-section {
  padding: 120px 0;
  background: var(--bg-color);
}

.novel-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  margin-top: 60px;
}

.subsection-title {
  font-size: 28px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 32px;
  text-align: center;
}

/* Left: Workflow Steps */
.novel-workflow {
  padding-right: 20px;
}

.workflow-steps {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.workflow-step {
  display: flex;
  gap: 20px;
}

.step-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
}

.step-number {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: transparent;
  color: #161618;
  font-size: 20px;
  font-weight: 700;
}

.dark .step-number {
  color: #ffffff;
}

.step-line {
  width: 2px;
  flex: 1;
  background: linear-gradient(180deg, var(--primary-color) 0%, var(--accent-color) 100%);
  margin: 8px 0;
  min-height: 40px;
}

.step-content {
  flex: 1;
  padding-top: 4px;
}

.step-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.step-description {
  font-size: 15px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 12px;
}

.step-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.step-tag {
  display: inline-block;
  padding: 4px 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
}

/* Right: AI Team */
.novel-ai-team {
  padding-left: 20px;
  border-left: 1px solid var(--border-color);
}

.ai-team-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}

.ai-card {
  padding: 24px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  transition: all 0.3s;
}

.ai-card:hover {
  transform: translateX(4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border-color: var(--primary-color);
}

.dark .ai-card:hover {
  box-shadow: 0 4px 12px rgba(255, 255, 255, 0.05);
}

.ai-icon {
  font-size: 36px;
  margin-bottom: 12px;
}

.ai-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.ai-role {
  font-size: 14px;
  color: var(--primary-color);
  font-weight: 500;
  margin-bottom: 8px;
}

.ai-description {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0;
}

.novel-cta {
  margin-top: 48px;
  text-align: center;
}

.novel-cta-button {
  height: 56px;
  padding: 0 40px;
  font-size: 18px;
  font-weight: 600;
  border-radius: 28px;
}

/* Quiz Workflow Section */
.quiz-section {
  padding: 120px 0;
  background: var(--bg-secondary);
}

.quiz-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  margin-top: 60px;
}

/* Left: Workflow Nodes */
.quiz-workflow {
  padding-right: 20px;
}

.workflow-nodes {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.workflow-node {
  display: flex;
  gap: 20px;
}

.node-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
}

.node-icon {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--card-bg);
  border: 2px solid var(--primary-color);
  font-size: 24px;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.15);
}

.node-line {
  width: 2px;
  flex: 1;
  background: var(--border-color);
  margin: 8px 0;
  min-height: 30px;
}

.node-content {
  flex: 1;
  padding-top: 8px;
}

.node-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.node-description {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0;
}

/* Right: Examples with Tabs */
.quiz-examples {
  padding-left: 20px;
  border-left: 1px solid var(--border-color);
}

.quiz-examples :deep(.n-tabs) {
  --n-tab-text-color-active: var(--primary-color);
  --n-tab-text-color-hover: var(--primary-color);
  --n-bar-color: var(--primary-color);
}

.quiz-examples :deep(.n-tabs-nav) {
  margin-bottom: 24px;
}

.quiz-examples :deep(.n-tabs-tab) {
  padding: 8px 16px;
  font-weight: 500;
}

.example-content {
  display: grid;
  grid-template-columns: 1fr auto 3fr;
  gap: 16px;
  align-items: start;
}

.example-content.single {
  grid-template-columns: 1fr;
}

.example-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.example-section.full {
  width: 100%;
}

.example-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.example-card {
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  max-height: 300px;
  overflow-y: auto;
}

.example-card.output {
  border-color: var(--primary-color);
  border-width: 1.5px;
}

.example-card :deep(.n-card__content) {
  padding: 12px;
}

.example-text {
  margin: 0;
  font-size: 13px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  color: var(--text-secondary);
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.example-code {
  margin: 0;
  font-size: 12px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  color: var(--text-primary);
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  background: transparent;
}

.example-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: var(--primary-color);
  font-weight: bold;
  padding-top: 32px;
}

.quiz-cta {
  margin-top: 48px;
  text-align: center;
}

.quiz-cta-button {
  height: 56px;
  padding: 0 40px;
  font-size: 18px;
  font-weight: 600;
  border-radius: 28px;
}

/* Exam Paper Styles */
.example-card.exam-paper {
  max-height: 500px;
}

.exam-content {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.8;
}

.exam-content :deep(h1) {
  text-align: center;
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.exam-content :deep(h2) {
  text-align: center;
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 20px;
  font-weight: 500;
}

.exam-content :deep(h3) {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-top: 24px;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 2px solid var(--border-color);
}

.exam-content :deep(.question-item) {
  margin-bottom: 20px;
  padding-left: 8px;
}

.exam-content :deep(.question-text) {
  font-size: 14px;
  color: var(--text-primary);
  margin-bottom: 8px;
  line-height: 1.6;
}

.exam-content :deep(.options) {
  margin-left: 20px;
  margin-top: 8px;
}

.exam-content :deep(.option) {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 6px;
  line-height: 1.5;
}

.exam-content :deep(.exam-footer) {
  margin-top: 32px;
  padding-top: 16px;
  border-top: 1px dashed var(--border-color);
  text-align: center;
  font-size: 13px;
  color: var(--text-secondary);
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

  .ai-chat-section,
  .pricing-section,
  .trust-section,
  .faq-section {
    padding: 80px 0;
  }

  .section-header {
    margin-bottom: 32px;
  }

  .ai-chat-content {
    grid-template-columns: 1fr;
    gap: 48px;
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

  .novel-section {
    padding: 80px 0;
  }

  .novel-content {
    grid-template-columns: 1fr;
    gap: 48px;
  }

  .novel-workflow {
    padding-right: 0;
  }

  .novel-ai-team {
    padding-left: 0;
    border-left: none;
    border-top: 1px solid var(--border-color);
    padding-top: 48px;
  }

  .quiz-section {
    padding: 80px 0;
  }

  .quiz-content {
    grid-template-columns: 1fr;
    gap: 48px;
  }

  .quiz-workflow {
    padding-right: 0;
  }

  .quiz-examples {
    padding-left: 0;
    border-left: none;
    border-top: 1px solid var(--border-color);
    padding-top: 48px;
  }

  .example-content {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .example-arrow {
    transform: rotate(90deg);
    padding-top: 0;
  }
}
</style>
