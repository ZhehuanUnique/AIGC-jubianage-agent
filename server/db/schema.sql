-- AIGC 剧变时代 Agent 数据库表结构

-- 1. 项目表
CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  script_title VARCHAR(255),
  script_content TEXT,
  work_style VARCHAR(100),
  max_shots INTEGER,
  analysis_result JSONB, -- 存储分析结果（角色、场景、物品）
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 任务表
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  date DATE DEFAULT CURRENT_DATE,
  progress1 INTEGER DEFAULT 0,
  progress2 INTEGER DEFAULT 0,
  is_completed1 BOOLEAN DEFAULT FALSE,
  is_expanded BOOLEAN DEFAULT FALSE,
  mode VARCHAR(50), -- 'fusion' 或 'image'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. 剧本片段表
CREATE TABLE IF NOT EXISTS script_segments (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  shot_number INTEGER NOT NULL,
  segment TEXT NOT NULL,
  prompt TEXT, -- 分镜提示词
  description TEXT, -- 分镜描述
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. 分镜表
CREATE TABLE IF NOT EXISTS shots (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  segment_id INTEGER REFERENCES script_segments(id) ON DELETE SET NULL,
  shot_number INTEGER NOT NULL,
  description TEXT,
  prompt TEXT,
  segment TEXT,
  style VARCHAR(100),
  scene_description TEXT,
  visual_focus TEXT,
  model VARCHAR(100) DEFAULT '即梦AI-视频生成3.0pro',
  aspect_ratio VARCHAR(20) DEFAULT '16:9',
  quantity INTEGER DEFAULT 1,
  is_expanded BOOLEAN DEFAULT FALSE,
  thumbnail_image_url TEXT, -- COS中的缩略图URL
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. 角色表
CREATE TABLE IF NOT EXISTS characters (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT, -- COS中的图片URL
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, name) -- 同一项目内角色名唯一
);

-- 6. 场景表
CREATE TABLE IF NOT EXISTS scenes (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT, -- COS中的图片URL
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, name) -- 同一项目内场景名唯一
);

-- 7. 物品表
CREATE TABLE IF NOT EXISTS items (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT, -- COS中的图片URL
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, name) -- 同一项目内物品名唯一
);

-- 8. 文件表（存储COS中的文件信息）
CREATE TABLE IF NOT EXISTS files (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  file_type VARCHAR(50) NOT NULL, -- 'image', 'video', 'document'
  file_name VARCHAR(255) NOT NULL,
  file_size BIGINT, -- 文件大小（字节）
  mime_type VARCHAR(100),
  cos_key VARCHAR(500) NOT NULL, -- COS中的文件路径
  cos_url TEXT NOT NULL, -- COS中的文件URL
  thumbnail_url TEXT, -- 缩略图URL
  metadata JSONB, -- 额外的元数据
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. 分镜关联表（多对多关系）
CREATE TABLE IF NOT EXISTS shot_characters (
  shot_id INTEGER REFERENCES shots(id) ON DELETE CASCADE,
  character_id INTEGER REFERENCES characters(id) ON DELETE CASCADE,
  PRIMARY KEY (shot_id, character_id)
);

CREATE TABLE IF NOT EXISTS shot_scenes (
  shot_id INTEGER REFERENCES shots(id) ON DELETE CASCADE,
  scene_id INTEGER REFERENCES scenes(id) ON DELETE CASCADE,
  PRIMARY KEY (shot_id, scene_id)
);

CREATE TABLE IF NOT EXISTS shot_items (
  shot_id INTEGER REFERENCES shots(id) ON DELETE CASCADE,
  item_id INTEGER REFERENCES items(id) ON DELETE CASCADE,
  PRIMARY KEY (shot_id, item_id)
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_segments_project_id ON script_segments(project_id);
CREATE INDEX IF NOT EXISTS idx_shots_project_id ON shots(project_id);
CREATE INDEX IF NOT EXISTS idx_shots_segment_id ON shots(segment_id);
CREATE INDEX IF NOT EXISTS idx_characters_project_id ON characters(project_id);
CREATE INDEX IF NOT EXISTS idx_scenes_project_id ON scenes(project_id);
CREATE INDEX IF NOT EXISTS idx_items_project_id ON items(project_id);
CREATE INDEX IF NOT EXISTS idx_files_project_id ON files(project_id);
CREATE INDEX IF NOT EXISTS idx_files_file_type ON files(file_type);

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 为需要的表添加更新时间触发器
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shots_updated_at BEFORE UPDATE ON shots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_characters_updated_at BEFORE UPDATE ON characters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scenes_updated_at BEFORE UPDATE ON scenes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


