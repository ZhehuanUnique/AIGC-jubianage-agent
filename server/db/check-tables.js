import pool from './connection.js'

async function checkTables() {
  try {
    const result = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name"
    )
    console.log('已存在的表:')
    if (result.rows.length === 0) {
      console.log('  (无)')
    } else {
      result.rows.forEach(row => {
        console.log(`  - ${row.table_name}`)
      })
    }
  } catch (error) {
    console.error('检查失败:', error)
  } finally {
    await pool.end()
  }
}

checkTables()
