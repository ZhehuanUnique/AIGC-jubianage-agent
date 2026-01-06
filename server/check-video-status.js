/**
 * 查询刚才测试生成的视频任务状态
 */

import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const envPath = join(__dirname, '../.env')
if (existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

// 刚才测试生成的任务ID
const tasks = [
  { taskId: '9b0c3de1-f815-4712-a2f4-dad741d8dc66', model: 'veo3.1', label: 'Veo3.1' },
  { taskId: '4a19623b-4fc1-4754-b456-82dd7b7f70cc', model: 'veo3.1-pro', label: 'Veo3.1 Pro' },
  { taskId: '905583362515677184', model: 'viduq2-turbo', label: 'Vidu Q2 Turbo' },
  { taskId: '905583520947138560', model: 'viduq2-pro', label: 'Vidu Q2 Pro' },
]

async function checkTaskStatus(taskId, model) {
  try {
    let result
    
    if (model === 'veo3.1' || model === 'veo3.1-pro') {
      const { getVideoTaskStatus } = await import('./services/imageToVideoService.js')
      result = await getVideoTaskStatus(taskId, model)
    } else if (model === 'viduq2-turbo' || model === 'viduq2-pro') {
      const { getVideoTaskStatus } = await import('./services/imageToVideoService.js')
      result = await getVideoTaskStatus(taskId, model)
    }
    
    return result
  } catch (error) {
    return { status: 'error', error: error.message }
  }
}

async function main() {
  console.log('🔍 查询视频生成状态...\n')
  
  for (const task of tasks) {
    console.log(`\n${'='.repeat(70)}`)
    console.log(`${task.label} (${task.model})`)
    console.log(`任务ID: ${task.taskId}`)
    console.log(`${'='.repeat(70)}`)
    
    const result = await checkTaskStatus(task.taskId, task.model)
    
    console.log(`状态: ${result.status}`)
    
    if (result.status === 'completed' && result.videoUrl) {
      console.log(`✅ 视频已生成完成!`)
      console.log(`视频URL: ${result.videoUrl}`)
      console.log(`\n💡 查看视频:`)
      console.log(`   1. 直接在浏览器打开: ${result.videoUrl}`)
      console.log(`   2. 或下载视频文件`)
    } else if (result.status === 'processing' || result.status === 'pending') {
      console.log(`⏳ 视频生成中，请稍候...`)
      if (result.progress) {
        console.log(`进度: ${result.progress}%`)
      }
    } else if (result.status === 'failed') {
      console.log(`❌ 视频生成失败`)
      if (result.errorMessage) {
        console.log(`错误: ${result.errorMessage}`)
      }
    } else if (result.error) {
      console.log(`❌ 查询失败: ${result.error}`)
    }
    
    // 延迟500ms
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  console.log(`\n${'='.repeat(70)}`)
  console.log('📝 说明:')
  console.log('   - 如果视频还在生成中，请稍等几分钟后再次运行此脚本查询')
  console.log('   - 视频生成完成后，会保存到COS存储，URL会显示在上面')
  console.log('   - 视频也会自动保存到项目的videos文件夹中')
  console.log(`${'='.repeat(70)}\n`)
}

main().catch(error => {
  console.error('查询失败:', error)
  process.exit(1)
})


