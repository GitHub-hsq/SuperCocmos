<script setup lang="ts">
import { useAuth0 } from '@auth0/auth0-vue'
import { NButton, NCard, NSpace, NTag } from 'naive-ui'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getUserPermissions } from '@/utils/permissions'

const router = useRouter()
const { user, logout, getAccessTokenSilently } = useAuth0()

const permissions = ref<string[]>([])
const isLoading = ref(true)

// 用户信息（处理可能为 undefined 的情况）
const userPicture = computed(() => user.value?.picture || '')
const userName = computed(() => user.value?.name || '未设置')
const userEmail = computed(() => user.value?.email || '未设置')
const userSub = computed(() => user.value?.sub || '未设置')

// 加载用户权限（优先使用缓存）
onMounted(async () => {
  try {
    const w = window as any
    const cachedPermissions = w.__user_permissions_cache__

    if (cachedPermissions && cachedPermissions.length > 0) {
      // 使用缓存的权限
      permissions.value = cachedPermissions
    }
    else {
      // 没有缓存，重新获取
      const userPermissions = await getUserPermissions(getAccessTokenSilently)
      permissions.value = userPermissions
      // 缓存权限
      w.__user_permissions_cache__ = userPermissions
    }
  }
  catch (error) {
    console.error('❌ 加载权限失败:', error)
    // 尝试使用缓存（即使出错）
    const w = window as any
    if (w.__user_permissions_cache__) {
      permissions.value = w.__user_permissions_cache__
    }
  }
  finally {
    isLoading.value = false
  }
})

// 检查是否有管理员权限
const hasAdminPermission = computed(() => {
  return permissions.value.includes('read:admin')
})

// 返回首页
function goHome() {
  router.push('/')
}

// 退出登录
function handleLogout() {
  logout({
    logoutParams: {
      returnTo: window.location.origin,
    },
  })
}
</script>

<template>
  <div class="admin-panel">
    <div class="container">
      <!-- 页面标题 -->
      <div class="page-header">
        <h1 class="page-title">
          🔐 管理员面板
        </h1>
        <p class="page-subtitle">
          这是一个需要 <code>read:admin</code> 权限才能访问的页面
        </p>
      </div>

      <!-- 用户信息卡片 -->
      <NCard title="用户信息" class="mb-4">
        <div class="user-info-grid">
          <div class="info-item">
            <div class="info-label">
              头像
            </div>
            <img
              v-if="userPicture"
              :src="userPicture"
              :alt="userName"
              class="user-avatar"
            >
          </div>

          <div class="info-item">
            <div class="info-label">
              姓名
            </div>
            <div class="info-value">
              {{ userName }}
            </div>
          </div>

          <div class="info-item">
            <div class="info-label">
              邮箱
            </div>
            <div class="info-value">
              {{ userEmail }}
            </div>
          </div>

          <div class="info-item">
            <div class="info-label">
              用户 ID
            </div>
            <div class="info-value">
              {{ userSub }}
            </div>
          </div>
        </div>
      </NCard>

      <!-- 权限列表卡片 -->
      <NCard title="用户权限" class="mb-4">
        <div v-if="isLoading">
          加载中...
        </div>
        <div v-else-if="permissions.length > 0">
          <NSpace>
            <NTag
              v-for="perm in permissions"
              :key="perm"
              type="success"
              round
            >
              {{ perm }}
            </NTag>
          </NSpace>
        </div>
        <div v-else class="no-permissions">
          ⚠️ 当前用户没有任何权限
        </div>

        <!-- 权限检查结果 -->
        <div class="mt-4">
          <div class="permission-check">
            <span class="check-label">是否有管理员权限：</span>
            <NTag :type="hasAdminPermission ? 'success' : 'error'" round>
              {{ hasAdminPermission ? '✅ 是' : '❌ 否' }}
            </NTag>
          </div>
        </div>
      </NCard>

      <!-- 操作按钮 -->
      <NSpace>
        <NButton type="primary" @click="goHome">
          返回首页
        </NButton>
        <NButton @click="handleLogout">
          退出登录
        </NButton>
      </NSpace>

      <!-- 权限说明 -->
      <div class="permission-note">
        <h3>💡 权限测试说明</h3>
        <p>
          如果你能看到这个页面，说明你拥有 <code>read:admin</code> 权限。
        </p>
        <p>
          如果没有权限，路由守卫会自动重定向到 <strong>403</strong> 页面。
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-panel {
  min-height: 100vh;
  background: var(--n-color);
  padding: 40px 0;
}

.container {
  max-width: 900px;
  margin: 0 auto;
  padding: 0 24px;
}

.page-header {
  margin-bottom: 40px;
  text-align: center;
}

.page-title {
  font-size: 36px;
  font-weight: 700;
  margin-bottom: 12px;
}

.page-subtitle {
  font-size: 18px;
  color: #666;
}

.page-subtitle code {
  padding: 2px 8px;
  background: #f0f0f0;
  border-radius: 4px;
  font-family: monospace;
  color: #e83e8c;
}

.dark .page-subtitle {
  color: #999;
}

.dark .page-subtitle code {
  background: #333;
}

.mb-4 {
  margin-bottom: 24px;
}

.mt-4 {
  margin-top: 24px;
}

.user-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 24px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-label {
  font-size: 14px;
  font-weight: 600;
  color: #999;
}

.info-value {
  font-size: 16px;
  color: #333;
}

.dark .info-value {
  color: #fff;
}

.user-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid #e0e0e0;
}

.dark .user-avatar {
  border-color: #333;
}

.no-permissions {
  padding: 20px;
  text-align: center;
  color: #999;
  background: #f9f9f9;
  border-radius: 8px;
}

.dark .no-permissions {
  background: #1a1a1a;
}

.permission-check {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #f9f9f9;
  border-radius: 8px;
}

.dark .permission-check {
  background: #1a1a1a;
}

.check-label {
  font-weight: 600;
}

.permission-note {
  margin-top: 40px;
  padding: 24px;
  background: #fff3cd;
  border-left: 4px solid #ffc107;
  border-radius: 4px;
}

.dark .permission-note {
  background: #3a3000;
  border-left-color: #ffc107;
}

.permission-note h3 {
  margin: 0 0 12px 0;
  font-size: 18px;
}

.permission-note p {
  margin: 8px 0;
  line-height: 1.6;
}

.permission-note code {
  padding: 2px 8px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  font-family: monospace;
  color: #e83e8c;
}
</style>
