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

        // 🔥 并行加载优化：用户初始化 + 模型加载并行执行，互不阻塞

        // 🔐 步骤 1: 统一初始化（用户同步 + 配置加载 + 会话列表）
        const step1Promise = (async () => {
          console.warn('⏱️ [AppInit] 开始用户初始化...')
          if (!auth0.isAuthenticated.value || !auth0.user.value) {
            this.permissionsLoaded = true
            this.configLoaded = true
            return
          }
          const user = auth0.user.value

          // 🔥 优化：先从 Auth0 token 中提取角色（不依赖后端）
          const auth0Roles = (user['http://supercocmos.com/roles'] as string[]
            || user['https://supercocmos.com/roles'] as string[]
            || []).filter(r => r != null)

          const primaryRole = auth0Roles.includes('admin') ? 'admin' : (auth0Roles[0] || 'user')

          // 先设置用户信息（使用 Auth0 角色）
          authStore.setUserInfo({
            email: user.email || '',
            id: user.sub || '',
            createdAt: new Date().toISOString(),
            avatarUrl: user.picture,
            roles: auth0Roles,
            role: primaryRole,
          })

          try {
            // 🔥 调用统一的初始化接口（后端并行执行）
            const { initializeApp: initApp } = await import('@/api/services/initService')
            const initStartTime = performance.now()

            const initResponse = await initApp(user)

            const initDuration = performance.now() - initStartTime
            console.warn(`🎉 [AppInit] 统一初始化完成: ${initDuration.toFixed(0)}ms`)

            if (initResponse.status === 'Success' && initResponse.data) {
              const { user: userData, config, conversations } = initResponse.data

              // 🔥 不再从后端更新角色（已从 Auth0 token 获取）
              // 只更新其他用户信息
              authStore.setUserInfo({
                ...authStore.userInfo,
                email: userData.email || '',
                id: userData.auth0Id || '',
                createdAt: userData.createdAt,
                avatarUrl: userData.avatarUrl,
                // 保持 Auth0 的角色，不使用后端角色
                roles: auth0Roles,
                role: primaryRole,
              })

              // 🔥 加载配置到 configStore
              if (config) {
                // 映射配置到 store（后端返回的是 snake_case 格式）
                configStore.userSettings = config.userSettings || (config as any).user_settings
                configStore.chatConfig = config.chatConfig || (config as any).chat_config
                configStore.workflowConfig = config.workflowConfig || (config as any).workflow_config
                configStore.loaded = true
              }
              this.configLoaded = true

              // 🔥 加载会话列表到 chatStore
              const { useChatStore } = await import('../chat')
              const chatStore = useChatStore()

              if (conversations && conversations.length > 0) {
                // 将会话数据转换为 chatStore 格式
                type HistoryMode = 'normal' | 'noteToQuestion' | 'noteToStory'
                const historyItems = conversations.map((conv): Chat.History => {
                  // 确保 mode 是有效的类型
                  const mode: HistoryMode = (conv.mode === 'noteToQuestion' || conv.mode === 'noteToStory')
                    ? (conv.mode as HistoryMode)
                    : 'normal'

                  return {
                    uuid: conv.frontend_uuid || conv.id,
                    title: conv.title || '新对话',
                    isEdit: false,
                    mode,
                    backendConversationId: conv.id, // 后端 UUID
                  }
                })

                // 更新 chatStore（直接设置 history 数组）
                chatStore.history = historyItems

                console.warn(`✅ [AppInit] 会话列表已加载: ${conversations.length} 条`)
              }
            }
          }
          catch (error: any) {
            console.error('❌ [AppInit] 统一初始化失败:', error)
            // 初始化失败时，标记为已完成，避免阻塞应用
            this.configLoaded = true
          }

          // 🔥 获取 token 并设置 Cookie + 权限
          try {
            const token = await auth0.getAccessTokenSilently({
              authorizationParams: {
                audience: import.meta.env.VITE_AUTH0_AUDIENCE,
              },
            })

            // 并行执行：设置 Cookie + 权限解码
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
          }
          catch (error: any) {
            console.error('⚠️ [AppInit] 获取 token 失败:', error)
            this.permissionsLoaded = true
          }
        })()

        // 📦 步骤 2: 加载模型列表（并行执行，不阻塞用户初始化）
        const step2Promise = (async () => {
          console.warn('⏱️ [AppInit] 开始加载模型列表...')
          if (!modelStore.isProvidersLoaded) {
            try {
              const loadStart = performance.now()
              const success = await modelStore.loadModelsFromBackend()
              const loadDuration = performance.now() - loadStart
              console.warn(`✅ [AppInit] 模型列表加载${success ? '成功' : '失败'}: ${loadDuration.toFixed(0)}ms`)
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
            console.warn('✅ [AppInit] 模型列表已缓存，跳过加载')
          }
        })()

        // 🔥 等待所有并行任务完成（统一初始化 + 模型加载）
        const parallelStart = performance.now()
        await Promise.all([step1Promise, step2Promise])
        const parallelDuration = performance.now() - parallelStart
        console.warn(`⚡ [AppInit] 并行任务全部完成: ${parallelDuration.toFixed(0)}ms`)

        // ⚙️ 🔥 步骤 5: 启动 SSE 连接（跨设备实时同步，依赖步骤1的 token）
        // 🔥 临时禁用：服务器部署后 SSE 连接不稳定，暂时禁用，保留代码以便后续恢复
        // if (auth0.isAuthenticated.value) {
        //   try {
        //     const { sseManager } = await import('@/services/sseService')

        //     // 检查是否已连接，避免重复连接
        //     const status = sseManager.getStatus()
        //     if (!status.connected) {
        //       // 异步建立连接（不阻塞初始化）
        //       sseManager.connect().catch((error) => {
        //         console.error('❌ [AppInit] SSE 连接失败:', error)
        //       })
        //     }
        //   }
        //   catch (error) {
        //     console.error('❌ [AppInit] SSE 初始化失败:', error)
        //     // SSE 连接失败不阻止应用使用
        //   }
        // }

        this.isInitialized = true

        const totalDuration = performance.now() - performance.now()
        console.warn(`🎉 [AppInit] 应用初始化完成！准备进入主界面`)

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
