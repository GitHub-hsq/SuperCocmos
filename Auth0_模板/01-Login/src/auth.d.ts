// auth.d.ts - Auth0实例类型声明
declare module '../auth' {
  import type { Auth0VueClient } from '@auth0/auth0-vue'

  export const auth0: Auth0VueClient
  export default auth0
}

declare module './auth' {
  import type { Auth0VueClient } from '@auth0/auth0-vue'

  export const auth0: Auth0VueClient
  export default auth0
}
