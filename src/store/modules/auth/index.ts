import { defineStore } from 'pinia'
import type { AuthState, UserInfo } from './helper'
import { getLocalState, setLocalState } from './helper'
import { store } from '@/store/helper'

export const useAuthStore = defineStore('auth-store', {
  state: (): AuthState => getLocalState(),

  getters: {
    isLoggedIn: state => !!state.token,
    getUserEmail: state => state.userInfo?.email || '',
    isChatGPTAPI: state => state.isChatGPTAPI || false,
    session: state => state.session || null,
  },

  actions: {
    setUserInfo(userInfo: UserInfo) {
      this.userInfo = userInfo
      this.recordState()
    },

    setToken(token: string) {
      this.token = token
      this.recordState()
    },

    logout() {
      this.userInfo = null
      this.token = ''
      this.recordState()
    },

    removeToken() {
      this.token = ''
      this.recordState()
    },

    setSession(session: any) {
      this.session = session
      this.recordState()
    },

    setIsChatGPTAPI(isChatGPTAPI: boolean) {
      this.isChatGPTAPI = isChatGPTAPI
      this.recordState()
    },

    recordState() {
      setLocalState(this.$state)
    },
  },
})

export function useAuthStoreWithOut() {
  return useAuthStore(store)
}
