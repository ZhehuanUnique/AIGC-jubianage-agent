import pool from './connection.js'

async function addIsExpandedColumn() {
  try {
    await pool.query(`
      ALTER TABLE tasks 
      ADD COLUMN IF NOT EXISTS is_expanded BOOLEAN DEFAULT FALSE
    `)
    console.log('✅ 已添加 is_expanded 字段到 tasks 表')
  } catch (error) {
    console.error('❌ 添加字段失败:', error.message)
  } finally {
    await pool.end()
  }
}

addIsExpandedColumn()


