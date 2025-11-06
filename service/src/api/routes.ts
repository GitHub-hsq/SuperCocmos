/**
 * API 路由配置
 * 集成 Auth0 + Supabase
 */

import express from 'express'
// 🔥 使用优化版缓存鉴权中间件（性能提升99% + 请求去重）
import { auth, requireAdmin, requireAuth } from '../middleware/authCachedOptimized'
import { performanceLogger } from '../middleware/performanceLogger'
import { sseAuth } from '../middleware/sseAuth'
import * as auth0Controller from './auth0Controller'
import * as authController from './authController'
import * as configController from './configController'
import * as conversationController from './conversationController'
import * as debugController from './debugController'
import * as initController from './initController'
import * as modelRoleController from './modelRoleController'
import * as novelController from './novelController'
import * as providerController from './providerController'
import * as roleController from './roleController'
import * as sseController from './sseController'

const router = express.Router()

// 🔥 应用性能监控中间件到所有路由
router.use(performanceLogger)

// ==============================================
// Auth0 相关路由
// ==============================================

/**
 * 🔥 应用初始化接口（优化版）
 * POST /api/init
 *
 * 并行执行用户同步、配置加载、会话列表获取
 * 用于优化首次登录的加载速度
 *
 * 🎯 性能优化：
 * - 用户同步 + 配置加载 + 会话列表并行执行
 * - 减少网络往返次数（3次请求 -> 1次请求）
 * - 预期加载时间从 10-15 秒降至 2-5 秒
 */
router.post('/init', initController.initializeApp)

/**
 * 同步 Auth0 用户到 Supabase
 * POST /api/auth/sync-auth0-user
 * 需要 Auth0 认证
 */
router.post('/auth/sync-auth0-user', auth, auth0Controller.syncAuth0User)

/**
 * 将 Access Token 写入 Cookie（用于 SSE 认证）
 * POST /api/auth/set-token-cookie
 * 前端登录后调用此接口
 */
router.post('/auth/set-token-cookie', authController.setTokenCookie)

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
 * 用户退出登录
 * POST /api/auth/logout
 * 清除用户相关的 Redis 缓存
 */
router.post('/auth/logout', auth, requireAuth, authController.logout)

/**
 * 获取当前登录用户信息
 * 需要 Auth0 认证
 */
router.get('/auth/me', auth, requireAuth, authController.getCurrentUser)

// ==============================================
// 角色管理路由
// ==============================================

/**
 * 获取所有角色（需要登录）
 */
router.get('/roles', auth, requireAuth, roleController.getAllRoles)

/**
 * 创建角色（需要管理员权限）
 */
router.post('/roles', auth, requireAdmin, roleController.createRole)

/**
 * 更新角色（需要管理员权限）
 */
router.put('/roles/:id', auth, requireAdmin, roleController.updateRole)

/**
 * 删除角色（需要管理员权限）
 */
router.delete('/roles/:id', auth, requireAdmin, roleController.deleteRole)

// ==============================================
// 用户角色管理路由
// ==============================================

/**
 * 为用户分配角色（需要管理员权限）
 */
router.post('/user-roles/assign', auth, requireAdmin, roleController.assignRoleToUser)

/**
 * 移除用户角色（需要管理员权限）
 */
router.post('/user-roles/remove', auth, requireAdmin, roleController.removeRoleFromUser)

/**
 * 获取用户的角色（需要登录）
 */
router.get('/user-roles/:userId', auth, requireAuth, roleController.getUserRoles)

// ==============================================
// 供应商和模型管理路由
// ==============================================

/**
 * 获取所有供应商及其模型
 */
router.get('/providers', auth, requireAuth, providerController.getProviders)

/**
 * 创建供应商
 */
router.post('/providers', auth, requireAuth, providerController.addProvider)

/**
 * 更新供应商
 */
router.put('/providers/:id', auth, requireAuth, providerController.editProvider)

/**
 * 删除供应商
 */
router.delete('/providers/:id', auth, requireAuth, providerController.removeProvider)

/**
 * 创建模型
 */
router.post('/models', auth, requireAuth, providerController.addModel)

/**
 * 更新模型
 */
router.put('/models/:id', auth, requireAuth, providerController.editModel)

/**
 * 删除模型
 */
router.delete('/models/:id', auth, requireAuth, providerController.removeModel)

/**
 * 切换模型启用状态
 */
router.patch('/models/:id/toggle', auth, requireAuth, providerController.toggleModel)

/**
 * 测试模型连接
 */
router.post('/models/:id/test', auth, requireAuth, providerController.testModel)

// ==============================================
// 用户配置路由
// ==============================================

/**
 * 获取用户完整配置
 */
router.get('/config', auth, requireAuth, configController.getConfig)

/**
 * 获取用户设置
 */
router.get('/config/user-settings', auth, requireAuth, configController.getUserSettingsHandler)

/**
 * 更新用户设置
 */
router.patch('/config/user-settings', auth, requireAuth, configController.patchUserSettings)

/**
 * 获取聊天配置
 */
router.get('/config/chat', auth, requireAuth, configController.getChatConfigHandler)

/**
 * 更新聊天配置
 */
router.patch('/config/chat', auth, requireAuth, configController.patchChatConfig)

/**
 * 获取工作流配置
 */
router.get('/config/workflow', auth, requireAuth, configController.getWorkflowConfigHandler)

/**
 * 更新工作流配置
 */
router.patch('/config/workflow', auth, requireAuth, configController.patchWorkflowConfig)

/**
 * 获取额外配置
 */
router.get('/config/additional', auth, requireAuth, configController.getAdditionalConfigHandler)

/**
 * 更新额外配置
 */
router.patch('/config/additional', auth, requireAuth, configController.patchAdditionalConfig)

/**
 * 重置配置为默认值
 */
router.post('/config/reset', auth, requireAuth, configController.resetConfig)

// ==============================================
// 会话管理路由
// ==============================================

/**
 * 获取用户的所有会话列表
 * GET /api/conversations
 */
router.get('/conversations', auth, requireAuth, conversationController.getUserConversationsHandler)

/**
 * 创建新会话
 * POST /api/conversations
 */
router.post('/conversations', auth, requireAuth, conversationController.createConversationHandler)

/**
 * 获取指定会话的详细信息
 * GET /api/conversations/:id
 */
router.get('/conversations/:id', auth, requireAuth, conversationController.getConversationByIdHandler)

/**
 * 更新会话信息
 * PATCH /api/conversations/:id
 */
router.patch('/conversations/:id', auth, requireAuth, conversationController.updateConversationHandler)

/**
 * 删除会话
 * DELETE /api/conversations/:id
 */
router.delete('/conversations/:id', auth, requireAuth, conversationController.deleteConversationHandler)

/**
 * 获取会话的所有消息
 * GET /api/conversations/:id/messages
 */
router.get('/conversations/:id/messages', auth, requireAuth, (req, res) => {
  console.warn('🚀🚀🚀 [ROUTE] 路由被匹配到了！conversationId:', req.params.id)
  return conversationController.getConversationMessagesHandler(req, res)
})

/**
 * 批量保存消息到会话
 * POST /api/conversations/:id/messages
 */
router.post('/conversations/:id/messages', auth, requireAuth, conversationController.saveMessagesHandler)

// ==============================================
// 模型-角色权限管理路由（仅管理员）
// ==============================================

/**
 * 获取所有模型及其可访问角色
 */
router.get('/model-roles/all', auth, requireAdmin, modelRoleController.getAllModelsWithRolesHandler)

/**
 * 获取指定模型的角色列表
 */
router.get('/model-roles/:modelId', auth, requireAdmin, modelRoleController.getModelRolesHandler)

/**
 * 为模型分配角色
 */
router.post('/model-roles/assign', auth, requireAdmin, modelRoleController.assignRoleHandler)

/**
 * 移除模型的角色
 */
router.post('/model-roles/remove', auth, requireAdmin, modelRoleController.removeRoleHandler)

/**
 * 批量设置模型的角色（覆盖现有设置）
 */
router.post('/model-roles/set', auth, requireAdmin, modelRoleController.setModelRolesHandler)

// ==============================================
// SSE 实时事件推送路由
// ==============================================

/**
 * 建立 SSE 连接
 * GET /api/events/sync
 * 用于跨设备实时同步状态
 *
 * 🔥 认证方式（方案 A - 更安全）：
 * - 优先从 Cookie 读取 token（HttpOnly Cookie，防止 XSS）
 * - 降级支持：URL 参数传递 token（兼容旧版本）
 *
 * 前端配置：
 * - EventSource({ withCredentials: true }) 自动发送 Cookie
 * - 登录后调用 POST /api/auth/set-token-cookie 设置 Cookie
 */
router.get('/events/sync', ...sseAuth, sseController.handleSSEConnection)

/**
 * 获取 SSE 统计信息
 * GET /api/events/stats
 * 需要管理员权限
 */
router.get('/events/stats', auth, requireAdmin, sseController.getSSEStatsHandler)

// ==============================================
// 调试工具路由（仅开发环境）
// ==============================================

/**
 * 清除会话缓存
 * DELETE /api/debug/cache/conversation/:id
 * 需要登录
 */
router.delete('/debug/cache/conversation/:id', auth, requireAuth, debugController.clearConversationCache)

// ==============================================
// 小说工作流路由
// ==============================================

/**
 * 创建新小说项目
 * POST /api/novels
 * Body: { title, genre?, theme?, idea? }
 */
router.post('/novels', auth, requireAuth, novelController.createNovel)

/**
 * 获取用户的所有小说
 * GET /api/novels
 */
router.get('/novels', auth, requireAuth, novelController.getUserNovels)

/**
 * 获取小说详情（包含所有卷）
 * GET /api/novels/:id
 */
router.get('/novels/:id', auth, requireAuth, novelController.getNovel)

/**
 * 更新小说信息
 * PATCH /api/novels/:id
 * Body: { title?, genre?, theme?, status? }
 */
router.patch('/novels/:id', auth, requireAuth, novelController.updateNovel)

/**
 * 删除小说（级联删除所有卷和章节）
 * DELETE /api/novels/:id
 */
router.delete('/novels/:id', auth, requireAuth, novelController.deleteNovel)

/**
 * 获取卷详情
 * GET /api/volumes/:volumeId
 */
router.get('/volumes/:volumeId', auth, requireAuth, novelController.getVolume)

/**
 * 更新卷信息（未封存时可用）
 * PATCH /api/volumes/:volumeId
 * Body: { outline?, style_config?, breakdown?, tasks?, status? }
 */
router.patch('/volumes/:volumeId', auth, requireAuth, novelController.updateVolume)

/**
 * 启动工作流1：剧情大纲生成
 * POST /api/volumes/:volumeId/workflow/1/start
 * Body: { idea?, chat_history? }
 */
router.post('/volumes/:volumeId/workflow/1/start', auth, requireAuth, novelController.startWorkflow1)

/**
 * 获取工作流执行状态
 * GET /api/workflow/:executionId/status
 */
router.get('/workflow/:executionId/status', auth, requireAuth, novelController.getWorkflowStatus)

/**
 * 与 AI 角色聊天
 * POST /api/volumes/:volumeId/chat/:aiRole
 * Body: { message, workflow_type }
 * aiRole: screenwriter | director | task | chapter
 */
router.post('/volumes/:volumeId/chat/:aiRole', auth, requireAuth, novelController.chatWithAI)

/**
 * 获取聊天历史
 * GET /api/volumes/:volumeId/chat/:aiRole?workflow_type=1
 */
router.get('/volumes/:volumeId/chat/:aiRole', auth, requireAuth, novelController.getChatHistory)

/**
 * 获取卷的所有章节
 * GET /api/volumes/:volumeId/chapters
 */
router.get('/volumes/:volumeId/chapters', auth, requireAuth, novelController.getChapters)

export default router
