/**
 * ChatGPT 相关工具函数
 */

import httpsProxyAgent from 'https-proxy-agent'
import fetch from 'node-fetch'
import { SocksProxyAgent } from 'socks-proxy-agent'
import { isNotEmptyString } from '../utils/is'

const { HttpsProxyAgent } = httpsProxyAgent

export interface SetProxyOptions {
  fetch?: any
  [key: string]: any
}

/**
 * 设置代理
 */
export function setupProxy(options: SetProxyOptions) {
  if (isNotEmptyString(process.env.SOCKS_PROXY_HOST) && isNotEmptyString(process.env.SOCKS_PROXY_PORT)) {
    const agent = new SocksProxyAgent({
      hostname: process.env.SOCKS_PROXY_HOST,
      port: process.env.SOCKS_PROXY_PORT,
      userId: isNotEmptyString(process.env.SOCKS_PROXY_USERNAME) ? process.env.SOCKS_PROXY_USERNAME : undefined,
      password: isNotEmptyString(process.env.SOCKS_PROXY_PASSWORD) ? process.env.SOCKS_PROXY_PASSWORD : undefined,
    })
    options.fetch = (url: string, opts: any) => {
      return fetch(url, { agent, ...opts })
    }
  }
  else if (isNotEmptyString(process.env.HTTPS_PROXY) || isNotEmptyString(process.env.ALL_PROXY)) {
    const httpsProxy = process.env.HTTPS_PROXY || process.env.ALL_PROXY
    if (httpsProxy) {
      const agent = new HttpsProxyAgent(httpsProxy)
      options.fetch = (url: string, opts: any) => {
        return fetch(url, { agent, ...opts })
      }
    }
  }
  else {
    options.fetch = (url: string, opts: any) => {
      return fetch(url, { ...opts })
    }
  }
}
