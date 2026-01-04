-- 首尾帧生成视频表
CREATE TABLE IF NOT EXISTS first_last_frame_videos (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id VARCHAR(255) UNIQUE NOT NULL, -- 任务ID（唯一）
  video_url TEXT NOT NULL, -- 视频URL（COS地址）
  cos_key TEXT NOT NULL, -- COS存储key
  first_frame_url TEXT, -- 首帧图片URL
  last_frame_url TEXT, -- 尾帧图片URL（可选）
  model VARCHAR(100) DEFAULT 'volcengine-video-3.0-pro', -- 使用的模型
  resolution VARCHAR(20) DEFAULT '720p', -- 分辨率
  ratio VARCHAR(20) DEFAULT '16:9', -- 宽高比
  duration INTEGER DEFAULT 5, -- 时长（秒）
  prompt TEXT, -- 提示词
  text TEXT, -- 文本描述
  status VARCHAR(50) DEFAULT 'pending', -- 状态：pending, processing, completed, failed
  error_message TEXT, -- 错误信息（如果失败）
  shot_id INTEGER REFERENCES shots(id) ON DELETE SET NULL, -- 关联的分镜ID（如果自动创建了分镜）
  estimated_credit INTEGER, -- 预计消耗的积分
  actual_credit INTEGER, -- 实际消耗的积分
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_first_last_frame_videos_user_id ON first_last_frame_videos(user_id);
CREATE INDEX IF NOT EXISTS idx_first_last_frame_videos_project_id ON first_last_frame_videos(project_id);
CREATE INDEX IF NOT EXISTS idx_first_last_frame_videos_task_id ON first_last_frame_videos(task_id);
CREATE INDEX IF NOT EXISTS idx_first_last_frame_videos_status ON first_last_frame_videos(status);
CREATE INDEX IF NOT EXISTS idx_first_last_frame_videos_created_at ON first_last_frame_videos(created_at DESC);

-- 添加注释
COMMENT ON TABLE first_last_frame_videos IS '首尾帧生成视频表';
COMMENT ON COLUMN first_last_frame_videos.task_id IS '任务ID，用于查询生成状态';
COMMENT ON COLUMN first_last_frame_videos.video_url IS '视频在COS上的URL';
COMMENT ON COLUMN first_last_frame_videos.cos_key IS '视频在COS上的存储key';
COMMENT ON COLUMN first_last_frame_videos.status IS '视频生成状态：pending-待处理, processing-处理中, completed-已完成, failed-失败';

