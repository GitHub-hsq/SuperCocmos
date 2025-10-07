import type { App } from 'vue'
import { store } from './helper'

export function setupStore(app: App) {
  app.use(store)
}
/**
 * 为了使其他地方 import {useAppStore} from '@/store'
 */
export * from './modules'
