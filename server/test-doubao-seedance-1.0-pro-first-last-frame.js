import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'
import { generateFirstLastFrameVideoWithSeedance, getSeedanceTaskStatus } from './services/doubaoSeedanceService.js'
import { uploadBuffer, generateKey as generateCosKey } from './services/storageService.js'

// 加载.env文件
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const envPath = join(__dirname, '.env')
if (existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

// 测试用的图片URL
let TEST_FIRST_FRAME_URL = ''
let TEST_LAST_FRAME_URL = ''
const TEST_PROMPT = '从首帧平滑过渡到尾帧，展现美丽的风景变化'
const MODEL_NAME = 'doubao-seedance-1-0-pro-250528' // 1.0 Pro 模型ID

// 初始化测试图片
async function initTestImages() {
  try {
    // 创建首帧图片（蓝色渐变）
    const { createCanvas } = await import('canvas')
    
    // 首帧：蓝色渐变
    const canvas1 = createCanvas(512, 512)
    const ctx1 = canvas1.getContext('2d')
    const gradient1 = ctx1.createLinearGradient(0, 0, 512, 512)
    gradient1.addColorStop(0, '#4A90E2')
    gradient1.addColorStop(1, '#357ABD')
    ctx1.fillStyle = gradient1
    ctx1.fillRect(0, 0, 512, 512)
    ctx1.fillStyle = 'white'
    ctx1.font = 'bold 48px Arial'
    ctx1.textAlign = 'center'
    ctx1.textBaseline = 'middle'
    ctx1.fillText('FIRST', 256, 256)
    
    const imageBuffer1 = canvas1.toBuffer('image/png')
    const cosKey1 = generateCosKey('image', 'png')
    const uploadResult1 = await uploadBuffer(imageBuffer1, cosKey1, 'image/png')
    TEST_FIRST_FRAME_URL = uploadResult1.url
    console.log(`✅ 首帧图片已上传: ${TEST_FIRST_FRAME_URL}`)
    
    // 尾帧：绿色渐变
    const canvas2 = createCanvas(512, 512)
    const ctx2 = canvas2.getContext('2d')
    const gradient2 = ctx2.createLinearGradient(0, 0, 512, 512)
    gradient2.addColorStop(0, '#50C878')
    gradient2.addColorStop(1, '#3FA863')
    ctx2.fillStyle = gradient2
    ctx2.fillRect(0, 0, 512, 512)
    ctx2.fillStyle = 'white'
    ctx2.font = 'bold 48px Arial'
    ctx2.textAlign = 'center'
    ctx2.textBaseline = 'middle'
    ctx2.fillText('LAST', 256, 256)
    
    const imageBuffer2 = canvas2.toBuffer('image/png')
    const cosKey2 = generateCosKey('image', 'png')
    const uploadResult2 = await uploadBuffer(imageBuffer2, cosKey2, 'image/png')
    TEST_LAST_FRAME_URL = uploadResult2.url
    console.log(`✅ 尾帧图片已上传: ${TEST_LAST_FRAME_URL}`)
  } catch (error) {
    console.warn('⚠️ 无法创建测试图片，使用备用URL:', error.message)
    // 如果canvas不可用，使用公开的测试图片URL
    TEST_FIRST_FRAME_URL = 'https://picsum.photos/512/512?random=1'
    TEST_LAST_FRAME_URL = 'https://picsum.photos/512/512?random=2'
  }
}

// 轮询任务状态直到完成
async function waitForTaskCompletion(taskId, maxWaitTime = 300000) {
  const startTime = Date.now()
  const pollInterval = 10000 // 每10秒查询一次
  
  console.log(`\n⏳ 开始轮询任务状态，任务ID: ${taskId}`)
  console.log(`   最大等待时间: ${maxWaitTime / 1000}秒`)
  
  while (Date.now() - startTime < maxWaitTime) {
    try {
      const status = await getSeedanceTaskStatus(taskId)
      
      console.log(`\n📊 任务状态查询结果:`)
      console.log(`   状态: ${status.status}`)
      console.log(`   进度: ${status.progress || 0}%`)
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

async function testFirstLastFrame() {
  console.log('🚀 开始测试 Doubao-Seedance-1.0-pro 首尾帧生视频功能')
  console.log('='.repeat(60))
  
  try {
    // 初始化测试图片
    await initTestImages()
    
    console.log(`\n📝 测试配置:`)
    console.log(`   模型: ${MODEL_NAME}`)
    console.log(`   首帧图片: ${TEST_FIRST_FRAME_URL}`)
    console.log(`   尾帧图片: ${TEST_LAST_FRAME_URL}`)
    console.log(`   提示词: ${TEST_PROMPT}`)
    console.log(`   分辨率: 720p`)
    console.log(`   宽高比: 16:9`)
    console.log(`   时长: 5秒`)
    
    // 调用首尾帧生视频API
    console.log(`\n📤 正在提交首尾帧生视频任务...`)
    const result = await generateFirstLastFrameVideoWithSeedance(
      TEST_FIRST_FRAME_URL,
      TEST_LAST_FRAME_URL,
      {
        model: MODEL_NAME, // 使用1.0 Pro模型
        text: TEST_PROMPT,
        resolution: '720p',
        ratio: '16:9',
        duration: 5,
      }
    )
    
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
      console.log(`\n💡 结论: doubao-seedance-1-0-pro-250528 模型支持首尾帧生视频功能！`)
      return finalResult
    } else {
      console.log(`\n${'='.repeat(60)}`)
      console.log(`❌ 测试失败`)
      console.log(`${'='.repeat(60)}`)
      console.log(`\n错误: ${finalResult.error || '未知错误'}`)
      console.log(`\n💡 结论: doubao-seedance-1-0-pro-250528 模型可能不支持首尾帧生视频功能，或API调用失败`)
      throw new Error(finalResult.error || '测试失败')
    }
  } catch (error) {
    console.error(`\n❌ 测试过程中发生错误:`)
    console.error(`   ${error.message}`)
    if (error.stack) {
      console.error(`\n堆栈跟踪:`)
      console.error(error.stack)
    }
    console.log(`\n💡 结论: doubao-seedance-1-0-pro-250528 模型首尾帧生视频功能测试失败`)
    throw error
  }
}

// 运行测试
testFirstLastFrame()
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

