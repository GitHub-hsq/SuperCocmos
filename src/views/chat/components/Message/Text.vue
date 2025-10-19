<script lang="ts" setup>
import MdKatex from '@vscode/markdown-it-katex'
import hljs from 'highlight.js'
import MarkdownIt from 'markdown-it'
import MdLinkAttributes from 'markdown-it-link-attributes'
import MdMermaid from 'mermaid-it-markdown'
import { computed, onMounted, onUnmounted, onUpdated, ref } from 'vue'
import { useBasicLayout } from '@/hooks/useBasicLayout'
import { t } from '@/locales'
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

const textRef = ref<HTMLElement>()

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

const wrapClass = computed(() => {
  return [
    'text-wrap',
    'min-w-[20px]',
    props.inversion ? 'user-message-rounded' : 'rounded-md',
    isMobile.value ? 'p-2' : 'px-4 py-2',
    props.inversion ? 'bg-[#f4f4f4]' : 'bg-transparent',
    props.inversion ? 'dark:bg-[#f4f4f4]' : 'dark:bg-transparent',
    props.inversion ? 'message-request' : 'message-reply',
    // 限制用户消息最多占2/3宽度
    props.inversion ? 'max-w-[65%]' : '',
    { 'text-red-500': props.error },
  ]
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

// 🔥 检查是否是思考过程
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
})

onUpdated(() => {
  addCopyEvents()
})

onUnmounted(() => {
  removeCopyEvents()
})
</script>

<template>
  <div class="text-black" :class="wrapClass">
    <div ref="textRef" class="leading-relaxed break-words">
      <div v-if="!inversion">
        <!-- 🔥 思考过程特殊显示 -->
        <div v-if="isThinking" class="thinking-content">
          <div class="thinking-header">
            <span class="thinking-icon">💭</span>
            <span class="thinking-title">思考中...</span>
          </div>
          <div class="thinking-text" v-text="text.replace('💭 思考中...\n', '')" />
        </div>
        <!-- 普通内容 -->
        <div v-else-if="!asRawText" class="markdown-body" :class="{ 'markdown-body-generate': loading }" v-html="text" />
        <div v-else class="whitespace-pre-wrap text-base" v-text="text" />
      </div>
      <div v-else class="whitespace-pre-wrap text-base" v-text="text" />
    </div>
  </div>
</template>

<style lang="less">
@import url(./style.less);

.user-message-rounded {
  border-radius: 15px;
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
    font-weight: 600;
    color: #475569;
    
    .thinking-icon {
      font-size: 18px;
      animation: pulse 2s infinite;
    }
    
    .thinking-title {
      font-size: 14px;
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
    border-left: 3px solid #3b82f6;
    min-height: 60px; // 🔥 设置最小高度
    max-height: 400px; // 🔥 增大最大高度
    overflow-y: auto;
    white-space: pre-wrap; // 🔥 保持换行格式
    word-wrap: break-word; // 🔥 自动换行
  }
}

// 暗色主题
.dark .thinking-content {
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  border-color: #475569;
  
  .thinking-header {
    color: #cbd5e1;
  }
  
  .thinking-text {
    color: #94a3b8;
    background: rgba(0, 0, 0, 0.3);
    border-left-color: #60a5fa;
    font-size: 14px; // 🔥 暗色主题也使用大字体
    padding: 16px; // 🔥 暗色主题也使用大内边距
    min-height: 60px; // 🔥 暗色主题也设置最小高度
    max-height: 400px; // 🔥 暗色主题也设置最大高度
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
