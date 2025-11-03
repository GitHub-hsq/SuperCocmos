import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useAppStore } from '@/store'

/**
 * 右侧栏控制和拖拽调整宽度
 */
export function useRightSider() {
  const appStore = useAppStore()

  // 右侧侧边栏状态
  const rightSiderCollapsed = computed(() => appStore.rightSiderCollapsed)
  const rightSiderWidth = computed(() => appStore.rightSiderWidth)

  // 切换右侧栏显示/隐藏
  function toggleRightSider() {
    appStore.setRightSiderCollapsed(!rightSiderCollapsed.value)
  }

  // 拖拽调整宽度
  const isDragging = ref(false)
  const dragStartX = ref(0)
  const dragStartWidth = ref(0)

  function handleResizeStart(e: MouseEvent) {
    isDragging.value = true
    dragStartX.value = e.clientX
    dragStartWidth.value = rightSiderWidth.value
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  function handleResizeMove(e: MouseEvent) {
    if (!isDragging.value)
      return

    const windowWidth = window.innerWidth
    const deltaX = dragStartX.value - e.clientX // 向左拖动为正
    const deltaPercent = (deltaX / windowWidth) * 100
    const newWidth = dragStartWidth.value + deltaPercent

    appStore.setRightSiderWidth(newWidth)
  }

  function handleResizeEnd() {
    isDragging.value = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }

  // 监听鼠标事件
  onMounted(() => {
    document.addEventListener('mousemove', handleResizeMove)
    document.addEventListener('mouseup', handleResizeEnd)
  })

  onUnmounted(() => {
    document.removeEventListener('mousemove', handleResizeMove)
    document.removeEventListener('mouseup', handleResizeEnd)
  })

  return {
    // 状态
    rightSiderCollapsed,
    rightSiderWidth,
    isDragging,

    // 方法
    toggleRightSider,
    handleResizeStart,
    handleResizeMove,
    handleResizeEnd,
  }
}
