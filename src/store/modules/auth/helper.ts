import { ss } from '@/utils/storage'

const LOCAL_NAME = 'authStorage'

export interface UserInfo {
  email: string
  id: string
  createdAt: string
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
