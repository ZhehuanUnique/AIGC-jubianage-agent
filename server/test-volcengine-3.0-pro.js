/**
 * 测试即梦-3.0Pro API
 * 用于验证环境变量配置和API调用是否正常
 */

import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'

// 加载.env文件
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 优先从项目根目录加载.env
const rootEnvPath = join(__dirname, '../.env')
const serverEnvPath = join(__dirname, '.env')

// 尝试多个路径加载 .env
const envPaths = [
  rootEnvPath,
  serverEnvPath,
  join(process.cwd(), '.env'),
  join(process.cwd(), 'server', '.env'),
]

let envLoaded = false
for (const envPath of envPaths) {
  if (existsSync(envPath)) {
    console.log('📁 加载 .env 文件:', envPath)
    dotenv.config({ path: envPath, override: true })
    envLoaded = true
    break
  }
}

if (!envLoaded) {
  console.warn('⚠️  未找到 .env 文件，尝试从环境变量读取')
  // 也尝试从系统环境变量读取
  dotenv.config()
}

// 调试：打印所有环境变量（仅用于调试）
console.log('\n🔍 调试信息:')
console.log('已加载的 .env 路径:', envLoaded ? (existsSync(rootEnvPath) ? rootEnvPath : serverEnvPath) : '未找到')
console.log('process.env.VOLCENGINE_AK:', process.env.VOLCENGINE_AK ? '已设置' : '未设置')
console.log('process.env.VOLCENGINE_SK:', process.env.VOLCENGINE_SK ? '已设置' : '未设置')

// 检查环境变量
const VOLCENGINE_AK = process.env.VOLCENGINE_AK || process.env.VOLCENGINE_ACCESS_KEY || process.env.VOLC_ACCESSKEY
const VOLCENGINE_SK = process.env.VOLCENGINE_SK || process.env.VOLCENGINE_SECRET_KEY || process.env.VOLC_SECRETKEY
const VOLCENGINE_API_HOST = process.env.VOLCENGINE_API_HOST || 'https://visual.volcengineapi.com'

console.log('\n🔍 环境变量检查:')
console.log('VOLCENGINE_AK:', VOLCENGINE_AK ? `${VOLCENGINE_AK.substring(0, 10)}...` : '❌ 未设置')
console.log('VOLCENGINE_SK:', VOLCENGINE_SK ? `${VOLCENGINE_SK.substring(0, 10)}...` : '❌ 未设置')
console.log('VOLCENGINE_API_HOST:', VOLCENGINE_API_HOST)

if (!VOLCENGINE_AK || !VOLCENGINE_SK) {
  console.error('\n❌ 错误: VOLCENGINE_AK 或 VOLCENGINE_SK 未设置')
  console.log('\n请确保 .env 文件中包含以下配置:')
  console.log('VOLCENGINE_AK=your_access_key')
  console.log('VOLCENGINE_SK=your_secret_key')
  process.exit(1)
}

// 导入服务
import { generateVideoWithVolcengine, getVolcengineTaskStatus } from './services/volcengineVideoService.js'

async function testVolcengineAPI() {
  console.log('\n🧪 开始测试即梦-3.0Pro API...\n')

  try {
    // 使用一个测试图片URL（这里使用一个公开的测试图片）
    // 注意：实际使用时，图片URL必须是可公开访问的HTTP/HTTPS URL
    const testImageUrl = 'https://via.placeholder.com/1280x720.jpg'
    
    console.log('📤 测试1: 调用生成视频API')
    console.log('图片URL:', testImageUrl)
    console.log('模型: volcengine-video-3.0-pro')
    console.log('分辨率: 720p')
    console.log('时长: 5秒')
    console.log('提示词: 测试视频生成\n')

    const result = await generateVideoWithVolcengine(testImageUrl, {
      model: 'volcengine-video-3.0-pro',
      text: '测试视频生成',
      resolution: '720p',
      ratio: '16:9',
      duration: 5,
      serviceTier: 'offline', // 使用离线推理
      generateAudio: true,
    })

    console.log('✅ API调用成功!')
    console.log('返回结果:', JSON.stringify(result, null, 2))

    if (result.taskId) {
      console.log('\n📤 测试2: 查询任务状态')
      console.log('任务ID:', result.taskId)
      
      // 等待2秒后查询状态
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const statusResult = await getVolcengineTaskStatus(result.taskId, 'volcengine-video-3.0-pro')
      console.log('✅ 状态查询成功!')
      console.log('任务状态:', JSON.stringify(statusResult, null, 2))
    }

    console.log('\n✅ 所有测试通过! 即梦-3.0Pro API 工作正常')
    process.exit(0)
  } catch (error) {
    console.error('\n❌ 测试失败:')
    console.error('错误信息:', error.message)
    console.error('错误堆栈:', error.stack)
    
    if (error.message.includes('环境变量未设置')) {
      console.error('\n💡 提示: 请检查 .env 文件中的配置')
    } else if (error.message.includes('API调用失败')) {
      console.error('\n💡 提示: 请检查:')
      console.error('1. Access Key 和 Secret Key 是否正确')
      console.error('2. 是否已开通即梦-3.0Pro服务')
      console.error('3. API权限是否足够')
      console.error('4. 账户余额是否充足')
    }
    
    process.exit(1)
  }
}

// 运行测试
testVolcengineAPI()

