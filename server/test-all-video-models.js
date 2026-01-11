/**
 * 测试所有图生视频模型
 * 使用桌面的"杨齐.png"图片和提示词"人物跳起来"
 */

import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync, readFileSync } from 'fs'
import { generateVideoFromImage } from './services/imageToVideoService.js'
import { uploadBuffer, generateKey as generateCosKey } from './services/storageService.js'

// 加载.env文件
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const envPath = join(__dirname, '../.env')
if (existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

// 所有要测试的模型
const MODELS_TO_TEST = [
  { name: 'veo3.1', label: 'Veo3.1', requiredEnv: ['VEO3_API_KEY'] },
  { name: 'veo3.1-pro', label: 'Veo3.1 Pro', requiredEnv: ['VEO3_PRO_API_KEY'] },
  { name: 'viduq2-turbo', label: 'Vidu Q2 Turbo', requiredEnv: ['VIDU_V2_API_KEY'] },
  { name: 'viduq2-pro', label: 'Vidu Q2 Pro', requiredEnv: ['VIDU_V2_API_KEY'] },
  { name: 'volcengine-video-3.0-pro', label: '即梦-3.0Pro', requiredEnv: ['VOLCENGINE_AK', 'VOLCENGINE_SK'] },
  { name: 'doubao-seedance-1-5-pro-251215', label: '即梦-3.5Pro', requiredEnv: ['DOUBAO_SEEDANCE_API_KEY'] },
  { name: 'minimax-hailuo-02', label: 'MiniMax Hailuo-02', requiredEnv: ['HAILUO_02_API_KEY'] },
  { name: 'minimax-hailuo-2.3', label: 'MiniMax Hailuo-2.3', requiredEnv: ['HAILUO_23_API_KEY'] },
  { name: 'minimax-hailuo-2.3-fast', label: 'MiniMax Hailuo-2.3-fast', requiredEnv: ['HAILUO_23_API_KEY'] },
  { name: 'kling-2.6', label: 'Kling-2.6', requiredEnv: ['KLING_26_API_KEY'] },
  { name: 'kling-o1', label: 'Kling-O1', requiredEnv: ['KLING_O1_API_KEY'] },
]

// 测试结果
const results = {
  available: [],      // 可用（API调用成功）
  missing_config: [], // 配置缺失（缺少API Key）
  error: [],          // 调用失败（有配置但调用失败）
}

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

// 读取图片文件并转换为base64
async function loadImageFile() {
  const desktopPath = join(process.env.USERPROFILE || process.env.HOME || '', 'Desktop', '杨齐.png')
  
  if (!existsSync(desktopPath)) {
    throw new Error(`找不到图片文件: ${desktopPath}`)
  }
  
  const imageBuffer = readFileSync(desktopPath)
  const imageBase64 = imageBuffer.toString('base64')
  const imageDataUrl = `data:image/png;base64,${imageBase64}`
  
  console.log(`✅ 已加载图片: ${desktopPath}`)
  console.log(`   图片大小: ${(imageBuffer.length / 1024).toFixed(2)} KB\n`)
  
  return imageDataUrl
}

// 测试单个模型
async function testModel(modelConfig, imageUrl) {
  const { name, label, requiredEnv } = modelConfig
  
  console.log(`\n${'='.repeat(70)}`)
  console.log(`测试模型: ${label} (${name})`)
  console.log(`${'='.repeat(70)}`)
  
  // 1. 检查环境变量
  const envCheck = checkEnvVars(requiredEnv)
  console.log(`📋 环境变量检查:`)
  if (envCheck.present.length > 0) {
    console.log(`   ✅ 已配置: ${envCheck.present.join(', ')}`)
  }
  if (envCheck.missing.length > 0) {
    console.log(`   ❌ 缺失: ${envCheck.missing.join(', ')}`)
    results.missing_config.push({
      model: name,
      label,
      missing: envCheck.missing,
    })
    return
  }
  
  // 2. 尝试调用API
  try {
    console.log(`\n🧪 测试API调用...`)
    console.log(`   提示词: "人物跳起来"`)
    console.log(`   分辨率: 720p`)
    console.log(`   时长: 5秒`)
    
    const result = await generateVideoFromImage(imageUrl, {
      model: name,
      resolution: '720p',
      duration: 5,
      text: '人物跳起来',
    })
    
    if (result && result.taskId) {
      console.log(`   ✅ API调用成功!`)
      console.log(`   任务ID: ${result.taskId}`)
      console.log(`   状态: ${result.status || 'pending'}`)
      
      results.available.push({
        model: name,
        label,
        taskId: result.taskId,
        status: result.status,
      })
    } else {
      console.log(`   ⚠️  API调用返回异常:`)
      console.log(`   ${JSON.stringify(result, null, 2)}`)
      
      results.error.push({
        model: name,
        label,
        error: 'API调用返回异常',
        result,
      })
    }
  } catch (error) {
    console.log(`   ❌ API调用失败:`)
    console.log(`   ${error.message}`)
    if (error.stack) {
      console.log(`   堆栈: ${error.stack.split('\n').slice(0, 3).join('\n')}`)
    }
    
    results.error.push({
      model: name,
      label,
      error: error.message,
      errorType: error.constructor.name,
    })
  }
}

// 主函数
async function main() {
  console.log('🚀 开始测试所有图生视频模型...\n')
  console.log('📝 测试参数:')
  console.log('   - 图片: 桌面/杨齐.png')
  console.log('   - 提示词: "人物跳起来"')
  console.log('   - 分辨率: 720p')
  console.log('   - 时长: 5秒\n')
  
  // 加载图片
  let imageUrl
  try {
    imageUrl = await loadImageFile()
  } catch (error) {
    console.error(`❌ 加载图片失败: ${error.message}`)
    console.error(`\n请确保桌面上有"杨齐.png"文件`)
    process.exit(1)
  }
  
  // 测试所有模型
  for (const model of MODELS_TO_TEST) {
    await testModel(model, imageUrl)
    
    // 延迟1秒，避免API限流
    if (model !== MODELS_TO_TEST[MODELS_TO_TEST.length - 1]) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
  
  // 输出总结
  console.log(`\n${'='.repeat(70)}`)
  console.log('📊 测试总结')
  console.log(`${'='.repeat(70)}`)
  
  console.log(`\n✅ 可用模型 (${results.available.length}):`)
  if (results.available.length > 0) {
    results.available.forEach(r => {
      console.log(`   ✓ ${r.label} (${r.model})`)
      console.log(`     任务ID: ${r.taskId}`)
    })
  } else {
    console.log(`   无`)
  }
  
  console.log(`\n❌ 配置缺失 (${results.missing_config.length}):`)
  if (results.missing_config.length > 0) {
    results.missing_config.forEach(r => {
      console.log(`   ✗ ${r.label} (${r.model})`)
      console.log(`     缺失环境变量: ${r.missing.join(', ')}`)
    })
  } else {
    console.log(`   无`)
  }
  
  console.log(`\n⚠️  调用失败 (${results.error.length}):`)
  if (results.error.length > 0) {
    results.error.forEach(r => {
      console.log(`   ⚠ ${r.label} (${r.model})`)
      console.log(`     错误: ${r.error}`)
      if (r.errorType) {
        console.log(`     错误类型: ${r.errorType}`)
      }
    })
  } else {
    console.log(`   无`)
  }
  
  console.log(`\n${'='.repeat(70)}`)
  console.log(`总计: ${MODELS_TO_TEST.length} 个模型`)
  console.log(`✅ 可用: ${results.available.length} 个`)
  console.log(`❌ 配置缺失: ${results.missing_config.length} 个`)
  console.log(`⚠️  调用失败: ${results.error.length} 个`)
  console.log(`${'='.repeat(70)}\n`)
  
  // 详细建议
  if (results.missing_config.length > 0) {
    console.log('💡 配置建议:')
    console.log('   请在 .env 文件中添加以下环境变量:\n')
    const envVarsNeeded = new Set()
    results.missing_config.forEach(r => {
      r.missing.forEach(env => envVarsNeeded.add(env))
    })
    envVarsNeeded.forEach(env => {
      console.log(`   ${env}=你的API密钥`)
    })
    console.log('')
  }
}

// 运行测试
main().catch(error => {
  console.error('\n❌ 测试过程出错:', error)
  console.error(error.stack)
  process.exit(1)
})


