<script lang="ts">
import type { Ref } from 'vue'
import { useAuth0 } from '@auth0/auth0-vue'
import { onBeforeMount, ref, watch } from 'vue'
import { getUserPermissions } from '../utils/permissions'

export default {
  name: 'NavBar',
  setup() {
    const auth0 = useAuth0()
    const hasAdminPermission: Ref<boolean> = ref(false)

    /**
     * 检查用户权限
     * 只在 Auth0 已加载且用户已认证时执行
     */
    const checkPermissions = async (): Promise<void> => {
      // 等待 Auth0 加载完成
      if (auth0.isLoading.value) {
        return
      }

      if (auth0.isAuthenticated.value) {
        try {
          // 传递 getAccessTokenSilently 方法
          const permissions: string[] = await getUserPermissions(auth0.getAccessTokenSilently)
          console.log('🔑 权限列表：', permissions)
          hasAdminPermission.value = permissions.includes('read:statics')
        }
        catch (error) {
          console.error('❌ 检查权限失败:', error)
          hasAdminPermission.value = false
        }
      }
      else {
        hasAdminPermission.value = false
      }
    }

    // 在组件挂载前检查初始状态
    onBeforeMount(() => {
      // 如果 Auth0 已加载完成且用户已认证，立即检查权限
      if (!auth0.isLoading.value && auth0.isAuthenticated.value) {
        checkPermissions()
      }
    })

    // 监听加载状态变化 - 加载完成时检查权限
    watch(() => auth0.isLoading.value, (isLoading: boolean, wasLoading: boolean) => {
      // 从加载中变为加载完成，且用户已登录
      if (wasLoading && !isLoading && auth0.isAuthenticated.value) {
        console.log('✅ Auth0 加载完成，检查权限')
        checkPermissions()
      }
    })

    // 监听认证状态变化
    watch(() => auth0.isAuthenticated.value, (isAuth: boolean, wasAuth: boolean) => {
      if (isAuth && !wasAuth) {
        // 从未登录变为已登录时检查权限
        console.log('✅ 用户已登录，检查权限')
        checkPermissions()
      }
      else if (!isAuth && wasAuth) {
        // 退出登录时清除权限
        console.log('🔓 用户已退出，清除权限')
        hasAdminPermission.value = false
      }
    })

    return {
      isAuthenticated: auth0.isAuthenticated,
      isLoading: auth0.isLoading,
      user: auth0.user,
      hasAdminPermission,
      login(): void {
        auth0.loginWithRedirect({ appState: { target: '/welcome' } })
      },
      logout(): void {
        auth0.logout({
          logoutParams: {
            returnTo: window.location.origin,
          },
        })
      },
    }
  },
}
</script>

<template>
  <div class="nav-container mb-3">
    <nav class="navbar navbar-expand-md navbar-light bg-light">
      <div class="container">
        <div class="navbar-brand logo" />
        <button
          class="navbar-toggler"
          type="button"
          data-toggle="collapse"
          data-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span class="navbar-toggler-icon" />
        </button>

        <div id="navbarNav" class="collapse navbar-collapse">
          <ul class="navbar-nav mr-auto">
            <li class="nav-item">
              <router-link to="/" class="nav-link">
                Home
              </router-link>
            </li>
            <!-- 登录用户可见的菜单 -->
            <li v-if="isAuthenticated" class="nav-item">
              <router-link to="/welcome" class="nav-link">
                Welcome
              </router-link>
            </li>
            <li v-if="isAuthenticated" class="nav-item">
              <router-link to="/profile" class="nav-link">
                Profile
              </router-link>
            </li>
            <!-- 只有Admin权限用户可见 -->
            <li v-if="isAuthenticated && hasAdminPermission" class="nav-item">
              <router-link to="/statics" class="nav-link">
                Admin Panel
              </router-link>
            </li>
          </ul>
          <ul class="navbar-nav d-none d-md-block">
            <li v-if="!isAuthenticated && !isLoading" class="nav-item">
              <button
                id="qsLoginBtn"
                class="btn btn-primary btn-margin"
                @click.prevent="login"
              >
                Login
              </button>
            </li>

            <li v-if="isAuthenticated" class="nav-item dropdown">
              <a
                id="profileDropDown"
                class="nav-link dropdown-toggle"
                href="#"
                data-toggle="dropdown"
              >
                <img
                  :src="user?.picture || '/logo.png'"
                  alt="User's profile picture"
                  class="nav-user-profile rounded-circle"
                  width="50"
                >
              </a>
              <div class="dropdown-menu dropdown-menu-right">
                <div class="dropdown-header">
                  {{ user?.name || '用户' }}
                </div>
                <router-link to="/profile" class="dropdown-item dropdown-profile">
                  <font-awesome-icon class="mr-3" icon="user" />Profile
                </router-link>
                <a id="qsLogoutBtn" href="#" class="dropdown-item" @click.prevent="logout">
                  <font-awesome-icon class="mr-3" icon="power-off" />Log out
                </a>
              </div>
            </li>
          </ul>

          <ul v-if="!isAuthenticated && !isLoading" class="navbar-nav d-md-none">
            <button id="qsLoginBtn" class="btn btn-primary btn-block" @click="login">
              Log in
            </button>
          </ul>

          <ul
            v-if="isAuthenticated"
            id="mobileAuthNavBar"
            class="navbar-nav d-md-none d-flex"
          >
            <li class="nav-item">
              <span class="user-info">
                <img
                  :src="user?.picture || '/logo.png'"
                  alt="User's profile picture"
                  class="nav-user-profile d-inline-block rounded-circle mr-3"
                  width="50"
                >
                <h6 class="d-inline-block">{{ user?.name || '用户' }}</h6>
              </span>
            </li>
            <li>
              <font-awesome-icon icon="user" class="mr-3" />
              <router-link to="/profile">
                Profile
              </router-link>
            </li>
            <li v-if="hasAdminPermission">
              <router-link to="/statics">
                🔐 Admin Panel
              </router-link>
            </li>
            <li>
              <font-awesome-icon icon="power-off" class="mr-3" />
              <a id="qsLogoutBtn" href="#" class @click.prevent="logout">Log out</a>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  </div>
</template>

<style>
#mobileAuthNavBar {
  min-height: 125px;
  justify-content: space-between;
}
</style>
