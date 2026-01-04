/**
 * 简单测试即梦AI-视频生成3.0 Pro API
 * 直接读取 .env 文件并测试
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 手动读取 .env 文件
const envPath = join(__dirname, '../.env')
console.log('📁 读取 .env 文件:', envPath)

if (!existsSync(envPath)) {
  console.error('❌ .env 文件不存在:', envPath)
  process.exit(1)
}

// 读取并解析 .env 文件
const envContent = readFileSync(envPath, 'utf-8')
console.log('文件内容前200字符:', envContent.substring(0, 200))
console.log('文件行数:', envContent.split(/\r?\n/).length)

const envVars = {}
envContent.split(/\r?\n/).forEach((line, index) => {
  const originalLine = line
  line = line.trim()
  if (line && !line.startsWith('#')) {
    const equalIndex = line.indexOf('=')
    if (equalIndex > 0) {
      const key = line.substring(0, equalIndex).trim()
      const value = line.substring(equalIndex + 1).trim()
      // 移除引号（如果有）
      const cleanValue = value.replace(/^["']|["']$/g, '')
      envVars[key] = cleanValue
      if (key.includes('VOLC')) {
        console.log(`找到变量 [行${index + 1}]: ${key} = ${cleanValue.substring(0, 20)}...`)
      }
    }
  }
})

console.log('从 .env 文件解析的所有变量:', Object.keys(envVars).join(', ') || '无')

// 设置环境变量
process.env.VOLCENGINE_AK = envVars.VOLCENGINE_AK
process.env.VOLCENGINE_SK = envVars.VOLCENGINE_SK
process.env.VOLCENGINE_API_HOST = envVars.VOLCENGINE_API_HOST || 'https://visual.volcengineapi.com'

console.log('\n🔍 环境变量检查:')
console.log('VOLCENGINE_AK:', process.env.VOLCENGINE_AK ? `${process.env.VOLCENGINE_AK.substring(0, 10)}...` : '❌ 未设置')
console.log('VOLCENGINE_SK:', process.env.VOLCENGINE_SK ? `${process.env.VOLCENGINE_SK.substring(0, 10)}...` : '❌ 未设置')
console.log('VOLCENGINE_API_HOST:', process.env.VOLCENGINE_API_HOST)

if (!process.env.VOLCENGINE_AK || !process.env.VOLCENGINE_SK) {
  console.error('\n❌ 错误: VOLCENGINE_AK 或 VOLCENGINE_SK 未设置')
  console.log('\n从 .env 文件读取的变量:')
  console.log('VOLCENGINE_AK:', envVars.VOLCENGINE_AK ? '已找到' : '未找到')
  console.log('VOLCENGINE_SK:', envVars.VOLCENGINE_SK ? '已找到' : '未找到')
  process.exit(1)
}

// 导入服务并测试
import { generateVideoWithVolcengine } from './services/volcengineVideoService.js'

async function testAPI() {
  console.log('\n🧪 开始测试即梦AI-视频生成3.0 Pro API...\n')

  try {
    // 使用一个测试图片URL
    const testImageUrl = 'https://via.placeholder.com/1280x720.jpg'
    
    console.log('📤 调用生成视频API')
    console.log('图片URL:', testImageUrl)
    console.log('模型: volcengine-video-3.0-pro')
    console.log('分辨率: 720p')
    console.log('时长: 5秒\n')

    const result = await generateVideoWithVolcengine(testImageUrl, {
      model: 'volcengine-video-3.0-pro',
      text: '测试视频生成',
      resolution: '720p',
      ratio: '16:9',
      duration: 5,
      serviceTier: 'offline',
      generateAudio: true,
    })

    console.log('✅ API调用成功!')
    console.log('返回结果:', JSON.stringify(result, null, 2))
    console.log('\n✅ 测试通过! 即梦AI-视频生成3.0 Pro API 工作正常')
    process.exit(0)
  } catch (error) {
    console.error('\n❌ 测试失败:')
    console.error('错误信息:', error.message)
    if (error.stack) {
      console.error('错误堆栈:', error.stack)
    }
    process.exit(1)
  }
}

testAPI()

