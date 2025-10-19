/**
 * API 路由配置
 * 集成 Clerk + Supabase
 */

import express from 'express'
import { clerkAuth, requireAdmin, requireAuth } from '../middleware/clerkAuth'
import * as authController from './authController'
import * as configController from './configController'
import * as modelRoleController from './modelRoleController'
import * as providerController from './providerController'
import * as roleController from './roleController'

const router = express.Router()

// ==============================================
// Clerk 相关路由
// ==============================================

/**
 * Clerk Webhook 处理
 * 用于同步 Clerk 用户到 Supabase
 */
router.post('/webhooks/clerk', authController.handleClerkWebhook)

/**
 * 获取当前登录用户信息
 * 需要 Clerk 认证
 */
router.get('/auth/me', clerkAuth, requireAuth, authController.getCurrentUser)

// ==============================================
// 角色管理路由
// ==============================================

/**
 * 获取所有角色（需要登录）
 */
router.get('/roles', clerkAuth, requireAuth, roleController.getAllRoles)

/**
 * 创建角色（需要管理员权限）
 */
router.post('/roles', clerkAuth, requireAdmin, roleController.createRole)

/**
 * 更新角色（需要管理员权限）
 */
router.put('/roles/:id', clerkAuth, requireAdmin, roleController.updateRole)

/**
 * 删除角色（需要管理员权限）
 */
router.delete('/roles/:id', clerkAuth, requireAdmin, roleController.deleteRole)

// ==============================================
// 用户角色管理路由
// ==============================================

/**
 * 为用户分配角色（需要管理员权限）
 */
router.post('/user-roles/assign', clerkAuth, requireAdmin, roleController.assignRoleToUser)

/**
 * 移除用户角色（需要管理员权限）
 */
router.post('/user-roles/remove', clerkAuth, requireAdmin, roleController.removeRoleFromUser)

/**
 * 获取用户的角色（需要登录）
 */
router.get('/user-roles/:userId', clerkAuth, requireAuth, roleController.getUserRoles)

// ==============================================
// 供应商和模型管理路由
// ==============================================

/**
 * 获取所有供应商及其模型
 */
router.get('/providers', clerkAuth, requireAuth, providerController.getProviders)

/**
 * 创建供应商
 */
router.post('/providers', clerkAuth, requireAuth, providerController.addProvider)

/**
 * 更新供应商
 */
router.put('/providers/:id', clerkAuth, requireAuth, providerController.editProvider)

/**
 * 删除供应商
 */
router.delete('/providers/:id', clerkAuth, requireAuth, providerController.removeProvider)

/**
 * 创建模型
 */
router.post('/models', clerkAuth, requireAuth, providerController.addModel)

/**
 * 更新模型
 */
router.put('/models/:id', clerkAuth, requireAuth, providerController.editModel)

/**
 * 删除模型
 */
router.delete('/models/:id', clerkAuth, requireAuth, providerController.removeModel)

/**
 * 切换模型启用状态
 */
router.patch('/models/:id/toggle', clerkAuth, requireAuth, providerController.toggleModel)

// ==============================================
// 用户配置路由
// ==============================================

/**
 * 获取用户完整配置
 */
router.get('/config', clerkAuth, requireAuth, configController.getConfig)

/**
 * 获取用户设置
 */
router.get('/config/user-settings', clerkAuth, requireAuth, configController.getUserSettingsHandler)

/**
 * 更新用户设置
 */
router.patch('/config/user-settings', clerkAuth, requireAuth, configController.patchUserSettings)

/**
 * 获取聊天配置
 */
router.get('/config/chat', clerkAuth, requireAuth, configController.getChatConfigHandler)

/**
 * 更新聊天配置
 */
router.patch('/config/chat', clerkAuth, requireAuth, configController.patchChatConfig)

/**
 * 获取工作流配置
 */
router.get('/config/workflow', clerkAuth, requireAuth, configController.getWorkflowConfigHandler)

/**
 * 更新工作流配置
 */
router.patch('/config/workflow', clerkAuth, requireAuth, configController.patchWorkflowConfig)

/**
 * 获取额外配置
 */
router.get('/config/additional', clerkAuth, requireAuth, configController.getAdditionalConfigHandler)

/**
 * 更新额外配置
 */
router.patch('/config/additional', clerkAuth, requireAuth, configController.patchAdditionalConfig)

/**
 * 重置配置为默认值
 */
router.post('/config/reset', clerkAuth, requireAuth, configController.resetConfig)

// ==============================================
// 模型-角色权限管理路由（仅管理员）
// ==============================================

/**
 * 获取所有模型及其可访问角色
 */
router.get('/model-roles/all', clerkAuth, requireAdmin, modelRoleController.getAllModelsWithRolesHandler)

/**
 * 获取指定模型的角色列表
 */
router.get('/model-roles/:modelId', clerkAuth, requireAdmin, modelRoleController.getModelRolesHandler)

/**
 * 为模型分配角色
 */
router.post('/model-roles/assign', clerkAuth, requireAdmin, modelRoleController.assignRoleHandler)

/**
 * 移除模型的角色
 */
router.post('/model-roles/remove', clerkAuth, requireAdmin, modelRoleController.removeRoleHandler)

/**
 * 批量设置模型的角色（覆盖现有设置）
 */
router.post('/model-roles/set', clerkAuth, requireAdmin, modelRoleController.setModelRolesHandler)

export default router
