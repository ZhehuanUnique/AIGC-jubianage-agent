// 检查COS配置和测试上传功能
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'
import { uploadBuffer } from './services/cosService.js'
import { generateCosKey } from './services/cosService.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const envPath = join(__dirname, '.env')

console.log('='.repeat(60))
console.log('COS配置检查工具')
console.log('='.repeat(60))
console.log()

// 加载环境变量
if (existsSync(envPath)) {
  dotenv.config({ path: envPath })
  console.log('✅ .env 文件已加载')
} else {
  console.log('❌ .env 文件不存在')
  process.exit(1)
}

console.log()
console.log('📋 COS环境变量检查:')
console.log()

const cosVars = [
  { key: 'COS_SECRET_ID', required: true },
  { key: 'COS_SECRET_KEY', required: true },
  { key: 'COS_BUCKET', required: true },
  { key: 'COS_REGION', required: false, default: 'ap-guangzhou' },
]

let hasError = false

cosVars.forEach(({ key, required, default: defaultValue }) => {
  const value = process.env[key]
  if (value) {
    if (key === 'COS_SECRET_KEY') {
      console.log(`  ✅ ${key}: ***已设置***`)
    } else if (key === 'COS_SECRET_ID') {
      console.log(`  ✅ ${key}: ${value.substring(0, 10)}...`)
    } else {
      console.log(`  ✅ ${key}: ${value}`)
    }
  } else {
    if (required) {
      console.log(`  ❌ ${key}: 未设置 (必需)`)
      hasError = true
    } else {
      console.log(`  ⚠️  ${key}: 未设置 (将使用默认值: ${defaultValue})`)
    }
  }
})

console.log()

if (hasError) {
  console.log('❌ COS配置不完整，请检查上述环境变量')
  console.log()
  console.log('💡 配置步骤:')
  console.log('  1. 打开 server/.env 文件')
  console.log('  2. 设置以下变量:')
  console.log('     COS_SECRET_ID=你的SecretId')
  console.log('     COS_SECRET_KEY=你的SecretKey')
  console.log('     COS_BUCKET=你的存储桶名称')
  console.log('     COS_REGION=ap-guangzhou (或其他区域)')
  console.log()
  process.exit(1)
}

// 测试上传功能
console.log('🧪 测试COS上传功能...')
console.log()

try {
  // 创建一个测试图片（1x1像素的PNG）
  const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
  const testImageBuffer = Buffer.from(testImageBase64, 'base64')
  const cosKey = generateCosKey('test', 'png')
  
  console.log(`📤 上传测试图片到: ${cosKey}`)
  
  const result = await uploadBuffer(testImageBuffer, cosKey, 'image/png')
  
  console.log()
  console.log('✅ COS上传测试成功!')
  console.log(`   文件URL: ${result.url}`)
  console.log()
  
  // 验证URL是否可访问
  console.log('🔍 验证上传的文件URL是否可访问...')
  try {
    const verifyResponse = await fetch(result.url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(10000),
    })
    
    if (verifyResponse.ok) {
      const contentType = verifyResponse.headers.get('content-type') || 'unknown'
      const contentLength = verifyResponse.headers.get('content-length') || 'unknown'
      console.log(`✅ URL可访问: Content-Type: ${contentType}, Size: ${contentLength} bytes`)
      console.log()
      console.log('💡 提示: URL可访问，COS配置正确！')
    } else {
      console.log(`⚠️ URL返回状态码: ${verifyResponse.status}`)
      console.log('   可能原因: 存储桶权限设置不正确')
      console.log('   解决方案: 在腾讯云控制台设置存储桶为"公共读"或"公共读写"')
    }
  } catch (verifyError) {
    console.log(`❌ URL无法访问: ${verifyError.message}`)
    console.log('   可能原因:')
    console.log('   1. 存储桶权限设置不正确（需要设置为"公共读"）')
    console.log('   2. 网络连接问题')
    console.log('   3. 文件上传失败但未报错')
  }
  
  console.log()
  console.log('💡 如果上传失败，请检查:')
  console.log('   1. SecretId 和 SecretKey 是否正确')
  console.log('   2. 存储桶名称是否正确')
  console.log('   3. 存储桶区域是否匹配')
  console.log('   4. 存储桶权限是否允许上传和公共读')
  
} catch (error) {
  console.log()
  console.log('❌ COS上传测试失败!')
  console.log(`   错误信息: ${error.message}`)
  console.log()
  console.log('💡 可能的原因:')
  console.log('   1. SecretId 或 SecretKey 错误')
  console.log('   2. 存储桶名称不存在或拼写错误')
  console.log('   3. 存储桶区域不匹配')
  console.log('   4. 网络连接问题')
  console.log('   5. 存储桶权限不足')
  console.log()
  process.exit(1)
}

console.log()
console.log('='.repeat(60))

