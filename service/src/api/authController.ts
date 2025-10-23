/* eslint-disable no-console */
/**
 * 认证控制器
 * TODO: 更新为 Auth0 认证
 */

import type { Request, Response } from 'express'
import { findUserByClerkId, upsertUserFromOAuth } from '../db/supabaseUserService'
import { getUserWithRoles } from '../db/userRoleService'

/**
 * Webhook 处理器
 * TODO: 更新为 Auth0 Webhook
 */
export async function handleClerkWebhook(req: Request, res: Response) {
  try {
    // TODO: 实现 Auth0 Webhook
    console.warn('⚠️ [Webhook] Clerk Webhook 已废弃，待实现 Auth0 Webhook')
    return res.status(501).send({
      status: 'Fail',
      message: 'Webhook not implemented',
    })

    /* 原 Clerk Webhook 代码已注释
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
      // ==================== 用户事件 ====================
      case 'user.created':
      case 'user.updated': {
        const { id, email_addresses, username, image_url, external_accounts, primary_email_address_id } = evt.data

        // 获取邮箱地址
        let email = null
        if (email_addresses && email_addresses.length > 0) {
          email = email_addresses[0].email_address
        }
        else if (primary_email_address_id) {
          // 测试数据可能没有完整的 email_addresses，跳过同步
          console.log(`⚠️  [Webhook] 测试事件缺少邮箱数据，跳过同步: ${id}`)
          break
        }

        if (!email) {
          console.log(`⚠️  [Webhook] 用户没有邮箱，跳过同步: ${id}`)
          break
        }

        // 确定登录提供商
        let provider = 'clerk'
        if (external_accounts && external_accounts.length > 0)
          provider = external_accounts[0].provider || 'clerk'

        // 同步用户到 Supabase
        await upsertUserFromOAuth({
          clerk_id: id,
          email,
          username: username || email.split('@')[0],
          avatar_url: image_url,
          provider,
        })

        console.log(`✅ [Webhook] 用户同步成功: ${email}`)
        break
      }

      case 'user.deleted': {
        const { id } = evt.data
        const user = await findUserByClerkId(id)
        if (user) {
          // 软删除：标记为已删除状态
          const { updateUser } = await import('../db/supabaseUserService')
          await updateUser(user.user_id, { status: 0 })
          console.log(`✅ [Webhook] 用户已软删除: ${id}`)
        }
        break
      }

      // ==================== Session 事件 ====================
      case 'session.created': {
        const { user_id } = evt.data
        console.log(`📍 [Webhook] 用户创建会话: ${user_id}`)
        // 更新最后登录时间
        const user = await findUserByClerkId(user_id)
        if (user) {
          const { updateUser } = await import('../db/supabaseUserService')
          await updateUser(user.user_id, {
            last_login_at: new Date().toISOString(),
          })
        }
        break
      }

      case 'session.ended':
      case 'session.removed':
      case 'session.revoked': {
        const { user_id } = evt.data
        console.log(`📍 [Webhook] 用户会话结束: ${user_id} (${eventType})`)
        // 可以在这里记录会话结束时间到数据库
        break
      }

      // ==================== Email 事件 ====================
      case 'email.created': {
        const { from_email_name, to_email_address } = evt.data
        console.log(`📧 [Webhook] 邮件已创建: ${from_email_name} -> ${to_email_address}`)
        break
      }

      // ==================== Organization 事件 ====================
      case 'organization.created':
      case 'organization.updated': {
        const { id, name } = evt.data
        console.log(`🏢 [Webhook] 组织事件: ${eventType} - ${name} (${id})`)
        // 可以在这里同步组织信息到数据库
        break
      }

      case 'organization.deleted': {
        const { id } = evt.data
        console.log(`🏢 [Webhook] 组织已删除: ${id}`)
        break
      }

      // ==================== Role 事件 ====================
      case 'role.created':
      case 'role.updated':
      case 'role.deleted': {
        const { id, name } = evt.data
        console.log(`👔 [Webhook] 角色事件: ${eventType} - ${name || id}`)
        // 可以在这里同步角色信息到数据库
        break
      }

      // ==================== 其他事件 ====================
      case 'session.pending': {
        console.log(`⏳ [Webhook] 会话待处理`)
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
  */
}

/**
 * 获取当前登录用户信息（包含角色）
 */
export async function getCurrentUser(req: Request, res: Response) {
  try {
    // TODO: 使用 Auth0 认证
    const userId = req.userId

    if (!userId) {
      return res.status(401).send({
        status: 'Fail',
        message: '未登录',
        data: null,
      })
    }

    // 从用户 ID 获取用户信息
    const user = await findUserByClerkId(userId)
    if (!user) {
      return res.status(404).send({
        status: 'Fail',
        message: '用户不存在',
        data: null,
      })
    }

    // 获取用户角色
    const userWithRoles = await getUserWithRoles(user.user_id)

    // 提取主要角色（优先返回 admin）
    const roles = userWithRoles?.roles || []
    const role = roles.includes('admin') ? 'admin' : (roles[0] || 'user')

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
          role, // 主要角色
          roles, // 所有角色
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
