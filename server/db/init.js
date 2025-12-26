import pool, { testConnection } from './connection.js'
import pg from 'pg'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const { Pool } = pg
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * 初始化数据库（创建表结构）
 */
export async function initDatabase() {
  try {
    // 先检查并创建数据库（如果不存在）
    console.log('🔍 检查数据库是否存在...')
    
    // 构建连接到 postgres 数据库的连接字符串
    const dbUrl = process.env.DATABASE_URL || 
      `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || ''}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'aigc_db'}`
    
    // 提取数据库名（从 DATABASE_URL 中提取，支持带连字符的数据库名）
    let dbName = process.env.DB_NAME
    if (!dbName) {
      // 从连接字符串中提取数据库名（最后一个 / 后面的部分）
      const urlParts = dbUrl.split('/')
      dbName = urlParts[urlParts.length - 1].split('?')[0] // 移除查询参数
      if (!dbName || dbName === '') {
        dbName = 'aigc_db'
      }
    }
    console.log(`📌 目标数据库名: ${dbName}`)
    // 构建连接到 postgres 数据库的连接字符串
    const postgresUrl = dbUrl.replace(/\/[^\/\?]+(\?|$)/, '/postgres$1')
    
    // 连接到 postgres 数据库检查目标数据库是否存在
    const adminPool = new Pool({ connectionString: postgresUrl })
    
    try {
      const result = await adminPool.query(
        "SELECT 1 FROM pg_database WHERE datname = $1",
        [dbName]
      )
      
      if (result.rows.length === 0) {
        console.log(`📦 数据库 ${dbName} 不存在，正在创建...`)
        await adminPool.query(`CREATE DATABASE ${dbName}`)
        console.log(`✅ 数据库 ${dbName} 创建成功`)
      } else {
        console.log(`✅ 数据库 ${dbName} 已存在`)
      }
    } finally {
      await adminPool.end()
    }
    
    // 现在连接到目标数据库
    console.log('🔗 连接到数据库...')
    const connected = await testConnection()
    if (!connected) {
      throw new Error('数据库连接失败，请检查配置')
    }

    // 读取SQL文件
    const schemaPath = join(__dirname, 'schema.sql')
    const schemaSQL = readFileSync(schemaPath, 'utf-8')

    // 使用更可靠的方法：先处理函数定义块，然后分割其他语句
    // 1. 提取所有函数定义（使用 $$ 分隔符，需要匹配多行）
    const functionBlocks = []
    // 匹配从 CREATE FUNCTION 到 $$ language 'plpgsql' 的完整函数定义
    const functionRegex = /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION[^$]*\$\$[\s\S]*?\$\$\s+language\s+['"]plpgsql['"]/gi
    let functionIndex = 0
    let processedSQL = schemaSQL.replace(functionRegex, (match) => {
      const placeholder = `__FUNCTION_${functionIndex}__`
      functionBlocks.push(match.trim())
      functionIndex++
      return placeholder
    })
    
    // 2. 按分号分割剩余SQL（不包含函数定义）
    const rawStatements = processedSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    // 3. 恢复函数定义并构建完整语句列表
    const allStatements = []
    
    // 先添加函数定义
    functionBlocks.forEach(func => {
      allStatements.push(func)
    })
    
    // 再添加其他语句（恢复函数占位符）
    rawStatements.forEach(stmt => {
      // 检查是否包含函数占位符
      const functionMatch = stmt.match(/__FUNCTION_(\d+)__/)
      if (functionMatch) {
        // 这个占位符已经在函数列表中，跳过
        return
      }
      // 普通语句，直接添加
      if (stmt && !stmt.startsWith('--')) {
        allStatements.push(stmt)
      }
    })

    console.log(`📝 开始执行 ${allStatements.length} 条SQL语句...`)

    for (let i = 0; i < allStatements.length; i++) {
      const statement = allStatements[i]
      try {
        await pool.query(statement)
        // 只对前几个语句显示详细信息
        if (i < 5) {
          const preview = statement.substring(0, 50).replace(/\s+/g, ' ')
          console.log(`  ✓ 执行语句 ${i + 1}: ${preview}...`)
        }
      } catch (error) {
        // 忽略已存在的表/索引/函数错误
        if (!error.message.includes('already exists') && 
            !error.message.includes('duplicate') &&
            !error.message.includes('已存在')) {
          console.warn(`⚠️ SQL执行警告 (语句 ${i + 1}):`, error.message)
          // 显示有问题的语句前50个字符
          const preview = statement.substring(0, 50).replace(/\s+/g, ' ')
          console.warn(`   语句内容: ${preview}...`)
        }
      }
    }

    console.log('✅ 数据库初始化完成')
    return true
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error)
    throw error
  }
}

// 如果直接运行此文件，执行初始化
// 检查是否是直接运行（不是被导入）
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     process.argv[1] && process.argv[1].endsWith('init.js')

if (isMainModule || process.argv[1]?.includes('init.js')) {
  console.log('🚀 开始初始化数据库...')
  initDatabase()
    .then(() => {
      console.log('✅ 数据库初始化成功')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ 数据库初始化失败:', error.message)
      console.error('详细错误:', error)
      process.exit(1)
    })
}


