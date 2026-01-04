/**
 * 测试图生视频模型可用性
 * 检查哪些模型已配置API Key并可以正常调用
 */

import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'

// 加载.env文件
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const envPath = join(__dirname, '../.env')
if (existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

// 测试图片URL（使用一个公开的测试图片）
const TEST_IMAGE_URL = 'https://picsum.photos/512/512'

// 所有图生视频模型配置
const MODELS = [
  {
    name: 'volcengine-video-3.0-pro',
    label: '即梦AI-视频生成3.0 Pro',
    requiredEnv: ['VOLCENGINE_AK', 'VOLCENGINE_SK'],
    service: 'volcengine',
  },
  {
    name: 'doubao-seedance-1-5-pro-251215',
    label: '豆包Seedance 1.5 Pro',
    requiredEnv: ['DOUBAO_SEEDANCE_API_KEY'],
    service: 'seedance',
  },
  {
    name: 'minimax-hailuo-02',
    label: 'MiniMax Hailuo 02',
    requiredEnv: ['HAILUO_02_API_KEY'],
    service: 'hailuo',
  },
  {
    name: 'minimax-hailuo-2.3',
    label: 'MiniMax Hailuo 2.3',
    requiredEnv: ['HAILUO_23_API_KEY'],
    service: 'hailuo',
  },
  {
    name: 'minimax-hailuo-2.3-fast',
    label: 'MiniMax Hailuo 2.3 Fast',
    requiredEnv: ['HAILUO_23_API_KEY'],
    service: 'hailuo',
  },
  {
    name: 'veo3.1',
    label: 'Google Veo3.1',
    requiredEnv: ['VEO3_API_KEY'],
    service: 'veo3',
  },
  {
    name: 'veo3.1-pro',
    label: 'Google Veo3.1 Pro',
    requiredEnv: ['VEO3_PRO_API_KEY'],
    service: 'veo3',
  },
  {
    name: 'viduq2-turbo',
    label: 'Vidu Q2 Turbo',
    requiredEnv: ['VIDU_V2_API_KEY'],
    service: 'vidu',
  },
  {
    name: 'viduq2-pro',
    label: 'Vidu Q2 Pro',
    requiredEnv: ['VIDU_V2_API_KEY'],
    service: 'vidu',
  },
  {
    name: 'viduq1',
    label: 'Vidu Q1',
    requiredEnv: ['VIDU_V2_API_KEY'],
    service: 'vidu',
  },
  {
    name: 'vidu2.0',
    label: 'Vidu 2.0',
    requiredEnv: ['VIDU_V2_API_KEY'],
    service: 'vidu',
  },
  {
    name: 'vidu1.5',
    label: 'Vidu 1.5',
    requiredEnv: ['VIDU_V2_API_KEY'],
    service: 'vidu',
  },
  {
    name: 'vidu1.0',
    label: 'Vidu 1.0',
    requiredEnv: ['VIDU_V2_API_KEY'],
    service: 'vidu',
  },
  {
    name: 'kling-2.6',
    label: 'Kling 2.6',
    requiredEnv: ['KLING_API_KEY'],
    service: 'kling',
  },
  {
    name: 'kling-o1',
    label: 'Kling O1',
    requiredEnv: ['KLING_API_KEY'],
    service: 'kling',
  },
]

// 检查环境变量
function checkEnvVars(requiredEnv) {
  const missing = []
  const present = []
  
  for (const envVar of requiredEnv) {
    if (process.env[envVar]) {
      present.push(envVar)
    } else {
      missing.push(envVar)
    }
  }
  
  return { missing, present, allPresent: missing.length === 0 }
}

// 测试模型
async function testModel(modelConfig) {
  const { name, label, requiredEnv, service } = modelConfig
  
  console.log(`\n${'='.repeat(60)}`)
  console.log(`测试模型: ${label} (${name})`)
  console.log(`${'='.repeat(60)}`)
  
  // 1. 检查环境变量
  const envCheck = checkEnvVars(requiredEnv)
  console.log(`\n📋 环境变量检查:`)
  if (envCheck.present.length > 0) {
    console.log(`  ✅ 已配置: ${envCheck.present.join(', ')}`)
  }
  if (envCheck.missing.length > 0) {
    console.log(`  ❌ 缺失: ${envCheck.missing.join(', ')}`)
    return {
      model: name,
      label,
      status: 'missing_config',
      message: `缺少环境变量: ${envCheck.missing.join(', ')}`,
    }
  }
  
  // 2. 尝试调用API（只测试能否创建任务，不等待完成）
  try {
    console.log(`\n🧪 测试API调用...`)
    const { generateVideoFromImage } = await import('./services/imageToVideoService.js')
    
    const result = await generateVideoFromImage(TEST_IMAGE_URL, {
      model: name,
      resolution: '720p',
      duration: 5,
      text: '测试视频生成',
    })
    
    if (result && result.taskId) {
      console.log(`  ✅ API调用成功! 任务ID: ${result.taskId}`)
      return {
        model: name,
        label,
        status: 'available',
        message: 'API调用成功',
        taskId: result.taskId,
      }
    } else {
      console.log(`  ⚠️  API调用返回异常:`, result)
      return {
        model: name,
        label,
        status: 'error',
        message: 'API调用返回异常',
        result,
      }
    }
  } catch (error) {
    console.log(`  ❌ API调用失败:`, error.message)
    return {
      model: name,
      label,
      status: 'error',
      message: error.message,
      error: error.toString(),
    }
  }
}

// 主函数
async function main() {
  console.log('🚀 开始测试图生视频模型可用性...\n')
  console.log(`测试图片URL: ${TEST_IMAGE_URL}\n`)
  
  const results = {
    available: [],
    missing_config: [],
    error: [],
  }
  
  // 测试所有模型
  for (const model of MODELS) {
    const result = await testModel(model)
    
    if (result.status === 'available') {
      results.available.push(result)
    } else if (result.status === 'missing_config') {
      results.missing_config.push(result)
    } else {
      results.error.push(result)
    }
    
    // 稍微延迟，避免API限流
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  // 输出总结
  console.log(`\n${'='.repeat(60)}`)
  console.log('📊 测试总结')
  console.log(`${'='.repeat(60)}`)
  
  console.log(`\n✅ 可用模型 (${results.available.length}):`)
  if (results.available.length > 0) {
    results.available.forEach(r => {
      console.log(`  - ${r.label} (${r.model})`)
    })
  } else {
    console.log(`  无`)
  }
  
  console.log(`\n❌ 配置缺失 (${results.missing_config.length}):`)
  if (results.missing_config.length > 0) {
    results.missing_config.forEach(r => {
      console.log(`  - ${r.label} (${r.model}): ${r.message}`)
    })
  } else {
    console.log(`  无`)
  }
  
  console.log(`\n⚠️  调用失败 (${results.error.length}):`)
  if (results.error.length > 0) {
    results.error.forEach(r => {
      console.log(`  - ${r.label} (${r.model}): ${r.message}`)
    })
  } else {
    console.log(`  无`)
  }
  
  console.log(`\n${'='.repeat(60)}`)
  console.log(`总计: ${MODELS.length} 个模型`)
  console.log(`可用: ${results.available.length} 个`)
  console.log(`配置缺失: ${results.missing_config.length} 个`)
  console.log(`调用失败: ${results.error.length} 个`)
  console.log(`${'='.repeat(60)}\n`)
}

// 运行测试
main().catch(error => {
  console.error('测试过程出错:', error)
  process.exit(1)
})

