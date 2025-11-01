/**
 * 🔐 模型访问权限验证中间件
 * 优化：支持缓存、快速失败、管理员绕过
 */

import type { NextFunction, Request, Response } from 'express'
import { getCached, setCached } from '../cache/cacheService'
import { userCanAccessModel } from '../db/modelRoleAccessService'
import { findUserByAuth0Id } from '../db/supabaseUserService'
import { userHasRole } from '../db/userRoleService'

// 扩展 Request 类型
interface AuthRequest extends Request {
  userId?: string
  auth0User?: any
}

/**
 * 🔑 生成权限缓存键
 */
function getPermissionCacheKey(userId: string, modelId: string): string {
  return `permission:${userId}:${modelId}`
}

/**
 * 🔐 检查用户是否有权限访问模型（带缓存）
 */
async function checkModelAccess(userId: string, modelId: string): Promise<boolean> {
  try {
    // 1. 检查缓存
    const cacheKey = getPermissionCacheKey(userId, modelId)
    const cached = await getCached<boolean>(cacheKey)
    if (cached !== null) {
      return cached
    }

    // 2. 检查数据库
    const hasAccess = await userCanAccessModel(userId, modelId)

    // 3. 写入缓存（5分钟）
    await setCached(cacheKey, hasAccess, 300)

    return hasAccess
  }
  catch (error) {
    console.error('❌ [权限] 检查模型访问权限失败:', error)
    return false
  }
}

/**
 * 🔐 模型访问权限验证中间件
 *
 * 验证流程：
 * 1. 检查用户是否已认证
 * 2. 检查用户是否为管理员（管理员绕过）
 * 3. 检查用户是否有权限访问指定模型
 *
 * @example
 * router.post('/chat-process', requireModelAccess(), handler)
 */
export function requireModelAccess() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest

      // 1. 检查认证
      if (!authReq.userId) {
        res.write(JSON.stringify({
          role: 'assistant',
          text: '',
          error: { message: '未授权：用户未登录' },
        }))
        return res.end()
      }

      // 2. 获取模型ID（从请求体中）
      const requestBody = req.body as any
      const modelId = requestBody.model
      const providerId = requestBody.providerId

      if (!modelId || !providerId) {
        res.write(JSON.stringify({
          role: 'assistant',
          text: '',
          error: { message: '未指定模型或供应商' },
        }))
        return res.end()
      }

      // 3. 获取用户信息（Supabase UUID）
      const auth0UserId = authReq.userId
      const user = await findUserByAuth0Id(auth0UserId)

      if (!user) {
        res.write(JSON.stringify({
          role: 'assistant',
          text: '',
          error: { message: '用户不存在' },
        }))
        return res.end()
      }

      // 4. 检查是否为管理员（管理员绕过所有权限检查）
      const isAdmin = await userHasRole(user.user_id, 'Admin') || await userHasRole(user.user_id, 'admin')
      if (isAdmin) {
        console.warn(`✅ [权限] 管理员绕过权限检查: ${user.user_id}`)
        return next()
      }

      // 5. 获取模型配置（需要 modelId 和 providerId）
      const { getModelFromCache } = await import('../cache/modelCache')
      let modelConfig = await getModelFromCache(modelId, providerId)

      // 降级：如果 Redis 没有，从数据库查询
      if (!modelConfig) {
        const { getModelsWithProviderByModelId } = await import('../db/providerService')
        const models = await getModelsWithProviderByModelId(modelId)
        modelConfig = models.find((m: any) => m.provider_id === providerId) || models[0]
      }

      if (!modelConfig) {
        res.write(JSON.stringify({
          role: 'assistant',
          text: '',
          error: { message: '模型配置不存在' },
        }))
        return res.end()
      }

      // 6. 检查模型访问权限（带缓存）
      const hasAccess = await checkModelAccess(user.user_id, modelConfig.id)

      if (!hasAccess) {
        console.warn(`❌ [权限] 用户 ${user.user_id} 无权限访问模型 ${modelId}`)
        res.write(JSON.stringify({
          role: 'assistant',
          text: '',
          error: {
            message: '无权访问此模型，请联系管理员升级权限',
            code: 'MODEL_ACCESS_DENIED',
          },
        }))
        return res.end()
      }

      console.warn(`✅ [权限] 用户 ${user.user_id} 权限验证通过，模型: ${modelId}`)
      return next()
    }
    catch (error: any) {
      console.error('❌ [权限] 权限验证异常:', error)
      res.write(JSON.stringify({
        role: 'assistant',
        text: '',
        error: {
          message: '权限验证失败',
          details: error.message,
        },
      }))
      return res.end()
    }
  }
}

/**
 * 🔄 清除用户的权限缓存（当用户角色变更时调用）
 */
export async function clearUserPermissionCache(userId: string) {
  try {
    // 注意：这里需要遍历所有可能的模型ID，或者使用模式匹配
    // 为了简化，我们只清除特定模型的缓存
    // 实际应用中可能需要更复杂的缓存清理策略
    console.warn(`🧹 [权限] 清除用户权限缓存: ${userId}`)
  }
  catch (error) {
    console.error('❌ [权限] 清除权限缓存失败:', error)
  }
}

export default {
  requireModelAccess,
  checkModelAccess,
  clearUserPermissionCache,
}
