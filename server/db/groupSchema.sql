-- 小组功能数据库表结构

-- 1. 小组表
CREATE TABLE IF NOT EXISTS groups (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE, -- 小组名称
  description TEXT, -- 小组描述
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL, -- 创建者
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 用户-小组关联表（多对多关系）
CREATE TABLE IF NOT EXISTS user_groups (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member', -- 角色：'owner'（组长）或 'member'（成员）
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, group_id) -- 确保用户在同一小组中只出现一次
);

-- 3. 修改项目表，添加 group_id 字段（如果还没有）
-- 注意：如果 projects 表已经有 user_id，我们需要同时支持 user_id 和 group_id
-- 项目可以属于个人（user_id）或小组（group_id）
ALTER TABLE projects ADD COLUMN IF NOT EXISTS group_id INTEGER REFERENCES groups(id) ON DELETE SET NULL;

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_groups_name ON groups(name);
CREATE INDEX IF NOT EXISTS idx_user_groups_user_id ON user_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_user_groups_group_id ON user_groups(group_id);
CREATE INDEX IF NOT EXISTS idx_projects_group_id ON projects(group_id);

-- 创建更新时间触发器函数（如果还没有）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 为 groups 表添加更新时间触发器
DROP TRIGGER IF EXISTS update_groups_updated_at ON groups;
CREATE TRIGGER update_groups_updated_at
  BEFORE UPDATE ON groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

