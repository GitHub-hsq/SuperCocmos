<script lang="ts">
import type { Ref } from 'vue'
import { useAuth0 } from '@auth0/auth0-vue'
import { onBeforeMount, ref, watch } from 'vue'
import { getUserPermissions } from '../utils/permissions'

export default {
  name: 'StaticsView',
  setup() {
    const auth0 = useAuth0()
    const permissions: Ref<string[]> = ref([])

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
    }
  },
}
</script>

<template>
  <div class="text-center hero">
    <img class="mb-3 app-logo" src="/logo.png" alt="Vue.js logo" width="120">
    <h1 class="mb-4">
      🔐 管理员面板
    </h1>
    <p class="lead">
      这是只有拥有 <code>read:statics</code> 权限的用户才能访问的私有页面。
    </p>

    <div v-if="user" class="admin-info">
      <div class="alert alert-warning">
        <h5>👤 当前管理员: {{ user.name }}</h5>
        <p><strong>邮箱:</strong> {{ user.email }}</p>
        <p><strong>访问时间:</strong> {{ new Date().toLocaleString() }}</p>
      </div>
    </div>

    <div class="admin-content mt-4">
      <div class="row">
        <div class="permissions-display mt-4">
          <div class="alert alert-info">
            <h6>🔑 你的权限:</h6>
            <span v-for="permission in permissions" :key="permission" class="badge badge-primary mr-2">
              {{ permission }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-info {
  margin: 2rem 0;
}

.admin-content {
  margin-top: 2rem;
}

.card {
  margin-bottom: 1rem;
}

.permissions-display {
  margin-top: 2rem;
}

.badge {
  font-size: 0.8rem;
}
</style>
