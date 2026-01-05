-- 社区视频点赞表
CREATE TABLE IF NOT EXISTS community_video_likes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id INTEGER NOT NULL REFERENCES community_videos(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, video_id) -- 确保每个用户对每个视频只能点赞一次
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_community_video_likes_user_id ON community_video_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_community_video_likes_video_id ON community_video_likes(video_id);
CREATE INDEX IF NOT EXISTS idx_community_video_likes_created_at ON community_video_likes(created_at DESC);

-- 添加注释
COMMENT ON TABLE community_video_likes IS '社区视频点赞表，记录用户对社区视频的点赞状态';
COMMENT ON COLUMN community_video_likes.user_id IS '用户ID';
COMMENT ON COLUMN community_video_likes.video_id IS '视频ID';

