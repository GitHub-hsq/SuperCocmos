-- ============================================
-- 清理软删除记录脚本
-- ============================================
-- 
-- 用途：物理删除超过指定天数的软删除记录
-- 建议：定期运行（如每月一次）
-- 警告：此操作不可逆！
--
-- ============================================

-- 1. 查看即将删除的记录（预览）
-- 取消注释下面的查询来预览将被删除的记录

-- 查看超过 30 天的软删除模型
-- SELECT 
--   m.id, 
--   m.model_id, 
--   m.display_name, 
--   m.deleted_at,
--   p.name as provider_name
-- FROM models m
-- LEFT JOIN providers p ON m.provider_id = p.id
-- WHERE m.deleted_at IS NOT NULL 
--   AND m.deleted_at < NOW() - INTERVAL '30 days'
-- ORDER BY m.deleted_at DESC;

-- 查看超过 30 天的软删除供应商
-- SELECT 
--   id, 
--   name, 
--   base_url, 
--   deleted_at
-- FROM providers
-- WHERE deleted_at IS NOT NULL 
--   AND deleted_at < NOW() - INTERVAL '30 days'
-- ORDER BY deleted_at DESC;

-- ============================================
-- 2. 执行清理（请谨慎操作！）
-- ============================================

-- 🔥 删除超过 30 天的软删除模型
-- 取消注释下面的语句来执行删除
-- DELETE FROM models
-- WHERE deleted_at IS NOT NULL 
--   AND deleted_at < NOW() - INTERVAL '30 days';

-- 🔥 删除超过 30 天的软删除供应商
-- 注意：由于外键级联，删除供应商会自动删除其所有模型
-- DELETE FROM providers
-- WHERE deleted_at IS NOT NULL 
--   AND deleted_at < NOW() - INTERVAL '30 days';

-- ============================================
-- 3. 常用清理命令（可根据需要调整天数）
-- ============================================

-- 清理 7 天前的软删除记录
-- DELETE FROM models WHERE deleted_at < NOW() - INTERVAL '7 days';
-- DELETE FROM providers WHERE deleted_at < NOW() - INTERVAL '7 days';

-- 清理 60 天前的软删除记录
-- DELETE FROM models WHERE deleted_at < NOW() - INTERVAL '60 days';
-- DELETE FROM providers WHERE deleted_at < NOW() - INTERVAL '60 days';

-- 清理 90 天前的软删除记录
-- DELETE FROM models WHERE deleted_at < NOW() - INTERVAL '90 days';
-- DELETE FROM providers WHERE deleted_at < NOW() - INTERVAL '90 days';

-- ============================================
-- 4. 立即清理所有软删除记录（危险！）
-- ============================================

-- ⚠️ 警告：这将删除所有软删除的记录，不考虑删除时间
-- 只在确定不需要恢复任何记录时使用

-- DELETE FROM models WHERE deleted_at IS NOT NULL;
-- DELETE FROM providers WHERE deleted_at IS NOT NULL;

-- ============================================
-- 5. 统计软删除记录数量
-- ============================================

-- 统计软删除的模型数量（按供应商分组）
SELECT 
  p.name as provider_name,
  COUNT(m.id) as deleted_models_count,
  MIN(m.deleted_at) as oldest_deletion,
  MAX(m.deleted_at) as latest_deletion
FROM models m
LEFT JOIN providers p ON m.provider_id = p.id
WHERE m.deleted_at IS NOT NULL
GROUP BY p.name
ORDER BY deleted_models_count DESC;

-- 统计软删除的供应商数量
SELECT 
  COUNT(*) as deleted_providers_count,
  MIN(deleted_at) as oldest_deletion,
  MAX(deleted_at) as latest_deletion
FROM providers
WHERE deleted_at IS NOT NULL;

-- ============================================
-- 6. 恢复误删除的记录（如果需要）
-- ============================================

-- 恢复特定模型（通过 ID）
-- UPDATE models 
-- SET deleted_at = NULL, updated_at = NOW()
-- WHERE id = 'your-model-uuid-here';

-- 恢复特定供应商（通过名称）
-- UPDATE providers 
-- SET deleted_at = NULL, updated_at = NOW()
-- WHERE name = 'your-provider-name-here';

-- 恢复最近删除的模型（最近 1 小时内删除的）
-- UPDATE models 
-- SET deleted_at = NULL, updated_at = NOW()
-- WHERE deleted_at > NOW() - INTERVAL '1 hour';

