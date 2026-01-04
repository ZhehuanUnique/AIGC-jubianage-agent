# 在 Supabase 上创建小组功能数据库表

## 问题描述

当前错误：
- `column "group_id" of relation "projects" does not exist` - projects 表缺少 group_id 列
- `relation "user_groups" does not exist` - user_groups 表不存在

## 解决步骤

### 1. 打开 Supabase Dashboard

1. 访问 [Supabase Dashboard](https://app.supabase.com/)
2. 登录并选择你的项目

### 2. 打开 SQL Editor

1. 在左侧菜单中，点击 **SQL Editor**
2. 点击 **New query** 创建新查询

### 3. 执行 SQL 脚本

1. 复制以下 SQL 脚本内容（或从 `server/db/supabase_group_schema.sql` 文件复制）
2. 粘贴到 SQL Editor 中
3. 点击 **Run** 或按 `Ctrl+Enter` 执行

### 4. SQL 脚本内容

```sql
-- ============================================
-- 小组功能数据库表结构 - Supabase 版本
-- ============================================

-- 1. 创建小组表
CREATE TABLE IF NOT EXISTS groups (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE, -- 小组名称
  description TEXT, -- 小组描述
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL, -- 创建者
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 创建用户-小组关联表（多对多关系）
CREATE TABLE IF NOT EXISTS user_groups (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member', -- 角色：'owner'（组长）或 'member'（成员）
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, group_id) -- 确保用户在同一小组中只出现一次
);

-- 3. 修改项目表，添加 group_id 字段（如果还没有）
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'group_id'
  ) THEN
    ALTER TABLE projects ADD COLUMN group_id INTEGER REFERENCES groups(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 4. 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_groups_name ON groups(name);
CREATE INDEX IF NOT EXISTS idx_user_groups_user_id ON user_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_user_groups_group_id ON user_groups(group_id);
CREATE INDEX IF NOT EXISTS idx_projects_group_id ON projects(group_id);

-- 5. 创建更新时间触发器函数（如果还没有）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. 为 groups 表添加更新时间触发器
DROP TRIGGER IF EXISTS update_groups_updated_at ON groups;
CREATE TRIGGER update_groups_updated_at
  BEFORE UPDATE ON groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 5. 验证创建结果

执行以下查询来验证表是否创建成功：

```sql
-- 检查表是否存在
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('groups', 'user_groups');

-- 检查 projects 表是否有 group_id 列
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'projects' 
  AND column_name = 'group_id';
```

如果查询返回了 `groups`、`user_groups` 表和 `group_id` 列，说明创建成功！

### 6. 完成后

1. 刷新前端页面
2. 尝试创建项目，应该不再出现错误

## 注意事项

- 这个脚本使用了 `IF NOT EXISTS`，可以安全地重复执行
- 如果 `projects` 表已经存在 `group_id` 列，脚本会跳过添加列的步骤
- 所有表都会自动创建必要的索引和触发器

## 如果遇到错误

如果执行时遇到错误，请检查：
1. `users` 表是否存在（groups 表引用了 users 表）
2. `projects` 表是否存在（需要添加 group_id 列）
3. 是否有足够的数据库权限








