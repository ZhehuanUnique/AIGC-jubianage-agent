# 后端服务文档

## 数据库管理

### 在 Supabase 上创建小组功能数据库表

如果遇到 `column "group_id" of relation "projects" does not exist` 错误，需要在 Supabase 上创建小组功能相关的数据库表：

#### 解决步骤

1. **打开 Supabase Dashboard**
   - 访问 [Supabase Dashboard](https://app.supabase.com/)
   - 登录并选择你的项目

2. **打开 SQL Editor**
   - 在左侧菜单中，点击 **SQL Editor**
   - 点击 **New query** 创建新查询

3. **执行 SQL 脚本**
   - 打开项目中的 `server/db/supabase_group_schema.sql` 文件
   - 复制全部内容
   - 粘贴到 Supabase SQL Editor 中
   - 点击 **Run** 或按 `Ctrl+Enter` 执行

4. **验证创建结果**

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

#### 注意事项

- 这个脚本使用了 `IF NOT EXISTS`，可以安全地重复执行
- 如果 `projects` 表已经存在 `group_id` 列，脚本会跳过添加列的步骤
- 所有表都会自动创建必要的索引和触发器

#### 如果遇到错误

如果执行时遇到错误，请检查：
1. `users` 表是否存在（groups 表引用了 users 表）
2. `projects` 表是否存在（需要添加 group_id 列）
3. 是否有足够的数据库权限

## 服务模块

### 视频运动提示词生成模块

详细文档请参考：`server/services/videoMotionPrompt/README.md`

## 环境变量配置

详细的环境变量配置说明请参考项目根目录的 `README.md` 文件。

## API 接口

详细 API 接口文档请参考项目根目录的 `README.md` 文件。


