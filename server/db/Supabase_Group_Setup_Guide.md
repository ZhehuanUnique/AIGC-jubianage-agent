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

1. 打开项目中的 `server/db/supabase_group_schema.sql` 文件
2. 复制全部内容
3. 粘贴到 Supabase SQL Editor 中
4. 点击 **Run** 或按 `Ctrl+Enter` 执行

### 4. 验证创建结果

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

### 5. 完成后

1. 刷新前端页面
2. 尝试创建项目，应该不再出现错误

## 注意事项

- 这个脚本使用了 `IF NOT EXISTS`，可以安全地重复执行
- 如果 `projects` 表已经存在 `group_id` 列，脚本会跳过添加列的步骤
- 所有表都会自动创建必要的索引和触发器

