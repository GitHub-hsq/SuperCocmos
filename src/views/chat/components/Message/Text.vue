<script lang="ts" setup>
import MdKatex from '@vscode/markdown-it-katex'
import hljs from 'highlight.js'
import MarkdownIt from 'markdown-it'
import MdLinkAttributes from 'markdown-it-link-attributes'
import MdMermaid from 'mermaid-it-markdown'
import { computed, nextTick, onMounted, onUnmounted, onUpdated, ref, watch } from 'vue'
import { useBasicLayout } from '@/hooks/useBasicLayout'
import { t } from '@/locales'
import { useConfigStore } from '@/store'
import { copyToClip } from '@/utils/copy'

interface Props {
  inversion?: boolean
  error?: boolean
  text?: string
  loading?: boolean
  asRawText?: boolean
}

const props = defineProps<Props>()

const { isMobile } = useBasicLayout()
const configStore = useConfigStore()

// 🔥 检查是否启用文本缩进
const textIndentEnabled = computed(() => {
  return (configStore.chatConfig as Config.ChatConfig | null)?.textIndentEnabled ?? false
})

const textRef = ref<HTMLElement>()
const wrapperRef = ref<HTMLElement>()
const isUserMessageMultiline = ref(false)
let resizeObserver: ResizeObserver | null = null
let singleLineThreshold = 0
const USER_MESSAGE_DEFAULT_HEIGHT = 40

const mdi = new MarkdownIt({
  html: false,
  linkify: true,
  highlight(code, language) {
    const validLang = !!(language && hljs.getLanguage(language))
    if (validLang) {
      const lang = language ?? ''
      return highlightBlock(hljs.highlight(code, { language: lang }).value, lang)
    }
    return highlightBlock(hljs.highlightAuto(code).value, '')
  },
})

mdi.use(MdLinkAttributes, { attrs: { target: '_blank', rel: 'noopener' } }).use(MdKatex).use(MdMermaid)

const userMessageRadiusClass = computed(() => {
  if (!props.inversion)
    return ''
  return isUserMessageMultiline.value ? 'user-message-multiline' : 'user-message-single-line'
})

const wrapClass = computed(() => {
  return [
    'text-wrap',
    'min-w-[20px]',
    props.inversion ? 'min-h-[40px]' : '',
    props.inversion ? userMessageRadiusClass.value : 'rounded-md',
    isMobile.value ? 'p-2' : 'px-4 py-2',
    props.inversion ? 'bg-[#f4f4f4]' : 'bg-transparent',
    props.inversion ? 'dark:bg-[#2a2a2a]' : 'dark:bg-transparent',
    props.inversion ? 'message-request' : 'message-reply',
    // 限制用户消息最多占2/3宽度
    props.inversion ? 'max-w-[65%]' : '',
    { 'text-red-500': props.error },
  ]
})

watch(
  () => props.inversion,
  (isInversion) => {
    if (isInversion) {
      nextTick(() => {
        evaluateUserMessageHeight()
        setupUserMessageObserver()
      })
    }
    else {
      teardownUserMessageObserver()
    }
  },
)

watch(isMobile, () => {
  if (!props.inversion)
    return
  singleLineThreshold = 0
  nextTick(() => {
    evaluateUserMessageHeight()
  })
})

const text = computed(() => {
  const value = props.text ?? ''
  if (!props.asRawText) {
    // 🔥 检查是否是思考过程
    if (value.startsWith('💭 思考中...')) {
      // 思考过程使用特殊样式，不进行 markdown 渲染
      return value
    }
    // 对数学公式进行处理，自动添加 $$ 符号
    const escapedText = escapeBrackets(escapeDollarNumber(value))
    return mdi.render(escapedText)
  }
  return value
})

// 🔥 检查是否是等待状态（loading 且内容是"思考中..."）
const isLoading = computed(() => {
  const thinkingText = t('chat.thinking') // 支持多语言
  return props.loading && (props.text === thinkingText || props.text === '思考中...' || props.text === 'Thinking...')
})

// 🔥 检查是否是思考过程（后端返回的思考内容）
const isThinking = computed(() => {
  return props.text?.startsWith('💭 思考中...') || false
})

function highlightBlock(str: string, lang?: string) {
  return `<pre class="code-block-wrapper"><div class="code-block-header"><span class="code-block-header__lang">${lang}</span><span class="code-block-header__copy">${t('chat.copyCode')}</span></div><code class="hljs code-block-body ${lang}">${str}</code></pre>`
}

function addCopyEvents() {
  if (textRef.value) {
    const copyBtn = textRef.value.querySelectorAll('.code-block-header__copy')
    copyBtn.forEach((btn) => {
      btn.addEventListener('click', () => {
        const code = btn.parentElement?.nextElementSibling?.textContent
        if (code) {
          copyToClip(code).then(() => {
            btn.textContent = t('chat.copied')
            setTimeout(() => {
              btn.textContent = t('chat.copyCode')
            }, 1000)
          })
        }
      })
    })
  }
}

function removeCopyEvents() {
  if (textRef.value) {
    const copyBtn = textRef.value.querySelectorAll('.code-block-header__copy')
    copyBtn.forEach((btn) => {
      btn.removeEventListener('click', () => { })
    })
  }
}

function escapeDollarNumber(text: string) {
  let escapedText = ''

  for (let i = 0; i < text.length; i += 1) {
    let char = text[i]
    const nextChar = text[i + 1] || ' '

    if (char === '$' && nextChar >= '0' && nextChar <= '9')
      char = '\\$'

    escapedText += char
  }

  return escapedText
}

function escapeBrackets(text: string) {
  const pattern = /(```[\s\S]*?```|`.*?`)|\\\[([\s\S]*?[^\\])\\\]|\\\((.*?)\\\)/g
  return text.replace(pattern, (match, codeBlock, squareBracket, roundBracket) => {
    if (codeBlock)
      return codeBlock
    else if (squareBracket)
      return `$$${squareBracket}$$`
    else if (roundBracket)
      return `$${roundBracket}$`
    return match
  })
}

onMounted(() => {
  addCopyEvents()
  nextTick(() => {
    evaluateUserMessageHeight()
    setupUserMessageObserver()
  })
})

onUpdated(() => {
  addCopyEvents()
  nextTick(() => {
    evaluateUserMessageHeight()
  })
})

onUnmounted(() => {
  removeCopyEvents()
  teardownUserMessageObserver()
})

function evaluateUserMessageHeight(height?: number) {
  if (!props.inversion || !wrapperRef.value) {
    isUserMessageMultiline.value = false
    return
  }

  const currentHeight = height ?? wrapperRef.value.offsetHeight
  if (currentHeight <= 0)
    return

  const tolerance = 0
  singleLineThreshold = Math.max(calculateSingleLineThreshold(), USER_MESSAGE_DEFAULT_HEIGHT)

  const baseline = singleLineThreshold || USER_MESSAGE_DEFAULT_HEIGHT
  isUserMessageMultiline.value = currentHeight > baseline + tolerance
}

function setupUserMessageObserver() {
  if (!props.inversion || !wrapperRef.value || typeof ResizeObserver === 'undefined' || resizeObserver)
    return

  resizeObserver = new ResizeObserver((entries) => {
    entries.forEach((entry) => {
      evaluateUserMessageHeight(entry.contentRect.height)
    })
  })
  resizeObserver.observe(wrapperRef.value)
}

function teardownUserMessageObserver() {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  singleLineThreshold = 0
}

function calculateSingleLineThreshold() {
  if (typeof window === 'undefined' || !wrapperRef.value)
    return 0

  const style = window.getComputedStyle(wrapperRef.value)
  const textStyle = textRef.value ? window.getComputedStyle(textRef.value) : null

  const lineHeightSources = [
    Number.parseFloat(style.lineHeight),
    textStyle ? Number.parseFloat(textStyle.lineHeight) : Number.NaN,
  ].filter(value => Number.isFinite(value) && value > 0) as number[]

  const lineHeight = lineHeightSources.length ? lineHeightSources[0] : 24
  const paddingTop = Number.parseFloat(style.paddingTop) || 0
  const paddingBottom = Number.parseFloat(style.paddingBottom) || 0
  const borderTop = Number.parseFloat(style.borderTopWidth) || 0
  const borderBottom = Number.parseFloat(style.borderBottomWidth) || 0
  const minHeight = Number.parseFloat(style.minHeight) || 0

  const estimatedHeight = lineHeight + paddingTop + paddingBottom + borderTop + borderBottom
  const baseHeight = minHeight > 0
    ? Math.max(minHeight, estimatedHeight)
    : estimatedHeight

  return Math.max(USER_MESSAGE_DEFAULT_HEIGHT, baseHeight)
}
</script>

<template>
  <div ref="wrapperRef" class="text-black dark:text-[var(--dark-text-primary)]" :class="wrapClass">
    <div ref="textRef" class="leading-relaxed break-words">
      <div v-if="!inversion">
        <!-- 🔥 等待状态：显示小圆点动画 -->
        <div v-if="isLoading" class="loading-indicator">
          <div class="loading-dot" />
        </div>
        <!-- 🔥 思考过程特殊显示 -->
        <div v-else-if="isThinking" class="thinking-content">
          <div class="thinking-header">
            <div class="thinking-dot" />
          </div>
          <div class="thinking-text" v-text="text.replace('💭 思考中...\n', '')" />
        </div>
        <!-- 普通内容 -->
        <div v-else-if="!asRawText" class="markdown-body" :class="{ 'markdown-body-generate': loading, 'text-indent-enabled': textIndentEnabled }" v-html="text" />
        <div v-else class="whitespace-pre-wrap text-base" v-text="text" />
      </div>
      <div v-else class="whitespace-pre-wrap text-base" v-text="text" />
    </div>
  </div>
</template>

<style lang="less">
@import url(./style.less);

.user-message-single-line {
  border-radius: 20px / 50%;
  min-height: 40px;
  display: inline-flex;
  align-items: center;
}

.user-message-multiline {
  border-radius: 18px;
  min-height: 40px;
}

// 🔥 等待状态样式（loading 时显示小圆点）
.loading-indicator {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 8px 0;

  .loading-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background-color: #161618;
    animation: loading-pulse 1.5s ease-in-out infinite;
  }
}

// 暗色主题下的等待状态
.dark .loading-indicator {
  .loading-dot {
    background-color: #c9d1d9;
  }
}

@keyframes loading-pulse {
  0% {
    transform: scale(0.666);
    opacity: 0.8;
  }
  50% {
    transform: scale(1);
    opacity: 1;
  }
  100% {
    transform: scale(0.666);
    opacity: 0.8;
  }
}

// 🔥 思考过程样式
.thinking-content {
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  padding: 16px;
  margin: 8px 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  min-height: 120px; // 🔥 设置最小高度，让思考窗口更大

  .thinking-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    height: 24px;

    .thinking-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: #161618;
      animation: thinking-pulse 1.5s ease-in-out infinite;
    }
  }

  .thinking-text {
    font-size: 14px; // 🔥 增大字体
    line-height: 1.6;
    color: #64748b;
    font-style: italic;
    background: rgba(255, 255, 255, 0.7);
    padding: 16px; // 🔥 增大内边距
    border-radius: 8px;
    border-left: 3px solid #161618;
    min-height: 60px; // 🔥 设置最小高度
    max-height: 400px; // 🔥 增大最大高度
    overflow-y: auto;
    white-space: pre-wrap; // 🔥 保持换行格式
    word-wrap: break-word; // 🔥 自动换行
  }
}

@keyframes thinking-pulse {
  0% {
    transform: scale(0.5);
    opacity: 0.8;
  }
  50% {
    transform: scale(1);
    opacity: 1;
  }
  100% {
    transform: scale(0.5);
    opacity: 0.8;
  }
}

// 暗色主题
.dark .thinking-content {
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  border-color: #475569;

  .thinking-header {
    .thinking-dot {
      background-color: #c9d1d9;
    }
  }

  .thinking-text {
    color: #94a3b8;
    background: rgba(0, 0, 0, 0.3);
    border-left-color: #c9d1d9;
    font-size: 14px;
    padding: 16px;
    min-height: 60px;
    max-height: 400px;
  }
}
</style>
