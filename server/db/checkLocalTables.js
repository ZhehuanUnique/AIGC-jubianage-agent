import pg from 'pg'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'

const { Pool } = pg

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const envPath = join(__dirname, '..', '.env')
if (existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

async function checkTables() {
  const localDbUrl = process.env.LOCAL_DATABASE_URL || 
    `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || ''}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'aigc_db'}`

  let pool = null
  try {
    console.log('🔗 连接到本地数据库...')
    pool = new Pool({ connectionString: localDbUrl })
    
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `)
    
    console.log(`✅ 找到 ${tables.rows.length} 个表：`)
    tables.rows.forEach(row => {
      console.log(`   - ${row.table_name}`)
    })

    // 检查每个表的数据
    const requiredTables = ['projects', 'tasks', 'script_segments', 'shots', 'characters', 'scenes', 'items', 'files', 'users', 'operation_logs', 'daily_consumption_stats']
    
    console.log('\n📊 表数据统计：\n')
    for (const tableName of requiredTables) {
      try {
        const count = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`)
        console.log(`   ${tableName}: ${count.rows[0].count} 条记录`)
      } catch (error) {
        console.log(`   ${tableName}: ❌ ${error.message}`)
      }
    }

  } catch (error) {
    console.error('❌ 错误:', error.message)
  } finally {
    if (pool) {
      await pool.end()
    }
  }
}

checkTables().catch(console.error)




