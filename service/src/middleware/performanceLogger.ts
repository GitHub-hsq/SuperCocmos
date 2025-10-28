import type { NextFunction, Request, Response } from 'express'

// 🔥 扩展 Request 类型，添加性能追踪字段
interface PerformanceRequest extends Request {
  _perfStart?: number
  _perfCheckpoints?: Array<{ name: string, time: number }>
}

/**
 * 性能监控中间件
 * 读取前端请求时间戳，计算网络延迟和处理时间
 */
export function performanceLogger(req: Request, res: Response, next: NextFunction) {
  const perfReq = req as PerformanceRequest
  const requestArrivalTime = Date.now()
  const startTime = performance.now()

  // 🔥 初始化性能追踪
  perfReq._perfStart = startTime
  perfReq._perfCheckpoints = [{ name: 'Request Arrival', time: startTime }]

  // 🔥 读取前端请求开始时间
  const clientStartTime = req.headers['x-request-start-time']
  const networkLatency = clientStartTime
    ? requestArrivalTime - Number.parseInt(clientStartTime as string, 10)
    : null

  // 只在网络延迟 > 50ms 或处理时间 > 100ms 时输出日志
  const originalSend = res.send

  res.send = function (body: any) {
    const endTime = performance.now()
    const processingTime = Math.round(endTime - startTime)
    const totalTime = networkLatency !== null ? networkLatency + processingTime : processingTime

    // 只在慢速时输出警告
    if (networkLatency !== null && networkLatency > 50) {
      console.warn(`⚠️ [Performance] 网络延迟过长: ${networkLatency}ms (${req.method} ${req.path})`)
    }

    if (processingTime > 100) {
      console.warn(`⚠️ [Performance] 后端处理耗时过长: ${processingTime}ms (${req.method} ${req.path})`)

      // 🔥 输出详细的性能检查点
      if (perfReq._perfCheckpoints && perfReq._perfCheckpoints.length > 1) {
        console.warn(`   📊 性能检查点:`)
        for (let i = 1; i < perfReq._perfCheckpoints.length; i++) {
          const prev = perfReq._perfCheckpoints[i - 1]
          const curr = perfReq._perfCheckpoints[i]
          const duration = Math.round(curr.time - prev.time)
          if (duration > 10) {
            console.warn(`      ${curr.name}: ${duration}ms`)
          }
        }
      }
    }

    if (totalTime > 150) {
      console.warn(`⚠️ [Performance] 总耗时过长: ${totalTime}ms (网络: ${networkLatency || 'N/A'}ms + 处理: ${processingTime}ms) (${req.method} ${req.path})`)
    }

    return originalSend.call(this, body)
  }

  next()
}

/**
 * 添加性能检查点
 */
export function addPerfCheckpoint(req: Request, name: string) {
  const perfReq = req as PerformanceRequest
  if (perfReq._perfCheckpoints) {
    perfReq._perfCheckpoints.push({ name, time: performance.now() })
  }
}

/**
 * 工具函数：在控制器中手动记录性能日志
 * 用于需要详细分析的端点
 */
export function logPerformance(req: Request, label: string, startTime: number) {
  const endTime = performance.now()
  const duration = Math.round(endTime - startTime)

  if (duration > 100) {
    console.warn(`⚠️ [Performance] ${label} 耗时过长: ${duration}ms (${req.method} ${req.path})`)
  }
}

/**
 * 计算网络延迟
 */
export function getNetworkLatency(req: Request): number | null {
  const clientStartTime = req.headers['x-request-start-time']
  if (!clientStartTime)
    return null

  const requestArrivalTime = Date.now()
  return requestArrivalTime - Number.parseInt(clientStartTime as string, 10)
}
