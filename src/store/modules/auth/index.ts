import type { AuthState, UserInfo } from './helper'
import { defineStore } from 'pinia'
import { store } from '@/store/helper'
import { debounce } from '@/utils/debounce'
import { getLocalState, setLocalState } from './helper'

// 创建防抖的recordState函数
const debouncedRecordState = debounce((state: AuthState) => {
  setLocalState(state)
}, 300)

export const useAuthStore = defineStore('auth-store', {
  state: (): AuthState => getLocalState(),

  getters: {
    isLoggedIn: state => !!state.token,
    getUserEmail: state => state.userInfo?.email || '',
    // isChatGPTAPI 已在 state 中定义，可以直接访问 state.isChatGPTAPI
    // session 已在 state 中定义，可以直接访问 state.session（移除冗余 getter）
  },

  actions: {
    setUserInfo(userInfo: UserInfo) {
      this.userInfo = userInfo
      debouncedRecordState(this.$state)
    },

    setToken(token: string) {
      this.token = token
      debouncedRecordState(this.$state)
    },

    logout() {
      this.userInfo = null
      this.token = ''
      debouncedRecordState(this.$state)
    },

    removeToken() {
      this.token = ''
      debouncedRecordState(this.$state)
    },

    setSession(session: any) {
      this.session = session
      debouncedRecordState(this.$state)
    },

    setIsChatGPTAPI(isChatGPTAPI: boolean) {
      this.isChatGPTAPI = isChatGPTAPI
      debouncedRecordState(this.$state)
    },

    recordState() {
      setLocalState(this.$state)
    },
  },
})

export function useAuthStoreWithOut() {
  return useAuthStore(store)
}
