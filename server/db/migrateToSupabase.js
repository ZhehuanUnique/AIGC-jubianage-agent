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

/**
 * 数据迁移脚本：从本地数据库迁移到 Supabase
 * 
 * 使用方法：
 * 1. 在 .env 文件中配置本地数据库连接（LOCAL_DATABASE_URL）
 * 2. 在 .env 文件中配置 Supabase 数据库连接（SUPABASE_DATABASE_URL）
 * 3. 运行：node server/db/migrateToSupabase.js
 */

async function migrateData() {
  let localPool = null
  let supabasePool = null

  try {
    // 获取本地数据库连接字符串
    const localDbUrl = process.env.LOCAL_DATABASE_URL || 
      `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || ''}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'aigc_db'}`

    // 获取 Supabase 数据库连接字符串
    const supabaseDbUrl = process.env.SUPABASE_DATABASE_URL

    if (!supabaseDbUrl) {
      throw new Error('❌ 请先在 .env 文件中配置 SUPABASE_DATABASE_URL')
    }

    console.log('🔗 连接到本地数据库...')
    localPool = new Pool({ connectionString: localDbUrl })
    await localPool.query('SELECT NOW()')
    console.log('✅ 本地数据库连接成功')

    console.log('🔗 连接到 Supabase 数据库...')
    
    // 尝试使用 IPv6 地址直接连接（如果 DNS 解析失败）
    let resolvedUrl = supabaseDbUrl
    const hostMatch = supabaseDbUrl.match(/@([^:]+):/)
    if (hostMatch) {
      const host = hostMatch[1]
      try {
        // 尝试解析 IPv6 地址
        const dns = await import('dns')
        const { promisify } = await import('util')
        const dnsResolve6 = promisify(dns.resolve6)
        const ipv6Addresses = await dnsResolve6(host)
        if (ipv6Addresses && ipv6Addresses.length > 0) {
          const ipv6 = ipv6Addresses[0]
          console.log(`   💡 使用 IPv6 地址: ${ipv6}`)
          // PostgreSQL 连接字符串中 IPv6 地址需要用方括号包裹
          resolvedUrl = supabaseDbUrl.replace(`@${host}:`, `@[${ipv6}]:`)
        }
      } catch (error) {
        // DNS 解析失败，使用原始连接字符串
        console.log(`   ⚠️ DNS 解析失败，使用原始连接字符串`)
      }
    }
    
    supabasePool = new Pool({ 
      connectionString: resolvedUrl,
      connectionTimeoutMillis: 30000, // 30 秒超时
    })
    await supabasePool.query('SELECT NOW()')
    console.log('✅ Supabase 数据库连接成功')

    // 需要迁移的表列表（按依赖顺序）
    const tables = [
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

    console.log('\n📦 开始迁移数据...\n')

    for (const table of tables) {
      try {
        // 获取本地数据
        const localData = await localPool.query(`SELECT * FROM ${table}`)
        
        if (localData.rows.length === 0) {
          console.log(`ℹ️  表 ${table} 没有数据，跳过...\n`)
          continue
        }

        console.log(`📤 迁移表 ${table}，共 ${localData.rows.length} 条记录...`)

        // 获取表的列名
        const columns = Object.keys(localData.rows[0])
        
        // 简化主键查询：直接假设所有表都有 'id' 主键（大多数表都有）
        let pkColumns = []
        if (columns.includes('id')) {
          pkColumns = ['id']
        }
        
        // 构建插入语句
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ')
        const columnNames = columns.map(col => `"${col}"`).join(', ') // 使用引号包裹列名，避免关键字冲突
        
        // 如果有主键，使用 ON CONFLICT，否则直接插入
        let insertQuery
        if (pkColumns.length > 0) {
          const conflictColumns = pkColumns.map(col => `"${col}"`).join(', ')
          insertQuery = `
            INSERT INTO "${table}" (${columnNames})
            VALUES (${placeholders})
            ON CONFLICT (${conflictColumns}) DO NOTHING
          `
        } else {
          insertQuery = `
            INSERT INTO "${table}" (${columnNames})
            VALUES (${placeholders})
          `
        }

        // 批量插入数据
        let insertedCount = 0
        let skippedCount = 0
        for (const row of localData.rows) {
          const values = columns.map(col => row[col])
          try {
            const result = await supabasePool.query(insertQuery, values)
            if (result.rowCount > 0) {
              insertedCount++
            } else {
              skippedCount++ // ON CONFLICT DO NOTHING 时 rowCount 为 0
            }
          } catch (error) {
            // 如果是主键冲突，忽略（使用 ON CONFLICT DO NOTHING）
            if (error.message.includes('duplicate key') || error.message.includes('violates unique constraint')) {
              skippedCount++
            } else {
              console.error(`  ⚠️  插入记录失败: ${error.message}`)
              console.error(`     记录: ${JSON.stringify(row).substring(0, 100)}...`)
            }
          }
        }

        console.log(`  ✅ 表 ${table} 迁移完成，成功插入 ${insertedCount} 条，跳过 ${skippedCount} 条（已存在）\n`)
      } catch (error) {
        console.error(`  ❌ 表 ${table} 迁移失败: ${error.message}\n`)
      }
    }

    console.log('✅ 数据迁移完成！')
    console.log('\n📝 下一步：')
    console.log('1. 在 .env 文件中将 DATABASE_URL 更新为 SUPABASE_DATABASE_URL 的值')
    console.log('2. 或者将 SUPABASE_DATABASE_URL 重命名为 DATABASE_URL')
    console.log('3. 重启后端服务以使用 Supabase 数据库')

  } catch (error) {
    console.error('❌ 迁移失败:', error.message)
    process.exit(1)
  } finally {
    if (localPool) await localPool.end()
    if (supabasePool) await supabasePool.end()
  }
}

// 运行迁移
migrateData()

