-- 用户关注关系表
CREATE TABLE IF NOT EXISTS user_follows (
  id SERIAL PRIMARY KEY,
  follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- 关注者ID
  following_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- 被关注者ID
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(follower_id, following_id) -- 确保不能重复关注
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows(following_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_created_at ON user_follows(created_at DESC);

-- 添加注释
COMMENT ON TABLE user_follows IS '用户关注关系表';
COMMENT ON COLUMN user_follows.follower_id IS '关注者ID';
COMMENT ON COLUMN user_follows.following_id IS '被关注者ID';

