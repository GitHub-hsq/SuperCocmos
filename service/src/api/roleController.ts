/* eslint-disable no-console */
/**
 * 角色管理控制器
 */

import type { Request, Response } from 'express'
import * as roleService from '../db/roleService'
import * as userRoleService from '../db/userRoleService'

/**
 * 获取所有角色
 */
export async function getAllRoles(req: Request, res: Response) {
  try {
    const roles = await roleService.getAllRoles()

    res.send({
      status: 'Success',
      message: '获取角色列表成功',
      data: {
        roles,
        total: roles.length,
      },
    })
  }
  catch (error: any) {
    console.error('❌ [RoleController] 获取角色列表失败:', error.message)
    res.status(500).send({
      status: 'Fail',
      message: error?.message || String(error),
      data: null,
    })
  }
}

/**
 * 创建角色
 */
export async function createRole(req: Request, res: Response) {
  try {
    const { role_name, role_description } = req.body

    if (!role_name) {
      return res.status(400).send({
        status: 'Fail',
        message: '角色名称不能为空',
        data: null,
      })
    }

    const role = await roleService.createRole({
      role_name,
      role_description,
    })

    res.send({
      status: 'Success',
      message: '角色创建成功',
      data: { role },
    })
  }
  catch (error: any) {
    console.error('❌ [RoleController] 创建角色失败:', error.message)
    res.status(500).send({
      status: 'Fail',
      message: error?.message || String(error),
      data: null,
    })
  }
}

/**
 * 更新角色
 */
export async function updateRole(req: Request, res: Response) {
  try {
    const { id } = req.params
    const { role_name, role_description } = req.body

    const role = await roleService.updateRole(Number(id), {
      role_name,
      role_description,
    })

    if (!role) {
      return res.status(404).send({
        status: 'Fail',
        message: '角色不存在',
        data: null,
      })
    }

    res.send({
      status: 'Success',
      message: '角色更新成功',
      data: { role },
    })
  }
  catch (error: any) {
    console.error('❌ [RoleController] 更新角色失败:', error.message)
    res.status(500).send({
      status: 'Fail',
      message: error?.message || String(error),
      data: null,
    })
  }
}

/**
 * 删除角色
 */
export async function deleteRole(req: Request, res: Response) {
  try {
    const { id } = req.params

    await roleService.deleteRole(Number(id))

    res.send({
      status: 'Success',
      message: '角色删除成功',
      data: null,
    })
  }
  catch (error: any) {
    console.error('❌ [RoleController] 删除角色失败:', error.message)
    res.status(500).send({
      status: 'Fail',
      message: error?.message || String(error),
      data: null,
    })
  }
}

/**
 * 为用户分配角色
 */
export async function assignRoleToUser(req: Request, res: Response) {
  try {
    const { userId, roleId } = req.body

    if (!userId || !roleId) {
      return res.status(400).send({
        status: 'Fail',
        message: '用户ID和角色ID不能为空',
        data: null,
      })
    }

    await userRoleService.assignRoleToUser(Number(userId), Number(roleId))

    res.send({
      status: 'Success',
      message: '角色分配成功',
      data: null,
    })
  }
  catch (error: any) {
    console.error('❌ [RoleController] 分配角色失败:', error.message)
    res.status(500).send({
      status: 'Fail',
      message: error?.message || String(error),
      data: null,
    })
  }
}

/**
 * 移除用户的角色
 */
export async function removeRoleFromUser(req: Request, res: Response) {
  try {
    const { userId, roleId } = req.body

    if (!userId || !roleId) {
      return res.status(400).send({
        status: 'Fail',
        message: '用户ID和角色ID不能为空',
        data: null,
      })
    }

    await userRoleService.removeRoleFromUser(Number(userId), Number(roleId))

    res.send({
      status: 'Success',
      message: '角色移除成功',
      data: null,
    })
  }
  catch (error: any) {
    console.error('❌ [RoleController] 移除角色失败:', error.message)
    res.status(500).send({
      status: 'Fail',
      message: error?.message || String(error),
      data: null,
    })
  }
}

/**
 * 获取用户的角色列表
 */
export async function getUserRoles(req: Request, res: Response) {
  try {
    const { userId } = req.params

    const userWithRoles = await userRoleService.getUserWithRoles(Number(userId))

    if (!userWithRoles) {
      return res.status(404).send({
        status: 'Fail',
        message: '用户不存在',
        data: null,
      })
    }

    res.send({
      status: 'Success',
      message: '获取用户角色成功',
      data: {
        userId: userWithRoles.user_id,
        username: userWithRoles.username,
        email: userWithRoles.email,
        roles: userWithRoles.roles || [],
        roleIds: userWithRoles.role_ids || [],
      },
    })
  }
  catch (error: any) {
    console.error('❌ [RoleController] 获取用户角色失败:', error.message)
    res.status(500).send({
      status: 'Fail',
      message: error?.message || String(error),
      data: null,
    })
  }
}

