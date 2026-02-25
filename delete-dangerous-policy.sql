-- ========================================
-- 删除危险的 "允许所有操作" 策略
-- ========================================
-- 🚨 这个策略允许任何人访问所有数据，必须立即删除！

-- 删除危险策略
DROP POLICY IF EXISTS "允许所有操作 (临时)" ON todos;

-- 或者如果策略名称不同，可以尝试这些可能的名称：
DROP POLICY IF EXISTS "允许所有操作(临时)" ON todos;
DROP POLICY IF EXISTS "Allow all operations" ON todos;
DROP POLICY IF EXISTS "临时策略" ON todos;
DROP POLICY IF EXISTS "Enable all" ON todos;

-- ========================================
-- 执行完毕后，再次运行验证脚本确认
-- ========================================
-- 应该只剩下 4 条策略：
-- 1. 用户只能查看自己的任务 (SELECT)
-- 2. 用户只能创建自己的任务 (INSERT)
-- 3. 用户只能更新自己的任务 (UPDATE)
-- 4. 用户只能删除自己的任务 (DELETE)
