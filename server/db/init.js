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
    
    // 提取数据库名
    let dbName = process.env.DB_NAME
    if (!dbName) {
      const urlParts = dbUrl.split('/')
      dbName = urlParts[urlParts.length - 1].split('?')[0]
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
    
    // 读取用户表SQL文件
    const userSchemaPath = join(__dirname, 'userSchema.sql')
    let userSchemaSQL = ''
    try {
      userSchemaSQL = readFileSync(userSchemaPath, 'utf-8')
      console.log('📋 读取用户表结构文件...')
    } catch (error) {
      console.warn('⚠️  用户表结构文件不存在，跳过:', userSchemaPath)
    }
    
    // 合并SQL
    const combinedSQL = schemaSQL + '\n\n' + userSchemaSQL

    // 按照正确顺序执行SQL：函数 -> 表 -> 索引 -> 触发器
    const statements = {
      functions: [],
      tables: [],
      indexes: [],
      triggers: []
    }

    // 移除注释
    let cleanedSQL = combinedSQL
      .replace(/--[^\n]*/g, '') // 移除单行注释
      .replace(/\/\*[\s\S]*?\*\//g, '') // 移除多行注释
      .trim()

    // 1. 提取函数定义（使用更精确的正则，匹配 $$...$$ 语法）
    const functionRegex = /CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION[^$]*\$\$[\s\S]*?\$\$\s+language\s+['"]plpgsql['"]/gi
    let processedSQL = cleanedSQL
    let functionMatch
    while ((functionMatch = functionRegex.exec(cleanedSQL)) !== null) {
      statements.functions.push(functionMatch[0].trim())
      processedSQL = processedSQL.replace(functionMatch[0], '')
    }

    // 2. 智能分割SQL语句（处理括号嵌套）
    function splitSQLStatements(sql) {
      const statements = []
      let current = ''
      let depth = 0
      let inString = false
      let stringChar = null
      
      for (let i = 0; i < sql.length; i++) {
        const char = sql[i]
        const nextChar = sql[i + 1]
        
        // 处理字符串
        if ((char === '"' || char === "'") && (i === 0 || sql[i - 1] !== '\\')) {
          if (!inString) {
            inString = true
            stringChar = char
          } else if (char === stringChar) {
            inString = false
            stringChar = null
          }
        }
        
        if (!inString) {
          // 处理括号
          if (char === '(') depth++
          if (char === ')') depth--
          
          // 处理分号（语句结束）
          if (char === ';' && depth === 0) {
            current += char
            const trimmed = current.trim()
            if (trimmed.length > 0) {
              statements.push(trimmed)
            }
            current = ''
            continue
          }
        }
        
        current += char
      }
      
      // 添加最后一个语句（如果没有分号）
      const trimmed = current.trim()
      if (trimmed.length > 0) {
        statements.push(trimmed)
      }
      
      return statements
    }

    const allStatements = splitSQLStatements(processedSQL)

    // 3. 分类语句
    allStatements.forEach(stmt => {
      const upperStmt = stmt.toUpperCase().trim()
      
      if (upperStmt.startsWith('CREATE TABLE')) {
        statements.tables.push(stmt)
      } else if (upperStmt.startsWith('CREATE') && upperStmt.includes('INDEX')) {
        statements.indexes.push(stmt)
      } else if (upperStmt.startsWith('CREATE TRIGGER')) {
        statements.triggers.push(stmt)
      }
    })

    console.log(`📝 开始执行SQL语句...`)
    console.log(`  - 函数: ${statements.functions.length} 个`)
    console.log(`  - 表: ${statements.tables.length} 个`)
    console.log(`  - 索引: ${statements.indexes.length} 个`)
    console.log(`  - 触发器: ${statements.triggers.length} 个`)

    // 4. 按顺序执行：函数 -> 表 -> 索引 -> 触发器
    let executedCount = 0

    // 执行函数
    for (const func of statements.functions) {
      try {
        await pool.query(func)
        executedCount++
      } catch (error) {
        if (!error.message.includes('already exists') && !error.message.includes('已存在')) {
          console.warn(`⚠️ 函数执行警告:`, error.message.substring(0, 100))
        }
      }
    }

    // 执行表创建
    for (const table of statements.tables) {
      try {
        await pool.query(table)
        executedCount++
      } catch (error) {
        if (!error.message.includes('already exists') && !error.message.includes('已存在')) {
          console.warn(`⚠️ 表创建警告:`, error.message.substring(0, 100))
        }
      }
    }

    // 执行索引创建
    for (const index of statements.indexes) {
      try {
        await pool.query(index)
        executedCount++
      } catch (error) {
        if (!error.message.includes('already exists') && !error.message.includes('已存在') && !error.message.includes('不存在')) {
          console.warn(`⚠️ 索引创建警告:`, error.message.substring(0, 100))
        }
      }
    }

    // 执行触发器创建
    for (const trigger of statements.triggers) {
      try {
        await pool.query(trigger)
        executedCount++
      } catch (error) {
        if (!error.message.includes('already exists') && !error.message.includes('已存在') && !error.message.includes('不存在')) {
          console.warn(`⚠️ 触发器创建警告:`, error.message.substring(0, 100))
        }
      }
    }

    console.log(`✅ 数据库初始化完成 (共执行 ${executedCount} 条语句)`)
    return true
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error)
    throw error
  }
}

// 如果直接运行此文件，执行初始化
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
