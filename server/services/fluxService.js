/**
 * Flux 系列文生图服务
 * Flux-2-Max: https://302ai.apifox.cn/393555388e0
 * Flux-2-Flex: https://doc.302.ai/383170361e0
 * Flux-2-Pro: https://doc.302.ai/383203029e0
 * 查询任务: https://302ai.apifox.cn/393555440e0 (所有模型共用)
 */

import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'

// 加载.env文件
// 注意：如果环境变量已经通过 server/index.js 加载，这里不会覆盖
// 但为了确保在独立使用时也能工作，这里也尝试加载
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootEnvPath = join(__dirname, '../../.env')
const serverEnvPath = join(__dirname, '../.env')

// 优先加载根目录的 .env，如果不存在则加载 server/.env
if (existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath, override: false }) // override: false 避免覆盖已存在的环境变量
  console.log('📋 fluxService: 已加载根目录 .env 文件:', rootEnvPath)
} else if (existsSync(serverEnvPath)) {
  dotenv.config({ path: serverEnvPath, override: false })
  console.log('📋 fluxService: 已加载 server/.env 文件:', serverEnvPath)
} else {
  console.warn('⚠️  fluxService: 未找到 .env 文件，尝试从默认位置加载')
  dotenv.config({ override: false })
}

// 调试：检查 FLUX API 密钥是否已加载
if (process.env.FLUX_2_MAX_API_KEY) {
  console.log('✅ fluxService: FLUX_2_MAX_API_KEY 已加载')
} else {
  console.warn('⚠️  fluxService: FLUX_2_MAX_API_KEY 未找到')
}

/**
 * 获取指定模型的 API Key
 * @param {string} model - 模型名称 (flux-2-max, flux-2-flex, flux-2-pro)
 * @returns {string} API Key
 */
function getApiKey(model) {
  // 动态获取环境变量，而不是在模块加载时创建 keyMap
  // 这样可以确保在 .env 文件加载后也能正确读取
  let apiKey
  switch (model) {
    case 'flux-2-max':
      apiKey = process.env.FLUX_2_MAX_API_KEY
      break
    case 'flux-2-flex':
      apiKey = process.env.FLUX_2_FLEX_API_KEY
      break
    case 'flux-2-pro':
      apiKey = process.env.FLUX_2_PRO_API_KEY
      break
    default:
      apiKey = null
  }
  
  if (!apiKey) {
    // 调试信息：显示当前环境变量的状态
    console.error('❌ FLUX API Key 未找到:', {
      model,
      FLUX_2_MAX_API_KEY: process.env.FLUX_2_MAX_API_KEY ? '已设置' : '未设置',
      FLUX_2_FLEX_API_KEY: process.env.FLUX_2_FLEX_API_KEY ? '已设置' : '未设置',
      FLUX_2_PRO_API_KEY: process.env.FLUX_2_PRO_API_KEY ? '已设置' : '未设置',
    })
    throw new Error(`${model.toUpperCase()}_API_KEY 环境变量未设置，请检查 .env 文件`)
  }
  
  return apiKey
}

/**
 * 获取 API Host
 * @returns {string} API Host
 */
function getApiHost() {
  return process.env.FLUX_API_HOST || 'https://api.302.ai'
}

/**
 * 获取模型对应的生成接口路径
 * @param {string} model - 模型名称
 * @returns {string} API 路径
 */
function getGenerateEndpoint(model) {
  const endpointMap = {
    'flux-2-max': '/flux/v1/flux-2-max',
    'flux-2-flex': '/flux/v1/flux-2-flex',
    'flux-2-pro': '/flux/v1/flux-2-pro',
  }
  
  const endpoint = endpointMap[model]
  if (!endpoint) {
    throw new Error(`不支持的 Flux 模型: ${model}`)
  }
  
  return endpoint
}

/**
 * 将宽高比转换为像素尺寸
 * @param {string} aspectRatio - 宽高比，如 '16:9', '9:16', '1:1'
 * @param {string} resolution - 分辨率，如 '2K', '4K'
 * @returns {Object} { width, height }
 */
function aspectRatioToSize(aspectRatio, resolution = '2K') {
  // 如果宽高比是 'auto'，默认使用 16:9
  if (aspectRatio === 'auto') {
    aspectRatio = '16:9'
  }
  
  // 根据分辨率确定基准尺寸
  let baseSize
  if (resolution === '4K') {
    baseSize = 3840 // 4K 宽度基准
  } else if (resolution === '2K') {
    baseSize = 2048 // 2K 宽度基准
  } else {
    baseSize = 1024 // 1K 宽度基准
  }
  
  // 解析宽高比
  const [widthRatio, heightRatio] = aspectRatio.split(':').map(Number)
  if (!widthRatio || !heightRatio || isNaN(widthRatio) || isNaN(heightRatio)) {
    // 如果解析失败，默认使用 16:9
    return aspectRatioToSize('16:9', resolution)
  }
  
  const ratio = widthRatio / heightRatio
  
  let width, height
  if (ratio >= 1) {
    // 横向或正方形
    width = baseSize
    height = Math.round(baseSize / ratio)
  } else {
    // 纵向
    height = baseSize
    width = Math.round(baseSize * ratio)
  }
  
  // 确保尺寸是64的倍数（Flux API要求）
  width = Math.round(width / 64) * 64
  height = Math.round(height / 64) * 64
  
  // 确保最小尺寸为64
  width = Math.max(width, 64)
  height = Math.max(height, 64)
  
  return { width, height }
}

/**
 * 使用 Flux 模型生成图片
 * @param {string} prompt - 文生图提示词
 * @param {Object} options - 生成选项
 * @param {string} options.model - 模型名称 (flux-2-max, flux-2-flex, flux-2-pro)
 * @param {string} options.aspectRatio - 宽高比，如 '16:9', '9:16', '1:1'
 * @param {string} options.resolution - 分辨率：2K 或 4K
 * @param {string} options.referenceImage - 参考图片URL或base64（用于图生图）
 * @param {Array<string>} options.referenceImages - 多张参考图片（最多8张）
 * @param {boolean} options.sync - 是否同步返回（默认false，异步返回）
 * @returns {Promise<Object>} 返回任务ID和状态
 */
export async function generateImageWithFlux(prompt, options = {}) {
  const {
    model = 'flux-2-max',
    aspectRatio = '16:9',
    resolution = '2K',
    referenceImage = null,
    referenceImages = [],
    sync = false,
  } = options

  const apiKey = getApiKey(model)
  const apiHost = getApiHost()
  const endpoint = getGenerateEndpoint(model)

  try {
    console.log(`🎨 调用 ${model.toUpperCase()} API:`, {
      prompt: prompt.substring(0, 50) + '...',
      aspectRatio,
      resolution,
      hasReferenceImage: !!referenceImage || referenceImages.length > 0,
      sync,
    })

    // 计算宽高
    const { width, height } = aspectRatioToSize(aspectRatio, resolution)

    // 构建请求体
    const requestBody = {
      prompt: prompt,
      width: width,
      height: height,
      sync: sync, // 是否同步返回
      safety_tolerance: 2, // 默认安全容忍度
      output_format: 'jpeg', // 输出格式
    }

    // 处理参考图片
    if (referenceImage) {
      // 单张参考图
      requestBody.input_image = referenceImage
    } else if (referenceImages && referenceImages.length > 0) {
      // 多张参考图（最多8张）
      const maxImages = Math.min(referenceImages.length, 8)
      for (let i = 0; i < maxImages; i++) {
        const fieldName = i === 0 ? 'input_image' : `input_image_${i + 1}`
        requestBody[fieldName] = referenceImages[i]
      }
    }

    console.log('📤 发送请求到:', `${apiHost}${endpoint}`)
    console.log('📤 请求参数:', JSON.stringify({
      ...requestBody,
      prompt: requestBody.prompt.substring(0, 50) + '...',
    }, null, 2))

    // 调用 Flux API
    const response = await fetch(`${apiHost}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.detail?.[0]?.msg || errorData.message || `HTTP ${response.status}`
      
      if (response.status === 401) {
        throw new Error('API密钥无效，请检查对应的 API Key 环境变量')
      }
      
      throw new Error(`Flux API调用失败: ${errorMessage}`)
    }

    const data = await response.json()
    
    console.log('✅ Flux API响应:', JSON.stringify(data, null, 2))

    // 如果是同步返回，直接返回结果
    if (sync && data.result && data.result.sample) {
      return {
        taskId: data.id || 'sync-result',
        status: 'completed',
        imageUrl: data.result.sample,
        message: '图片生成完成',
        cost: data.cost,
        input_mp: data.input_mp,
        output_mp: data.output_mp,
      }
    }

    // 异步返回：返回任务ID和查询URL
    return {
      taskId: data.id,
      status: 'pending',
      pollingUrl: data.polling_url,
      message: '图片生成任务已提交',
      cost: data.cost,
      input_mp: data.input_mp,
      output_mp: data.output_mp,
    }
  } catch (error) {
    console.error(`❌ ${model.toUpperCase()} API调用错误:`, error)
    
    if (error instanceof Error) {
      throw error
    }
    
    throw new Error(`Flux 调用失败: ${error.message || '未知错误'}`)
  }
}

/**
 * 查询 Flux 图片生成任务状态（所有模型共用）
 * @param {string} taskId - 任务ID
 * @param {string} model - 模型名称（用于日志，实际查询接口相同）
 * @returns {Promise<Object>} 返回任务状态和图片信息
 */
export async function getFluxTaskStatus(taskId, model = 'flux-2-max') {
  // 所有 Flux 模型使用相同的查询接口，使用第一个可用的 API Key
  const apiKey = getApiKey(model) // 使用传入的模型获取对应的 API Key
  const apiHost = getApiHost()

  if (!taskId) {
    throw new Error('任务ID不能为空')
  }

  try {
    console.log(`🔍 查询 ${model.toUpperCase()} 任务状态:`, taskId)

    // 所有 Flux 模型共用同一个查询接口
    const response = await fetch(`${apiHost}/flux/v1/get_result?id=${encodeURIComponent(taskId)}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.detail?.[0]?.msg || errorData.message || `HTTP ${response.status}`
      throw new Error(`查询任务状态失败: ${errorMessage}`)
    }

    const data = await response.json()
    
    console.log('✅ 任务状态查询结果:', JSON.stringify(data, null, 2))

    // 解析响应
    const status = data.status || 'pending'
    const result = data.result || {}
    const imageUrl = result.sample || result.image_url || ''

    // 状态映射
    let finalStatus = 'pending'
    if (status === 'Ready' || status === 'completed' || status === 'success') {
      finalStatus = 'completed'
    } else if (status === 'failed' || status === 'error') {
      finalStatus = 'failed'
    } else if (status === 'processing' || status === 'running') {
      finalStatus = 'processing'
    }

    // 计算进度（如果有）
    let progress = 0
    if (finalStatus === 'completed') {
      progress = 100
    } else if (finalStatus === 'processing') {
      progress = 50 // 默认进度
    }

    console.log(`📊 ${model.toUpperCase()} 任务状态: ${finalStatus}, hasImage: ${!!imageUrl}`)
    
    return {
      taskId: data.id || taskId,
      status: finalStatus,
      imageUrl: imageUrl,
      progress: progress,
      message: status === 'Ready' ? '图片生成完成' : (status || '处理中'),
      cost: data.cost,
      input_mp: data.input_mp,
      output_mp: data.output_mp,
    }
  } catch (error) {
    console.error(`❌ 查询 ${model.toUpperCase()} 任务状态错误:`, error)
    
    if (error instanceof Error) {
      throw error
    }
    
    throw new Error(`查询任务状态失败: ${error.message || '未知错误'}`)
  }
}

