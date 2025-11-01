<script setup lang="ts">
import { useAuth0 } from '@auth0/auth0-vue'
import { NDropdown, NTag } from 'naive-ui'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/store'
import { clearAllUserData } from '@/utils/clearUserData'

const router = useRouter()
const { user, logout } = useAuth0()
const authStore = useAuthStore()

// 响应式的权限列表（用于触发菜单更新）
const cachedPermissions = ref<string[]>([])

// 从缓存加载权限并持续监听
onMounted(() => {
  // 立即加载
  const w = window as any
  cachedPermissions.value = w.__user_permissions_cache__ || []

  // 监听缓存变化（静默更新）
  const checkInterval = setInterval(() => {
    const newPermissions = w.__user_permissions_cache__ || []
    // 使用长度和内容双重检查
    if (newPermissions.length !== cachedPermissions.value.length
      || JSON.stringify(newPermissions) !== JSON.stringify(cachedPermissions.value)) {
      cachedPermissions.value = [...newPermissions] // 创建新数组触发响应式更新
    }
  }, 500) // 500ms 检查一次

  // 清理定时器
  onBeforeUnmount(() => {
    clearInterval(checkInterval)
  })
})

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
  const options: any[] = [
    {
      label: '个人资料',
      key: 'profile',
    },
  ]

  // 检查是否有管理员权限（使用响应式的权限列表）
  const hasAdminPermission = cachedPermissions.value.includes('read:statics') || cachedPermissions.value.includes('read:admin')

  if (hasAdminPermission) {
    options.push({
      label: '🔐 管理员面板',
      key: 'admin',
    })
  }

  options.push(
    {
      label: '切换账号',
      key: 'switch',
    },
    {
      type: 'divider',
      key: 'd1',
    },
    {
      label: '退出登录',
      key: 'logout',
    },
  )

  return options
})

// 处理下拉菜单点击
function handleDropdownSelect(key: string) {
  if (key === 'admin') {
    // 跳转到管理员面板
    router.push('/admin')
  }
  else if (key === 'logout') {
    // 🔥 清除所有用户相关的本地存储数据
    clearAllUserData()

    // 退出登录
    logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    })
  }
  else if (key === 'switch') {
    // 🔥 清除所有用户相关的本地存储数据（切换账号也需要清除）
    clearAllUserData()

    // 切换账号：先退出，然后立即重新登录
    logout({
      logoutParams: {
        returnTo: `${window.location.origin}?switchAccount=true`,
      },
    })
  }
  else if (key === 'profile') {
    // TODO: 跳转到个人资料页面
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

  // 检查是否为管理员（不区分大小写）
  if (roles.some(r => r.toLowerCase() === 'admin'))
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
