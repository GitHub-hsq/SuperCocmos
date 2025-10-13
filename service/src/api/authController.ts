/* eslint-disable no-console */
/**
 * 认证控制器
 * 处理 Clerk Webhook 和用户同步
 */

import type { Request, Response } from 'express'
import { getAuth } from '@clerk/express'
import { Webhook } from 'svix'
import { findUserByClerkId, upsertUserFromOAuth } from '../db/supabaseUserService'
import { getUserWithRoles } from '../db/userRoleService'

/**
 * Clerk Webhook 处理器
 * 当 Clerk 用户事件发生时同步到 Supabase
 */
export async function handleClerkWebhook(req: Request, res: Response) {
  try {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

    if (!WEBHOOK_SECRET) {
      console.error('❌ [Webhook] 未配置 CLERK_WEBHOOK_SECRET')
      return res.status(500).send({
        status: 'Fail',
        message: '服务器配置错误',
        data: null,
      })
    }

    // 验证 Webhook 签名
    const wh = new Webhook(WEBHOOK_SECRET)
    const payload = req.body
    const headers = req.headers

    let evt: any
    try {
      evt = wh.verify(JSON.stringify(payload), {
        'svix-id': headers['svix-id'] as string,
        'svix-timestamp': headers['svix-timestamp'] as string,
        'svix-signature': headers['svix-signature'] as string,
      })
    }
    catch (error: any) {
      console.error('❌ [Webhook] 签名验证失败:', error.message)
      return res.status(400).send({
        status: 'Fail',
        message: 'Webhook 签名验证失败',
        data: null,
      })
    }

    // 处理不同的事件类型
    const eventType = evt.type
    console.log(`📨 [Webhook] 收到事件: ${eventType}`)

    switch (eventType) {
      case 'user.created':
      case 'user.updated': {
        const { id, email_addresses, username, image_url, external_accounts } = evt.data

        // 确定登录提供商
        let provider = 'clerk'
        if (external_accounts && external_accounts.length > 0)
          provider = external_accounts[0].provider || 'clerk'

        // 同步用户到 Supabase
        await upsertUserFromOAuth({
          clerk_id: id,
          email: email_addresses[0].email_address,
          username: username || email_addresses[0].email_address.split('@')[0],
          avatar_url: image_url,
          provider,
        })

        console.log(`✅ [Webhook] 用户同步成功: ${email_addresses[0].email_address}`)
        break
      }

      case 'user.deleted': {
        const { id } = evt.data
        // 可以选择删除或软删除用户
        const user = await findUserByClerkId(id)
        if (user) {
          // 这里可以调用删除用户的逻辑
          console.log(`⚠️  [Webhook] 用户删除事件: ${id}`)
        }
        break
      }

      default:
        console.log(`⚠️  [Webhook] 未处理的事件类型: ${eventType}`)
    }

    res.status(200).send({
      status: 'Success',
      message: 'Webhook processed',
      data: null,
    })
  }
  catch (error: any) {
    console.error('❌ [Webhook] 处理失败:', error.message)
    res.status(500).send({
      status: 'Fail',
      message: error?.message || String(error),
      data: null,
    })
  }
}

/**
 * 获取当前登录用户信息（包含角色）
 */
export async function getCurrentUser(req: Request, res: Response) {
  try {
    const auth = getAuth(req)

    if (!auth?.userId) {
      return res.status(401).send({
        status: 'Fail',
        message: '未登录',
        data: null,
      })
    }

    // 从 Clerk ID 获取用户信息
    const user = await findUserByClerkId(auth.userId)
    if (!user) {
      return res.status(404).send({
        status: 'Fail',
        message: '用户不存在',
        data: null,
      })
    }

    // 获取用户角色
    const userWithRoles = await getUserWithRoles(user.user_id)

    res.send({
      status: 'Success',
      message: '获取用户信息成功',
      data: {
        user: {
          id: user.user_id,
          clerkId: user.clerk_id,
          username: user.username,
          email: user.email,
          phone: user.phone,
          avatarUrl: user.avatar_url,
          provider: user.provider,
          status: user.status,
          roles: userWithRoles?.roles || [],
          createdAt: user.created_at,
          updatedAt: user.updated_at,
          lastLoginAt: user.last_login_at,
        },
      },
    })
  }
  catch (error: any) {
    console.error('❌ [Auth] 获取用户信息失败:', error.message)
    res.status(500).send({
      status: 'Fail',
      message: error?.message || String(error),
      data: null,
    })
  }
}
