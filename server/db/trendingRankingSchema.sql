-- 榜单数据表
CREATE TABLE IF NOT EXISTS trending_rankings (
  id SERIAL PRIMARY KEY,
  ranking_type VARCHAR(50) NOT NULL, -- 榜单类型：'anime'（动态漫榜）或 'ai-real'（AI短剧榜）
  ranking_data JSONB NOT NULL, -- 榜单数据（JSON数组）
  date DATE NOT NULL DEFAULT CURRENT_DATE, -- 榜单日期
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(ranking_type, date) -- 确保每天每种榜单类型只有一条记录
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_trending_rankings_type ON trending_rankings(ranking_type);
CREATE INDEX IF NOT EXISTS idx_trending_rankings_date ON trending_rankings(date DESC);
CREATE INDEX IF NOT EXISTS idx_trending_rankings_type_date ON trending_rankings(ranking_type, date DESC);

-- 添加注释
COMMENT ON TABLE trending_rankings IS '榜单数据表，存储动态漫榜和AI短剧榜';
COMMENT ON COLUMN trending_rankings.ranking_type IS '榜单类型：anime（动态漫榜）或 ai-real（AI短剧榜）';
COMMENT ON COLUMN trending_rankings.ranking_data IS '榜单数据，JSON数组格式，包含keyword、tag、rank、views等字段';
COMMENT ON COLUMN trending_rankings.date IS '榜单日期';

