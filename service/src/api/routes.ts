/**
 * API 路由配置
 * 集成 Clerk + Supabase
 */

import express from 'express'
import { clerkAuth, requireAdmin, requireAuth } from '../middleware/clerkAuth'
import * as authController from './authController'
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

export default router
