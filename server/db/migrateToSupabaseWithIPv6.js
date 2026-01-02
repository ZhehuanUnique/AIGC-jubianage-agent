import pg from 'pg'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'
import dns from 'dns'
import { promisify } from 'util'

const { Pool } = pg
const dnsResolve4 = promisify(dns.resolve4)
const dnsResolve6 = promisify(dns.resolve6)

// 获取当前文件所在目录
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 加载.env文件
const envPath = join(__dirname, '..', '.env')
if (existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

/**
 * 数据迁移脚本：从本地数据库迁移到 Supabase（支持 IPv6）
 * 
 * 如果 DNS 解析失败，会尝试使用 IPv6 地址直接连接
 */

async function migrateData() {
  let localPool = null
  let supabasePool = null

  try {
    // 获取本地数据库连接字符串
    const localDbUrl = process.env.LOCAL_DATABASE_URL || 
      `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || ''}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'aigc_db'}`

    // 获取 Supabase 数据库连接字符串
    let supabaseDbUrl = process.env.SUPABASE_DATABASE_URL

    if (!supabaseDbUrl) {
      throw new Error('❌ 请先在 .env 文件中配置 SUPABASE_DATABASE_URL')
    }

    console.log('🔗 连接到本地数据库...')
    localPool = new Pool({ connectionString: localDbUrl })
    await localPool.query('SELECT NOW()')
    console.log('✅ 本地数据库连接成功')

    // 尝试解析 Supabase 主机名
    console.log('🔍 解析 Supabase 主机名...')
    let supabaseHost = supabaseDbUrl.match(/@([^:]+):/)?.[1]
    let resolvedUrl = supabaseDbUrl

    if (supabaseHost) {
      try {
        // 先尝试 IPv4
        try {
          const ipv4Addresses = await dnsResolve4(supabaseHost)
          if (ipv4Addresses && ipv4Addresses.length > 0) {
            const ipv4 = ipv4Addresses[0]
            console.log(`✅ 解析到 IPv4 地址: ${ipv4}`)
            resolvedUrl = supabaseDbUrl.replace(`@${supabaseHost}:`, `@[${ipv4}]:`)
          }
        } catch (ipv4Error) {
          console.log('⚠️ IPv4 解析失败，尝试 IPv6...')
          // 尝试 IPv6
          try {
            const ipv6Addresses = await dnsResolve6(supabaseHost)
            if (ipv6Addresses && ipv6Addresses.length > 0) {
              const ipv6 = ipv6Addresses[0]
              console.log(`✅ 解析到 IPv6 地址: ${ipv6}`)
              // PostgreSQL 连接字符串中 IPv6 地址需要用方括号包裹
              resolvedUrl = supabaseDbUrl.replace(`@${supabaseHost}:`, `@[${ipv6}]:`)
            }
          } catch (ipv6Error) {
            console.log('⚠️ IPv6 解析也失败，使用原始连接字符串...')
          }
        }
      } catch (error) {
        console.log('⚠️ DNS 解析失败，使用原始连接字符串...')
      }
    }

    console.log('🔗 连接到 Supabase 数据库...')
    console.log(`   使用连接: ${resolvedUrl.replace(/:[^:@]+@/, ':****@')}`)
    
    supabasePool = new Pool({ 
      connectionString: resolvedUrl,
      connectionTimeoutMillis: 30000, // 30 秒超时
    })
    
    await supabasePool.query('SELECT NOW()')
    console.log('✅ Supabase 数据库连接成功')

    // 需要迁移的表列表（按依赖顺序）
    const tables = [
      'projects',
      'users',
      'tasks',
      'script_segments',
      'shots',
      'characters',
      'scenes',
      'items',
      'files',
      'operation_logs',
      'daily_consumption_stats',
    ]

    console.log('')
    console.log('📦 开始迁移数据...')
    console.log(`   需要迁移 ${tables.length} 个表`)

    let totalMigrated = 0
    let totalSkipped = 0

    for (const tableName of tables) {
      try {
        console.log(`\n📋 迁移表: ${tableName}`)

        // 检查表是否存在
        const tableExists = await supabasePool.query(`
          SELECT EXISTS (
            SELECT FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename = $1
          )
        `, [tableName])

        if (!tableExists.rows[0].exists) {
          console.log(`   ⚠️ 表 ${tableName} 在 Supabase 中不存在，跳过`)
          continue
        }

        // 从本地数据库读取数据
        const localData = await localPool.query(`SELECT * FROM ${tableName}`)
        const rowCount = localData.rows.length

        if (rowCount === 0) {
          console.log(`   ℹ️ 表 ${tableName} 没有数据，跳过`)
          continue
        }

        console.log(`   📥 从本地读取 ${rowCount} 条记录`)

        // 获取表的列名
        const columns = Object.keys(localData.rows[0])
        const columnList = columns.map(col => `"${col}"`).join(', ')
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ')

        // 构建 INSERT 语句（使用 ON CONFLICT DO NOTHING 避免重复）
        const insertQuery = `
          INSERT INTO ${tableName} (${columnList})
          VALUES (${placeholders})
          ON CONFLICT DO NOTHING
        `

        let inserted = 0
        let skipped = 0

        // 批量插入数据
        for (const row of localData.rows) {
          try {
            const values = columns.map(col => row[col])
            const result = await supabasePool.query(insertQuery, values)
            if (result.rowCount > 0) {
              inserted++
            } else {
              skipped++
            }
          } catch (error) {
            console.error(`   ❌ 插入记录失败:`, error.message)
            skipped++
          }
        }

        console.log(`   ✅ 成功插入 ${inserted} 条，跳过 ${skipped} 条（已存在）`)
        totalMigrated += inserted
        totalSkipped += skipped

      } catch (error) {
        console.error(`   ❌ 迁移表 ${tableName} 失败:`, error.message)
      }
    }

    console.log('')
    console.log('='.repeat(50))
    console.log('✅ 数据迁移完成！')
    console.log(`   成功迁移: ${totalMigrated} 条记录`)
    console.log(`   跳过（已存在）: ${totalSkipped} 条记录`)
    console.log('='.repeat(50))
    console.log('')
    console.log('📝 下一步：')
    console.log('1. 在 .env 文件中将 DATABASE_URL 更新为 SUPABASE_DATABASE_URL 的值')
    console.log('2. 重启后端服务')
    console.log('3. 验证数据是否正常')

  } catch (error) {
    console.error('')
    console.error('❌ 迁移失败:', error.message)
    console.error('')
    console.error('💡 排查建议：')
    console.error('1. 检查 .env 文件中的 SUPABASE_DATABASE_URL 配置')
    console.error('2. 确认 Supabase 项目正常运行')
    console.error('3. 检查网络连接（可能需要 VPN 或更换网络）')
    console.error('4. 如果使用 IPv6，确保网络支持 IPv6')
    process.exit(1)
  } finally {
    if (localPool) {
      await localPool.end()
    }
    if (supabasePool) {
      await supabasePool.end()
    }
  }
}

// 运行迁移
migrateData().catch(console.error)




