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

async function checkTables() {
  const supabaseDbUrl = process.env.SUPABASE_DATABASE_URL

  if (!supabaseDbUrl) {
    console.error('❌ 未找到 SUPABASE_DATABASE_URL 环境变量')
    return
  }

  let pool = null
  try {
    console.log('🔗 连接到 Supabase 数据库...')
    pool = new Pool({ 
      connectionString: supabaseDbUrl,
      connectionTimeoutMillis: 30000,
    })
    
    await pool.query('SELECT NOW()')
    console.log('✅ Supabase 数据库连接成功\n')

    // 检查所有表
    console.log('📋 检查表结构...\n')
    
    // 1. 列出所有表
    const allTables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `)
    
    console.log(`✅ 找到 ${allTables.rows.length} 个表：`)
    allTables.rows.forEach(row => {
      console.log(`   - ${row.table_name}`)
    })
    console.log('')

    // 2. 检查需要的表是否存在
    const requiredTables = [
      'projects',
      'tasks',
      'script_segments',
      'shots',
      'characters',
      'scenes',
      'items',
      'files',
      'users',
      'operation_logs',
      'daily_consumption_stats',
    ]

    console.log('🔍 检查必需的表：\n')
    for (const tableName of requiredTables) {
      const tableExists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [tableName])

      if (tableExists.rows[0].exists) {
        // 检查表是否有数据
        const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`)
        const count = parseInt(countResult.rows[0].count)
        console.log(`   ✅ ${tableName} - 存在 (${count} 条记录)`)
      } else {
        console.log(`   ❌ ${tableName} - 不存在`)
      }
    }

    // 3. 检查当前数据库和 schema
    console.log('\n📊 数据库信息：\n')
    const dbInfo = await pool.query(`
      SELECT 
        current_database() as database,
        current_schema() as schema,
        current_user as user
    `)
    console.log(`   数据库: ${dbInfo.rows[0].database}`)
    console.log(`   Schema: ${dbInfo.rows[0].schema}`)
    console.log(`   用户: ${dbInfo.rows[0].user}`)

    // 4. 检查 search_path
    const searchPath = await pool.query(`SHOW search_path`)
    console.log(`   Search Path: ${searchPath.rows[0].search_path}`)

  } catch (error) {
    console.error('❌ 错误:', error.message)
    console.error(error)
  } finally {
    if (pool) {
      await pool.end()
    }
  }
}

checkTables().catch(console.error)




