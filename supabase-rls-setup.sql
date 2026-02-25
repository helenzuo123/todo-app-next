-- ========================================
-- TodoList 应用 - Row Level Security (RLS) 策略设置
-- ========================================
--
-- 🔒 安全说明：
-- 此脚本将设置行级安全策略，确保每个用户只能访问自己的数据
-- 即使用户通过浏览器开发者工具直接调用 Supabase API，也无法访问其他用户的数据
--
-- ⚠️ 执行前请确保：
-- 1. 你已登录 Supabase Dashboard
-- 2. 选择了正确的项目
-- 3. 进入 SQL Editor 页面
-- 4. 将此文件的全部内容粘贴进去执行
--
-- ========================================

-- 步骤 1: 启用 RLS（Row Level Security）
-- ========================================
-- 这会强制所有对 todos 表的访问都必须经过策略检查
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 步骤 2: 删除可能存在的旧策略（如果有的话）
-- ========================================
DROP POLICY IF EXISTS "用户只能查看自己的任务" ON todos;
DROP POLICY IF EXISTS "用户只能创建自己的任务" ON todos;
DROP POLICY IF EXISTS "用户只能更新自己的任务" ON todos;
DROP POLICY IF EXISTS "用户只能删除自己的任务" ON todos;

-- ========================================
-- 步骤 3: 创建新的 RLS 策略
-- ========================================

-- 📖 SELECT 策略：用户只能查看自己的任务
CREATE POLICY "用户只能查看自己的任务"
ON todos
FOR SELECT
USING (auth.uid() = user_id);

-- ✏️ INSERT 策略：用户只能创建自己的任务
-- 同时确保新任务的 user_id 必须是当前登录用户
CREATE POLICY "用户只能创建自己的任务"
ON todos
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 🔄 UPDATE 策略：用户只能更新自己的任务
-- 并且不能修改任务的 user_id
CREATE POLICY "用户只能更新自己的任务"
ON todos
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 🗑️ DELETE 策略：用户只能删除自己的任务
-- 注意：我们使用软删除（delete_flag），所以实际上是 UPDATE 操作
-- 但这里也添加 DELETE 策略以防万一
CREATE POLICY "用户只能删除自己的任务"
ON todos
FOR DELETE
USING (auth.uid() = user_id);

-- ========================================
-- 步骤 4: 验证 RLS 策略是否生效
-- ========================================
-- 执行完上述 SQL 后，在 SQL Editor 中运行以下查询来验证：
--
-- 查看 todos 表的 RLS 状态：
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'todos';
--
-- 查看所有策略：
-- SELECT * FROM pg_policies WHERE tablename = 'todos';
--
-- 预期结果：
-- 1. rowsecurity 应该是 true
-- 2. 应该能看到 4 条策略（SELECT, INSERT, UPDATE, DELETE）
--
-- ========================================

-- ========================================
-- 步骤 5: 确保 user_id 字段不为空（可选但推荐）
-- ========================================
-- 如果你的表中已经有数据，先备份再执行
-- ALTER TABLE todos ALTER COLUMN user_id SET NOT NULL;

-- ========================================
-- 🎉 完成！
-- ========================================
--
-- 现在你的应用已经受到数据库级别的保护
--
-- 测试方法：
-- 1. 在浏览器中打开开发者工具
-- 2. 尝试直接调用 Supabase API 查询其他用户的数据
-- 3. 应该会返回空结果或权限错误
--
-- 例如：
-- const { data } = await supabase
--   .from('todos')
--   .select('*')
--   .eq('user_id', '其他用户的ID')  // 尝试访问其他用户的数据
--
-- 结果：data 应该是空数组 []，因为 RLS 策略阻止了访问
-- ========================================
