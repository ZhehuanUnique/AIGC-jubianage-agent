/**
 * 视频运动提示词生成功能测试脚本
 * 
 * 使用方法：
 * 1. 确保后端服务已启动（npm start）
 * 2. 确保 Ollama 服务运行中
 * 3. 运行: node server/services/videoMotionPrompt/test.js
 */

import { generateVideoMotionPrompt } from './videoMotionPromptGenerator.js'
import { ollamaService } from './ollamaService.js'
import { config } from './config.js'

async function testVideoMotionPrompt() {
  console.log('🧪 开始测试视频运动提示词生成功能...\n')

  // 测试参数
  const testParams = {
    imageUrl: 'https://example.com/test-image.jpg', // 替换为实际的图片URL
    scriptContext: '男主角站在画面中央，周围有多个女性围绕着他。他缓缓转身，目光扫过每一个人。',
    shotNumber: 1,
    scriptId: 'test_script_001',
    characterInfo: '男主角：年轻英俊，气质优雅',
    sceneInfo: '室内场景，灯光柔和',
  }

  try {
    // 1. 检查 Ollama 服务
    console.log('1️⃣ 检查 Ollama 服务状态...')
    const isHealthy = await ollamaService.checkHealth()
    if (!isHealthy) {
      console.error('❌ Ollama 服务不可用，请确保 Ollama 已启动')
      return
    }
    console.log('✅ Ollama 服务正常\n')

    // 2. 检查模型信息
    console.log('2️⃣ 检查模型配置...')
    console.log(`   模型: ${config.ollama.model}`)
    console.log(`   是否支持视觉: ${ollamaService.isVisionModel() ? '是' : '否'}`)
    console.log(`   RAG 启用: ${config.rag.enabled ? '是' : '否'}\n`)

    // 3. 测试生成视频运动提示词
    console.log('3️⃣ 测试生成视频运动提示词...')
    console.log(`   图片URL: ${testParams.imageUrl}`)
    console.log(`   剧本上下文: ${testParams.scriptContext}\n`)

    const startTime = Date.now()
    const result = await generateVideoMotionPrompt(testParams)
    const duration = Date.now() - startTime

    console.log('✅ 生成完成！\n')
    console.log('📊 结果:')
    console.log(`   提示词: ${result.motionPrompt}`)
    console.log(`   置信度: ${(result.confidence * 100).toFixed(1)}%`)
    console.log(`   使用模型: ${result.model || config.ollama.model}`)
    console.log(`   耗时: ${duration}ms`)
    if (result.error) {
      console.log(`   ⚠️  错误: ${result.error}`)
    }
    console.log('')

  } catch (error) {
    console.error('❌ 测试失败:', error.message)
    console.error(error.stack)
  }
}

// 运行测试
testVideoMotionPrompt()

