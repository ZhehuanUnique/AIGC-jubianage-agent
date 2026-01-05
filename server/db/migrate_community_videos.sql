-- 迁移脚本：创建社区视频表
-- 执行方式：在Supabase SQL编辑器中执行此脚本

-- 创建表
CREATE TABLE IF NOT EXISTS community_videos (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  shot_id INTEGER REFERENCES shots(id) ON DELETE SET NULL,
  video_url TEXT NOT NULL,
  cos_key TEXT NOT NULL,
  thumbnail_url TEXT,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  tags TEXT[],
  likes_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMP,
  model VARCHAR(100),
  resolution VARCHAR(20),
  duration INTEGER,
  prompt TEXT,
  metadata JSONB,
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

