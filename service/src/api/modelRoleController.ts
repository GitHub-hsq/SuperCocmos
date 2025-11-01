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

    const success = await setModelRoles(modelId, roleIds)

    if (!success) {
      return res.status(500).send({
        status: 'Fail',
        message: '设置模型角色失败',
        data: null,
      })
    }

    res.send({
      status: 'Success',
      message: roleIds.length === 0 ? '模型已设置为对所有人开放' : '设置模型角色成功',
      data: {
        modelId,
        roleIds,
        isPublic: roleIds.length === 0,
      },
    })
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
