/**
 * 火山引擎即梦AI-视频生成服务
 * 支持模型：
 * - 即梦AI-视频生成3.0 Pro
 * 
 * 接口文档：
 * - 即梦AI-视频生成3.0 Pro: https://www.volcengine.com/docs/85621/1777001?lang=zh
 * - SDK文档: https://www.volcengine.com/docs/6444/1340578?lang=zh#0f05efc9
 * - Python SDK: https://github.com/volcengine/volc-sdk-python
 * 
 * 注意：
 * - 在线推理：实时生成，响应快但可能排队
 * - 离线推理：异步生成，提交任务后需要轮询结果，通常更快且更稳定
 * - 3.5 Pro 模型ID待确认，暂时不添加
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
}

// 火山引擎 API 配置
const VOLCENGINE_AK = process.env.VOLCENGINE_AK || process.env.VOLCENGINE_ACCESS_KEY
const VOLCENGINE_SK = process.env.VOLCENGINE_SK || process.env.VOLCENGINE_SECRET_KEY
const VOLCENGINE_API_HOST = process.env.VOLCENGINE_API_HOST || 'https://visual.volcengineapi.com'

/**
 * 根据模型名称获取对应的模型ID
 * @param {string} model - 模型名称
 * @returns {string} 模型ID
 */
function getModelId(model) {
  const modelMap = {
    'volcengine-video-3.0-pro': 'video_generation_3_0_pro',
    // 兼容旧名称
    'doubao-seedance-3.0-pro': 'video_generation_3_0_pro',
  }
  
  if (!modelMap[model]) {
    throw new Error(`不支持的火山引擎模型: ${model}。支持的模型: volcengine-video-3.0-pro`)
  }
  
  return modelMap[model]
}

/**
 * 使用火山引擎即梦AI生成视频（图生视频）
 * @param {string} imageUrl - 图片URL（必须是可访问的HTTP/HTTPS URL）
 * @param {Object} options - 生成选项
 * @param {string} options.model - 模型名称：'volcengine-video-3.0-pro'
 * @param {string} options.resolution - 分辨率：'480p', '720p', '1080p'
 * @param {string} options.ratio - 宽高比：'16:9', '4:3', '1:1', '3:4', '9:16', '21:9', 'adaptive'
 * @param {number} options.duration - 视频时长（秒），支持 2~12 秒
 * @param {string} options.text - 文本提示词（可选）
 * @param {string} options.serviceTier - 服务层级：'default'（在线推理）或 'offline'（离线推理），默认 'default'
 * @param {boolean} options.generateAudio - 是否生成音频，默认 true
 * @returns {Promise<Object>} 返回任务ID和状态
 */
export async function generateVideoWithVolcengine(imageUrl, options = {}) {
  const {
    model = 'volcengine-video-3.0-pro',
    resolution = '720p',
    ratio = 'adaptive',
    duration = 5,
    text = '',
    serviceTier = 'default', // 'default' 在线推理, 'offline' 离线推理
    generateAudio = true,
  } = options

  if (!VOLCENGINE_AK || !VOLCENGINE_SK) {
    throw new Error('VOLCENGINE_AK 和 VOLCENGINE_SK 环境变量未设置，请检查 .env 文件')
  }

  const modelId = getModelId(model)

  try {
    console.log(`🎬 调用火山引擎即梦AI ${model} 图生视频API:`, {
      imageUrl: imageUrl.substring(0, 100) + (imageUrl.length > 100 ? '...' : ''),
      model: modelId,
      resolution,
      ratio,
      duration,
      serviceTier,
      hasText: !!text,
      generateAudio,
    })

    // 构建请求体（根据火山引擎API文档格式）
    const requestBody = {
      model: modelId,
      content: [
        {
          type: 'image_url',
          image_url: {
            url: imageUrl,
          },
        },
      ],
      service_tier: serviceTier, // 'default' 在线推理, 'offline' 离线推理
      generate_audio: generateAudio,
    }

    // 如果有文本提示词，添加到 content 中
    if (text && text.trim()) {
      requestBody.content.unshift({
        type: 'text',
        text: text.trim(),
      })
    }

    // 设置视频参数
    if (resolution) {
      requestBody.resolution = resolution
    }
    if (ratio && ratio !== 'adaptive') {
      requestBody.ratio = ratio
    }
    if (duration) {
      requestBody.duration = duration
    }

    // 使用火山引擎的签名算法构建请求
    // 注意：这里需要使用火山引擎的签名算法，而不是简单的 Bearer Token
    // 由于 Node.js 环境，我们可能需要使用 volc-sdk-nodejs 或手动实现签名
    
    // 临时方案：使用 HTTP 请求（需要实现签名）
    // 完整实现需要使用火山引擎的 SDK 或实现签名算法
    
    console.log('📤 发送请求到:', `${VOLCENGINE_API_HOST}/api/v1/video_generation`)
    console.log('📤 请求体:', JSON.stringify(requestBody, null, 2))

    // TODO: 实现火山引擎的签名算法
    // 这里需要根据火山引擎的签名规范实现
    // 参考：https://www.volcengine.com/docs/6444/1340578?lang=zh
    
    // 临时使用 fetch，但需要添加正确的签名头
    const response = await fetch(`${VOLCENGINE_API_HOST}/api/v1/video_generation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // TODO: 添加火山引擎的签名头
        // 'Authorization': `Bearer ${signature}`,
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.message || errorData.error || `HTTP ${response.status}`
      throw new Error(`火山引擎视频生成API调用失败: ${errorMessage}`)
    }

    const result = await response.json()
    console.log('✅ 火山引擎API响应:', JSON.stringify(result, null, 2))

    // 解析响应
    if (result.task_id) {
      return {
        taskId: result.task_id,
        status: 'processing',
        provider: 'volcengine',
        model: modelId,
      }
    } else {
      throw new Error('火山引擎API返回数据格式错误：缺少 task_id')
    }
  } catch (error) {
    console.error('❌ 火山引擎视频生成失败:', error)
    throw error
  }
}

/**
 * 查询火山引擎视频生成任务状态
 * @param {string} taskId - 任务ID
 * @param {string} model - 模型名称（用于选择 API Key）
 * @returns {Promise<Object>} 返回任务状态和视频信息
 */
export async function getVolcengineTaskStatus(taskId, model = 'volcengine-video-3.0-pro') {
  if (!VOLCENGINE_AK || !VOLCENGINE_SK) {
    throw new Error('VOLCENGINE_AK 和 VOLCENGINE_SK 环境变量未设置，请检查 .env 文件')
  }

  try {
    console.log(`🔍 查询火山引擎任务状态: ${taskId} (模型: ${model})`)

    // TODO: 实现查询接口
    // 根据火山引擎文档实现任务状态查询
    
    const response = await fetch(`${VOLCENGINE_API_HOST}/api/v1/video_generation/${taskId}`, {
      method: 'GET',
      headers: {
        // TODO: 添加火山引擎的签名头
      },
    })

    if (!response.ok) {
      throw new Error(`查询任务状态失败: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()
    console.log('📥 火山引擎查询响应:', result)

    // 解析状态
    let status = 'processing'
    let progress = 0
    let videoUrl = null

    // 根据实际API响应格式解析
    if (result.status === 'completed' || result.status === 'success') {
      status = 'completed'
      progress = 100
      videoUrl = result.video_url || result.output_url
    } else if (result.status === 'failed' || result.status === 'error') {
      status = 'failed'
      progress = 0
    } else {
      status = 'processing'
      progress = result.progress || 50
    }

    return {
      status,
      progress,
      videoUrl,
      taskId,
      provider: 'volcengine',
    }
  } catch (error) {
    console.error('❌ 火山引擎任务状态查询失败:', error)
    throw error
  }
}

