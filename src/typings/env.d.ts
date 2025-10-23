/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'

  const component: DefineComponent<Record<string, any>, Record<string, any>, any>
  export default component
}

interface ImportMetaEnv {
  readonly VITE_GLOB_API_URL: string
  readonly VITE_APP_API_BASE_URL: string
  readonly VITE_GLOB_OPEN_LONG_REPLY: string
  readonly VITE_GLOB_APP_PWA: string
  // TODO: 添加 Auth0 环境变量类型
  // readonly VITE_AUTH0_DOMAIN: string
  // readonly VITE_AUTH0_CLIENT_ID: string
  // readonly VITE_AUTH0_AUDIENCE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
