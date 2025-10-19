import type { StateTree } from 'pinia'
import { defineStore } from 'pinia'

// 防抖定时器
let debounceTimer: NodeJS.Timeout | null = null

/**
 * 防抖保存状态到localStorage
 * @param state 状态对象
 * @param delay 延迟时间，默认300ms
 */
export function debouncedSave(state: StateTree, delay: number = 300): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }

  debounceTimer = setTimeout(() => {
    try {
      localStorage.setItem('super-cosmos-state', JSON.stringify(state))
    }
    catch (error) {
      console.warn('Failed to save state to localStorage:', error)
    }
  }, delay)
}

/**
 * 从localStorage加载状态
 * @param defaultValue 默认值
 * @returns 解析后的状态对象或默认值
 */
export function loadState<T>(defaultValue: T): T {
  try {
    const savedState = localStorage.getItem('super-cosmos-state')
    if (savedState) {
      return { ...defaultValue, ...JSON.parse(savedState) }
    }
  }
  catch (error) {
    console.warn('Failed to load state from localStorage:', error)
  }
  return defaultValue
}

/**
 * 基础Store类，提供通用的状态管理功能
 */
export abstract class BaseStore {
  protected state: StateTree = {}

  /**
   * 防抖记录状态变化
   * @param state 当前状态
   * @param immediate 是否立即保存
   */
  protected recordState(state: StateTree, immediate: boolean = false): void {
    if (immediate) {
      try {
        localStorage.setItem('super-cosmos-state', JSON.stringify(state))
      }
      catch (error) {
        console.warn('Failed to save state to localStorage:', error)
      }
    }
    else {
      debouncedSave(state)
    }
  }

  /**
   * 清理保存的本地状态
   */
  protected clearPersistedState(): void {
    try {
      localStorage.removeItem('super-cosmos-state')
    }
    catch (error) {
      console.warn('Failed to clear persisted state:', error)
    }
  }

  /**
   * 创建带有持久化功能的Store
   * @param id Store ID
   * @param stateFactory 状态工厂函数
   * @param actions 操作函数
   * @returns Pinia Store
   */
  protected createStore<T extends StateTree>(
    id: string,
    stateFactory: () => T,
    actions: Record<string, (...args: any[]) => any> = {},
  ) {
    const defaultState = stateFactory()
    const initialState = loadState(defaultState)

    return defineStore(id, {
      state: () => initialState,
      actions: {
        ...actions,
        recordState(this: T, immediate: boolean = false) {
          this.recordState(this, immediate)
        },
        clearPersistedState(this: T) {
          this.clearPersistedState()
        },
      },
    })
  }
}

/**
 * 创建带有自动持久化功能的Store
 * @param id Store ID
 * @param stateFactory 状态工厂函数
 * @param actions 操作函数
 * @returns Pinia Store
 */
export function createPersistentStore<T extends StateTree>(
  id: string,
  stateFactory: () => T,
  actions: Record<string, (...args: any[]) => any> = {},
) {
  const defaultState = stateFactory()
  const initialState = loadState(defaultState)

  return defineStore(id, {
    state: () => initialState,
    actions: {
      ...actions,
      recordState(immediate: boolean = false) {
        debouncedSave(this.$state, immediate ? 0 : 300)
      },
      clearPersistedState() {
        try {
          localStorage.removeItem('super-cosmos-state')
        }
        catch (error) {
          console.warn('Failed to clear persisted state:', error)
        }
      },
    },
  })
}
