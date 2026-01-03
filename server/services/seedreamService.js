/**
 * Seedream 系列文生图服务
 * Seedream 4.5: https://doc.302.ai/385925488e0
 * Seedream 4.0: https://302ai.apifox.cn/347859401e0
 */

import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'

// 加载.env文件
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const envPath = join(__dirname, '../../.env')
if (existsSync(envPath)) {
  dotenv.config({ path: envPath })
} else {
  // 尝试从 server/.env 加载
  const serverEnvPath = join(__dirname, '../.env')
  if (existsSync(serverEnvPath)) {
    dotenv.config({ path: serverEnvPath })
  }
}

/**
 * 获取指定模型的 API Key
 * @param {string} model - 模型名称 (seedream-4-5, seedream-4-0)
 * @returns {string} API Key
 */
function getApiKey(model) {
  const keyMap = {
    'seedream-4-5': process.env.SEEDREAM_4_5_API_KEY,
    'seedream-4-0': process.env.SEEDREAM_4_0_API_KEY,
  }
  
  const apiKey = keyMap[model]
  if (!apiKey) {
    throw new Error(`${model.toUpperCase()}_API_KEY 环境变量未设置，请检查 .env 文件`)
  }
  
  return apiKey
}

/**
 * 获取 API Host
 * @returns {string} API Host
 */
function getApiHost() {
  return process.env.SEEDREAM_API_HOST || 'https://api.302.ai'
}

/**
 * 获取模型对应的模型名称（用于API请求）
 * @param {string} model - 模型名称 (seedream-4-5, seedream-4-0)
 * @returns {string} API 模型名称
 */
function getModelName(model) {
  const modelMap = {
    'seedream-4-5': 'doubao-seedream-4-5-251128',
    'seedream-4-0': 'doubao-seedream-4-0-250828',
  }
  
  const modelName = modelMap[model]
  if (!modelName) {
    throw new Error(`不支持的 Seedream 模型: ${model}`)
  }
  
  return modelName
}

/**
 * 将宽高比和分辨率转换为 size 参数
 * @param {string} aspectRatio - 宽高比，如 '16:9', '9:16', '1:1'
 * @param {string} resolution - 分辨率，如 '2K', '4K'
 * @returns {string} size 参数 ('2K' 或 '4K')
 */
function getSizeParam(aspectRatio, resolution = '2K') {
  // Seedream 支持 2K 和 4K
  // 4.5版本只支持2K和4K，4.0版本还支持1K
  if (resolution === '4K') {
    return '4K'
  } else if (resolution === '2K') {
    return '2K'
  } else {
    return '2K' // 默认2K
  }
}

/**
 * 使用 Seedream 模型生成图片
 * @param {string} prompt - 文生图提示词
 * @param {Object} options - 生成选项
 * @param {string} options.model - 模型名称 (seedream-4-5, seedream-4-0)
 * @param {string} options.aspectRatio - 宽高比，如 '16:9', '9:16', '1:1'
 * @param {string} options.resolution - 分辨率：2K 或 4K
 * @param {string|Array<string>} options.referenceImage - 参考图片URL或base64（用于图生图，支持多张）
 * @param {boolean} options.sequentialImageGeneration - 是否生成组图（默认false，生成单图）
 * @param {number} options.maxImages - 组图最大数量（1-15，默认15）
 * @returns {Promise<Object>} 返回图片URL数组和状态
 */
export async function generateImageWithSeedream(prompt, options = {}) {
  const {
    model = 'seedream-4-5',
    aspectRatio = '16:9',
    resolution = '2K',
    referenceImage = null,
    sequentialImageGeneration = false, // 默认生成单图
    maxImages = 15, // 组图最大数量
  } = options

  const apiKey = getApiKey(model)
  const apiHost = getApiHost()
  const modelName = getModelName(model)
  const size = getSizeParam(aspectRatio, resolution)

  try {
    console.log(`🎨 调用 ${model.toUpperCase()} API:`, {
      prompt: prompt.substring(0, 50) + '...',
      aspectRatio,
      resolution,
      size,
      hasReferenceImage: !!referenceImage,
      sequentialImageGeneration,
    })

    // 构建请求体
    const requestBody = {
      model: modelName,
      prompt: prompt,
      size: size, // 2K 或 4K
      sequential_image_generation: sequentialImageGeneration ? 'auto' : 'disabled', // auto: 生成组图, disabled: 生成单图
      response_format: 'url', // 返回URL格式
      watermark: false, // 不添加水印
      stream: false, // 非流式输出
    }

    // 处理参考图片
    if (referenceImage) {
      if (Array.isArray(referenceImage)) {
        // 多张参考图（2-10张）
        requestBody.image = referenceImage
      } else {
        // 单张参考图
        requestBody.image = [referenceImage]
      }
    }

    // 如果启用组图生成，设置最大图片数量
    if (sequentialImageGeneration) {
      requestBody.sequential_image_generation_options = {
        max_images: Math.max(1, Math.min(maxImages, 15)), // 限制在1-15之间
      }
    }

    console.log('📤 发送请求到:', `${apiHost}/doubao/images/generations`)
    console.log('📤 请求参数:', JSON.stringify({
      ...requestBody,
      prompt: requestBody.prompt.substring(0, 50) + '...',
      image: requestBody.image ? (Array.isArray(requestBody.image) ? `[${requestBody.image.length}张图片]` : '[1张图片]') : undefined,
    }, null, 2))

    // 调用 Seedream API
    const response = await fetch(`${apiHost}/doubao/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.error?.message || errorData.message || `HTTP ${response.status}`
      
      if (response.status === 401) {
        throw new Error('API密钥无效，请检查对应的 API Key 环境变量')
      }
      
      throw new Error(`Seedream API调用失败: ${errorMessage}`)
    }

    const data = await response.json()
    
    console.log('✅ Seedream API响应:', JSON.stringify(data, null, 2))

    // 解析响应
    // Seedream API 直接返回结果，不需要查询任务状态
    const images = data.data || []
    const imageUrls = images.map(item => item.url || item.b64_json).filter(Boolean)

    if (imageUrls.length === 0) {
      throw new Error('API响应中未找到生成的图片')
    }

    // 返回第一张图片（如果是组图，返回所有图片）
    return {
      taskId: `seedream-${Date.now()}`, // 生成一个临时任务ID（因为这是同步API）
      status: 'completed',
      imageUrl: imageUrls[0], // 第一张图片
      imageUrls: imageUrls, // 所有图片（如果是组图）
      message: `成功生成${imageUrls.length}张图片`,
      generatedImages: data.usage?.generated_images || imageUrls.length,
    }
  } catch (error) {
    console.error(`❌ ${model.toUpperCase()} API调用错误:`, error)
    
    if (error instanceof Error) {
      throw error
    }
    
    throw new Error(`Seedream 调用失败: ${error.message || '未知错误'}`)
  }
}

/**
 * 查询 Seedream 图片生成任务状态
 * 注意：Seedream API 是同步的，直接返回结果，不需要查询任务状态
 * 此函数仅用于兼容性，实际不会调用
 * @param {string} taskId - 任务ID（实际上不会被使用）
 * @param {string} model - 模型名称（用于日志）
 * @returns {Promise<Object>} 返回任务状态和图片信息
 */
export async function getSeedreamTaskStatus(taskId, model = 'seedream-4-5') {
  // Seedream API 是同步的，不需要查询任务状态
  // 此函数仅用于兼容性
  console.warn(`⚠️ Seedream API 是同步的，不需要查询任务状态。taskId: ${taskId}`)
  
  return {
    taskId,
    status: 'completed',
    message: 'Seedream API 是同步的，图片已在生成时返回',
  }
}





