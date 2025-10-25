<script lang="ts">
import type { Ref } from 'vue'
import { useAuth0 } from '@auth0/auth0-vue'
import { onBeforeMount, ref, watch } from 'vue'
import { getUserPermissions } from '../utils/permissions'

export default {
  name: 'WelcomeView',
  setup() {
    const auth0 = useAuth0()
    const permissions: Ref<string[]> = ref([])
    const hasAdminPermission: Ref<boolean> = ref(false)

    /**
     * 获取用户权限
     * 只在 Auth0 已加载且用户已认证时执行
     */
    const fetchUserPermissions = async (): Promise<void> => {
      // 等待 Auth0 加载完成
      if (auth0.isLoading.value) {
        return
      }

      if (auth0.isAuthenticated.value) {
        try {
          // 传递 getAccessTokenSilently 方法
          const userPermissions: string[] = await getUserPermissions(auth0.getAccessTokenSilently)
          permissions.value = userPermissions
          hasAdminPermission.value = userPermissions.includes('read:statics')
        }
        catch (error) {
          console.error('❌ 获取权限失败:', error)
        }
      }
    }

    // 在组件挂载前检查初始状态
    onBeforeMount(() => {
      // 如果 Auth0 已加载完成且用户已认证，立即获取权限
      if (!auth0.isLoading.value && auth0.isAuthenticated.value) {
        fetchUserPermissions()
      }
    })

    // 监听加载状态变化
    watch(() => auth0.isLoading.value, (isLoading: boolean, wasLoading: boolean) => {
      if (wasLoading && !isLoading && auth0.isAuthenticated.value) {
        fetchUserPermissions()
      }
    })

    return {
      user: auth0.user,
      permissions,
      hasAdminPermission,
    }
  },
}
</script>

<template>
  <div class="text-center hero">
    <img class="mb-3 app-logo" src="/logo.png" alt="Vue.js logo" width="120">
    <h1 class="mb-4">
      欢迎你，{{ user?.name || '用户' }}！
    </h1>
    <p class="lead">
      你已经成功登录到我们的应用程序。
    </p>
    <div v-if="user" class="user-info">
      <p><strong>邮箱:</strong> {{ user.email }}</p>
      <p><strong>登录时间:</strong> {{ new Date().toLocaleString() }}</p>
    </div>

    <!-- 权限信息显示 -->
    <div v-if="permissions.length > 0" class="permissions-info mt-4">
      <h5>你的权限:</h5>
      <ul class="list-unstyled">
        <li v-for="permission in permissions" :key="permission" class="badge badge-primary mr-2">
          {{ permission }}
        </li>
      </ul>
    </div>

    <!-- 根据权限显示不同内容 -->
    <div v-if="hasAdminPermission" class="admin-content mt-4">
      <div class="alert alert-success">
        <h5>🎉 恭喜！你拥有管理员权限</h5>
        <p>
          你可以访问 <router-link to="/statics" class="alert-link">
            管理面板
          </router-link>
        </p>
      </div>
    </div>

    <div v-else class="user-content mt-4">
      <div class="alert alert-info">
        <h5>👋 欢迎使用我们的系统</h5>
        <p>你目前拥有普通用户权限，可以访问个人资料页面。</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.user-info {
  background-color: #f8f9fa;
  padding: 1rem;
  border-radius: 0.5rem;
  margin: 1rem 0;
}

.permissions-info {
  background-color: #e9ecef;
  padding: 1rem;
  border-radius: 0.5rem;
}

.badge {
  font-size: 0.8rem;
}
</style>
