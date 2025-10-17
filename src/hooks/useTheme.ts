import type { GlobalThemeOverrides } from 'naive-ui'
import { darkTheme, useOsTheme } from 'naive-ui'
import { computed, watch } from 'vue'
import { useAppStore } from '@/store'

export function useTheme() {
  const appStore = useAppStore()

  const OsTheme = useOsTheme()

  const isDark = computed(() => {
    if (appStore.theme === 'auto')
      return OsTheme.value === 'dark'
    else
      return appStore.theme === 'dark'
  })

  const theme = computed(() => {
    return isDark.value ? darkTheme : undefined
  })

  const themeOverrides = computed<GlobalThemeOverrides>(() => {
    if (isDark.value) {
      return {
        common: {
          primaryColor: '#ffffff',
          primaryColorHover: '#f5f5f5',
          primaryColorPressed: '#e0e0e0',
          primaryColorSuppl: '#ffffff',
        },
      }
    }
    return {
      common: {
        primaryColor: '#080808',
        primaryColorHover: '#333333',
        primaryColorPressed: '#000000',
        primaryColorSuppl: '#080808',
      },
    }
  })

  watch(
    () => isDark.value,
    (dark) => {
      if (dark)
        document.documentElement.classList.add('dark')
      else
        document.documentElement.classList.remove('dark')
    },
    { immediate: true },
  )

  return { theme, themeOverrides }
}

