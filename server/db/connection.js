import pg from 'pg'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'

const { Pool } = pg

// 获取当前文件所在目录
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 加载.env文件
const envPath = join(__dirname, '..', '.env')
if (existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

// 构建连接字符串
const connectionString = process.env.DATABASE_URL || 
  `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || ''}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'aigc_db'}`

// 创建数据库连接池
const pool = new Pool({
  connectionString: connectionString,
  max: 10, // 最大连接数（降低以适应 Supabase Session 模式限制）
  idleTimeoutMillis: 30000, // 空闲连接超时时间
  connectionTimeoutMillis: 10000, // 连接超时时间
})

// 测试数据库连接
pool.on('connect', () => {
  console.log('✅ PostgreSQL 数据库连接成功')
})

pool.on('error', (err) => {
  console.error('❌ PostgreSQL 数据库连接错误:', err)
})

// 测试连接函数
export async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW()')
    console.log('✅ 数据库连接测试成功:', result.rows[0].now)
    return true
  } catch (error) {
    console.error('❌ 数据库连接测试失败:', error.message)
    return false
  }
}

export default pool

