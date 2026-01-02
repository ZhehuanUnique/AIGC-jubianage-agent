import bcrypt from 'bcryptjs'
import pool from './connection.js'

/**
 * 初始化默认管理员用户
 */
async function initDefaultUsers() {
  try {
    console.log('🔐 开始初始化默认管理员用户...')

    // 先检查用户表是否存在
    try {
      await pool.query('SELECT 1 FROM users LIMIT 1')
    } catch (error) {
      if (error.message.includes('does not exist') || error.message.includes('不存在')) {
        console.error('❌ 用户表不存在！请先运行: npm run init-db')
        throw new Error('用户表不存在，请先初始化数据库')
      }
      throw error
    }

    // 默认管理员账号配置
    const defaultUsers = [
      {
        username: 'Chiefavefan',
        password: '246859CFF',
        displayName: '超级管理员',
      },
      {
        username: 'jubian888',
        password: '8888',
        displayName: '超级管理员',
      },
    ]

    for (const user of defaultUsers) {
      try {
        // 检查用户是否已存在
        const existingUser = await pool.query(
          'SELECT id FROM users WHERE username = $1',
          [user.username]
        )

        if (existingUser.rows.length > 0) {
          console.log(`✅ 用户 ${user.username} 已存在，更新密码和显示名称`)
          // 如果用户已存在，更新密码（以防密码被修改）
          const passwordHash = await bcrypt.hash(user.password, 10)
          await pool.query(
            'UPDATE users SET password_hash = $1, display_name = $2, is_active = TRUE WHERE username = $3',
            [passwordHash, user.displayName, user.username]
          )
          console.log(`✅ 已更新用户 ${user.username} 的密码`)
        } else {
          // 创建新用户
          const passwordHash = await bcrypt.hash(user.password, 10)
          const result = await pool.query(
            'INSERT INTO users (username, password_hash, display_name, is_active) VALUES ($1, $2, $3, TRUE) RETURNING id',
            [user.username, passwordHash, user.displayName]
          )
          console.log(`✅ 创建用户 ${user.username} 成功 (ID: ${result.rows[0].id})`)
        }
      } catch (error) {
        console.error(`❌ 处理用户 ${user.username} 失败:`, error.message)
        console.error('详细错误:', error)
      }
    }

    console.log('✅ 默认管理员用户初始化完成')
  } catch (error) {
    console.error('❌ 初始化默认用户失败:', error)
    throw error
  }
}

// 如果直接运行此文件，执行初始化
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('initDefaultUsers.js')) {
  initDefaultUsers()
    .then(() => {
      console.log('✅ 默认用户初始化成功')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ 默认用户初始化失败:', error)
      process.exit(1)
    })
}

export { initDefaultUsers }

