-- ============================================
-- 清理模型-角色访问控制表
-- 删除旧表，准备重建
-- ============================================

-- ⚠️ 警告：此脚本会删除表及其所有数据
-- 请确保已备份重要数据

-- 1. 删除视图（依赖 model_role_access 表）
DROP VIEW IF EXISTS models_with_roles CASCADE;

-- 2. 删除函数（依赖 model_role_access 表）
DROP FUNCTION IF EXISTS user_can_access_model(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS get_user_accessible_models(UUID) CASCADE;

-- 3. 删除表（会级联删除所有关联数据）
DROP TABLE IF EXISTS model_role_access CASCADE;

-- 4. 清理完成提示
-- 现在可以重新执行 model-role-access-schema.sql 创建新表

