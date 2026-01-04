/**
 * 初始化首尾帧视频表
 * 如果表不存在，则创建表
 */

import pool from './connection.js'

async function initFirstLastFrameVideosTable() {
  try {
    console.log('🔍 检查 first_last_frame_videos 表是否存在...')
    
    // 检查表是否存在
    const checkTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'first_last_frame_videos'
      )
    `)
    
    if (checkTable.rows[0].exists) {
      console.log('✅ first_last_frame_videos 表已存在')
      return true
    }
    
    console.log('📝 创建 first_last_frame_videos 表...')
    
    // 创建表
    await pool.query(`
      CREATE TABLE first_last_frame_videos (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        task_id VARCHAR(255) UNIQUE NOT NULL,
        video_url TEXT NOT NULL,
        cos_key TEXT NOT NULL,
        first_frame_url TEXT,
        last_frame_url TEXT,
        model VARCHAR(100) DEFAULT 'volcengine-video-3.0-pro',
        resolution VARCHAR(20) DEFAULT '720p',
        ratio VARCHAR(20) DEFAULT '16:9',
        duration INTEGER DEFAULT 5,
        prompt TEXT,
        text TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        error_message TEXT,
        shot_id INTEGER REFERENCES shots(id) ON DELETE SET NULL,
        estimated_credit INTEGER,
        actual_credit INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    // 创建索引
    await pool.query(`
      CREATE INDEX idx_first_last_frame_videos_user_id ON first_last_frame_videos(user_id)
    `)
    
    await pool.query(`
      CREATE INDEX idx_first_last_frame_videos_project_id ON first_last_frame_videos(project_id)
    `)
    
    await pool.query(`
      CREATE INDEX idx_first_last_frame_videos_task_id ON first_last_frame_videos(task_id)
    `)
    
    await pool.query(`
      CREATE INDEX idx_first_last_frame_videos_status ON first_last_frame_videos(status)
    `)
    
    await pool.query(`
      CREATE INDEX idx_first_last_frame_videos_created_at ON first_last_frame_videos(created_at DESC)
    `)
    
    console.log('✅ first_last_frame_videos 表创建成功')
    return true
  } catch (error) {
    console.error('❌ 创建 first_last_frame_videos 表失败:', error.message)
    
    // 如果是表已存在的错误，忽略
    if (error.message.includes('already exists') || error.message.includes('duplicate')) {
      console.log('ℹ️  表可能已存在，继续执行...')
      return true
    }
    
    throw error
  }
}

async function initVideoAnnotationsTable() {
  try {
    console.log('🔍 检查 video_annotations 表是否存在...')
    
    // 检查表是否存在
    const checkTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'video_annotations'
      )
    `)
    
    if (checkTable.rows[0].exists) {
      console.log('✅ video_annotations 表已存在')
      return true
    }
    
    console.log('📝 创建 video_annotations 表...')
    
    // 创建表
    await pool.query(`
      CREATE TABLE video_annotations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        fragment_id INTEGER,
        video_url TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp_seconds DECIMAL(10, 2),
        timestamp_display VARCHAR(20),
        status VARCHAR(20) DEFAULT '待批注',
        parent_id INTEGER REFERENCES video_annotations(id) ON DELETE CASCADE,
        replies_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    // 创建索引
    await pool.query(`
      CREATE INDEX idx_video_annotations_user_id ON video_annotations(user_id)
    `)
    
    await pool.query(`
      CREATE INDEX idx_video_annotations_project_id ON video_annotations(project_id)
    `)
    
    await pool.query(`
      CREATE INDEX idx_video_annotations_fragment_id ON video_annotations(fragment_id)
    `)
    
    await pool.query(`
      CREATE INDEX idx_video_annotations_video_url ON video_annotations(video_url)
    `)
    
    await pool.query(`
      CREATE INDEX idx_video_annotations_status ON video_annotations(status)
    `)
    
    await pool.query(`
      CREATE INDEX idx_video_annotations_parent_id ON video_annotations(parent_id)
    `)
    
    await pool.query(`
      CREATE INDEX idx_video_annotations_created_at ON video_annotations(created_at DESC)
    `)
    
    console.log('✅ video_annotations 表创建成功')
    return true
  } catch (error) {
    console.error('❌ 创建 video_annotations 表失败:', error.message)
    
    // 如果是表已存在的错误，忽略
    if (error.message.includes('already exists') || error.message.includes('duplicate')) {
      console.log('ℹ️  表可能已存在，继续执行...')
      return true
    }
    
    throw error
  }
}

// 主函数
async function main() {
  try {
    console.log('==========================================')
    console.log('初始化数据库表')
    console.log('==========================================\n')
    
    await initFirstLastFrameVideosTable()
    await initVideoAnnotationsTable()
    
    console.log('\n==========================================')
    console.log('✅ 所有表初始化完成')
    console.log('==========================================')
    
    process.exit(0)
  } catch (error) {
    console.error('\n❌ 初始化失败:', error)
    process.exit(1)
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

export { initFirstLastFrameVideosTable, initVideoAnnotationsTable }

