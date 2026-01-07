/**
 * 初始化视频处理任务表（补帧、超分辨率等）
 * 如果表不存在，则创建表
 */

import pool from './connection.js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function initVideoProcessingTasksTable() {
  try {
    console.log('🔍 检查 video_processing_tasks 表是否存在...')
    
    // 检查表是否存在
    const checkTable = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'video_processing_tasks'
      )
    `)
    
    if (checkTable.rows[0].exists) {
      console.log('✅ video_processing_tasks 表已存在')
      return true
    }
    
    console.log('📝 创建 video_processing_tasks 表...')
    
    // 创建表
    await pool.query(`
      CREATE TABLE video_processing_tasks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
        source_video_task_id VARCHAR(255) NOT NULL,
        source_video_url TEXT NOT NULL,
        source_cos_key TEXT NOT NULL,
        processing_type VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        result_video_url TEXT,
        result_cos_key TEXT,
        error_message TEXT,
        estimated_credit INTEGER,
        actual_credit INTEGER,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    // 创建索引
    await pool.query(`
      CREATE INDEX idx_video_processing_tasks_user_id ON video_processing_tasks(user_id)
    `)
    
    await pool.query(`
      CREATE INDEX idx_video_processing_tasks_task_id ON video_processing_tasks(source_video_task_id)
    `)
    
    await pool.query(`
      CREATE INDEX idx_video_processing_tasks_type ON video_processing_tasks(processing_type)
    `)
    
    await pool.query(`
      CREATE INDEX idx_video_processing_tasks_status ON video_processing_tasks(status)
    `)
    
    await pool.query(`
      CREATE INDEX idx_video_processing_tasks_created_at ON video_processing_tasks(created_at DESC)
    `)
    
    console.log('✅ video_processing_tasks 表创建成功')
    return true
  } catch (error) {
    console.error('❌ 创建 video_processing_tasks 表失败:', error.message)
    
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
    console.log('初始化 video_processing_tasks 表')
    console.log('==========================================\n')
    
    await initVideoProcessingTasksTable()
    
    console.log('\n==========================================')
    console.log('✅ 表初始化完成')
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

export { initVideoProcessingTasksTable }

