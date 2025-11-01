import type { Auth0VueClient } from '@auth0/auth0-vue'
import { defineStore } from 'pinia'
import { getUserPermissionsFromToken } from '@/utils/permissions'

interface AppInitState {
  // 初始化标记
  isInitialized: boolean
  isInitializing: boolean

  // 权限相关
  permissionsLoaded: boolean
  userPermissions: string[]
  permissionNotificationShown: boolean

  // 模型相关
  modelsLoaded: boolean

  // 配置相关
  configLoaded: boolean

  // 错误状态
  initError: string | null
}

export const useAppInitStore = defineStore('app-init', {
  state: (): AppInitState => ({
    isInitialized: false,
    isInitializing: false,
    permissionsLoaded: false,
    userPermissions: [],
    permissionNotificationShown: false,
    modelsLoaded: false,
    configLoaded: false,
    initError: null,
  }),

  getters: {
    /**
     * 是否完全初始化完成
     */
    isFullyInitialized(state): boolean {
      return state.isInitialized
        && state.permissionsLoaded
        && state.modelsLoaded
        && state.configLoaded
    },

    /**
     * 检查是否有特定权限
     */
    hasPermission: state => (permission: string) => {
      return state.userPermissions.includes(permission)
    },

    /**
     * 检查是否有任一权限
     */
    hasAnyPermission: state => (permissions: string[]) => {
      return permissions.some(perm => state.userPermissions.includes(perm))
    },

    /**
     * 检查是否有所有权限
     */
    hasAllPermissions: state => (permissions: string[]) => {
      return permissions.every(perm => state.userPermissions.includes(perm))
    },
  },

  actions: {
    /**
     * 应用级初始化（只执行一次）
     * 在路由守卫中调用
     *
     * @param auth0 - Auth0 客户端实例（必须从 setup 上下文传入）
     */
    async initializeApp(auth0: Auth0VueClient) {
      // 防止重复初始化
      if (this.isInitialized || this.isInitializing) {
        return { success: true }
      }

      this.isInitializing = true

      try {
        // 动态导入 store（避免循环依赖）
        const { useModelStore } = await import('../model')
        const { useConfigStore } = await import('../config')
        const { useAuthStore } = await import('../auth')

        const modelStore = useModelStore()
        const configStore = useConfigStore()
        const authStore = useAuthStore()

        // 🔥 并行加载优化：将独立的步骤并行执行

        // 🔐 步骤 1: 设置用户信息、同步用户到数据库、加载权限（如果已登录）
        const step1Promise = (async () => {
          if (!auth0.isAuthenticated.value || !auth0.user.value) {
            this.permissionsLoaded = true
            return
          }
          const user = auth0.user.value

          // 提取角色信息（支持两种命名空间）
          const roles = (user['http://supercocmos.com/roles'] as string[]
            || user['https://supercocmos.com/roles'] as string[]
            || [])

          // 设置用户信息到 authStore
          authStore.setUserInfo({
            email: user.email || '',
            id: user.sub || '',
            createdAt: new Date().toISOString(),
            avatarUrl: user.picture,
            roles, // 🔥 保存角色数组
            role: roles[0] || 'Free', // 主要角色
          })

          // 🔥 并行执行：用户同步 + 获取 token（互不依赖）
          const syncPromise = (async () => {
            try {
              const { syncAuth0UserToSupabase } = await import('@/api/services/auth0Service')
              await syncAuth0UserToSupabase(user)
            }
            catch {
              // 用户同步失败，可能是网络问题或用户已存在
            }
          })()

          const tokenPromise = (async () => {
            try {
              const token = await auth0.getAccessTokenSilently({
                authorizationParams: {
                  audience: import.meta.env.VITE_AUTH0_AUDIENCE,
                },
              })
              return token
            }
            catch (error: any) {
              console.error('⚠️ [AppInit] 获取 token 失败:', error)
              return null
            }
          })()

          // 等待用户同步和 token 获取完成
          const [_, token] = await Promise.all([syncPromise, tokenPromise])

          // 🔥 并行执行：设置 Cookie + 权限解码（都需要 token，但互不依赖）
          const cookiePromise = (async () => {
            if (token) {
              try {
                const { setTokenCookie } = await import('@/api/services/authService')
                await setTokenCookie(token)
              }
              catch (error: any) {
                console.error('⚠️ [AppInit] 设置 token 到 Cookie 失败:', error)
              }
            }
          })()

          const permPromise = (async () => {
            try {
              if (token) {
                this.userPermissions = getUserPermissionsFromToken(token)
              }
              else {
                this.userPermissions = []
              }
              this.permissionsLoaded = true
            }
            catch (error: any) {
              console.error('⚠️ [AppInit] 权限加载失败:', error)
              this.permissionsLoaded = true
            }
          })()

          await Promise.all([cookiePromise, permPromise])
        })()

        // 📦 步骤 2: 加载模型列表
        const step2Promise = (async () => {
          if (!modelStore.isProvidersLoaded) {
            try {
              const success = await modelStore.loadModelsFromBackend()
              this.modelsLoaded = success
            }
            catch (error) {
              console.error('❌ [AppInit] 模型列表加载失败:', error)
              this.initError = '模型列表加载失败'
              // 模型加载失败，标记但不阻止应用
              this.modelsLoaded = true
            }
          }
          else {
            this.modelsLoaded = true
          }
        })()

        // ⚙️ 步骤 3: 加载用户配置（仅在已登录时）
        const step3Promise = (async () => {
          if (auth0.isAuthenticated.value && !configStore.loaded) {
            try {
              const loadConfig = (configStore as any).loadAllConfig
              if (typeof loadConfig === 'function') {
                await loadConfig()
              }
              this.configLoaded = true
            }
            catch {
            // 配置加载失败不阻止应用
              this.configLoaded = true // 标记但不阻止
            }
          }
          else {
            this.configLoaded = true
          }
        })()

        // ⚙️ 步骤 4: 用户登录时从数据库同步会话
        const step4Promise = (async () => {
          if (auth0.isAuthenticated.value) {
            try {
              const { useChatStore } = await import('../chat')
              const chatStore = useChatStore()

              // 🔥 优化：始终从数据库同步会话列表，确保跨设备数据一致性
              const result = await chatStore.loadConversationsFromBackend()

              if (result.success && result.count && result.count > 0) {
                // 🔥 只有当 active 不为 null 时才加载消息（首次登录时 active 为 null，不加载）
                if (chatStore.active) {
                  const activeConversation = chatStore.history.find(
                    h => h.uuid === chatStore.active,
                  )

                  if (activeConversation?.backendConversationId) {
                    await chatStore.loadConversationMessages(
                      activeConversation.backendConversationId,
                    )
                  }
                }
              }
              else if (result.success && result.count === 0) {
              // 数据库无会话，使用本地缓存作为降级
                const localHasData = chatStore.history.length > 0
                if (localHasData) {
                  // 加载本地第一个会话的消息（如果没有）
                  const firstConversation = chatStore.history[0]
                  if (firstConversation) {
                    const chatData = chatStore.chat.find(c => c.uuid === firstConversation.uuid)
                    if (chatData && chatData.data.length === 0 && firstConversation.backendConversationId) {
                      chatStore.loadConversationMessages(firstConversation.backendConversationId)
                        .catch(err => console.error('❌ [AppInit] 会话消息加载失败:', err))
                    }
                  }
                }
              }
            }
            catch (error) {
              console.error('❌ [AppInit] 会话同步失败:', error)
              // 同步失败不阻止应用使用，继续使用本地缓存
            }
          }
        })()

        // 🔥 等待所有并行任务完成
        await Promise.all([step1Promise, step2Promise, step3Promise, step4Promise])

        // ⚙️ 🔥 步骤 5: 启动 SSE 连接（跨设备实时同步，依赖步骤1的 token）
        if (auth0.isAuthenticated.value) {
          try {
            const { sseManager } = await import('@/services/sseService')

            // 检查是否已连接，避免重复连接
            const status = sseManager.getStatus()
            if (!status.connected) {
              // 异步建立连接（不阻塞初始化）
              sseManager.connect().catch((error) => {
                console.error('❌ [AppInit] SSE 连接失败:', error)
              })
            }
          }
          catch (error) {
            console.error('❌ [AppInit] SSE 初始化失败:', error)
            // SSE 连接失败不阻止应用使用
          }
        }

        this.isInitialized = true

        return { success: true }
      }
      catch (error: any) {
        console.error('❌ [AppInit] 应用初始化失败:', error)
        this.initError = error.message || '初始化失败'
        return { success: false, error: error.message }
      }
      finally {
        this.isInitializing = false
      }
    },

    /**
     * 显示权限通知（只显示一次）
     * 🔥 已禁用：用户不需要弹窗
     */
    showPermissionNotification(_notificationApi: any, _userName?: string) {
      // 🔥 不显示弹窗

    },

    /**
     * 重置初始化状态（用于退出登录等场景）
     */
    resetInitialization() {
      this.$reset()
    },
  },
})
