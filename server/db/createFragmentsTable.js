/**
 * 在 Supabase 中创建 fragments 表
 * 如果表已存在，则跳过
 */

import pg from 'pg'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync, readFileSync } from 'fs'

const { Pool } = pg

// 获取当前文件所在目录
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 加载.env文件
const envPath = join(__dirname, '..', '.env')
if (existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

async function createFragmentsTable() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 
      `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || ''}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'aigc_db'}`
  })

  try {
    console.log('🔗 连接到数据库...')
    await pool.query('SELECT NOW()')
    console.log('✅ 数据库连接成功\n')

    // 读取 SQL 文件
    const sqlPath = join(__dirname, 'fragmentSchema.sql')
    const sql = readFileSync(sqlPath, 'utf-8')

    // 执行 SQL（按语句分割执行）
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    console.log(`📝 执行 ${statements.length} 条 SQL 语句...\n`)

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement.trim()) {
        try {
          await pool.query(statement)
          console.log(`✅ 语句 ${i + 1}/${statements.length} 执行成功`)
        } catch (error) {
          // 如果是"已存在"的错误，可以忽略
          if (error.message.includes('already exists') || 
              error.message.includes('duplicate') ||
              (error.message.includes('relation') && error.message.includes('already exists'))) {
            console.log(`⚠️  语句 ${i + 1}/${statements.length} 已存在，跳过`)
          } else {
            console.error(`❌ 语句 ${i + 1}/${statements.length} 执行失败:`, error.message)
            throw error
          }
        }
      }
    }

    console.log('\n✅ fragments 表已创建或已存在')
    await pool.end()
  } catch (error) {
    console.error('❌ 创建 fragments 表失败:', error.message)
    throw error
  }
}

createFragmentsTable().catch(console.error)










