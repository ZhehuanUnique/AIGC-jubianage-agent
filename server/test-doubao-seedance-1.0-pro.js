import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'
import { generateVideoWithSeedance, getSeedanceTaskStatus } from './services/doubaoSeedanceService.js'
import { uploadBuffer } from './services/storageService.js'

// 加载.env文件
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const envPath = join(__dirname, '.env')
if (existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

// 测试用的简单图片
let TEST_IMAGE_URL = ''
const TEST_PROMPT = 'a beautiful landscape with smooth camera movement'
const MODEL_NAME = 'doubao-seedance-1-0-pro-250528' // 1.0 Pro 模型ID

// 初始化测试图片URL
async function initTestImage() {
  try {
    // 创建一个简单的测试图片（512x512像素的PNG）
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

// 轮询任务状态直到完成
async function waitForTaskCompletion(taskId, maxWaitTime = 300000) {
  const startTime = Date.now()
  const pollInterval = 5000 // 每5秒查询一次
  
  console.log(`\n⏳ 开始轮询任务状态，任务ID: ${taskId}`)
  console.log(`   最大等待时间: ${maxWaitTime / 1000}秒`)
  
  while (Date.now() - startTime < maxWaitTime) {
    try {
      const status = await getSeedanceTaskStatus(taskId)
      
      console.log(`\n📊 任务状态查询结果:`)
      console.log(`   状态: ${status.status}`)
      console.log(`   进度: ${status.progress}%`)
      console.log(`   消息: ${status.message || '无'}`)
      
      if (status.status === 'completed') {
        console.log(`\n✅ 视频生成完成！`)
        if (status.videoUrl) {
          console.log(`\n🎬 视频链接: ${status.videoUrl}`)
          return {
            success: true,
            taskId: status.taskId,
            videoUrl: status.videoUrl,
            status: status.status,
          }
        } else {
          console.log(`⚠️ 任务已完成，但未找到视频链接`)
          return {
            success: false,
            taskId: status.taskId,
            error: '任务已完成，但未找到视频链接',
          }
        }
      } else if (status.status === 'failed') {
        console.log(`\n❌ 视频生成失败`)
        return {
          success: false,
          taskId: status.taskId,
          error: status.message || '视频生成失败',
        }
      } else {
        // 处理中，继续等待
        const elapsed = Math.floor((Date.now() - startTime) / 1000)
        const remaining = Math.floor((maxWaitTime - (Date.now() - startTime)) / 1000)
        console.log(`   已等待: ${elapsed}秒，剩余: ${remaining}秒`)
      }
    } catch (error) {
      console.error(`❌ 查询任务状态时出错: ${error.message}`)
      // 继续重试，可能是临时网络问题
    }
    
    // 等待一段时间后再次查询
    await new Promise(resolve => setTimeout(resolve, pollInterval))
  }
  
  // 超时
  console.log(`\n⏰ 等待超时（${maxWaitTime / 1000}秒）`)
  return {
    success: false,
    taskId: taskId,
    error: '等待超时',
  }
}

async function testDoubaoSeedance1_0Pro() {
  console.log('🚀 开始测试 Doubao-Seedance-1.0-pro 模型')
  console.log('='.repeat(60))
  
  try {
    // 初始化测试图片
    await initTestImage()
    
    console.log(`\n📝 测试配置:`)
    console.log(`   模型: ${MODEL_NAME}`)
    console.log(`   测试图片: ${TEST_IMAGE_URL}`)
    console.log(`   提示词: ${TEST_PROMPT}`)
    console.log(`   分辨率: 720p`)
    console.log(`   宽高比: 16:9`)
    console.log(`   时长: 5秒`)
    console.log(`   生成音频: false`)
    
    // 调用生成视频API
    console.log(`\n📤 正在提交视频生成任务...`)
    const result = await generateVideoWithSeedance(TEST_IMAGE_URL, {
      model: MODEL_NAME,
      text: TEST_PROMPT,
      resolution: '720p',
      ratio: '16:9',
      duration: 5,
      generateAudio: false, // 1.0 Pro 可能不支持音频，设为false
    })
    
    if (!result || !result.taskId) {
      throw new Error('API返回结果中没有任务ID')
    }
    
    console.log(`\n✅ 任务提交成功！`)
    console.log(`   任务ID: ${result.taskId}`)
    console.log(`   状态: ${result.status || 'pending'}`)
    
    // 等待任务完成
    const finalResult = await waitForTaskCompletion(result.taskId, 300000) // 最多等待5分钟
    
    if (finalResult.success && finalResult.videoUrl) {
      console.log(`\n${'='.repeat(60)}`)
      console.log(`🎉 测试成功！`)
      console.log(`${'='.repeat(60)}`)
      console.log(`\n📹 视频链接: ${finalResult.videoUrl}`)
      console.log(`\n✅ 任务ID: ${finalResult.taskId}`)
      return finalResult
    } else {
      console.log(`\n${'='.repeat(60)}`)
      console.log(`❌ 测试失败`)
      console.log(`${'='.repeat(60)}`)
      console.log(`\n错误: ${finalResult.error || '未知错误'}`)
      throw new Error(finalResult.error || '测试失败')
    }
  } catch (error) {
    console.error(`\n❌ 测试过程中发生错误:`)
    console.error(`   ${error.message}`)
    if (error.stack) {
      console.error(`\n堆栈跟踪:`)
      console.error(error.stack)
    }
    throw error
  }
}

// 运行测试
testDoubaoSeedance1_0Pro()
  .then(result => {
    console.log(`\n✅ 测试完成！`)
    if (result && result.videoUrl) {
      console.log(`\n🎬 最终视频链接: ${result.videoUrl}`)
    }
    process.exit(0)
  })
  .catch(error => {
    console.error(`\n❌ 测试失败:`, error.message)
    process.exit(1)
  })

