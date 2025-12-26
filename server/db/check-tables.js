import pool from './connection.js'

async function checkTables() {
  try {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `)
    
    console.log('✅ 已创建的表:')
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`)
    })
    
    console.log(`\n📊 总共 ${result.rows.length} 个表`)
  } catch (error) {
    console.error('❌ 检查失败:', error.message)
  } finally {
    await pool.end()
  }
}

checkTables()


