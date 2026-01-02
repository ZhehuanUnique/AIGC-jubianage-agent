import pg from 'pg'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'
import dns from 'dns'
import { promisify } from 'util'

const { Pool } = pg
const dnsLookup = promisify(dns.lookup)

// 获取当前文件所在目录
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 加载.env文件
const envPath = join(__dirname, '..', '.env')
if (existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

/**
 * 测试 Supabase 连接
 * 包括 DNS 解析测试和数据库连接测试
 */

async function testSupabaseConnection() {
  const supabaseDbUrl = process.env.SUPABASE_DATABASE_URL

  if (!supabaseDbUrl) {
    console.error('❌ 未找到 SUPABASE_DATABASE_URL 环境变量')
    console.log('💡 请在 server/.env 文件中配置 SUPABASE_DATABASE_URL')
    return
  }

  console.log('📋 配置信息：')
  console.log(`   连接字符串: ${supabaseDbUrl.replace(/:[^:@]+@/, ':****@')}`) // 隐藏密码

  // 解析连接字符串
  const urlMatch = supabaseDbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/)
  if (!urlMatch) {
    console.error('❌ 连接字符串格式错误')
    return
  }

  const [, user, password, host, port, database] = urlMatch

  console.log(`   主机: ${host}`)
  console.log(`   端口: ${port}`)
  console.log(`   数据库: ${database}`)
  console.log(`   用户: ${user}`)
  console.log('')

  // 步骤 1：测试 DNS 解析
  console.log('🔍 步骤 1: 测试 DNS 解析...')
  try {
    // 尝试解析 IPv4 地址
    const addresses = await dnsLookup(host, { family: 4 })
    console.log(`✅ DNS 解析成功 (IPv4): ${host} -> ${addresses.address}`)
  } catch (ipv4Error) {
    try {
      // 如果 IPv4 失败，尝试 IPv6
      const addresses = await dnsLookup(host, { family: 6 })
      console.log(`✅ DNS 解析成功 (IPv6): ${host} -> ${addresses.address}`)
      console.log('   ⚠️ 注意：返回的是 IPv6 地址，如果网络不支持 IPv6 可能无法连接')
      console.log('   💡 建议：尝试使用手机热点，或联系网络管理员启用 IPv6')
    } catch (ipv6Error) {
      console.error(`❌ DNS 解析失败 (IPv4): ${ipv4Error.message}`)
      console.error(`❌ DNS 解析失败 (IPv6): ${ipv6Error.message}`)
      console.log('')
      console.log('💡 解决方案：')
      console.log('   1. 检查网络连接')
      console.log('   2. 尝试更换 DNS 服务器（8.8.8.8 或 114.114.114.114）')
      console.log('   3. 如果使用端口 5432，尝试改为 6543（Session Pooler）')
      console.log('   4. 检查防火墙设置')
      console.log('   5. 尝试使用手机热点测试')
      return
    }
  }

  console.log('')

  // 步骤 2：测试数据库连接
  console.log('🔍 步骤 2: 测试数据库连接...')
  let pool = null
  try {
    pool = new Pool({ 
      connectionString: supabaseDbUrl,
      connectionTimeoutMillis: 10000, // 10 秒超时
    })
    
    const result = await pool.query('SELECT NOW() as current_time, version() as pg_version')
    console.log('✅ 数据库连接成功！')
    console.log(`   当前时间: ${result.rows[0].current_time}`)
    console.log(`   PostgreSQL 版本: ${result.rows[0].pg_version.split(' ')[0]} ${result.rows[0].pg_version.split(' ')[1]}`)
    
    // 测试查询表是否存在
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      LIMIT 5
    `)
    console.log(`   已存在的表数量: ${tablesResult.rows.length} 个（显示前5个）`)
    if (tablesResult.rows.length > 0) {
      console.log(`   表列表: ${tablesResult.rows.map(r => r.table_name).join(', ')}`)
    }
    
  } catch (error) {
    console.error(`❌ 数据库连接失败: ${error.message}`)
    console.log('')
    console.log('💡 可能的原因：')
    if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
      console.log('   1. DNS 解析失败 - 尝试更换 DNS 服务器')
      console.log('   2. 网络无法访问 Supabase - 检查防火墙或使用 VPN')
      console.log('   3. 如果使用端口 5432，尝试改为 6543（Session Pooler）')
    } else if (error.message.includes('timeout') || error.message.includes('ECONNREFUSED')) {
      console.log('   1. 连接超时 - 检查网络连接')
      console.log('   2. 端口被阻止 - 尝试使用 Session Pooler（端口 6543）')
      console.log('   3. 检查防火墙设置')
    } else if (error.message.includes('password') || error.message.includes('authentication')) {
      console.log('   1. 密码错误 - 检查 SUPABASE_DATABASE_URL 中的密码')
      console.log('   2. 在 Supabase 项目设置中重置数据库密码')
    } else {
      console.log('   1. 检查连接字符串格式')
      console.log('   2. 确认 Supabase 项目正常运行')
      console.log('   3. 查看详细错误信息')
    }
  } finally {
    if (pool) {
      await pool.end()
    }
  }
}

// 运行测试
testSupabaseConnection().catch(console.error)

