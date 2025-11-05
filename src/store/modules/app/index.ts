import type { AppState, Language, Theme, WorkMode } from './helper'
import { defineStore } from 'pinia'
import { store } from '@/store/helper'
import { getLocalSetting, setLocalSetting } from './helper'
/**
 * 定义appStore，就行defineProps定义一个props
 */
export const useAppStore = defineStore('app-store', {
  state: (): AppState => getLocalSetting(),
  actions: {
    setSiderCollapsed(collapsed: boolean) {
      this.siderCollapsed = collapsed
      this.recordState()
    },

    setRightSiderCollapsed(collapsed: boolean) {
      this.rightSiderCollapsed = collapsed
      this.recordState()
    },

    setRightSiderWidth(width: number) {
      // 限制宽度在 20% - 50% 之间
      this.rightSiderWidth = Math.max(20, Math.min(50, width))
      this.recordState()
    },

    setTheme(theme: Theme) {
      this.theme = theme
      this.recordState()
    },

    setLanguage(language: Language) {
      if (this.language !== language) {
        this.language = language
        this.recordState()
      }
    },

    setShowSettingsPage(show: boolean) {
      this.showSettingsPage = show
      this.recordState()
    },

    setActiveSettingTab(tab: string) {
      this.activeSettingTab = tab
      this.recordState()
    },

    setWorkMode(mode: WorkMode) {
      this.workMode = mode
      this.recordState()
    },

    recordState() {
      setLocalSetting(this.$state)
    },
  },
})
/**
 * 为了在组件外也能使用appStore，需要导出useAppStoreWithOut
 * 上面是在组件里使用，下面这个是在组件外使用，两个本质是同一个实例
 */
export function useAppStoreWithOut() {
  return useAppStore(store)
}
