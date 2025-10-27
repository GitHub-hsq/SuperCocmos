import type { Auth0VueClient } from '@auth0/auth0-vue'
import { defineStore } from 'pinia'
import { getUserPermissions } from '@/utils/permissions'

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
        if (import.meta.env.DEV) {
          console.warn('⏭️ [AppInit] 应用已初始化，跳过')
        }
        return { success: true }
      }

      this.isInitializing = true
      console.warn('🚀 [AppInit] 开始应用初始化...')

      try {
        // 动态导入 store（避免循环依赖）
        const { useModelStore } = await import('../model')
        const { useConfigStore } = await import('../config')
        const { useAuthStore } = await import('../auth')

        const modelStore = useModelStore()
        const configStore = useConfigStore()
        const authStore = useAuthStore()

        // 🔐 步骤 1: 设置用户信息、同步用户到数据库、加载权限（如果已登录）
        if (auth0.isAuthenticated.value && auth0.user.value) {
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

          if (import.meta.env.DEV) {
            console.warn('✅ [AppInit] 用户信息已设置:', {
              email: user.email,
              sub: user.sub,
              roles,
            })
          }

          // 🔥 确保用户已同步到数据库（解决首次登录 401 问题）
          try {
            const { syncAuth0UserToSupabase } = await import('@/api/services/auth0Service')
            const syncResult = await syncAuth0UserToSupabase(user)
            if (syncResult.success) {
              if (import.meta.env.DEV)
                console.warn('✅ [AppInit] 用户已同步到数据库:', syncResult.data?.username)
            }
          }
          catch (error: any) {
            // 用户同步失败，可能是网络问题或用户已存在
            if (import.meta.env.DEV)
              console.warn('⚠️ [AppInit] 用户同步失败（可能已存在）:', error.message)
          }

          // 🔥 设置 token 到 Cookie（用于 SSE 认证）
          // 方案 A：调用后端 API，让后端设置 HttpOnly Cookie（更安全）
          try {
            const token = await auth0.getAccessTokenSilently({
              authorizationParams: {
                audience: import.meta.env.VITE_AUTH0_AUDIENCE,
              },
            })

            if (token) {
              // 调用后端 API 设置 HttpOnly Cookie
              const { setTokenCookie } = await import('@/api/services/authService')
              await setTokenCookie(token)

              if (import.meta.env.DEV)
                console.warn('✅ [AppInit] Token 已通过后端设置到 HttpOnly Cookie')
            }
          }
          catch (error: any) {
            console.error('⚠️ [AppInit] 设置 token 到 Cookie 失败:', error)
            // 不影响应用初始化，SSE 可能会降级到 URL 参数认证
          }

          // 加载权限
          try {
            this.userPermissions = await getUserPermissions(auth0.getAccessTokenSilently)
            this.permissionsLoaded = true
            if (import.meta.env.DEV)
              console.warn('✅ [AppInit] 权限加载完成:', this.userPermissions)
          }
          catch (error: any) {
            // 权限加载失败不影响应用使用
            if (!error?.message?.includes('Consent required'))
              console.error('⚠️ [AppInit] 权限加载失败:', error)

            this.permissionsLoaded = true // 标记为已尝试加载
          }
        }
        else {
          // 未登录，标记为已加载（空权限）
          this.permissionsLoaded = true
        }

        // 📦 步骤 2: 加载模型列表
        if (!modelStore.isProvidersLoaded) {
          try {
            const success = await modelStore.loadModelsFromBackend()
            this.modelsLoaded = success
            if (success && import.meta.env.DEV) {
              console.warn('✅ [AppInit] 模型列表加载完成:', {
                供应商数量: modelStore.providers.length,
                启用的模型: modelStore.enabledModels.length,
              })
            }
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
          if (import.meta.env.DEV) {
            console.warn('✅ [AppInit] 模型列表已从缓存加载')
          }
        }

        // ⚙️ 步骤 3: 加载用户配置（仅在已登录时）
        if (auth0.isAuthenticated.value && !configStore.loaded) {
          try {
            const loadConfig = (configStore as any).loadAllConfig
            if (typeof loadConfig === 'function') {
              await loadConfig()
              if (import.meta.env.DEV)
                console.warn('✅ [AppInit] 用户配置加载完成')
            }
            this.configLoaded = true
          }
          catch (error: any) {
            // 配置加载失败不阻止应用
            if (import.meta.env.DEV)
              console.error('❌ [AppInit] 用户配置加载失败:', error.message)
            this.configLoaded = true // 标记但不阻止
          }
        }
        else {
          this.configLoaded = true
          if (import.meta.env.DEV && !auth0.isAuthenticated.value)
            console.warn('ℹ️ [AppInit] 未登录，跳过配置加载')
        }

        // ⚙️ 步骤 4: 用户登录时从数据库同步会话
        if (auth0.isAuthenticated.value) {
          try {
            const { useChatStore } = await import('../chat')
            const chatStore = useChatStore()

            // 🔥 方案 B: 从数据库加载用户会话（跨设备同步）
            console.warn('🔄 [AppInit] 开始从数据库同步会话...')

            // 检查 localStorage 是否过期或为空
            const localHasData = chatStore.history.length > 0

            if (!localHasData) {
              // localStorage 无数据或已过期，从数据库加载
              console.warn('ℹ️ [AppInit] 本地无会话数据，从数据库加载')
              const result = await chatStore.loadConversationsFromBackend()

              if (result.success && result.count && result.count > 0) {
                console.warn(`✅ [AppInit] 已从数据库加载 ${result.count} 个会话`)
              }
              else {
                console.warn('ℹ️ [AppInit] 数据库无会话，等待用户创建')
              }
            }
            else {
              // 本地有数据，优先使用本地数据（性能考虑）
              // 可选：后台静默同步（不阻塞初始化）
              console.warn('ℹ️ [AppInit] 使用本地缓存会话')

              // 可选：后台同步检查（注释掉可提升启动速度）
              // chatStore.loadConversationsFromBackend().then(result => {
              //   if (result.success && result.count > 0) {
              //     console.warn('✅ [AppInit] 后台会话同步完成')
              //   }
              // }).catch(err => {
              //   console.error('❌ [AppInit] 后台会话同步失败:', err)
              // })
            }
          }
          catch (error) {
            console.error('❌ [AppInit] 会话同步失败:', error)
            // 同步失败不阻止应用使用，继续使用本地缓存
          }
        }

        // ⚙️ 🔥 步骤 5: 启动 SSE 连接（跨设备实时同步）
        if (auth0.isAuthenticated.value) {
          try {
            const { sseManager } = await import('@/services/sseService')

            console.warn('🔄 [AppInit] 启动 SSE 连接...')

            // 异步建立连接（不阻塞初始化）
            sseManager.connect().catch((error) => {
              console.error('❌ [AppInit] SSE 连接失败:', error)
            })

            console.warn('✅ [AppInit] SSE 连接请求已发送')
          }
          catch (error) {
            console.error('❌ [AppInit] SSE 初始化失败:', error)
            // SSE 连接失败不阻止应用使用
          }
        }

        this.isInitialized = true
        console.warn('✅ [AppInit] 应用初始化完成')

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
     */
    showPermissionNotification(notificationApi: any, userName?: string) {
      if (this.permissionNotificationShown) {
        return
      }

      this.permissionNotificationShown = true

      notificationApi.success({
        title: '🔐 登录成功',
        description: userName || '用户',
        content: this.userPermissions.length > 0
          ? `您的权限：${this.userPermissions.join(', ')}`
          : '当前账号暂无特殊权限',
        meta: new Date().toLocaleString(),
        duration: 0, // 需要手动关闭
        closable: true,
      })

      if (import.meta.env.DEV) {
        console.warn('✅ [AppInit] 权限通知已显示')
      }
    },

    /**
     * 重置初始化状态（用于退出登录等场景）
     */
    resetInitialization() {
      this.$reset()
      if (import.meta.env.DEV) {
        console.warn('🔄 [AppInit] 初始化状态已重置')
      }
    },
  },
})
