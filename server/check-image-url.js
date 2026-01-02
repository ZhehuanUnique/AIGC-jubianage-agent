// 检查图片URL格式和可访问性
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const envPath = join(__dirname, '.env')

// 加载环境变量
if (existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

/**
 * 检查图片URL格式
 * @param {string} url - 图片URL
 */
function checkImageUrlFormat(url) {
  console.log('='.repeat(60))
  console.log('图片URL格式检查')
  console.log('='.repeat(60))
  console.log()
  console.log(`📋 检查URL: ${url.substring(0, 100)}${url.length > 100 ? '...' : ''}`)
  console.log()
  
  // 1. 检查是否是base64格式
  if (url.startsWith('data:image/')) {
    console.log('✅ 格式: base64 data URI')
    const parts = url.split(',')
    if (parts.length === 2) {
      const mimeType = url.match(/data:([^;]+)/)?.[1] || 'unknown'
      const base64Data = parts[1]
      const sizeKB = (base64Data.length * 3) / 4 / 1024
      console.log(`   MIME类型: ${mimeType}`)
      console.log(`   数据大小: ${sizeKB.toFixed(2)} KB`)
      console.log()
      console.log('⚠️  注意: base64格式需要上传到COS后才能用于图生视频API')
      console.log('   系统会自动处理，但需要配置COS')
      return { format: 'base64', needsUpload: true }
    } else {
      console.log('❌ base64格式不正确')
      return { format: 'invalid', needsUpload: false }
    }
  }
  
  // 2. 检查是否是HTTP/HTTPS URL
  if (url.startsWith('http://') || url.startsWith('https://')) {
    console.log('✅ 格式: HTTP/HTTPS URL')
    
    // 检查URL是否可访问
    console.log('🔍 检查URL可访问性...')
    return fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) })
      .then(response => {
        if (response.ok) {
          const contentType = response.headers.get('content-type') || 'unknown'
          const contentLength = response.headers.get('content-length') || 'unknown'
          console.log(`   ✅ URL可访问`)
          console.log(`   Content-Type: ${contentType}`)
          console.log(`   Content-Length: ${contentLength} bytes`)
          console.log()
          console.log('💡 此URL可以直接用于图生视频API')
          return { format: 'http', needsUpload: false, accessible: true }
        } else {
          console.log(`   ⚠️  URL返回状态码: ${response.status}`)
          console.log('   ⚠️  可能无法访问，建议检查URL是否正确')
          return { format: 'http', needsUpload: false, accessible: false }
        }
      })
      .catch(error => {
        console.log(`   ❌ URL无法访问: ${error.message}`)
        console.log('   ⚠️  可能的原因:')
        console.log('      - URL需要认证')
        console.log('      - URL已过期')
        console.log('      - 网络连接问题')
        console.log('      - URL格式错误')
        console.log()
        console.log('💡 建议: 如果URL无法访问，系统会尝试上传到COS')
        return { format: 'http', needsUpload: true, accessible: false, error: error.message }
      })
  }
  
  // 3. 其他格式
  console.log('❌ 格式: 未知或不支持')
  console.log('   支持的格式:')
  console.log('   - base64 data URI (data:image/...)')
  console.log('   - HTTP/HTTPS URL (http://... 或 https://...)')
  return { format: 'invalid', needsUpload: false }
}

// 如果从命令行调用
if (import.meta.url === `file://${process.argv[1]}`) {
  const url = process.argv[2]
  if (!url) {
    console.log('用法: node check-image-url.js <图片URL>')
    console.log()
    console.log('示例:')
    console.log('  node check-image-url.js "data:image/png;base64,..."')
    console.log('  node check-image-url.js "https://example.com/image.jpg"')
    process.exit(1)
  }
  
  const result = checkImageUrlFormat(url)
  if (result instanceof Promise) {
    result.then(r => {
      console.log()
      console.log('='.repeat(60))
      process.exit(r.accessible === false ? 1 : 0)
    })
  } else {
    console.log()
    console.log('='.repeat(60))
    process.exit(result.format === 'invalid' ? 1 : 0)
  }
}

export { checkImageUrlFormat }



