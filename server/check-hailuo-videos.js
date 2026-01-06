/**
 * 查询之前测试生成的海螺视频任务状态
 */

import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'
import { getHailuoTaskStatus } from './services/hailuoService.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const envPath = join(__dirname, '../.env')
if (existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

// 之前测试生成的任务ID
const tasks = [
  { taskId: '352368266310021', model: 'MiniMax Hailuo-02' },
  { taskId: '352368154079627', model: 'MiniMax Hailuo-2.3' },
]

async function main() {
  console.log('🔍 查询海螺视频生成状态...\n')
  
  for (const task of tasks) {
    console.log(`\n${'='.repeat(70)}`)
    console.log(`${task.model}`)
    console.log(`任务ID: ${task.taskId}`)
    console.log(`${'='.repeat(70)}`)
    
    try {
      const result = await getHailuoTaskStatus(task.taskId)
      
      console.log(`状态: ${result.status}`)
      
      if (result.status === 'completed' && result.videoUrl) {
        console.log(`✅ 视频已生成完成!`)
        console.log(`视频URL: ${result.videoUrl}`)
        console.log(`\n💡 查看视频:`)
        console.log(`   直接在浏览器打开: ${result.videoUrl}`)
      } else if (result.status === 'processing') {
        console.log(`⏳ 视频生成中，请稍候...`)
        if (result.progress) {
          console.log(`进度: ${result.progress}%`)
        }
        if (result.message) {
          console.log(`消息: ${result.message}`)
        }
      } else if (result.status === 'failed') {
        console.log(`❌ 视频生成失败`)
        if (result.message) {
          console.log(`错误: ${result.message}`)
        }
      }
    } catch (error) {
      console.log(`❌ 查询失败: ${error.message}`)
    }
    
    // 延迟500ms
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  console.log(`\n${'='.repeat(70)}\n`)
}

main().catch(error => {
  console.error('查询失败:', error)
  process.exit(1)
})


