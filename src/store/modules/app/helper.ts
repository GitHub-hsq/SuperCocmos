import { ss } from '@/utils/storage'

const LOCAL_NAME = 'appSetting'

export type Theme = 'light' | 'dark' | 'auto'

export type Language = 'en-US' | 'zh-CN'

const languageMap: { [key: string]: Language } = {
  'en': 'en-US',
  'en-US': 'en-US',
  'zh': 'zh-CN',
  'zh-CN': 'zh-CN',
}

export type WorkMode = 'chat' | 'novel' | 'quiz'

export interface AppState {
  siderCollapsed: boolean
  rightSiderCollapsed: boolean
  rightSiderWidth: number
  theme: Theme
  language: Language
  showSettingsPage: boolean // 是否显示设置页面
  activeSettingTab: string // 当前激活的设置选项卡
  workMode: WorkMode // 当前工作模式：chat（聊天）或 novel（小说创作）
}

export function defaultSetting(): AppState {
  const language = languageMap[navigator.language]
  return {
    siderCollapsed: false,
    rightSiderCollapsed: true, // 默认收起
    rightSiderWidth: 30, // 默认30%
    theme: 'light', // 🔥 默认主题改为 light
    language,
    showSettingsPage: false, // 默认不显示设置页面
    activeSettingTab: 'General', // 默认显示通用设置
    workMode: 'chat', // 默认为聊天模式
  }
}

export function getLocalSetting(): AppState {
  const localSetting: AppState | undefined = ss.get(LOCAL_NAME)
  return { ...defaultSetting(), ...localSetting }
}

export function setLocalSetting(setting: AppState): void {
  ss.set(LOCAL_NAME, setting)
}
