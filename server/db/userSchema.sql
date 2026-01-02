-- 用户管理系统数据库表结构

-- 1. 用户表
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL, -- bcrypt加密后的密码
  display_name VARCHAR(100), -- 显示名称
  is_active BOOLEAN DEFAULT TRUE, -- 是否激活
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 操作日志表
CREATE TABLE IF NOT EXISTS operation_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  username VARCHAR(100) NOT NULL, -- 冗余存储用户名，防止用户删除后日志丢失
  operation_type VARCHAR(100) NOT NULL, -- 操作类型：如 'analyze_script', 'generate_image', 'generate_video' 等
  operation_name VARCHAR(255) NOT NULL, -- 操作名称：如 '分析剧本', '生成图片', '生成视频' 等
  resource_type VARCHAR(100), -- 资源类型：如 'script', 'image', 'video', 'character' 等
  resource_id VARCHAR(255), -- 资源ID
  description TEXT, -- 操作描述
  points_consumed DECIMAL(10, 2) DEFAULT 0, -- 消耗的积分
  status VARCHAR(50) DEFAULT 'success', -- 操作状态：'success', 'failed', 'pending'
  error_message TEXT, -- 错误信息（如果有）
  metadata JSONB, -- 额外的元数据（如请求参数、响应结果等）
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. 每日积分消耗统计表（用于快速查询）
CREATE TABLE IF NOT EXISTS daily_consumption_stats (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE, -- 日期
  total_points DECIMAL(12, 2) DEFAULT 0, -- 当日总消耗积分
  user_count INTEGER DEFAULT 0, -- 当日活跃用户数
  operation_count INTEGER DEFAULT 0, -- 当日操作总数
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_operation_logs_user_id ON operation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_operation_logs_username ON operation_logs(username);
CREATE INDEX IF NOT EXISTS idx_operation_logs_operation_type ON operation_logs(operation_type);
CREATE INDEX IF NOT EXISTS idx_operation_logs_created_at ON operation_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_operation_logs_date ON operation_logs(DATE(created_at));
CREATE INDEX IF NOT EXISTS idx_daily_consumption_stats_date ON daily_consumption_stats(date);

-- 为users表添加更新时间触发器
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 为daily_consumption_stats表添加更新时间触发器
CREATE TRIGGER update_daily_consumption_stats_updated_at BEFORE UPDATE ON daily_consumption_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 创建函数：自动更新每日统计
CREATE OR REPLACE FUNCTION update_daily_consumption_stats()
RETURNS TRIGGER AS $$
BEGIN
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
  )
  WHERE date = DATE(NEW.created_at);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器：当插入操作日志时自动更新每日统计
CREATE TRIGGER trigger_update_daily_stats
AFTER INSERT ON operation_logs
FOR EACH ROW
EXECUTE FUNCTION update_daily_consumption_stats();

