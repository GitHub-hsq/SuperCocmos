/**
 * 防抖工具函数
 */

export interface DebounceOptions {
  leading?: boolean // 是否在延迟开始前调用函数
  maxWait?: number // 最大等待时间
  trailing?: boolean // 是否在延迟结束后调用函数
}

/**
 * 防抖函数
 * @param func 要防抖的函数
 * @param wait 等待时间（毫秒）
 * @param options 选项
 * @returns 防抖后的函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  options: DebounceOptions = {},
): (...args: Parameters<T>) => ReturnType<T> | undefined {
  let timeoutId: NodeJS.Timeout | null = null
  let maxTimeoutId: NodeJS.Timeout | null = null
  let lastCallTime = 0
  let lastInvokeTime = 0
  let result: ReturnType<T> | undefined
  let lastArgs: Parameters<T> | undefined

  const { leading = false, maxWait, trailing = true } = options

  function invokeFunc(time: number): ReturnType<T> | undefined {
    const args = lastArgs!
    lastArgs = undefined
    lastInvokeTime = time
    result = func(...args)
    return result
  }

  function shouldInvoke(time: number): boolean {
    const timeSinceLastCall = time - lastCallTime
    const timeSinceLastInvoke = time - lastInvokeTime

    // 首次调用
    return (
      lastCallTime === 0
      || timeSinceLastCall >= wait
      || timeSinceLastCall < 0
      || (maxWait !== undefined && timeSinceLastInvoke >= maxWait)
    )
  }

  function trailingEdge(time: number): ReturnType<T> | undefined {
    timeoutId = null

    if (trailing && lastArgs) {
      return invokeFunc(time)
    }
    lastArgs = undefined
    return result
  }

  function timerExpired(): ReturnType<T> | undefined {
    const time = Date.now()
    if (shouldInvoke(time)) {
      return trailingEdge(time)
    }
    // 重新启动计时器
    const remainingWait = wait - (time - lastCallTime)
    timeoutId = setTimeout(timerExpired, remainingWait)
    return result
  }

  function leadingEdge(time: number): ReturnType<T> | undefined {
    // 重置最后调用时间
    lastInvokeTime = time
    // 开始计时器
    timeoutId = setTimeout(timerExpired, wait)
    // 如果配置了leading，立即调用函数
    return leading ? invokeFunc(time) : result
  }

  function cancel(): void {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }
    if (maxTimeoutId !== null) {
      clearTimeout(maxTimeoutId)
    }
    timeoutId = null
    maxTimeoutId = null
    lastInvokeTime = 0
    lastCallTime = 0
    lastArgs = undefined
  }

  function flush(): ReturnType<T> | undefined {
    if (timeoutId === null) {
      return result
    }
    const time = Date.now()
    return trailingEdge(time)
  }

  function pending(): boolean {
    return timeoutId !== null
  }

  function debouncedFn(...args: Parameters<T>): ReturnType<T> | undefined {
    const time = Date.now()
    const isInvoking = shouldInvoke(time)

    lastArgs = args
    lastCallTime = time

    if (isInvoking) {
      if (timeoutId === null) {
        return leadingEdge(time)
      }
      if (maxWait !== undefined) {
        // 处理最大等待时间
        timeoutId = setTimeout(timerExpired, wait)
        maxTimeoutId = setTimeout(() => {
          if (lastArgs) {
            invokeFunc(Date.now())
          }
        }, maxWait)
      }
    }
    if (timeoutId === null) {
      timeoutId = setTimeout(timerExpired, wait)
    }
    return result
  }

  debouncedFn.cancel = cancel
  debouncedFn.flush = flush
  debouncedFn.pending = pending

  return debouncedFn
}

/**
 * 节流函数
 * @param func 要节流的函数
 * @param wait 等待时间（毫秒）
 * @param options 选项
 * @returns 节流后的函数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  options: DebounceOptions = {},
): (...args: Parameters<T>) => ReturnType<T> | undefined {
  return debounce(func, wait, { ...options, leading: true, trailing: true })
}

/**
 * 创建防抖的Promise
 * @param func 返回Promise的函数
 * @param wait 等待时间
 * @param options 选项
 * @returns 防抖后的函数
 */
export function debouncePromise<T extends (...args: any[]) => Promise<any>>(
  func: T,
  wait: number,
  options: DebounceOptions = {},
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  const pendingPromises: Array<{
    resolve: (value: any) => void
    reject: (reason?: any) => void
  }> = []

  const debouncedFn = debounce(
    async (...args: Parameters<T>) => {
      try {
        const result = await func(...args)
        // Resolve all pending promises
        pendingPromises.forEach(({ resolve }) => resolve(result))
        pendingPromises.length = 0
        return result
      }
      catch (error) {
        // Reject all pending promises
        pendingPromises.forEach(({ reject }) => reject(error))
        pendingPromises.length = 0
        throw error
      }
    },
    wait,
    options,
  )

  return (...args: Parameters<T>): Promise<ReturnType<T>> => {
    return new Promise((resolve, reject) => {
      pendingPromises.push({ resolve, reject })
      debouncedFn(...args)
    })
  }
}
