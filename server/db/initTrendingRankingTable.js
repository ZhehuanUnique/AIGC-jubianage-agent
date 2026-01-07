/**
 * 初始化榜单数据表
 */

import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync } from 'fs'
import pool from './connection.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function initTrendingRankingTable() {
  try {
    const db = pool
    
    // 读取SQL文件
    const sqlPath = join(__dirname, 'trendingRankingSchema.sql')
    const sql = readFileSync(sqlPath, 'utf-8')
    
    // 执行SQL
    await db.query(sql)
    
    console.log('✅ 榜单数据表初始化成功')
  } catch (error) {
    if (error.message.includes('already exists') || error.message.includes('duplicate')) {
      console.log('ℹ️  榜单数据表已存在，跳过初始化')
    } else {
      console.error('❌ 榜单数据表初始化失败:', error.message)
      // 不抛出错误，允许服务器继续启动
    }
  }
}

export default initTrendingRankingTable

