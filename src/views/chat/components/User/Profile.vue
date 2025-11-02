<script setup lang="ts">
import { useAuth0 } from '@auth0/auth0-vue'
import { NDropdown, NTag } from 'naive-ui'
import { computed } from 'vue'
import { useAuthStore } from '@/store'
import { clearAllUserData } from '@/utils/clearUserData'

const { user, logout } = useAuth0()
const authStore = useAuthStore()

// 获取用户角色（优先使用 roles 数组，兼容单个 role 字段）
const userRoles = computed(() => {
  const roles = authStore.userInfo?.roles || []
  const singleRole = authStore.userInfo?.role

  // 如果 roles 数组为空，使用单个 role 字段
  if (roles.length === 0 && singleRole) {
    return [singleRole]
  }

  return roles
})

// 下拉菜单选项
const dropdownOptions = computed(() => {
  // 🔥 只保留退出登录选项
  return [
    {
      label: '退出登录',
      key: 'logout',
    },
  ]
})

// 处理下拉菜单点击
async function handleDropdownSelect(key: string) {
  if (key === 'logout') {
    // 🔥 优化：先调用后端（token 在 Cookie 中，不会被清除）
    // 然后立即清除本地数据并退出，不等待后端完成

    // 1. 发起后端清除请求（异步，不等待）
    // 后端从 Cookie 获取 token，即使清除了 localStorage 也能认证
    import('@/api/services/authService').then(({ logout: logoutApi }) => {
      logoutApi().catch((error) => {
        console.warn('⚠️ [Profile] 后端清除缓存失败（不影响退出）:', error)
      })
    })

    // 2. 立即清除本地存储（用户体验优先）
    clearAllUserData()

    // 3. 立即退出登录（跳转到 Auth0）
    logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    })
  }
}

// 用户信息（处理可能为 undefined 的情况）
const userPicture = computed(() => user.value?.picture || '')
const userName = computed(() => user.value?.name || user.value?.email || 'User')

// 获取用户名首字母
const userInitial = computed(() => {
  const name = user.value?.name || user.value?.email || 'U'
  return name.charAt(0).toUpperCase()
})

// 获取主要显示的角色（优先级：Admin > Beta > Ultra > Plus > Pro > Free）
const primaryRole = computed(() => {
  const roles = userRoles.value

  // 检查是否为管理员（不区分大小写，过滤 null/undefined）
  if (roles.some(r => r && r.toLowerCase() === 'admin'))
    return 'Admin'

  // 按会员等级优先级排序
  if (roles.includes('Beta'))
    return 'Beta'
  if (roles.includes('Ultra'))
    return 'Ultra'
  if (roles.includes('Plus'))
    return 'Plus'
  if (roles.includes('Pro'))
    return 'Pro'
  if (roles.includes('free') || roles.includes('Free'))
    return 'Free'

  // 默认返回免费用户（兼容旧数据）
  return 'Free'
})

// 🔥 用户角色显示文本（格式：角色 + Plan）
const roleText = computed(() => {
  const role = primaryRole.value

  // 特殊角色：管理员、内测等
  if (role === 'Admin')
    return 'Admin'
  if (role === 'Beta')
    return 'Beta'

  // 付费会员：显示 "角色 Plan"
  if (role === 'Ultra')
    return 'Ultra Plan'
  if (role === 'Plus')
    return 'Plus Plan'
  if (role === 'Pro')
    return 'Pro Plan'

  // 免费用户
  return 'Free Plan'
})

// 🔥 角色标签类型（更鲜艳的配色）
const roleTagType = computed(() => {
  const typeMap: Record<string, 'error' | 'warning' | 'success' | 'info'> = {
    Admin: 'error', // 红色 - 管理员
    Beta: 'warning', // 橙色 - 内测
    Ultra: 'warning', // 橙色 - Ultra
    Plus: 'success', // 绿色 - Plus
    Pro: 'success', // 绿色 - Pro
    Free: 'info', // 蓝色 - 免费
  }

  return typeMap[primaryRole.value] || 'info'
})
</script>

<template>
  <NDropdown
    trigger="click"
    :options="dropdownOptions"
    @select="handleDropdownSelect"
  >
    <div class="user-profile-compact">
      <!-- 用户头像 -->
      <div class="user-avatar">
        <img
          v-if="userPicture"
          :src="userPicture"
          :alt="userName"
          class="avatar-image"
        >
        <div v-else class="avatar-placeholder">
          {{ userInitial }}
        </div>
      </div>

      <!-- 用户信息 -->
      <div class="user-info">
        <div class="user-name">
          {{ userName }}
        </div>
        <div class="user-role">
          <NTag :type="roleTagType" size="small" round>
            {{ roleText }}
          </NTag>
        </div>
      </div>
    </div>
  </NDropdown>
</template>

<style scoped>
.user-profile-compact {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.user-profile-compact:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.dark .user-profile-compact:hover {
  background-color: rgba(255, 255, 255, 0.05);
}

.user-avatar {
  flex-shrink: 0;
}

.avatar-image {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid rgba(0, 0, 0, 0.1);
}

.dark .avatar-image {
  border-color: rgba(255, 255, 255, 0.1);
}

.avatar-placeholder {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 18px;
}

.user-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.user-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dark .user-name {
  color: #fff;
}

.user-role {
  display: flex;
}
</style>
