import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'
import { getSeedanceTaskStatus } from './services/doubaoSeedanceService.js'
import { getViduV2TaskStatus } from './services/viduV2Service.js'

// 加载.env文件
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const envPath = join(__dirname, '.env')
if (existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

// 测试成功的任务ID
const tasks = [
  { model: 'doubao-seedance-1-5-pro-251215', taskId: 'cgt-20260103145544-fw9bl', service: 'seedance' },
  { model: 'viduq2-turbo', taskId: '904928827975680000', service: 'vidu' },
  { model: 'viduq2-pro', taskId: '904928855968452608', service: 'vidu' },
]

async function checkTask(task) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`🔍 查询任务: ${task.model}`)
  console.log(`   任务ID: ${task.taskId}`)
  console.log(`${'='.repeat(60)}`)
  
  try {
    let result
    
    if (task.service === 'seedance') {
      result = await getSeedanceTaskStatus(task.taskId)
    } else if (task.service === 'vidu') {
      result = await getViduV2TaskStatus(task.taskId)
    }
    
    console.log(`📊 任务状态: ${result.status}`)
    
    if (result.videoUrl) {
      console.log(`✅ 视频已生成！`)
      console.log(`📹 视频URL: ${result.videoUrl}`)
      return {
        model: task.model,
        taskId: task.taskId,
        status: result.status,
        videoUrl: result.videoUrl,
        success: true
      }
    } else if (result.status === 'pending' || result.status === 'processing') {
      console.log(`⏳ 任务进行中，请稍候...`)
      return {
        model: task.model,
        taskId: task.taskId,
        status: result.status,
        videoUrl: null,
        success: false
      }
    } else if (result.status === 'failed') {
      console.log(`❌ 任务失败`)
      if (result.error) {
        console.log(`   错误: ${result.error}`)
      }
      return {
        model: task.model,
        taskId: task.taskId,
        status: result.status,
        error: result.error,
        success: false
      }
    } else {
      console.log(`⚠️ 未知状态`)
      console.log(`   完整结果:`, JSON.stringify(result, null, 2))
      return {
        model: task.model,
        taskId: task.taskId,
        status: result.status,
        result,
        success: false
      }
    }
  } catch (error) {
    console.log(`❌ 查询失败: ${error.message}`)
    return {
      model: task.model,
      taskId: task.taskId,
      error: error.message,
      success: false
    }
  }
}

async function checkAllTasks() {
  console.log('🚀 开始查询视频生成任务状态\n')
  
  const results = []
  
  for (const task of tasks) {
    const result = await checkTask(task)
    results.push(result)
    // 等待一小段时间
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  // 输出汇总
  console.log(`\n${'='.repeat(60)}`)
  console.log('📊 查询结果汇总')
  console.log(`${'='.repeat(60)}`)
  
  const completed = results.filter(r => r.videoUrl)
  const processing = results.filter(r => r.status === 'pending' || r.status === 'processing')
  const failed = results.filter(r => r.status === 'failed' || r.error)
  
  if (completed.length > 0) {
    console.log(`\n✅ 已完成 (${completed.length} 个):`)
    completed.forEach(r => {
      console.log(`\n  模型: ${r.model}`)
      console.log(`  任务ID: ${r.taskId}`)
      console.log(`  视频URL: ${r.videoUrl}`)
    })
  }
  
  if (processing.length > 0) {
    console.log(`\n⏳ 进行中 (${processing.length} 个):`)
    processing.forEach(r => {
      console.log(`  - ${r.model} (${r.taskId}) - 状态: ${r.status}`)
    })
  }
  
  if (failed.length > 0) {
    console.log(`\n❌ 失败 (${failed.length} 个):`)
    failed.forEach(r => {
      console.log(`  - ${r.model} (${r.taskId})`)
      if (r.error) {
        console.log(`    错误: ${r.error}`)
      }
    })
  }
  
  console.log(`\n${'='.repeat(60)}\n`)
}

checkAllTasks().catch(error => {
  console.error('查询过程中发生错误:', error)
  process.exit(1)
})

