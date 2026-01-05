-- 首尾帧视频用户点赞表
CREATE TABLE IF NOT EXISTS first_last_frame_video_likes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_task_id VARCHAR(255) NOT NULL, -- 关联 first_last_frame_videos 的 task_id
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, video_task_id) -- 确保每个用户对每个视频只能点赞一次
);

-- 首尾帧视频用户收藏表
CREATE TABLE IF NOT EXISTS first_last_frame_video_favorites (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_task_id VARCHAR(255) NOT NULL, -- 关联 first_last_frame_videos 的 task_id
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, video_task_id) -- 确保每个用户对每个视频只能收藏一次
);

-- 视频处理任务表（补帧、超分辨率等）
CREATE TABLE IF NOT EXISTS video_processing_tasks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  source_video_task_id VARCHAR(255) NOT NULL, -- 源视频的 task_id（来自 first_last_frame_videos）
  source_video_url TEXT NOT NULL, -- 源视频URL
  source_cos_key TEXT NOT NULL, -- 源视频COS key
  processing_type VARCHAR(50) NOT NULL, -- 处理类型：'frame_interpolation'（补帧）或 'super_resolution'（超分辨率）
  status VARCHAR(50) DEFAULT 'pending', -- 状态：pending, processing, completed, failed
  result_video_url TEXT, -- 处理后的视频URL
  result_cos_key TEXT, -- 处理后的视频COS key
  error_message TEXT, -- 错误信息（如果失败）
  estimated_credit INTEGER, -- 预计消耗的积分
  actual_credit INTEGER, -- 实际消耗的积分
  metadata JSONB, -- 其他元数据（如补帧参数、超分辨率参数等）
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_video_likes_user_id ON first_last_frame_video_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_video_likes_task_id ON first_last_frame_video_likes(video_task_id);
CREATE INDEX IF NOT EXISTS idx_video_favorites_user_id ON first_last_frame_video_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_video_favorites_task_id ON first_last_frame_video_favorites(video_task_id);
CREATE INDEX IF NOT EXISTS idx_video_processing_tasks_user_id ON video_processing_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_video_processing_tasks_task_id ON video_processing_tasks(source_video_task_id);
CREATE INDEX IF NOT EXISTS idx_video_processing_tasks_type ON video_processing_tasks(processing_type);
CREATE INDEX IF NOT EXISTS idx_video_processing_tasks_status ON video_processing_tasks(status);
CREATE INDEX IF NOT EXISTS idx_video_processing_tasks_created_at ON video_processing_tasks(created_at DESC);

-- 添加注释
COMMENT ON TABLE first_last_frame_video_likes IS '首尾帧视频用户点赞表，记录用户对视频的点赞状态';
COMMENT ON TABLE first_last_frame_video_favorites IS '首尾帧视频用户收藏表，记录用户对视频的收藏状态';
COMMENT ON TABLE video_processing_tasks IS '视频处理任务表，存储补帧、超分辨率等视频处理任务';
COMMENT ON COLUMN video_processing_tasks.processing_type IS '处理类型：frame_interpolation-补帧, super_resolution-超分辨率';
COMMENT ON COLUMN video_processing_tasks.status IS '任务状态：pending-待处理, processing-处理中, completed-已完成, failed-失败';

