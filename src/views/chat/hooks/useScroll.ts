import type { Ref } from 'vue'
import { nextTick, ref } from 'vue'
import { throttle } from '@/utils/debounce'

type ScrollElement = HTMLDivElement | null

interface ScrollReturn {
  scrollRef: Ref<ScrollElement>
  scrollToBottom: () => Promise<void>
  scrollToTop: () => Promise<void>
  scrollToBottomIfAtBottom: () => Promise<void>
}

export function useScroll(): ScrollReturn {
  const scrollRef = ref<ScrollElement>(null)

  // 使用节流优化滚动性能
  const throttledScrollToBottom = throttle(async (): Promise<void> => {
    await nextTick()
    if (scrollRef.value) {
      // 🔥 正确的滚动到底部方式：scrollTop = scrollHeight - clientHeight
      // scrollHeight 是内容总高度，clientHeight 是可视区域高度
      const maxScrollTop = scrollRef.value.scrollHeight - scrollRef.value.clientHeight
      scrollRef.value.scrollTop = maxScrollTop
    }
  }, 16) // 约60fps
  const scrollToBottom = async (): Promise<void> => {
    await (throttledScrollToBottom() ?? Promise.resolve())
  }

  const throttledScrollToTop = throttle(async (): Promise<void> => {
    await nextTick()
    if (scrollRef.value)
      scrollRef.value.scrollTop = 0
  }, 16)
  const scrollToTop = async (): Promise<void> => {
    await (throttledScrollToTop() ?? Promise.resolve())
  }

  const throttledScrollToBottomIfAtBottom = throttle(async (): Promise<void> => {
    await nextTick()
    if (scrollRef.value) {
      const threshold = 100 // Threshold, indicating the distance threshold to the bottom of the scroll bar.
      const distanceToBottom = scrollRef.value.scrollHeight - scrollRef.value.scrollTop - scrollRef.value.clientHeight
      if (distanceToBottom <= threshold) {
        // 🔥 正确的滚动到底部方式：scrollTop = scrollHeight - clientHeight
        const maxScrollTop = scrollRef.value.scrollHeight - scrollRef.value.clientHeight
        scrollRef.value.scrollTop = maxScrollTop
      }
    }
  }, 16)
  const scrollToBottomIfAtBottom = async (): Promise<void> => {
    await (throttledScrollToBottomIfAtBottom() ?? Promise.resolve())
  }

  return {
    scrollRef,
    scrollToBottom,
    scrollToTop,
    scrollToBottomIfAtBottom,
  }
}
