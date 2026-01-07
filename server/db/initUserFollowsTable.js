/**
 * 初始化用户关注关系表
 */

import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync } from 'fs'
import pool from './connection.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function initUserFollowsTable() {
  try {
    const db = pool
    
    // 读取SQL文件
    const sqlPath = join(__dirname, 'userFollowsSchema.sql')
    const sql = readFileSync(sqlPath, 'utf-8')
    
    // 执行SQL
    await db.query(sql)
    
    console.log('✅ 用户关注关系表初始化成功')
  } catch (error) {
    if (error.message.includes('already exists') || error.message.includes('duplicate')) {
      console.log('ℹ️  用户关注关系表已存在，跳过初始化')
    } else {
      console.error('❌ 用户关注关系表初始化失败:', error.message)
      // 不抛出错误，允许服务器继续启动
    }
  }
}

export default initUserFollowsTable

