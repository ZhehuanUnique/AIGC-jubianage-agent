/**
 * 测试剪映小助手API连接
 * 用于诊断 API 连接问题
 */

const JIANYING_API_BASE_URL = process.env.JIANYING_API_BASE_URL || 'https://capcut-mate.jcaigc.cn/openapi/capcut-mate/v1'
const JIANYING_API_KEY = process.env.JIANYING_API_KEY || ''

console.log('🔍 剪映小助手API连接测试')
console.log('='.repeat(60))
console.log('API地址:', JIANYING_API_BASE_URL)
console.log('API密钥:', JIANYING_API_KEY ? `${JIANYING_API_KEY.substring(0, 10)}...` : '未设置')
console.log('Node.js版本:', process.version)
console.log('fetch支持:', typeof fetch !== 'undefined' ? '✅ 是' : '❌ 否')
console.log('='.repeat(60))
console.log()

async function testConnection() {
  try {
    console.log('📡 测试1: 检查网络连接...')
    const testUrl = 'https://capcut-mate.jcaigc.cn'
    const testResponse = await fetch(testUrl, { method: 'HEAD' })
    console.log(`✅ 网络连接正常 (状态码: ${testResponse.status})`)
    console.log()
  } catch (error) {
    console.error('❌ 网络连接失败:', error.message)
    console.error('   可能原因: 网络问题、防火墙阻止、DNS解析失败')
    console.log()
    return false
  }

  try {
    console.log('📝 测试2: 调用 create_draft API...')
    const apiUrl = `${JIANYING_API_BASE_URL}/create_draft`
    console.log('   请求URL:', apiUrl)
    console.log('   请求参数: { width: 1920, height: 1080 }')
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(JIANYING_API_KEY ? { 'Authorization': `Bearer ${JIANYING_API_KEY}` } : {}),
      },
      body: JSON.stringify({
        width: 1920,
        height: 1080,
      }),
    })

    console.log('   响应状态:', response.status, response.statusText)
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('❌ API调用失败:')
      console.error('   状态码:', response.status)
      console.error('   错误信息:', errorData.detail || errorData.message || '未知错误')
      console.error('   完整响应:', JSON.stringify(errorData, null, 2))
      return false
    }

    const data = await response.json()
    console.log('✅ API调用成功!')
    console.log('   响应数据:', JSON.stringify(data, null, 2))
    
    if (data.draft_url) {
      const draftIdMatch = data.draft_url.match(/draft_id=([^&]+)/)
      if (draftIdMatch) {
        console.log('   草稿ID:', draftIdMatch[1])
      }
    }
    
    return true
  } catch (error) {
    console.error('❌ API调用失败:')
    console.error('   错误类型:', error.name)
    console.error('   错误消息:', error.message)
    
    if (error.message.includes('fetch failed')) {
      console.error('   可能原因:')
      console.error('   - API服务器不可用')
      console.error('   - 网络连接问题')
      console.error('   - 防火墙阻止')
      console.error('   - DNS解析失败')
    } else if (error.message.includes('ECONNREFUSED')) {
      console.error('   可能原因: 连接被拒绝，API服务器可能未运行')
    } else if (error.message.includes('ENOTFOUND')) {
      console.error('   可能原因: DNS解析失败，无法找到API服务器')
    } else if (error.message.includes('timeout')) {
      console.error('   可能原因: 请求超时，API服务器响应慢')
    }
    
    console.error('   完整错误:', error)
    return false
  }
}

// 运行测试
testConnection()
  .then(success => {
    console.log()
    console.log('='.repeat(60))
    if (success) {
      console.log('✅ 所有测试通过！API连接正常')
      process.exit(0)
    } else {
      console.log('❌ 测试失败！请检查上述错误信息')
      console.log()
      console.log('💡 建议:')
      console.log('   1. 检查网络连接')
      console.log('   2. 检查防火墙设置')
      console.log('   3. 确认API服务是否可用')
      console.log('   4. 如果API不可用，系统会自动使用本地草稿生成')
      process.exit(1)
    }
  })
  .catch(error => {
    console.error('❌ 测试过程中发生未预期的错误:', error)
    process.exit(1)
  })



