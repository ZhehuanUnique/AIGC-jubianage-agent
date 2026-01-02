import { initDatabase } from './init.js'
import { initDefaultUsers } from './initDefaultUsers.js'

async function setupDatabase() {
  try {
    console.log('🚀 开始设置数据库...\n')
    
    // 步骤1: 初始化数据库表结构
    console.log('📦 步骤1: 初始化数据库表结构...')
    await initDatabase()
    console.log('✅ 数据库表结构初始化完成\n')
    
    // 步骤2: 初始化默认用户
    console.log('👤 步骤2: 初始化默认管理员用户...')
    await initDefaultUsers()
    console.log('✅ 默认用户初始化完成\n')
    
    console.log('🎉 数据库设置完成！')
    console.log('\n📋 默认管理员账号:')
    console.log('  超级管理员: Chiefavefan / 246859CFF')
    console.log('  高级管理员: jubian888 / 8888')
    
    process.exit(0)
  } catch (error) {
    console.error('❌ 数据库设置失败:', error.message)
    console.error('详细错误:', error)
    process.exit(1)
  }
}

setupDatabase()


