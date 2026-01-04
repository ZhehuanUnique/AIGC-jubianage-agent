-- 视频批注表
CREATE TABLE IF NOT EXISTS video_annotations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  fragment_id INTEGER, -- 关联的片段/分镜ID（shots表的id）
  video_url TEXT NOT NULL, -- 视频URL（COS地址）
  content TEXT NOT NULL, -- 批注内容
  timestamp_seconds DECIMAL(10, 2), -- 时间戳（秒，支持小数）
  timestamp_display VARCHAR(20), -- 时间戳显示格式（如 "00:04:11"）
  status VARCHAR(20) DEFAULT '待批注', -- 状态：待批注、已批注
  parent_id INTEGER REFERENCES video_annotations(id) ON DELETE CASCADE, -- 父批注ID（用于回复）
  replies_count INTEGER DEFAULT 0, -- 回复数量
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_video_annotations_user_id ON video_annotations(user_id);
CREATE INDEX IF NOT EXISTS idx_video_annotations_project_id ON video_annotations(project_id);
CREATE INDEX IF NOT EXISTS idx_video_annotations_fragment_id ON video_annotations(fragment_id);
CREATE INDEX IF NOT EXISTS idx_video_annotations_video_url ON video_annotations(video_url);
CREATE INDEX IF NOT EXISTS idx_video_annotations_status ON video_annotations(status);
CREATE INDEX IF NOT EXISTS idx_video_annotations_parent_id ON video_annotations(parent_id);
CREATE INDEX IF NOT EXISTS idx_video_annotations_created_at ON video_annotations(created_at DESC);

-- 添加注释
COMMENT ON TABLE video_annotations IS '视频批注表';
COMMENT ON COLUMN video_annotations.fragment_id IS '关联的片段/分镜ID（shots表的id）';
COMMENT ON COLUMN video_annotations.video_url IS '视频URL（COS地址）';
COMMENT ON COLUMN video_annotations.timestamp_seconds IS '时间戳（秒，支持小数）';
COMMENT ON COLUMN video_annotations.status IS '状态：待批注、已批注';
COMMENT ON COLUMN video_annotations.parent_id IS '父批注ID（用于回复）';

