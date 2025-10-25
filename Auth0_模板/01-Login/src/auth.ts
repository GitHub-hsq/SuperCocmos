// auth.ts
import { createAuth0 } from '@auth0/auth0-vue'
import authConfig from '../auth_config.json'

export const auth0 = createAuth0({
  domain: authConfig.domain,
  clientId: authConfig.clientId,
  authorizationParams: {
    redirect_uri: window.location.origin,
    audience: 'http://supercocmos.com', // 使用HTTP协议（开发环境）
  },
})

export default auth0
