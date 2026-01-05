-- 社区视频表
CREATE TABLE IF NOT EXISTS community_videos (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  shot_id INTEGER REFERENCES shots(id) ON DELETE SET NULL,
  video_url TEXT NOT NULL,
  cos_key TEXT NOT NULL,
  thumbnail_url TEXT, -- 缩略图URL
  title VARCHAR(255) NOT NULL, -- 视频标题
  description TEXT, -- 视频描述
  tags TEXT[], -- 标签数组
  likes_count INTEGER DEFAULT 0, -- 点赞数
  views_count INTEGER DEFAULT 0, -- 观看数
  is_published BOOLEAN DEFAULT false, -- 是否已发布到社区
  published_at TIMESTAMP, -- 发布时间
  model VARCHAR(100), -- 使用的模型
  resolution VARCHAR(20), -- 分辨率
  duration INTEGER, -- 时长（秒）
  prompt TEXT, -- 提示词
  metadata JSONB, -- 其他元数据
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_community_videos_user_id ON community_videos(user_id);
CREATE INDEX IF NOT EXISTS idx_community_videos_is_published ON community_videos(is_published);
CREATE INDEX IF NOT EXISTS idx_community_videos_published_at ON community_videos(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_videos_likes_count ON community_videos(likes_count DESC);
CREATE INDEX IF NOT EXISTS idx_community_videos_views_count ON community_videos(views_count DESC);
CREATE INDEX IF NOT EXISTS idx_community_videos_created_at ON community_videos(created_at DESC);

-- 添加注释
COMMENT ON TABLE community_videos IS '社区视频表，存储用户上传到社区的视频';
COMMENT ON COLUMN community_videos.is_published IS '是否已发布到社区，只有is_published=true的视频才会在作品展示页面显示';
COMMENT ON COLUMN community_videos.published_at IS '发布时间，用于排序';

