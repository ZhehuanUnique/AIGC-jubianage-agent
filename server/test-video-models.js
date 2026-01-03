import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'
import { generateVideoFromImage } from './services/imageToVideoService.js'
import { generateVideoWithSeedance } from './services/doubaoSeedanceService.js'
import { uploadBuffer } from './services/cosService.js'

// 加载.env文件
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const envPath = join(__dirname, '.env')
if (existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

// 测试用的简单图片 - 创建一个简单的测试图片并上传到COS
let TEST_IMAGE_URL = ''
const TEST_PROMPT = 'a simple test video with smooth motion'

// 初始化测试图片URL
async function initTestImage() {
  try {
    // 创建一个简单的测试图片（1x1像素的PNG）
    const { createCanvas } = await import('canvas')
    const canvas = createCanvas(512, 512)
    const ctx = canvas.getContext('2d')
    
    // 绘制一个简单的渐变背景
    const gradient = ctx.createLinearGradient(0, 0, 512, 512)
    gradient.addColorStop(0, '#4A90E2')
    gradient.addColorStop(1, '#50C878')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 512, 512)
    
    // 添加文字
    ctx.fillStyle = 'white'
    ctx.font = 'bold 48px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('TEST', 256, 256)
    
    // 转换为Buffer
    const imageBuffer = canvas.toBuffer('image/png')
    
    // 上传到COS
    const cosKey = `test/test-image-${Date.now()}.png`
    const uploadResult = await uploadBuffer(imageBuffer, cosKey, 'image/png')
    TEST_IMAGE_URL = uploadResult.url
    console.log(`✅ 测试图片已上传到COS: ${TEST_IMAGE_URL}`)
  } catch (error) {
    console.warn('⚠️ 无法创建测试图片，使用备用URL:', error.message)
    // 如果canvas不可用，使用一个公开的测试图片URL
    TEST_IMAGE_URL = 'https://picsum.photos/512/512'
  }
}

// 所有要测试的模型列表
const MODELS_TO_TEST = [
  // 豆包 Seedance
  { name: 'doubao-seedance-1-5-pro-251215', service: 'seedance' },
  
  // MiniMax Hailuo
  { name: 'minimax-hailuo-02', service: 'imageToVideo' },
  { name: 'minimax-hailuo-2.3', service: 'imageToVideo' },
  { name: 'minimax-hailuo-2.3-fast', service: 'imageToVideo' },
  
  // Google Veo3.1
  { name: 'veo3.1', service: 'imageToVideo' },
  { name: 'veo3.1-pro', service: 'imageToVideo' },
  
  // Vidu V2
  { name: 'viduq2-turbo', service: 'imageToVideo' },
  { name: 'viduq2-pro', service: 'imageToVideo' },
  { name: 'viduq1', service: 'imageToVideo' },
  { name: 'vidu2.0', service: 'imageToVideo' },
  { name: 'vidu1.5', service: 'imageToVideo' },
  { name: 'vidu1.0', service: 'imageToVideo' },
]

// 测试结果
const results = {
  success: [],
  failed: [],
  skipped: []
}

async function testModel(modelConfig) {
  const { name, service } = modelConfig
  
  console.log(`\n${'='.repeat(60)}`)
  console.log(`🧪 测试模型: ${name}`)
  console.log(`${'='.repeat(60)}`)
  
  try {
    let result
    
    if (service === 'seedance') {
      // 直接调用 Seedance 服务
      result = await generateVideoWithSeedance(TEST_IMAGE_URL || 'https://picsum.photos/512/512', {
        model: name,
        text: TEST_PROMPT,
        resolution: '720p',
        ratio: '16:9',
        duration: 5,
        generateAudio: false,
      })
    } else {
      // 使用统一的 imageToVideo 服务
      result = await generateVideoFromImage(TEST_IMAGE_URL || 'https://picsum.photos/512/512', {
        model: name,
        text: TEST_PROMPT,
        resolution: '720p',
        duration: 5,
      })
    }
    
    if (result && result.taskId) {
      console.log(`✅ 成功: ${name}`)
      console.log(`   任务ID: ${result.taskId}`)
      console.log(`   状态: ${result.status || 'pending'}`)
      results.success.push({
        model: name,
        taskId: result.taskId,
        status: result.status,
      })
      return true
    } else {
      console.log(`⚠️ 警告: ${name} - 返回结果中没有 taskId`)
      results.failed.push({
        model: name,
        error: '返回结果中没有 taskId',
        result,
      })
      return false
    }
  } catch (error) {
    console.log(`❌ 失败: ${name}`)
    console.log(`   错误: ${error.message}`)
    results.failed.push({
      model: name,
      error: error.message,
      stack: error.stack,
    })
    return false
  }
}

async function runTests() {
  console.log('🚀 开始测试所有图生视频模型')
  
  // 初始化测试图片
  await initTestImage()
  
  console.log(`📝 测试图片: ${TEST_IMAGE_URL}`)
  console.log(`📝 测试提示词: ${TEST_PROMPT}`)
  console.log(`📊 总共 ${MODELS_TO_TEST.length} 个模型需要测试\n`)
  
  // 逐个测试模型
  for (const modelConfig of MODELS_TO_TEST) {
    await testModel(modelConfig)
    // 等待一小段时间，避免API限流
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  // 输出测试结果汇总
  console.log(`\n${'='.repeat(60)}`)
  console.log('📊 测试结果汇总')
  console.log(`${'='.repeat(60)}`)
  console.log(`✅ 成功: ${results.success.length} 个模型`)
  if (results.success.length > 0) {
    console.log('\n成功的模型:')
    results.success.forEach(r => {
      console.log(`  - ${r.model} (任务ID: ${r.taskId})`)
    })
  }
  
  console.log(`\n❌ 失败: ${results.failed.length} 个模型`)
  if (results.failed.length > 0) {
    console.log('\n失败的模型:')
    results.failed.forEach(r => {
      console.log(`  - ${r.model}`)
      console.log(`    错误: ${r.error}`)
    })
  }
  
  console.log(`\n⏭️  跳过: ${results.skipped.length} 个模型`)
  
  console.log(`\n${'='.repeat(60)}`)
  console.log('测试完成！')
  console.log(`${'='.repeat(60)}\n`)
}

// 运行测试
runTests().catch(error => {
  console.error('测试过程中发生错误:', error)
  process.exit(1)
})

