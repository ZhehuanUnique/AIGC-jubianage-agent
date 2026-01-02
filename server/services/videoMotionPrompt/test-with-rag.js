/**
 * 测试视频运动提示词生成功能（结合 RAG 库）
 * 
 * 完整流程：
 * 1. 存储整个剧本文档到 RAG 库
 * 2. 使用视觉模型分析图片
 * 3. 从 RAG 库检索相关剧本片段
 * 4. 结合图片分析和 RAG 上下文生成提示词
 * 
 * 使用方法：
 * node server/services/videoMotionPrompt/test-with-rag.js
 */

import { generateVideoMotionPrompt } from './videoMotionPromptGenerator.js'
import { ragService } from './ragService.js'
import { ollamaService } from './ollamaService.js'
import { config } from './config.js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'

// 确保加载正确的 .env 文件
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const envPath = join(__dirname, '../../../.env')
if (existsSync(envPath)) {
  dotenv.config({ path: envPath })
  console.log('📋 已加载 .env 文件:', envPath)
}

// 示例剧本数据（完整的剧本文档）
const sampleScript = {
  scriptId: 'test_script_001',
  segments: [
    {
      shotNumber: 1,
      content: '男主角站在画面中央，周围有多个女性围绕着他。他缓缓转身，目光扫过每一个人。',
      prompt: '景别：中景。主体: 男主角站在中央，周围有女性。动作：缓缓转身，目光扫视。',
    },
    {
      shotNumber: 2,
      content: '女主角从远处走来，步伐优雅，长发在微风中飘动。她停在男主角面前，两人对视。',
      prompt: '景别：全景。主体: 女主角从远处走来。动作：优雅行走，长发飘动，停在男主角面前。',
    },
    {
      shotNumber: 3,
      content: '男主角伸出手，女主角犹豫片刻后握住。两人手牵手走向远方，背影渐行渐远。',
      prompt: '景别：中景转全景。主体: 男女主角。动作：伸手、握手、牵手走向远方。',
    },
    {
      shotNumber: 4,
      content: '镜头拉近，聚焦在两人紧握的手上，然后慢慢上移，展现两人深情的对视。',
      prompt: '景别：特写。主体: 紧握的手。动作：镜头拉近，聚焦手部，然后上移。',
    },
    {
      shotNumber: 5,
      content: '夕阳西下，两人坐在海边，海浪轻拍岸边。男主角轻抚女主角的脸颊，女主角闭上眼睛。',
      prompt: '景别：中景。主体: 男女主角在海边。动作：轻抚脸颊，闭眼。环境：夕阳、海浪。',
    },
  ],
}

async function testWithRAG() {
  console.log('🧪 开始测试视频运动提示词生成（结合 RAG 库）\n')

  try {
    // 步骤 1: 检查 Ollama 服务
    console.log('1️⃣ 检查 Ollama 服务状态...')
    const isHealthy = await ollamaService.checkHealth()
    if (!isHealthy) {
      console.error('❌ Ollama 服务不可用，请确保 Ollama 已启动')
      return
    }
    console.log('✅ Ollama 服务正常')
    console.log(`   模型: ${config.ollama.model}`)
    console.log(`   是否支持视觉: ${ollamaService.isVisionModel() ? '是 ✅' : '否'}`)
    console.log(`   RAG 启用: ${config.rag.enabled ? '是 ✅' : '否'}\n`)

    // 步骤 2: 存储剧本到 RAG 库
    console.log('2️⃣ 存储剧本文档到 RAG 库...')
    const storeResult = await ragService.storeScriptSegments(
      sampleScript.scriptId,
      sampleScript.segments
    )
    
    if (!storeResult) {
      console.error('❌ 存储剧本失败')
      return
    }
    console.log(`✅ 已存储 ${sampleScript.segments.length} 个剧本片段到 RAG 库\n`)

    // 步骤 3: 测试生成视频运动提示词（结合 RAG）
    console.log('3️⃣ 测试生成视频运动提示词（结合图片分析和 RAG）...\n')

    const testCases = [
      {
        name: '测试 1: 分镜 1 - 男主角转身场景',
        params: {
          imageUrl: 'https://example.com/image1.jpg',
          scriptContext: sampleScript.segments[0].content,
          shotNumber: 1,
          scriptId: sampleScript.scriptId,
          characterInfo: '男主角：年轻英俊，气质优雅',
          sceneInfo: '室内场景，灯光柔和',
        },
      },
      {
        name: '测试 2: 分镜 2 - 女主角走来场景',
        params: {
          imageUrl: 'https://example.com/image2.jpg',
          scriptContext: sampleScript.segments[1].content,
          shotNumber: 2,
          scriptId: sampleScript.scriptId,
          characterInfo: '女主角：优雅美丽，长发飘逸',
          sceneInfo: '室外场景，微风',
        },
      },
      {
        name: '测试 3: 分镜 5 - 海边场景',
        params: {
          imageUrl: 'https://example.com/image5.jpg',
          scriptContext: sampleScript.segments[4].content,
          shotNumber: 5,
          scriptId: sampleScript.scriptId,
          characterInfo: '男女主角：深情对视',
          sceneInfo: '海边，夕阳西下，海浪轻拍',
        },
      },
    ]

    for (const testCase of testCases) {
      console.log(`\n📝 ${testCase.name}`)
      console.log(`   剧本上下文: ${testCase.params.scriptContext}`)
      console.log(`   图片URL: ${testCase.params.imageUrl}`)
      console.log(`   分镜编号: ${testCase.params.shotNumber}`)
      
      const startTime = Date.now()
      const result = await generateVideoMotionPrompt(testCase.params)
      const duration = Date.now() - startTime

      console.log(`\n✅ 生成完成（耗时: ${duration}ms）`)
      console.log(`   提示词: ${result.motionPrompt}`)
      console.log(`   置信度: ${(result.confidence * 100).toFixed(1)}%`)
      console.log(`   使用模型: ${result.model || config.ollama.model}`)
      
      if (result.error) {
        console.log(`   ⚠️  错误: ${result.error}`)
      }
    }

    console.log('\n\n🎉 测试完成！')
    console.log('\n💡 说明：')
    console.log('   - 系统会从 RAG 库检索相关剧本片段（相似度 >= 0.6）')
    console.log('   - 获取当前分镜前后的上下文（窗口大小：2）')
    console.log('   - 结合图片分析（如果使用视觉模型）和 RAG 上下文生成提示词')
    console.log('   - 生成的提示词包含动作描述和运镜方式')

  } catch (error) {
    console.error('❌ 测试失败:', error.message)
    console.error(error.stack)
  }
}

// 运行测试
testWithRAG()

