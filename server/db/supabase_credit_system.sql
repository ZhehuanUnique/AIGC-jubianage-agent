-- ============================================
-- 积分消耗统计系统 - Supabase 版本
-- 请在 Supabase Dashboard 的 SQL Editor 中执行此脚本
-- ============================================

-- 1. 操作日志表（如果不存在）
CREATE TABLE IF NOT EXISTS operation_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  username VARCHAR(100) NOT NULL, -- 冗余存储用户名，防止用户删除后日志丢失
  operation_type VARCHAR(100) NOT NULL, -- 操作类型：如 'video_generation', 'image_generation' 等
  operation_name VARCHAR(255) NOT NULL, -- 操作名称：如 '视频生成', '图片生成' 等
  resource_type VARCHAR(100), -- 资源类型：如 'video', 'image' 等
  resource_id VARCHAR(255), -- 资源ID
  description TEXT, -- 操作描述
  points_consumed DECIMAL(10, 2) DEFAULT 0, -- 消耗的积分
  status VARCHAR(50) DEFAULT 'success', -- 操作状态：'success', 'failed', 'pending'
  error_message TEXT, -- 错误信息（如果有）
  metadata JSONB, -- 额外的元数据（如请求参数、响应结果等）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. 每日积分消耗统计表（如果不存在）
CREATE TABLE IF NOT EXISTS daily_consumption_stats (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE, -- 日期
  total_points DECIMAL(12, 2) DEFAULT 0, -- 当日总消耗积分
  user_count INTEGER DEFAULT 0, -- 当日活跃用户数
  operation_count INTEGER DEFAULT 0, -- 当日操作总数
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_operation_logs_user_id ON operation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_operation_logs_username ON operation_logs(username);
CREATE INDEX IF NOT EXISTS idx_operation_logs_operation_type ON operation_logs(operation_type);
CREATE INDEX IF NOT EXISTS idx_operation_logs_created_at ON operation_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_operation_logs_date ON operation_logs(DATE(created_at));
CREATE INDEX IF NOT EXISTS idx_operation_logs_status ON operation_logs(status);
CREATE INDEX IF NOT EXISTS idx_daily_consumption_stats_date ON daily_consumption_stats(date);

-- 4. 创建更新时间触发器函数（如果还没有）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. 为 daily_consumption_stats 表添加更新时间触发器
DROP TRIGGER IF EXISTS update_daily_consumption_stats_updated_at ON daily_consumption_stats;
CREATE TRIGGER update_daily_consumption_stats_updated_at
  BEFORE UPDATE ON daily_consumption_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6. 创建函数：自动更新每日统计
CREATE OR REPLACE FUNCTION update_daily_consumption_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- 只在成功操作时更新统计
  IF NEW.status = 'success' AND NEW.points_consumed > 0 THEN
    INSERT INTO daily_consumption_stats (date, total_points, user_count, operation_count)
    VALUES (
      DATE(NEW.created_at),
      COALESCE(NEW.points_consumed, 0),
      1,
      1
    )
    ON CONFLICT (date) DO UPDATE SET
      total_points = daily_consumption_stats.total_points + COALESCE(NEW.points_consumed, 0),
      operation_count = daily_consumption_stats.operation_count + 1,
      updated_at = CURRENT_TIMESTAMP;
    
    -- 更新用户数（去重）
    UPDATE daily_consumption_stats
    SET user_count = (
      SELECT COUNT(DISTINCT user_id)
      FROM operation_logs
      WHERE DATE(created_at) = daily_consumption_stats.date
        AND user_id IS NOT NULL
        AND status = 'success'
    )
    WHERE date = DATE(NEW.created_at);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. 创建触发器：当插入操作日志时自动更新每日统计
DROP TRIGGER IF EXISTS trigger_update_daily_stats ON operation_logs;
CREATE TRIGGER trigger_update_daily_stats
AFTER INSERT ON operation_logs
FOR EACH ROW
EXECUTE FUNCTION update_daily_consumption_stats();

-- ============================================
-- 验证创建结果
-- ============================================
-- 执行以下查询来验证表是否创建成功：
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('operation_logs', 'daily_consumption_stats');
-- SELECT * FROM operation_logs ORDER BY created_at DESC LIMIT 10;
-- SELECT * FROM daily_consumption_stats ORDER BY date DESC LIMIT 10;







