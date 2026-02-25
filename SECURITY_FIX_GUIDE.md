# 🔒 安全问题修复指南

本文档将指导你修复 TodoList 应用中发现的关键安全问题。

---

## 📋 需要修复的问题

### 🔴 问题 1: 数据库缺少 RLS（Row Level Security）策略
**风险等级**: 严重
**影响**: 用户可以通过浏览器开发者工具直接调用 Supabase API 访问其他用户的数据

### 🔴 问题 2: 生产环境密钥泄露在 git 仓库
**风险等级**: 严重
**影响**: 任何人都可以看到你的 Supabase 凭证并直接访问数据库

### 🔴 问题 3: .env.local 文件被提交到 git 历史
**风险等级**: 严重
**影响**: 即使从当前版本删除，密钥仍然存在于 git 历史中

---

## ✅ 修复步骤

### 任务 1: 设置 Supabase RLS 策略（15 分钟）

#### 第 1 步：登录 Supabase Dashboard

1. 打开浏览器，访问 https://supabase.com
2. 登录你的账号
3. 选择 TodoList 项目（URL 是 `vlhbassbcbaftzitlhui.supabase.co` 的那个项目）

#### 第 2 步：打开 SQL Editor

1. 在左侧菜单中找到并点击 **SQL Editor** 图标（看起来像一个数据库加命令行）
2. 点击右上角的 **+ New query** 按钮

#### 第 3 步：执行 RLS 策略脚本

1. 打开项目根目录的 `supabase-rls-setup.sql` 文件
2. 复制全部内容
3. 粘贴到 Supabase SQL Editor 中
4. 点击右下角的 **Run** 按钮（或按 Cmd+Enter / Ctrl+Enter）
5. 等待执行完成，应该会看到 "Success. No rows returned" 或类似的成功消息

#### 第 4 步：验证 RLS 是否生效

在 SQL Editor 中运行以下查询：

```sql
-- 查看 RLS 是否启用
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'todos';

-- 查看所有策略
SELECT * FROM pg_policies WHERE tablename = 'todos';
```

**预期结果**：
- 第一个查询应该显示 `rowsecurity = true`
- 第二个查询应该显示 4 条策略（SELECT, INSERT, UPDATE, DELETE）

#### 第 5 步：测试 RLS 保护

1. 在应用中登录你的账号
2. 打开浏览器开发者工具（F12）
3. 在 Console 中尝试访问其他用户的数据：

```javascript
// 尝试查询所有用户的任务（应该只能看到自己的）
const { data, error } = await supabase
  .from('todos')
  .select('*')

console.log('我能看到的任务数量:', data?.length)
// 应该只能看到自己的任务，不能看到其他用户的
```

✅ **任务完成标志**: 能看到 4 条 RLS 策略，并且测试确认无法访问其他用户数据

---

### 任务 2: 更换泄露的 Supabase 密钥（5 分钟）

#### 第 1 步：在 Supabase 中生成新的 Anon Key

1. 在 Supabase Dashboard 中，点击左下角的 **Project Settings** （齿轮图标）
2. 点击左侧菜单中的 **API**
3. 找到 **Project API keys** 部分
4. 你会看到两个密钥：
   - `anon public` - 这是前端使用的密钥
   - `service_role secret` - 这是后端使用的密钥（不要泄露！）
5. 点击 `anon public` 旁边的 **Regenerate** 按钮
6. 确认操作
7. 复制新生成的密钥

⚠️ **注意**: 一旦更换密钥，旧密钥会立即失效，所有使用旧密钥的应用都会停止工作！

#### 第 2 步：更新 .env.local 文件

1. 打开项目根目录的 `.env.local` 文件
2. 将 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 的值替换为新生成的密钥
3. 保存文件

```env
NEXT_PUBLIC_SUPABASE_URL=https://vlhbassbcbaftzitlhui.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的新密钥
```

#### 第 3 步：重启开发服务器

```bash
# 停止当前运行的服务器（Ctrl+C）
# 然后重新启动
npm run dev
```

#### 第 4 步：测试应用是否正常工作

1. 打开浏览器访问 http://localhost:3000
2. 尝试登录
3. 尝试添加、编辑、删除任务
4. 确认所有功能正常

✅ **任务完成标志**: 应用使用新密钥能正常运行，所有功能正常

---

### 任务 3: 清理 git 历史中的敏感信息（10 分钟）

⚠️ **警告**: 这个操作会重写 git 历史，如果其他人也在使用这个仓库，需要协调好！

#### 方案 A: 使用 git-filter-repo（推荐）

**第 1 步：安装 git-filter-repo**

```bash
# macOS
brew install git-filter-repo

# 或者使用 pip
pip install git-filter-repo
```

**第 2 步：删除敏感文件**

```bash
# 进入项目目录
cd /Users/zuohongxia/TodoList/todo-app-next

# 从整个 git 历史中删除 .env.local 文件
git-filter-repo --path .env.local --invert-paths --force
```

**第 3 步：强制推送到远程仓库**

```bash
# 强制推送（会覆盖远程仓库的历史）
git push origin main --force
```

#### 方案 B: 使用 BFG Repo-Cleaner（备选）

**第 1 步：下载 BFG**

```bash
# 下载 BFG jar 文件
curl -O https://repo1.maven.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar
```

**第 2 步：清理仓库**

```bash
# 备份当前仓库
cd /Users/zuohongxia/TodoList
cp -r todo-app-next todo-app-next-backup

# 清理 .env.local 文件
java -jar bfg-1.14.0.jar --delete-files .env.local todo-app-next

# 进入仓库
cd todo-app-next

# 清理引用
git reflog expire --expire=now --all && git gc --prune=now --aggressive

# 强制推送
git push origin main --force
```

#### 第 4 步：验证清理结果

```bash
# 搜索 git 历史中是否还有敏感信息
git log --all --full-history -- .env.local

# 如果没有输出，说明清理成功
```

#### 第 5 步：通知其他协作者

如果有其他人也在使用这个仓库，需要通知他们：

```bash
# 他们需要重新克隆仓库
git clone https://github.com/你的用户名/todo-app-next.git

# 或者重置他们的本地仓库
git fetch origin
git reset --hard origin/main
git clean -fdx
```

✅ **任务完成标志**: `git log` 中搜索不到 .env.local 文件

---

## 🔍 验证所有修复是否完成

### 检查清单

- [ ] Supabase RLS 策略已设置并启用
- [ ] 测试确认无法访问其他用户的数据
- [ ] Supabase Anon Key 已更换
- [ ] 应用使用新密钥正常运行
- [ ] .env.local 已从 git 历史中完全删除
- [ ] .gitignore 中包含 `.env*` 规则

### 最终测试

1. **安全测试**：打开浏览器开发者工具，尝试绕过前端限制访问数据库，应该被 RLS 阻止
2. **功能测试**：所有 CRUD 操作正常工作
3. **历史检查**：`git log --all` 中没有敏感信息

---

## 📚 后续建议

### 1. 添加 .env.example 文件

创建一个示例环境变量文件：

```bash
# .env.example
NEXT_PUBLIC_SUPABASE_URL=你的Supabase项目URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的Supabase匿名密钥
```

### 2. 更新 README.md

添加设置说明：

```markdown
## 环境变量设置

1. 复制 `.env.example` 为 `.env.local`
2. 填入你的 Supabase 凭证
3. 不要将 `.env.local` 提交到 git
```

### 3. 定期审查安全配置

- 每月检查 Supabase 的访问日志
- 监控异常的 API 调用
- 定期更换密钥（每 3-6 个月）

---

## ❓ 常见问题

### Q: 如果我已经将代码推送到 GitHub，其他人看到了密钥怎么办？

A: 立即更换密钥！旧密钥一旦泄露就应该被视为不安全的，即使你删除了代码。

### Q: RLS 会不会影响性能？

A: 会有轻微的性能开销（几毫秒），但安全性的提升远远超过这点性能损失。

### Q: 我能不能只在代码里检查 user_id，不用 RLS？

A: 不能！客户端的任何检查都可以被绕过。RLS 是数据库级别的保护，无法被绕过。

### Q: git-filter-repo 说 "not a valid git repo"？

A: 确保你在 git 仓库的根目录，并且仓库没有未提交的更改。先提交所有更改，然后再运行清理命令。

---

## 📞 需要帮助？

如果遇到问题，可以：

1. 查看 Supabase 官方文档：https://supabase.com/docs/guides/auth/row-level-security
2. 查看 git-filter-repo 文档：https://github.com/newren/git-filter-repo
3. 在项目中提 issue

---

**最后修改时间**: 2026-02-20
