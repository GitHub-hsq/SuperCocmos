import type { Auth0VueClient } from '@auth0/auth0-vue'
import { defineStore } from 'pinia'
import { getUserPermissions, getUserPermissionsFromToken } from '@/utils/permissions'

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
          console.log('⏭️ [AppInit] 应用已初始化，跳过')
        }
        return { success: true }
      }

      this.isInitializing = true
      const startTime = performance.now()
      console.log('🚀 [AppInit] 开始应用初始化...')

      try {
        // 动态导入 store（避免循环依赖）
        const { useModelStore } = await import('../model')
        const { useConfigStore } = await import('../config')
        const { useAuthStore } = await import('../auth')

        const modelStore = useModelStore()
        const configStore = useConfigStore()
        const authStore = useAuthStore()

        // 🔥 并行加载优化：将独立的步骤并行执行
        const parallelStart = performance.now()

        // 🔐 步骤 1: 设置用户信息、同步用户到数据库、加载权限（如果已登录）
        const step1Promise = (async () => {
          if (!auth0.isAuthenticated.value || !auth0.user.value) {
            this.permissionsLoaded = true
            return
          }
          const step1Start = performance.now()
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
            console.log('✅ [AppInit] 用户信息已设置:', {
              email: user.email,
              sub: user.sub,
              roles,
            })
          }

          // 🔥 并行执行：用户同步 + 获取 token（互不依赖）
          const parallelStart = performance.now()

          const syncPromise = (async () => {
            const syncStart = performance.now()
            try {
              const { syncAuth0UserToSupabase } = await import('@/api/services/auth0Service')
              const syncResult = await syncAuth0UserToSupabase(user)
              if (syncResult.success) {
                if (import.meta.env.DEV)
                  console.log('✅ [AppInit] 用户已同步到数据库:', syncResult.data?.username)
              }
            }
            catch (error: any) {
              // 用户同步失败，可能是网络问题或用户已存在
              if (import.meta.env.DEV)
                console.log('⚠️ [AppInit] 用户同步失败（可能已存在）:', error.message)
            }
            const syncEnd = performance.now()
            console.log(`⏱️ [AppInit] 步骤1.1（用户同步）耗时: ${Math.round(syncEnd - syncStart)}ms`)
          })()

          const tokenPromise = (async () => {
            const tokenGetStart = performance.now()
            try {
              const token = await auth0.getAccessTokenSilently({
                authorizationParams: {
                  audience: import.meta.env.VITE_AUTH0_AUDIENCE,
                },
              })
              const tokenGetEnd = performance.now()
              console.log(`⏱️ [AppInit] 步骤1.2（获取 Token）耗时: ${Math.round(tokenGetEnd - tokenGetStart)}ms`)
              return token
            }
            catch (error: any) {
              console.error('⚠️ [AppInit] 获取 token 失败:', error)
              return null
            }
          })()

          // 等待用户同步和 token 获取完成
          const [_, token] = await Promise.all([syncPromise, tokenPromise])
          const parallelEnd = performance.now()
          console.log(`⏱️ [AppInit] 步骤1.1+1.2 并行耗时: ${Math.round(parallelEnd - parallelStart)}ms`)

          // 🔥 并行执行：设置 Cookie + 权限解码（都需要 token，但互不依赖）
          const parallel2Start = performance.now()

          const cookiePromise = (async () => {
            const cookieStart = performance.now()
            if (token) {
              try {
                const { setTokenCookie } = await import('@/api/services/authService')
                await setTokenCookie(token)

                if (import.meta.env.DEV)
                  console.log('✅ [AppInit] Token 已通过后端设置到 HttpOnly Cookie')
              }
              catch (error: any) {
                console.error('⚠️ [AppInit] 设置 token 到 Cookie 失败:', error)
              }
            }
            const cookieEnd = performance.now()
            console.log(`⏱️ [AppInit] 步骤1.3（设置 Cookie）耗时: ${Math.round(cookieEnd - cookieStart)}ms`)
          })()

          const permPromise = (async () => {
            const permStart = performance.now()
            try {
              if (token) {
                this.userPermissions = getUserPermissionsFromToken(token)
              }
              else {
                this.userPermissions = []
              }
              this.permissionsLoaded = true
              if (import.meta.env.DEV)
                console.log('✅ [AppInit] 权限加载完成:', this.userPermissions)
            }
            catch (error: any) {
              console.error('⚠️ [AppInit] 权限加载失败:', error)
              this.permissionsLoaded = true
            }
            const permEnd = performance.now()
            console.log(`⏱️ [AppInit] 步骤1.4（权限解码）耗时: ${Math.round(permEnd - permStart)}ms`)
          })()

          await Promise.all([cookiePromise, permPromise])
          const parallel2End = performance.now()
          console.log(`⏱️ [AppInit] 步骤1.3+1.4 并行耗时: ${Math.round(parallel2End - parallel2Start)}ms`)

          const step1End = performance.now()
          console.log(`⏱️ [AppInit] 步骤1（用户信息+权限）总耗时: ${Math.round(step1End - step1Start)}ms`)
        })()

        // 📦 步骤 2: 加载模型列表
        const step2Promise = (async () => {
          const step2Start = performance.now()
          console.log(`🔄 [AppInit] 检查模型列表加载状态: isProvidersLoaded=${modelStore.isProvidersLoaded}`)

          if (!modelStore.isProvidersLoaded) {
            try {
              console.log('🔄 [AppInit] 开始加载模型列表...')
              const success = await modelStore.loadModelsFromBackend()
              this.modelsLoaded = success
              if (success && import.meta.env.DEV) {
                console.log('✅ [AppInit] 模型列表加载完成:', {
                  供应商数量: modelStore.providers.length,
                  启用的模型: modelStore.enabledModels.length,
                })
              }
              else {
                console.error('❌ [AppInit] 模型列表加载返回失败')
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
              console.log('✅ [AppInit] 模型列表已从内存加载（跳过 API 请求）')
            }
          }
          const step2End = performance.now()
          console.log(`⏱️ [AppInit] 步骤2（模型列表）耗时: ${Math.round(step2End - step2Start)}ms`)
        })()

        // ⚙️ 步骤 3: 加载用户配置（仅在已登录时）
        const step3Promise = (async () => {
          const step3Start = performance.now()
          if (auth0.isAuthenticated.value && !configStore.loaded) {
            try {
              const loadConfig = (configStore as any).loadAllConfig
              if (typeof loadConfig === 'function') {
                await loadConfig()
                if (import.meta.env.DEV)
                  console.log('✅ [AppInit] 用户配置加载完成')
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
              console.log('ℹ️ [AppInit] 未登录，跳过配置加载')
          }
          const step3End = performance.now()
          console.log(`⏱️ [AppInit] 步骤3（用户配置）耗时: ${Math.round(step3End - step3Start)}ms`)
        })()

        // ⚙️ 步骤 4: 用户登录时从数据库同步会话
        const step4Promise = (async () => {
          const step4Start = performance.now()
          if (auth0.isAuthenticated.value) {
            try {
              const { useChatStore } = await import('../chat')
              const chatStore = useChatStore()

              // 🔥 优化：始终从数据库同步会话列表，确保跨设备数据一致性
              console.log('🔄 [AppInit] 从数据库同步会话列表...')

              const result = await chatStore.loadConversationsFromBackend()

              if (result.success && result.count && result.count > 0) {
                console.log(`✅ [AppInit] 已从数据库同步 ${result.count} 个会话`)

                // 🔥 自动加载最新会话的消息（第一个会话）
                const firstConversation = chatStore.history[0]
                if (firstConversation?.backendConversationId) {
                  console.log('🔄 [AppInit] 加载最新会话的消息...')
                  const msgResult = await chatStore.loadConversationMessages(
                    firstConversation.backendConversationId,
                  )
                  if (msgResult.success && import.meta.env.DEV) {
                    console.log(`✅ [AppInit] 最新会话消息加载完成: ${msgResult.count} 条`)
                  }
                }
              }
              else if (result.success && result.count === 0) {
              // 数据库无会话，使用本地缓存作为降级
                const localHasData = chatStore.history.length > 0
                if (localHasData) {
                  console.log('ℹ️ [AppInit] 数据库无会话，使用本地缓存')

                  // 加载本地第一个会话的消息（如果没有）
                  const firstConversation = chatStore.history[0]
                  if (firstConversation) {
                    const chatData = chatStore.chat.find(c => c.uuid === firstConversation.uuid)
                    if (chatData && chatData.data.length === 0 && firstConversation.backendConversationId) {
                      console.log('🔄 [AppInit] 本地会话无消息，从数据库加载...')
                      chatStore.loadConversationMessages(firstConversation.backendConversationId)
                        .then((msgResult) => {
                          if (msgResult.success && import.meta.env.DEV) {
                            console.log(`✅ [AppInit] 会话消息加载完成: ${msgResult.count} 条`)
                          }
                        })
                        .catch(err => console.error('❌ [AppInit] 会话消息加载失败:', err))
                    }
                  }
                }
                else {
                  console.log('ℹ️ [AppInit] 无会话数据，等待用户创建')
                }
              }
              else {
              // 同步失败，使用本地缓存作为降级
                console.log('⚠️ [AppInit] 会话同步失败，使用本地缓存')
              }
            }
            catch (error) {
              console.error('❌ [AppInit] 会话同步失败:', error)
              // 同步失败不阻止应用使用，继续使用本地缓存
              console.log('ℹ️ [AppInit] 降级到本地缓存模式')
            }
          }
          const step4End = performance.now()
          console.log(`⏱️ [AppInit] 步骤4（会话同步）耗时: ${Math.round(step4End - step4Start)}ms`)
        })()

        // 🔥 等待所有并行任务完成
        await Promise.all([step1Promise, step2Promise, step3Promise, step4Promise])
        const parallelEnd = performance.now()
        console.log(`⏱️ [AppInit] 🚀 并行加载总耗时: ${Math.round(parallelEnd - parallelStart)}ms`)

        // ⚙️ 🔥 步骤 5: 启动 SSE 连接（跨设备实时同步，依赖步骤1的 token）
        const step5Start = performance.now()
        if (auth0.isAuthenticated.value) {
          try {
            const { sseManager } = await import('@/services/sseService')

            // 检查是否已连接，避免重复连接
            const status = sseManager.getStatus()
            if (status.connected) {
              console.log('✅ [AppInit] SSE 已连接，跳过')
            }
            else {
              // 异步建立连接（不阻塞初始化）
              sseManager.connect().catch((error) => {
                console.error('❌ [AppInit] SSE 连接失败:', error)
              })

              console.log('✅ [AppInit] SSE 连接请求已发送')
            }
          }
          catch (error) {
            console.error('❌ [AppInit] SSE 初始化失败:', error)
            // SSE 连接失败不阻止应用使用
          }
        }

        this.isInitialized = true
        const totalTime = performance.now() - startTime
        console.log('✅ [AppInit] 应用初始化完成')
        console.log(`⏱️ [AppInit] 📊 总耗时: ${Math.round(totalTime)}ms (${(totalTime / 1000).toFixed(2)}s)`)

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
        console.log('✅ [AppInit] 权限通知已显示')
      }
    },

    /**
     * 重置初始化状态（用于退出登录等场景）
     */
    resetInitialization() {
      this.$reset()
      if (import.meta.env.DEV) {
        console.log('🔄 [AppInit] 初始化状态已重置')
      }
    },
  },
})
