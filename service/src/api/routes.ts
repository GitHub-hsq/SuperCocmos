/**
 * API 路由配置
 * 集成 Auth0 + Supabase
 */

import express from 'express'
import { auth0Auth, requireAuth0Admin } from '../middleware/auth0'
import { requireAuth, requireAdmin } from '../middleware/authUnified'
import * as auth0Controller from './auth0Controller'
import * as authController from './authController'
import * as configController from './configController'
import * as conversationController from './conversationController'
import * as modelRoleController from './modelRoleController'
import * as providerController from './providerController'
import * as roleController from './roleController'

const router = express.Router()

// ==============================================
// Auth0 相关路由
// ==============================================

/**
 * 同步 Auth0 用户到 Supabase
 * POST /api/auth/sync-auth0-user
 * 需要 Auth0 认证
 */
router.post('/auth/sync-auth0-user', ...auth0Auth, auth0Controller.syncAuth0User)

/**
 * 根据 Auth0 ID 获取用户信息
 * GET /api/auth/user/:auth0_id
 */
router.get('/auth/user/:auth0_id', auth0Controller.getAuth0User)

/**
 * Auth0 Webhook 处理
 * 用于同步 Auth0 用户到 Supabase
 */
router.post('/webhooks/auth0', authController.handleAuth0Webhook)

/**
 * 获取当前登录用户信息
 * 需要 Auth0 认证
 */
router.get('/auth/me', ...auth0Auth, requireAuth, authController.getCurrentUser)

// ==============================================
// 角色管理路由
// ==============================================

/**
 * 获取所有角色（需要登录）
 */
router.get('/roles', ...auth0Auth, requireAuth, roleController.getAllRoles)

/**
 * 创建角色（需要管理员权限）
 */
router.post('/roles', ...auth0Auth, requireAdmin, roleController.createRole)

/**
 * 更新角色（需要管理员权限）
 */
router.put('/roles/:id', ...auth0Auth, requireAdmin, roleController.updateRole)

/**
 * 删除角色（需要管理员权限）
 */
router.delete('/roles/:id', ...auth0Auth, requireAdmin, roleController.deleteRole)

// ==============================================
// 用户角色管理路由
// ==============================================

/**
 * 为用户分配角色（需要管理员权限）
 */
router.post('/user-roles/assign', ...auth0Auth, requireAdmin, roleController.assignRoleToUser)

/**
 * 移除用户角色（需要管理员权限）
 */
router.post('/user-roles/remove', ...auth0Auth, requireAdmin, roleController.removeRoleFromUser)

/**
 * 获取用户的角色（需要登录）
 */
router.get('/user-roles/:userId', ...auth0Auth, requireAuth, roleController.getUserRoles)

// ==============================================
// 供应商和模型管理路由
// ==============================================

/**
 * 获取所有供应商及其模型
 */
router.get('/providers', ...auth0Auth, requireAuth, providerController.getProviders)

/**
 * 创建供应商
 */
router.post('/providers', ...auth0Auth, requireAuth, providerController.addProvider)

/**
 * 更新供应商
 */
router.put('/providers/:id', ...auth0Auth, requireAuth, providerController.editProvider)

/**
 * 删除供应商
 */
router.delete('/providers/:id', ...auth0Auth, requireAuth, providerController.removeProvider)

/**
 * 创建模型
 */
router.post('/models', ...auth0Auth, requireAuth, providerController.addModel)

/**
 * 更新模型
 */
router.put('/models/:id', ...auth0Auth, requireAuth, providerController.editModel)

/**
 * 删除模型
 */
router.delete('/models/:id', ...auth0Auth, requireAuth, providerController.removeModel)

/**
 * 切换模型启用状态
 */
router.patch('/models/:id/toggle', ...auth0Auth, requireAuth, providerController.toggleModel)

// ==============================================
// 用户配置路由
// ==============================================

/**
 * 获取用户完整配置
 */
router.get('/config', ...auth0Auth, requireAuth, configController.getConfig)

/**
 * 获取用户设置
 */
router.get('/config/user-settings', ...auth0Auth, requireAuth, configController.getUserSettingsHandler)

/**
 * 更新用户设置
 */
router.patch('/config/user-settings', ...auth0Auth, requireAuth, configController.patchUserSettings)

/**
 * 获取聊天配置
 */
router.get('/config/chat', ...auth0Auth, requireAuth, configController.getChatConfigHandler)

/**
 * 更新聊天配置
 */
router.patch('/config/chat', ...auth0Auth, requireAuth, configController.patchChatConfig)

/**
 * 获取工作流配置
 */
router.get('/config/workflow', ...auth0Auth, requireAuth, configController.getWorkflowConfigHandler)

/**
 * 更新工作流配置
 */
router.patch('/config/workflow', ...auth0Auth, requireAuth, configController.patchWorkflowConfig)

/**
 * 获取额外配置
 */
router.get('/config/additional', ...auth0Auth, requireAuth, configController.getAdditionalConfigHandler)

/**
 * 更新额外配置
 */
router.patch('/config/additional', ...auth0Auth, requireAuth, configController.patchAdditionalConfig)

/**
 * 重置配置为默认值
 */
router.post('/config/reset', ...auth0Auth, requireAuth, configController.resetConfig)

// ==============================================
// 会话管理路由
// ==============================================

/**
 * 获取用户的所有会话列表
 * GET /api/conversations
 */
router.get('/conversations', ...auth0Auth, requireAuth, conversationController.getUserConversationsHandler)

/**
 * 创建新会话
 * POST /api/conversations
 */
router.post('/conversations', ...auth0Auth, requireAuth, conversationController.createConversationHandler)

/**
 * 获取指定会话的详细信息
 * GET /api/conversations/:id
 */
router.get('/conversations/:id', ...auth0Auth, requireAuth, conversationController.getConversationByIdHandler)

/**
 * 更新会话信息
 * PATCH /api/conversations/:id
 */
router.patch('/conversations/:id', ...auth0Auth, requireAuth, conversationController.updateConversationHandler)

/**
 * 删除会话
 * DELETE /api/conversations/:id
 */
router.delete('/conversations/:id', ...auth0Auth, requireAuth, conversationController.deleteConversationHandler)

/**
 * 获取会话的所有消息
 * GET /api/conversations/:id/messages
 */
router.get('/conversations/:id/messages', ...auth0Auth, requireAuth, conversationController.getConversationMessagesHandler)

/**
 * 批量保存消息到会话
 * POST /api/conversations/:id/messages
 */
router.post('/conversations/:id/messages', ...auth0Auth, requireAuth, conversationController.saveMessagesHandler)

// ==============================================
// 模型-角色权限管理路由（仅管理员）
// ==============================================

/**
 * 获取所有模型及其可访问角色
 */
router.get('/model-roles/all', ...auth0Auth, requireAdmin, modelRoleController.getAllModelsWithRolesHandler)

/**
 * 获取指定模型的角色列表
 */
router.get('/model-roles/:modelId', ...auth0Auth, requireAdmin, modelRoleController.getModelRolesHandler)

/**
 * 为模型分配角色
 */
router.post('/model-roles/assign', ...auth0Auth, requireAdmin, modelRoleController.assignRoleHandler)

/**
 * 移除模型的角色
 */
router.post('/model-roles/remove', ...auth0Auth, requireAdmin, modelRoleController.removeRoleHandler)

/**
 * 批量设置模型的角色（覆盖现有设置）
 */
router.post('/model-roles/set', ...auth0Auth, requireAdmin, modelRoleController.setModelRolesHandler)

export default router
