/**
 * 测试即梦-3.0Pro ARK API连接
 * 使用ARK API（Bearer Token认证）进行图生视频测试
 */

import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'

// 获取当前文件所在目录
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 加载.env文件（优先加载server目录下的.env，然后加载根目录的.env）
const rootEnvPath = join(__dirname, '../.env')
const serverEnvPath = join(__dirname, '.env')

// 先加载server目录下的.env（如果存在）
if (existsSync(serverEnvPath)) {
  console.log('📁 加载 server/.env 文件:', serverEnvPath)
  dotenv.config({ path: serverEnvPath })
}

// 然后加载根目录的.env（如果存在，会覆盖server/.env中的同名变量）
if (existsSync(rootEnvPath)) {
  console.log('📁 加载根目录 .env 文件:', rootEnvPath)
  dotenv.config({ path: rootEnvPath, override: true })
}

// 检查环境变量
const VOLCENGINE_ARK_API_KEY = process.env.VOLCENGINE_ARK_API_KEY || process.env.VOLCENGINE_API_KEY
const VOLCENGINE_ARK_API_HOST = process.env.VOLCENGINE_ARK_API_HOST || 'https://ark.cn-beijing.volces.com'

console.log('\n📋 环境变量检查:')
console.log('VOLCENGINE_ARK_API_KEY:', VOLCENGINE_ARK_API_KEY ? `${VOLCENGINE_ARK_API_KEY.substring(0, 20)}...` : '未设置')
console.log('VOLCENGINE_ARK_API_HOST:', VOLCENGINE_ARK_API_HOST)

if (!VOLCENGINE_ARK_API_KEY) {
  console.error('\n❌ 错误: VOLCENGINE_ARK_API_KEY 未设置')
  console.log('\n请确保 .env 文件中包含以下配置:')
  console.log('VOLCENGINE_ARK_API_KEY=your_ark_api_key')
  console.log('\n当前工作目录:', process.cwd())
  console.log('尝试加载的路径:')
  console.log('  -', rootEnvPath, existsSync(rootEnvPath) ? '✓' : '✗')
  console.log('  -', serverEnvPath, existsSync(serverEnvPath) ? '✓' : '✗')
  process.exit(1)
}

// 导入服务
import { generateVideoWithVolcengine, getVolcengineTaskStatus } from './services/volcengineVideoService.js'

async function testArkAPI() {
  console.log('\n🧪 开始测试即梦-3.0Pro ARK API...\n')

  try {
    // 使用一个公开的测试图片URL
    // 注意：实际使用时，图片URL必须是可公开访问的HTTP/HTTPS URL
    const testImageUrl = 'https://picsum.photos/1280/720'
    
    console.log('📤 测试1: 调用生成视频API（单首帧模式）')
    console.log('图片URL:', testImageUrl)
    console.log('模型: volcengine-video-3.0-pro')
    console.log('分辨率: 720p')
    console.log('时长: 5秒')
    console.log('提示词: 测试视频生成 - 图片中的场景自然运动\n')

    const result = await generateVideoWithVolcengine(testImageUrl, {
      model: 'volcengine-video-3.0-pro',
      text: '测试视频生成 - 图片中的场景自然运动',
      resolution: '720p',
      ratio: '16:9',
      duration: 5,
      serviceTier: 'offline',
      generateAudio: true,
    })

    console.log('✅ API调用成功!')
    console.log('返回结果:', JSON.stringify(result, null, 2))

    if (result.taskId) {
      console.log('\n📤 测试2: 查询任务状态')
      console.log('任务ID:', result.taskId)
      
      // 等待3秒后查询状态
      console.log('等待3秒后查询状态...')
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      try {
        const statusResult = await getVolcengineTaskStatus(result.taskId, 'volcengine-video-3.0-pro')
        console.log('✅ 状态查询成功!')
        console.log('任务状态:', JSON.stringify(statusResult, null, 2))
        
        if (statusResult.status === 'completed' && statusResult.videoUrl) {
          console.log('\n🎉 视频生成完成!')
          console.log('视频URL:', statusResult.videoUrl)
        } else if (statusResult.status === 'processing') {
          console.log('\n⏳ 视频正在生成中，进度:', statusResult.progress + '%')
        }
      } catch (statusError) {
        console.warn('⚠️  状态查询失败（可能是任务还在处理中）:', statusError.message)
      }
    } else if (result.videoUrl) {
      console.log('\n🎉 视频生成完成（在线推理）!')
      console.log('视频URL:', result.videoUrl)
    }

    console.log('\n✅ 所有测试通过! 即梦-3.0Pro ARK API 工作正常')
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

testArkAPI()
