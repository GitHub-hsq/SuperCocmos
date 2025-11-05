<script setup lang="ts">
import { useAuth0 } from '@auth0/auth0-vue'
import { NButton } from 'naive-ui'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import Logo from '@/assets/icons/Logo.vue'
import ChatIcon from '@/components/icons/ChatIcon.vue'
import ChevronIcon from '@/components/icons/ChevronIcon.vue'
import CodeIcon from '@/components/icons/CodeIcon.vue'
import DocumentIcon from '@/components/icons/DocumentIcon.vue'
import RocketIcon from '@/components/icons/RocketIcon.vue'
import ShieldIcon from '@/components/icons/ShieldIcon.vue'
import SparklesIcon from '@/components/icons/SparklesIcon.vue'

const { t } = useI18n()
const router = useRouter()
const { loginWithRedirect, isAuthenticated } = useAuth0()

const hoveredDropdown = ref<string | null>(null)
const activeDropdown = ref<string | null>(null)
const previousDropdown = ref<string | null>(null)
const dropdownLeft = ref('0px')
const firstDropdownRef = ref<HTMLElement | null>(null)
const animationDirection = ref<'left' | 'right' | ''>('')
const isAnimating = ref(false)
const isScrolled = ref(false)

const dropdownMenus = computed(() => ({
  products: [
    {
      icon: ChatIcon,
      title: t('home.nav.dropdowns.products.aiChat.title'),
      description: t('home.nav.dropdowns.products.aiChat.description'),
      href: '/chat',
    },
    {
      icon: CodeIcon,
      title: t('home.nav.dropdowns.products.codeAnalysis.title'),
      description: t('home.nav.dropdowns.products.codeAnalysis.description'),
      href: '#',
    },
    {
      icon: DocumentIcon,
      title: t('home.nav.dropdowns.products.knowledgeBase.title'),
      description: t('home.nav.dropdowns.products.knowledgeBase.description'),
      href: '#',
    },
  ],
  solutions: [
    {
      icon: RocketIcon,
      title: t('home.nav.dropdowns.solutions.developers.title'),
      description: t('home.nav.dropdowns.solutions.developers.description'),
      href: '#',
    },
    {
      icon: SparklesIcon,
      title: t('home.nav.dropdowns.solutions.teams.title'),
      description: t('home.nav.dropdowns.solutions.teams.description'),
      href: '#',
    },
    {
      icon: ShieldIcon,
      title: t('home.nav.dropdowns.solutions.enterprise.title'),
      description: t('home.nav.dropdowns.solutions.enterprise.description'),
      href: '#',
    },
  ],
  resources: [
    {
      icon: DocumentIcon,
      title: t('home.nav.dropdowns.resources.documentation.title'),
      description: t('home.nav.dropdowns.resources.documentation.description'),
      href: '#',
    },
    {
      icon: SparklesIcon,
      title: t('home.nav.dropdowns.resources.tutorials.title'),
      description: t('home.nav.dropdowns.resources.tutorials.description'),
      href: '#',
    },
    {
      icon: ChatIcon,
      title: t('home.nav.dropdowns.resources.community.title'),
      description: t('home.nav.dropdowns.resources.community.description'),
      href: '#',
    },
  ],
}))

const navItems = computed(() => [
  { label: t('home.nav.features'), href: '#features' },
  { label: t('home.nav.pricing'), href: '#pricing' },
  { label: t('home.nav.faq'), href: '#faq' },
])

const dropdownKeys = ['products', 'solutions', 'resources']

const currentMenuContent = computed(() => {
  if (!activeDropdown.value)
    return []
  return dropdownMenus.value[activeDropdown.value as keyof typeof dropdownMenus.value] || []
})

function scrollToSection(href: string) {
  // Validate that href is a valid selector (not just '#')
  if (!href || href === '#' || href.length <= 1) {
    return
  }

  try {
    const element = document.querySelector(href)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }
  catch (error) {
    console.warn(`Invalid selector: ${href}`, error)
  }
}

function handleGetStarted() {
  if (isAuthenticated.value) {
    router.push('/chat')
  }
  else {
    loginWithRedirect({
      appState: {
        target: '/chat',
      },
    })
  }
}

let leaveTimeout: ReturnType<typeof setTimeout> | null = null

function handleDropdownEnter(key: string) {
  // 清除任何待处理的离开定时器
  if (leaveTimeout) {
    clearTimeout(leaveTimeout)
    leaveTimeout = null
  }
  hoveredDropdown.value = key

  // 如果已经有活动的dropdown，确定动画方向
  if (activeDropdown.value && activeDropdown.value !== key) {
    const prevIndex = dropdownKeys.indexOf(activeDropdown.value)
    const newIndex = dropdownKeys.indexOf(key)

    if (newIndex > prevIndex) {
      // 向右移动，新内容从右边进入
      animationDirection.value = 'right'
    }
    else {
      // 向左移动，新内容从左边进入
      animationDirection.value = 'left'
    }

    previousDropdown.value = activeDropdown.value
    isAnimating.value = true

    // 动画完成后重置
    setTimeout(() => {
      isAnimating.value = false
      previousDropdown.value = null
      animationDirection.value = ''
    }, 300)
  }
  else {
    // 首次打开，无动画
    animationDirection.value = ''
  }

  activeDropdown.value = key
}

function handleDropdownLeave(key: string) {
  // 延迟关闭，给鼠标移动到弹窗的时间
  leaveTimeout = setTimeout(() => {
    if (activeDropdown.value === key) {
      activeDropdown.value = null
      hoveredDropdown.value = null
    }
  }, 100)
}

function handleMenuEnter(key: string) {
  // 清除任何待处理的离开定时器
  if (leaveTimeout) {
    clearTimeout(leaveTimeout)
    leaveTimeout = null
  }
  activeDropdown.value = key
}

function handleMenuLeave(_key: string) {
  leaveTimeout = setTimeout(() => {
    activeDropdown.value = null
    hoveredDropdown.value = null
  }, 100)
}

function handleMenuItemClick(href: string) {
  activeDropdown.value = null
  hoveredDropdown.value = null

  // Ignore placeholder links
  if (href === '#') {
    return
  }

  if (href.startsWith('#')) {
    scrollToSection(href)
  }
  else if (href === '/chat') {
    handleGetStarted()
  }
}

function updateDropdownPosition() {
  if (firstDropdownRef.value) {
    const rect = firstDropdownRef.value.getBoundingClientRect()
    dropdownLeft.value = `${rect.left}px`
  }
}

function handleScroll() {
  // 使用 requestAnimationFrame 优化性能
  requestAnimationFrame(() => {
    isScrolled.value = window.scrollY > 10
  })
}

onMounted(() => {
  // 计算第一个dropdown的位置
  updateDropdownPosition()

  // 监听窗口resize事件
  window.addEventListener('resize', updateDropdownPosition)

  // 监听滚动事件，使用 passive 提高性能
  window.addEventListener('scroll', handleScroll, { passive: true })

  // 初始检查
  handleScroll()
})

onUnmounted(() => {
  // 移除事件监听器
  window.removeEventListener('resize', updateDropdownPosition)
  window.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <header class="home-header" :class="{ 'is-scrolled': isScrolled }">
    <div class="header-container">
      <div class="header-content">
        <!-- Logo -->
        <div class="header-logo">
          <Logo icon-color="currentColor" custom-class="logo-icon" />
          <span class="logo-text">SuperCocmos</span>
        </div>

        <!-- Navigation -->
        <nav class="header-nav">
          <!-- Dropdown menus -->
          <div
            v-for="(_, key, menuIndex) in dropdownMenus"
            :key="key"
            :ref="menuIndex === 0 ? (el: any) => { firstDropdownRef = el } : undefined"
            class="nav-dropdown"
            @mouseenter="handleDropdownEnter(key)"
            @mouseleave="handleDropdownLeave(key)"
          >
            <span
              class="nav-link nav-link-with-icon"
              :class="{ 'nav-link-active': hoveredDropdown === key || activeDropdown === key }"
            >
              {{ t(`home.nav.${key}`) }}
              <ChevronIcon
                :size="14"
                :direction="activeDropdown === key ? 'down' : 'right'"
              />
            </span>
          </div>

          <!-- Single shared dropdown menu -->
          <Transition name="dropdown-fade">
            <div
              v-if="activeDropdown"
              class="dropdown-menu"
              :style="{ left: dropdownLeft }"
              @mouseenter="handleMenuEnter(activeDropdown!)"
              @mouseleave="handleMenuLeave(activeDropdown!)"
            >
              <Transition
                :name="`slide-${animationDirection}`"
                mode="out-in"
              >
                <div :key="activeDropdown" class="dropdown-content">
                  <a
                    v-for="(item, index) in currentMenuContent"
                    :key="index"
                    class="dropdown-item"
                    :href="item.href"
                    @click.prevent="handleMenuItemClick(item.href)"
                  >
                    <div class="dropdown-item-icon">
                      <component :is="item.icon" :size="20" />
                    </div>
                    <div class="dropdown-item-text">
                      <div class="dropdown-item-title">
                        {{ item.title }}
                      </div>
                      <div class="dropdown-item-description">
                        {{ item.description }}
                      </div>
                    </div>
                  </a>
                </div>
              </Transition>
            </div>
          </Transition>

          <!-- Regular links -->
          <a
            v-for="item in navItems"
            :key="item.href"
            :href="item.href"
            class="nav-link"
            @click.prevent="scrollToSection(item.href)"
          >
            {{ item.label }}
          </a>
        </nav>

        <!-- Actions -->
        <div class="header-actions">
          <NButton
            type="primary"
            class="get-started-btn"
            @click="handleGetStarted"
          >
            {{ t('home.nav.getStarted') }}
          </NButton>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.home-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  width: 100%;
  background: var(--bg-color);
  border-bottom: 1px solid transparent;
  backdrop-filter: blur(10px);
  transition: all 0.3s;
}

.home-header.is-scrolled {
  border-bottom: 1px solid var(--border-color);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  background: rgba(255, 255, 255, 0.98);
}

.dark .home-header.is-scrolled {
  border-bottom: 1px solid var(--border-color);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
  background: rgba(0, 0, 0, 0.98);
}

.header-container {
  max-width: 1400px;
  margin: 0 auto;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  padding: 0 24px;
}

.header-logo {
  display: flex;
  align-items: center;
  gap: 6px;
}

.logo-icon {
  width: 32px;
  height: 32px;
  color: var(--text-primary);
}

.logo-text {
  font-size: 20px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.02em;
}

.header-nav {
  display: flex;
  align-items: center;
  flex: 1;
  justify-content: flex-start;
  padding-left: 32px;
  position: relative;
}

.nav-dropdown {
  position: static;
  cursor: pointer;
}

.nav-link {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-secondary);
  text-decoration: none;
  transition: all 0.3s;
  cursor: pointer;
  padding: 8px 16px;
  border-radius: 24px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.nav-link:hover {
  color: var(--text-primary);
  background-color: #e3e3e3;
}

.nav-link-active {
  background-color: #e3e3e3;
  color: var(--text-primary);
}

.dark .nav-link:hover {
  background-color: rgba(255, 255, 255, 0.08);
}

.dark .nav-link-active {
  background-color: rgba(255, 255, 255, 0.08);
}

.dropdown-menu {
  position: fixed;
  top: 64px;
  width: 427px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  padding: 8px;
  z-index: 1000;
  overflow: hidden;
}

.dark .dropdown-menu {
  background: rgba(20, 20, 20, 0.95);
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(20px);
}

/* Dropdown fade animation */
.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: opacity 0.2s ease;
}

.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
}

.dropdown-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* Slide animations */
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.3s ease;
}

/* 从左边进入 */
.slide-left-enter-from {
  transform: translateX(-100%);
  opacity: 0;
}

.slide-left-enter-to {
  transform: translateX(0);
  opacity: 1;
}

.slide-left-leave-from {
  transform: translateX(0);
  opacity: 1;
}

.slide-left-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

/* 从右边进入 */
.slide-right-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.slide-right-enter-to {
  transform: translateX(0);
  opacity: 1;
}

.slide-right-leave-from {
  transform: translateX(0);
  opacity: 1;
}

.slide-right-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}

/* 无方向时的淡入淡出 */
.slide--enter-active,
.slide--leave-active {
  transition: opacity 0.2s ease;
}

.slide--enter-from,
.slide--leave-to {
  opacity: 0;
}

.slide--enter-to,
.slide--leave-from {
  opacity: 1;
}

.dropdown-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 10px;
  transition: all 0.2s;
  cursor: pointer;
  text-decoration: none;
}

.dropdown-item:hover {
  background: #ffffff;
}

.dark .dropdown-item:hover {
  background: rgba(255, 255, 255, 0.08);
}

.dropdown-item-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: rgba(128, 128, 128, 0.1);
  color: #808080;
  flex-shrink: 0;
  transition: all 0.2s;
}

.dropdown-item:hover .dropdown-item-icon {
  background: rgba(128, 128, 128, 0.2);
  color: #000000;
}

.dark .dropdown-item-icon {
  background: rgba(128, 128, 128, 0.15);
  color: #a0a0a0;
}

.dark .dropdown-item:hover .dropdown-item-icon {
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

.dropdown-item-text {
  flex: 1;
  min-width: 0;
}

.dropdown-item-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 2px;
  line-height: 1.4;
  transition: color 0.2s;
}

.dropdown-item:hover .dropdown-item-title {
  color: var(--text-primary);
}

.dark .dropdown-item:hover .dropdown-item-title {
  color: #ffffff;
}

.dropdown-item-description {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.4;
  opacity: 0.8;
  transition: all 0.2s;
}

.dropdown-item:hover .dropdown-item-description {
  color: var(--text-secondary);
  opacity: 1;
}

.dark .dropdown-item:hover .dropdown-item-description {
  color: rgba(255, 255, 255, 0.7);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.get-started-btn {
  height: 40px;
  padding: 0 24px;
  font-weight: 600;
  border-radius: 20px;
}

.dark .get-started-btn {
  background-color: #ffffff;
  color: #000000;
}

.dark .get-started-btn:hover {
  background-color: rgba(255, 255, 255, 0.9);
}

/* Responsive */
@media (max-width: 768px) {
  .header-nav {
    display: none;
  }

  .header-content {
    height: 56px;
  }

  .logo-icon {
    width: 28px;
    height: 28px;
  }

  .logo-text {
    font-size: 18px;
  }

  .get-started-btn {
    height: 36px;
    padding: 0 16px;
    font-size: 14px;
  }
}

@media (max-width: 1024px) {
  .dropdown-menu {
    width: 360px;
  }

  .header-nav {
    gap: 24px;
    padding-left: 24px;
  }
}

@media (max-width: 768px) {
  .dropdown-menu {
    width: calc(100vw - 48px);
    left: 24px !important;
  }
}
</style>
