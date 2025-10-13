<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

interface MousePosition {
  x: number
  y: number
}

interface Circle {
  x: number
  y: number
  translateX: number
  translateY: number
  size: number
  alpha: number
  targetAlpha: number
  dx: number
  dy: number
  magnetism: number
  color: string
}

interface ParticlesProps {
  className?: string
  quantity?: number
  staticity?: number
  ease?: number
  size?: number
  refresh?: boolean
  color?: string
  vx?: number
  vy?: number
  colors?: string[]
}

const props = withDefaults(defineProps<ParticlesProps>(), {
  className: '',
  quantity: 100,
  staticity: 50,
  ease: 50,
  size: 0.4,
  refresh: false,
  color: '#ffffff',
  vx: 0,
  vy: 0,
  colors: () => ['#ffffff'],
})

const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const ctx = ref<CanvasRenderingContext2D | null>(null)
const circles = ref<Circle[]>([])
const mousePosition = ref<MousePosition>({ x: 0, y: 0 })
const mouse = ref({ x: 0, y: 0 })
const canvasSize = ref({ w: 0, h: 0 })
const dpr = typeof window !== 'undefined' ? window.devicePixelRatio : 1
const rafID = ref<number | null>(null)
const resizeTimeout = ref<ReturnType<typeof setTimeout> | null>(null)

function hexToRgb(hex: string): number[] {
  hex = hex.replace('#', '')
  if (hex.length === 3)
    hex = hex.split('').map(c => c + c).join('')
  const hexInt = Number.parseInt(hex, 16)
  return [(hexInt >> 16) & 255, (hexInt >> 8) & 255, hexInt & 255]
}

function useMousePosition() {
  const handleMouseMove = (event: MouseEvent) => {
    mousePosition.value = { x: event.clientX, y: event.clientY }
  }

  onMounted(() => {
    window.addEventListener('mousemove', handleMouseMove)
  })

  onUnmounted(() => {
    window.removeEventListener('mousemove', handleMouseMove)
  })

  return mousePosition
}

function onMouseMove() {
  if (!canvasRef.value)
    return
  const rect = canvasRef.value.getBoundingClientRect()
  const { w, h } = canvasSize.value
  const x = mousePosition.value.x - rect.left - w / 2
  const y = mousePosition.value.y - rect.top - h / 2
  if (x < w / 2 && x > -w / 2 && y < h / 2 && y > -h / 2) {
    mouse.value = { x, y }
  }
}

function resizeCanvas() {
  if (containerRef.value && canvasRef.value && ctx.value) {
    canvasSize.value = {
      w: containerRef.value.offsetWidth,
      h: containerRef.value.offsetHeight,
    }
    canvasRef.value.width = canvasSize.value.w * dpr
    canvasRef.value.height = canvasSize.value.h * dpr
    canvasRef.value.style.width = `${canvasSize.value.w}px`
    canvasRef.value.style.height = `${canvasSize.value.h}px`
    ctx.value.scale(dpr, dpr)
    circles.value = []
    for (let i = 0; i < (props.quantity || 100); i++) drawCircle(circleParams())
  }
}

function circleParams(): Circle {
  return {
    x: Math.random() * canvasSize.value.w,
    y: Math.random() * canvasSize.value.h,
    translateX: 0,
    translateY: 0,
    size: Math.random() * 2 + (props.size || 0.4),
    alpha: 0,
    targetAlpha: Math.random() * 0.6 + 0.1,
    dx: (Math.random() - 0.5) * 0.1,
    dy: (Math.random() - 0.5) * 0.1,
    magnetism: 0.1 + Math.random() * 4,
    color: (props.colors || ['#ffffff'])[Math.floor(Math.random() * (props.colors || ['#ffffff']).length)],
  }
}

function drawCircle(circle: Circle, update = false) {
  if (!ctx.value)
    return
  const { x, y, translateX, translateY, size, alpha, color } = circle
  const circleRgb = hexToRgb(color)
  ctx.value.translate(translateX, translateY)
  ctx.value.beginPath()
  ctx.value.arc(x, y, size, 0, 2 * Math.PI)
  ctx.value.fillStyle = `rgba(${circleRgb.join(', ')}, ${alpha})`
  ctx.value.fill()
  ctx.value.setTransform(dpr, 0, 0, dpr, 0, 0)
  if (!update)
    circles.value.push(circle)
}

const clearCtx = () => ctx.value?.clearRect(0, 0, canvasSize.value.w, canvasSize.value.h)

function drawParticles() {
  clearCtx()
  for (let i = 0; i < (props.quantity || 100); i++) drawCircle(circleParams())
}

function remapValue(v: number, s1: number, e1: number, s2: number, e2: number) {
  return Math.max(((v - s1) * (e2 - s2)) / (e1 - s1) + s2, 0)
}

function animate() {
  clearCtx()
  circles.value.forEach((c, i) => {
    const edges = [
      c.x + c.translateX - c.size,
      canvasSize.value.w - c.x - c.translateX - c.size,
      c.y + c.translateY - c.size,
      canvasSize.value.h - c.y - c.translateY - c.size,
    ]
    const closestEdge = Math.min(...edges)
    const fade = remapValue(closestEdge, 0, 20, 0, 1)
    c.alpha = c.targetAlpha * fade
    c.x += c.dx + (props.vx || 0)
    c.y += c.dy + (props.vy || 0)
    c.translateX += (mouse.value.x / ((props.staticity || 50) / c.magnetism) - c.translateX) / (props.ease || 50)
    c.translateY += (mouse.value.y / ((props.staticity || 50) / c.magnetism) - c.translateY) / (props.ease || 50)
    drawCircle(c, true)
    if (
      c.x < -c.size
      || c.x > canvasSize.value.w + c.size
      || c.y < -c.size
      || c.y > canvasSize.value.h + c.size
    ) {
      circles.value.splice(i, 1)
      drawCircle(circleParams())
    }
  })
  rafID.value = requestAnimationFrame(animate)
}

function initCanvas() {
  resizeCanvas()
  drawParticles()
}

function handleResize() {
  if (resizeTimeout.value)
    clearTimeout(resizeTimeout.value)
  resizeTimeout.value = setTimeout(() => initCanvas(), 200)
}

// 初始化鼠标位置监听
useMousePosition()

// 监听鼠标位置变化
watch(() => mousePosition.value, () => {
  onMouseMove()
}, { deep: true })

// 监听 refresh 变化
watch(() => props.refresh, () => {
  initCanvas()
})

// 监听颜色变化
watch(() => props.color, () => {
  initCanvas()
})

onMounted(async () => {
  await nextTick()
  if (canvasRef.value) {
    ctx.value = canvasRef.value.getContext('2d')
    initCanvas()
    animate()
  }

  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  if (rafID.value)
    cancelAnimationFrame(rafID.value)
  if (resizeTimeout.value)
    clearTimeout(resizeTimeout.value)
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <div
    ref="containerRef"
    class="pointer-events-none w-full h-full"
    aria-hidden="true"
    :class="className"
  >
    <canvas ref="canvasRef" class="w-full h-full" />
  </div>
</template>
