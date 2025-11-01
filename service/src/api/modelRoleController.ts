/**
 * 模型-角色权限管理控制器
 * 仅管理员可以访问这些接口
 */

import type { Request, Response } from 'express'
import {
  assignRoleToModel,
  getAllModelsWithRoles,
  getModelAccessRoles,
  isModelPublic,
  removeRoleFromModel,
  setModelRoles,
} from '../db/modelRoleAccessService'
import { clearModelPermissionCache } from '../middleware/modelAccessAuth'
import { clearModelsWithRolesCache } from '../cache/modelCache'

/**
 * 获取所有模型及其可访问角色
 * GET /api/model-roles/all
 */
export async function getAllModelsWithRolesHandler(req: Request, res: Response) {
  try {
    const models = await getAllModelsWithRoles()
    console.warn('获取所有模型及其可访问角色2222222:')
    res.send({
      status: 'Success',
      message: '获取模型角色列表成功',
      data: { models },
    })
  }
  catch (error: any) {
    console.error('❌ [ModelRole] 获取模型角色列表失败:', error)
    res.status(500).send({
      status: 'Fail',
      message: error?.message || String(error),
      data: null,
    })
  }
}

/**
 * 获取指定模型的角色列表
 * GET /api/model-roles/:modelId
 */
export async function getModelRolesHandler(req: Request, res: Response) {
  try {
    const { modelId } = req.params

    if (!modelId) {
      return res.status(400).send({
        status: 'Fail',
        message: '缺少模型ID',
        data: null,
      })
    }

    const roleIds = await getModelAccessRoles(modelId)
    const isPublic = await isModelPublic(modelId)

    res.send({
      status: 'Success',
      message: '获取模型角色成功',
      data: {
        modelId,
        roleIds,
        isPublic,
      },
    })
  }
  catch (error: any) {
    console.error('❌ [ModelRole] 获取模型角色失败:', error)
    res.status(500).send({
      status: 'Fail',
      message: error?.message || String(error),
      data: null,
    })
  }
}

/**
 * 为模型分配角色
 * POST /api/model-roles/assign
 * Body: { modelId: string, roleId: string }
 */
export async function assignRoleHandler(req: Request, res: Response) {
  try {
    const { modelId, roleId } = req.body as { modelId: string, roleId: number }

    if (!modelId || !roleId) {
      return res.status(400).send({
        status: 'Fail',
        message: '缺少 modelId 或 roleId',
        data: null,
      })
    }

    const result = await assignRoleToModel(modelId, roleId)

    if (!result) {
      return res.status(500).send({
        status: 'Fail',
        message: '分配角色失败',
        data: null,
      })
    }

    // 🔥 清除该模型的权限缓存
    await clearModelPermissionCache(modelId)
    // 🔥 清除 models_with_roles 视图缓存
    await clearModelsWithRolesCache()

    res.send({
      status: 'Success',
      message: '分配角色成功',
      data: result,
    })
  }
  catch (error: any) {
    console.error('❌ [ModelRole] 分配角色失败:', error)
    res.status(500).send({
      status: 'Fail',
      message: error?.message || String(error),
      data: null,
    })
  }
}

/**
 * 移除模型的角色
 * POST /api/model-roles/remove
 * Body: { modelId: string, roleId: string }
 */
export async function removeRoleHandler(req: Request, res: Response) {
  try {
    const { modelId, roleId } = req.body as { modelId: string, roleId: number }

    if (!modelId || !roleId) {
      return res.status(400).send({
        status: 'Fail',
        message: '缺少 modelId 或 roleId',
        data: null,
      })
    }

    const success = await removeRoleFromModel(modelId, roleId)

    if (!success) {
      return res.status(500).send({
        status: 'Fail',
        message: '移除角色失败',
        data: null,
      })
    }

    // 🔥 清除该模型的权限缓存
    await clearModelPermissionCache(modelId)
    // 🔥 清除 models_with_roles 视图缓存
    await clearModelsWithRolesCache()

    res.send({
      status: 'Success',
      message: '移除角色成功',
      data: null,
    })
  }
  catch (error: any) {
    console.error('❌ [ModelRole] 移除角色失败:', error)
    res.status(500).send({
      status: 'Fail',
      message: error?.message || String(error),
      data: null,
    })
  }
}

/**
 * 批量设置模型的角色（覆盖现有设置）
 * POST /api/model-roles/set
 * Body: { modelId: string, roleIds: string[] }
 * 
 * 🔥 优化：先更新 Redis 缓存并立即返回，然后异步执行数据库同步（提高响应速度）
 */
export async function setModelRolesHandler(req: Request, res: Response) {
  try {
    const { modelId, roleIds } = req.body as { modelId: string, roleIds: number[] }

    if (!modelId) {
      return res.status(400).send({
        status: 'Fail',
        message: '缺少 modelId',
        data: null,
      })
    }

    if (!Array.isArray(roleIds)) {
      return res.status(400).send({
        status: 'Fail',
        message: 'roleIds 必须是数组',
        data: null,
      })
    }

    // 🔥 步骤 1: 立即更新 Redis 缓存（同步操作，确保缓存更新成功）
    try {
      // 1.1 清除该模型的所有权限缓存
      await clearModelPermissionCache(modelId)

      // 1.2 更新 models_with_roles 视图缓存
      const { updateModelRolesInCache } = await import('../cache/modelCache')
      // 尝试从缓存获取模型信息，如果缓存中没有则跳过更新（后续会重新加载）
      const { getModelsWithRolesFromCache } = await import('../cache/modelCache')
      const cachedModels = await getModelsWithRolesFromCache()
      const existingModel = cachedModels?.find((m: any) => m.id === modelId)
      
      if (existingModel) {
        await updateModelRolesInCache(modelId, roleIds, {
          model_id: existingModel.model_id,
          display_name: existingModel.display_name,
          enabled: existingModel.enabled,
          provider_id: existingModel.provider_id,
          created_at: existingModel.created_at,
          updated_at: existingModel.updated_at,
        })
      }
      else {
        // 如果缓存中没有，清除缓存让下次查询时重新加载
        const { clearModelsWithRolesCache } = await import('../cache/modelCache')
        await clearModelsWithRolesCache()
      }

      console.warn(`✅ [缓存] 已更新 Redis 缓存: 模型 ${modelId}, 角色 ${roleIds.join(', ')}`)
    }
    catch (cacheError) {
      console.error('⚠️ [缓存] 更新 Redis 缓存失败（继续执行数据库操作）:', cacheError)
      // 缓存失败不影响返回，继续执行数据库操作
    }

    // 🔥 步骤 2: 立即返回响应（不等待数据库操作）
    res.send({
      status: 'Success',
      message: roleIds.length === 0 ? '模型已设置为对所有人开放' : '设置模型角色成功',
      data: {
        modelId,
        roleIds,
        isPublic: roleIds.length === 0,
      },
    })

    // 🔥 步骤 3: 异步执行数据库同步（不阻塞响应）
    ;(async () => {
      try {
        const success = await setModelRoles(modelId, roleIds)
        if (success) {
          console.warn(`✅ [数据库] 异步同步完成: 模型 ${modelId}, 角色 ${roleIds.join(', ')}`)
        }
        else {
          console.error(`❌ [数据库] 异步同步失败: 模型 ${modelId}, 角色 ${roleIds.join(', ')}`)
          // 🔥 如果数据库同步失败，清除缓存让下次查询时重新加载
          clearModelPermissionCache(modelId).catch(console.error)
          const { clearModelsWithRolesCache } = await import('../cache/modelCache')
          clearModelsWithRolesCache().catch(console.error)
        }
      }
      catch (error) {
        console.error(`❌ [数据库] 异步同步异常: 模型 ${modelId}`, error)
        // 🔥 如果数据库同步失败，清除缓存让下次查询时重新加载
        clearModelPermissionCache(modelId).catch(console.error)
        const { clearModelsWithRolesCache } = await import('../cache/modelCache')
        clearModelsWithRolesCache().catch(console.error)
      }
    })()
  }
  catch (error: any) {
    console.error('❌ [ModelRole] 设置模型角色失败:', error)
    res.status(500).send({
      status: 'Fail',
      message: error?.message || String(error),
      data: null,
    })
  }
}
