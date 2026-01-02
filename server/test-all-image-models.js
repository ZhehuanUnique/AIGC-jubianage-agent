/**
 * 测试所有生图模型
 * 使用最简单的提示词"生成一个水杯"，最低分辨率（1K）测试所有模型
 */

import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// 加载环境变量
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '.env') })

// 导入所有生图服务
import { generateImageWithNanoBanana } from './services/nanoBananaService.js'
import { generateImageWithMidjourney } from './services/midjourneyService.js'
import { generateImageWithFlux } from './services/fluxService.js'
import { generateImageWithSeedream } from './services/seedreamService.js'

// 所有要测试的模型
const MODELS_TO_TEST = [
  { id: 'nano-banana-pro', name: 'Nano Banana Pro', handler: 'nano-banana' },
  { id: 'midjourney-v7-t2i', name: 'Midjourney v7', handler: 'midjourney' },
  { id: 'flux-2-max', name: 'Flux-2-Max', handler: 'flux' },
  { id: 'flux-2-flex', name: 'Flux-2-Flex', handler: 'flux' },
  { id: 'flux-2-pro', name: 'Flux-2-Pro', handler: 'flux' },
  { id: 'seedream-4-5', name: 'Seedream 4.5', handler: 'seedream' },
  { id: 'seedream-4-0', name: 'Seedream 4.0', handler: 'seedream' },
]

// 测试提示词
const TEST_PROMPT = '生成一个水杯'

// 测试结果
const results = []

/**
 * 测试单个模型
 */
async function testModel(model) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`🧪 测试模型: ${model.name} (${model.id})`)
  console.log(`${'='.repeat(60)}`)

  const startTime = Date.now()
  let result = {
    model: model.name,
    modelId: model.id,
    success: false,
    error: null,
    duration: 0,
    taskId: null,
    imageUrl: null,
  }

  try {
    let apiResult

    switch (model.handler) {
      case 'nano-banana':
        console.log('📤 调用 Nano Banana Pro API...')
        apiResult = await generateImageWithNanoBanana(TEST_PROMPT, {
          aspectRatio: 'auto',
          size: '1K', // 最低分辨率
        })
        break

      case 'midjourney':
        console.log('📤 调用 Midjourney API...')
        apiResult = await generateImageWithMidjourney(TEST_PROMPT, {
          botType: 'MID_JOURNEY',
          aspectRatio: 'auto',
          resolution: '1K',
        })
        break

      case 'flux':
        console.log('📤 调用 Flux API...')
        apiResult = await generateImageWithFlux(TEST_PROMPT, {
          model: model.id,
          aspectRatio: 'auto',
          resolution: '1K', // 最低分辨率
        })
        break

      case 'seedream':
        console.log('📤 调用 Seedream API...')
        apiResult = await generateImageWithSeedream(TEST_PROMPT, {
          model: model.id,
          aspectRatio: 'auto',
          resolution: '1K', // 最低分辨率
        })
        break

      default:
        throw new Error(`未知的模型处理器: ${model.handler}`)
    }

    const duration = Date.now() - startTime
    result.duration = duration

    console.log('✅ API 调用成功')
    console.log('📋 响应数据:', JSON.stringify(apiResult, null, 2))

    // 检查返回结果
    if (apiResult.taskId) {
      result.taskId = apiResult.taskId
      result.success = true
      console.log(`✅ 任务已提交，任务ID: ${apiResult.taskId}`)
      console.log(`⏱️  耗时: ${duration}ms`)
    } else if (apiResult.imageUrl || apiResult.url) {
      result.imageUrl = apiResult.imageUrl || apiResult.url
      result.success = true
      console.log(`✅ 图片生成成功，URL: ${result.imageUrl}`)
      console.log(`⏱️  耗时: ${duration}ms`)
    } else {
      result.success = true
      console.log(`✅ API 调用成功（异步任务）`)
      console.log(`⏱️  耗时: ${duration}ms`)
    }
  } catch (error) {
    const duration = Date.now() - startTime
    result.duration = duration
    result.error = error.message
    console.error(`❌ 测试失败:`, error.message)
    console.error('错误详情:', error)
  }

  results.push(result)
  return result
}

/**
 * 主函数
 */
async function main() {
  console.log('\n🚀 开始测试所有生图模型')
  console.log(`📝 测试提示词: "${TEST_PROMPT}"`)
  console.log(`📐 分辨率: 1K (最低)`)

  // 检查环境变量
  console.log('\n🔍 检查环境变量配置...')
  const envCheck = {
    'NANO_BANANA_API_KEY': process.env.NANO_BANANA_API_KEY ? '✅' : '❌',
    'MIDJOURNEY_API_KEY': process.env.MIDJOURNEY_API_KEY ? '✅' : '❌',
    'FLUX_2_MAX_API_KEY': process.env.FLUX_2_MAX_API_KEY ? '✅' : '❌',
    'FLUX_2_FLEX_API_KEY': process.env.FLUX_2_FLEX_API_KEY ? '✅' : '❌',
    'FLUX_2_PRO_API_KEY': process.env.FLUX_2_PRO_API_KEY ? '✅' : '❌',
    'SEEDREAM_4_5_API_KEY': process.env.SEEDREAM_4_5_API_KEY ? '✅' : '❌',
    'SEEDREAM_4_0_API_KEY': process.env.SEEDREAM_4_0_API_KEY ? '✅' : '❌',
  }
  console.table(envCheck)

  // 逐个测试模型
  for (const model of MODELS_TO_TEST) {
    await testModel(model)
    // 等待一小段时间，避免API限流
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  // 输出测试结果汇总
  console.log(`\n${'='.repeat(60)}`)
  console.log('📊 测试结果汇总')
  console.log(`${'='.repeat(60)}`)

  const successCount = results.filter(r => r.success).length
  const failCount = results.filter(r => !r.success).length

  console.log(`\n✅ 成功: ${successCount}/${results.length}`)
  console.log(`❌ 失败: ${failCount}/${results.length}`)

  console.log('\n📋 详细结果:')
  console.table(
    results.map(r => ({
      模型: r.model,
      状态: r.success ? '✅ 成功' : '❌ 失败',
      耗时: `${r.duration}ms`,
      任务ID: r.taskId || '-',
      图片URL: r.imageUrl ? (r.imageUrl.substring(0, 50) + '...') : '-',
      错误: r.error || '-',
    }))
  )

  // 输出可用的模型列表
  const workingModels = results.filter(r => r.success)
  if (workingModels.length > 0) {
    console.log('\n✅ 可正常工作的模型:')
    workingModels.forEach(r => {
      console.log(`  - ${r.model} (${r.modelId})`)
    })
  }

  // 输出失败的模型列表
  const failedModels = results.filter(r => !r.success)
  if (failedModels.length > 0) {
    console.log('\n❌ 无法正常工作的模型:')
    failedModels.forEach(r => {
      console.log(`  - ${r.model} (${r.modelId}): ${r.error}`)
    })
  }

  console.log('\n✨ 测试完成！\n')
}

// 运行测试
main().catch(error => {
  console.error('❌ 测试脚本执行失败:', error)
  process.exit(1)
})


