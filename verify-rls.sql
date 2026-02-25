-- ========================================
-- 验证 RLS 是否已启用
-- ========================================
-- 请在 Supabase SQL Editor 中执行这个脚本来检查 RLS 状态

-- 1. 查看 todos 表是否启用了 RLS
SELECT
  schemaname,
  tablename,
  rowsecurity as "RLS已启用"
FROM pg_tables
WHERE tablename = 'todos';

-- 预期结果：rowsecurity 应该是 't' (true)

-- ========================================

-- 2. 查看 todos 表上的所有 RLS 策略
SELECT
  schemaname,
  tablename,
  policyname as "策略名称",
  cmd as "操作类型",
  qual as "USING条件",
  with_check as "WITH CHECK条件"
FROM pg_policies
WHERE tablename = 'todos';

-- 预期结果：应该看到 4 条策略
-- - SELECT (查询)
-- - INSERT (插入)
-- - UPDATE (更新)
-- - DELETE (删除)
-- 每条策略的条件中应该包含 auth.uid() = user_id

-- ========================================

-- 如果上面两个查询：
-- ✅ 第一个返回 rowsecurity = 't'，第二个返回 4 条策略 → RLS 已正确设置
-- ❌ 第一个返回 rowsecurity = 'f' 或第二个返回 0 条策略 → 需要执行 supabase-rls-setup.sql
