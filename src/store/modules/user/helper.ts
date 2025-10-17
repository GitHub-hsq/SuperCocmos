import { ss } from '@/utils/storage'

const LOCAL_NAME = 'userStorage'

export interface UserInfo {
  avatar: string
  name: string
  description: string
  systemPrompt?: string // 系统提示词
  temperature?: number // 温度参数 0-2
  topP?: number // Top P 参数 0-1
}

export interface UserState {
  userInfo: UserInfo
}

export function defaultSetting(): UserState {
  return {
    userInfo: {
      avatar: 'https://raw.githubusercontent.com/Chanzhaoyu/chatgpt-web/main/src/assets/avatar.jpg',
      name: 'ChenZhaoYu',
      description: '<a href="/" class="text-blue-500">退出登录</a>',
      systemPrompt: '', // 默认空，使用模型默认
      temperature: 1, // 默认1（范围0-2）
      topP: 1, // 默认1（范围0-1）
    },
  }
}

export function getLocalState(): UserState {
  const localSetting: UserState | undefined = ss.get(LOCAL_NAME)
  return { ...defaultSetting(), ...localSetting }
}

export function setLocalState(setting: UserState): void {
  ss.set(LOCAL_NAME, setting)
}
