import pool from './connection.js'
import bcrypt from 'bcryptjs'

async function checkUsers() {
  try {
    console.log('🔍 检查用户表...')
    
    // 检查表是否存在
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      )
    `)
    
    if (!tableCheck.rows[0].exists) {
      console.error('❌ 用户表不存在！请先运行: npm run init-db')
      process.exit(1)
    }
    
    console.log('✅ 用户表存在')
    
    // 查询所有用户
    const result = await pool.query(`
      SELECT id, username, display_name, is_active, created_at 
      FROM users 
      ORDER BY created_at DESC
    `)
    
    console.log(`\n📊 当前用户列表 (共 ${result.rows.length} 个):`)
    result.rows.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.username} (${user.display_name || user.username}) - ${user.is_active ? '激活' : '禁用'}`)
    })
    
    // 检查默认用户是否存在
    const defaultUsers = ['Chiefavefan', 'jubian888']
    console.log('\n🔐 检查默认管理员账号:')
    for (const username of defaultUsers) {
      const userResult = await pool.query(
        'SELECT id, username, password_hash, is_active FROM users WHERE username = $1',
        [username]
      )
      
      if (userResult.rows.length > 0) {
        const user = userResult.rows[0]
        console.log(`  ✅ ${username}: 存在 (ID: ${user.id}, 状态: ${user.is_active ? '激活' : '禁用'})`)
        
        // 测试密码
        const testPasswords = {
          'Chiefavefan': '246859CFF',
          'jubian888': '8888'
        }
        const testPassword = testPasswords[username]
        if (testPassword) {
          const isValid = await bcrypt.compare(testPassword, user.password_hash)
          console.log(`    密码验证: ${isValid ? '✅ 正确' : '❌ 错误'}`)
        }
      } else {
        console.log(`  ❌ ${username}: 不存在`)
      }
    }
    
  } catch (error) {
    console.error('❌ 检查失败:', error.message)
    console.error('详细错误:', error)
  } finally {
    await pool.end()
  }
}

checkUsers()


