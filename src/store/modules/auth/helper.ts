import { ss } from '@/utils/storage'

const LOCAL_NAME = 'authStorage'

export interface UserInfo {
  email: string
  id: string
  createdAt: string
  role?: string // 用户主要角色（Admin, Pro, Ultra, Free 等）
  roles?: string[] // 用户所有角色数组
}

export interface AuthState {
  userInfo: UserInfo | null
  token: string
  session?: any
  isChatGPTAPI?: boolean
}

export function defaultSetting(): AuthState {
  return {
    userInfo: null,
    token: '',
  }
}

export function getLocalState(): AuthState {
  const localSetting: AuthState | undefined = ss.get(LOCAL_NAME)
  return { ...defaultSetting(), ...localSetting }
}

export function setLocalState(setting: AuthState): void {
  ss.set(LOCAL_NAME, setting)
}
