/**
 * 测试视频运动提示词生成功能
 * 
 * 使用方法：
 * node test-video-motion-prompt.js
 */

import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'

// 加载 .env 文件
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const envPath = join(__dirname, '.env')
if (existsSync(envPath)) {
  dotenv.config({ path: envPath })
  console.log('✅ .env 文件已加载')
} else {
  console.warn('⚠️  .env 文件不存在')
}

import { generateVideoMotionPrompt } from './services/videoMotionPrompt/videoMotionPromptGenerator.js'

async function testVideoMotionPrompt() {
  console.log('\n🧪 开始测试视频运动提示词生成功能...\n')

  // 测试用例 1: 基本测试
  console.log('📝 测试用例 1: 基本测试')
  console.log('─'.repeat(50))
  try {
    const result1 = await generateVideoMotionPrompt({
      imageUrl: 'https://example.com/test-image.jpg',
      scriptContext: '男主角站在画面中央，周围有多个女性围绕着他。他缓缓转身，目光扫过每一个人。',
      shotNumber: 1,
      scriptId: 'test_script_001',
    })

    console.log('✅ 生成成功！')
    console.log('📊 结果:')
    console.log('  运动提示词:', result1.motionPrompt)
    console.log('  置信度:', result1.confidence)
    console.log('  使用模型:', result1.model)
    if (result1.error) {
      console.log('  ⚠️  错误:', result1.error)
    }
    console.log()
  } catch (error) {
    console.error('❌ 测试失败:', error.message)
    console.error('   详细错误:', error)
    console.log()
  }

  // 测试用例 2: 包含角色和场景信息
  console.log('📝 测试用例 2: 包含角色和场景信息')
  console.log('─'.repeat(50))
  try {
    const result2 = await generateVideoMotionPrompt({
      imageUrl: 'https://example.com/test-image-2.jpg',
      scriptContext: '女主角在雨中奔跑，雨水打湿了她的衣服和头发。',
      shotNumber: 2,
      scriptId: 'test_script_001',
      characterInfo: '女主角：年轻女性，长发，穿着白色连衣裙',
      sceneInfo: '场景：城市街道，雨天，夜晚',
    })

    console.log('✅ 生成成功！')
    console.log('📊 结果:')
    console.log('  运动提示词:', result2.motionPrompt)
    console.log('  置信度:', result2.confidence)
    console.log('  使用模型:', result2.model)
    if (result2.error) {
      console.log('  ⚠️  错误:', result2.error)
    }
    console.log()
  } catch (error) {
    console.error('❌ 测试失败:', error.message)
    console.error('   详细错误:', error)
    console.log()
  }

  // 测试用例 3: 动作场景
  console.log('📝 测试用例 3: 动作场景')
  console.log('─'.repeat(50))
  try {
    const result3 = await generateVideoMotionPrompt({
      imageUrl: 'https://example.com/action-scene.jpg',
      scriptContext: '两个角色在激烈的打斗中，拳脚相加，动作迅速。',
      shotNumber: 3,
      scriptId: 'test_script_001',
    })

    console.log('✅ 生成成功！')
    console.log('📊 结果:')
    console.log('  运动提示词:', result3.motionPrompt)
    console.log('  置信度:', result3.confidence)
    console.log('  使用模型:', result3.model)
    if (result3.error) {
      console.log('  ⚠️  错误:', result3.error)
    }
    console.log()
  } catch (error) {
    console.error('❌ 测试失败:', error.message)
    console.error('   详细错误:', error)
    console.log()
  }

  // 测试用例 4: 静态场景
  console.log('📝 测试用例 4: 静态场景')
  console.log('─'.repeat(50))
  try {
    const result4 = await generateVideoMotionPrompt({
      imageUrl: 'https://example.com/static-scene.jpg',
      scriptContext: '角色静静地坐在窗边，看着窗外的风景，表情沉思。',
      shotNumber: 4,
      scriptId: 'test_script_001',
    })

    console.log('✅ 生成成功！')
    console.log('📊 结果:')
    console.log('  运动提示词:', result4.motionPrompt)
    console.log('  置信度:', result4.confidence)
    console.log('  使用模型:', result4.model)
    if (result4.error) {
      console.log('  ⚠️  错误:', result4.error)
    }
    console.log()
  } catch (error) {
    console.error('❌ 测试失败:', error.message)
    console.error('   详细错误:', error)
    console.log()
  }

  console.log('🎉 测试完成！\n')
}

// 运行测试
testVideoMotionPrompt().catch(error => {
  console.error('❌ 测试执行失败:', error)
  process.exit(1)
})

