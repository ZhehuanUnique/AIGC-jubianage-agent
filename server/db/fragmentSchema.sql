-- 片段表（fragments）结构
-- 注意：片段实际上是从 shots 表生成的，但为了更好的管理，可以创建一个独立的 fragments 表

-- 如果 fragments 表不存在，创建它
CREATE TABLE IF NOT EXISTS fragments (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  shot_id INTEGER REFERENCES shots(id) ON DELETE CASCADE, -- 关联的分镜ID
  name VARCHAR(255) NOT NULL,
  description TEXT,
  image_url TEXT, -- 缩略图URL
  video_urls JSONB, -- 视频URL数组
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL -- 创建者ID
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_fragments_project_id ON fragments(project_id);
CREATE INDEX IF NOT EXISTS idx_fragments_shot_id ON fragments(shot_id);
CREATE INDEX IF NOT EXISTS idx_fragments_user_id ON fragments(user_id);

-- 创建更新时间触发器
DROP TRIGGER IF EXISTS update_fragments_updated_at ON fragments;
CREATE TRIGGER update_fragments_updated_at
  BEFORE UPDATE ON fragments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();










