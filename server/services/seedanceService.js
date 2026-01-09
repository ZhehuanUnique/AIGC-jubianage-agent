/**
 * 302.AI Seedance 视频生成服务（即梦-3.0Pro）
 * 
 * 支持模型：
 * - doubao-seedance-1-0-lite-i2v-250428 (即梦-3.0 Lite 图生视频)
 * - doubao-seedance-1-0-pro-i2v-250528 (即梦-3.0 Pro 图生视频)
 * 
 * API文档：
 * - 302.AI Seedance: https://302ai.apifox.cn/344157438e0
 * - 火山引擎官方文档: https://www.volcengine.com/docs/82379/1520757
 * 
 * 价格（302.AI）：
 * - lite: 0.002 PTC/1000 token
 * - pro: 0.003 PTC/1000 token
 * 
 * Token计算公式：
 * token = 宽 × 高 × 帧率 × 视频长度 / 1024
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

// 302.AI API 配置
const API_BASE_URL = process.env.SEEDANCE_API_HOST || 'https://api.302.ai'
const SEEDANCE_API_KEY = process.env.SEEDANCE_API_KEY

// 存储任务的查询URL（用于后续状态查询）
const taskQueryUrls = new Map()

/**
 * 使用302.AI Seedance生成视频（图生视频，支持首尾帧）
 * @param {string} imageUrl - 首帧图片URL
 * @param {Object} options - 生成选项
 * @param {string} options.model - 模型名称：'seedance-3.0-lite' 或 'seedance-3.0-pro'
 * @param {string} options.resolution - 分辨率：'720p' 或 '1080p'
 * @param {string} options.ratio - 宽高比：'16:9', '4:3', '1:1', '3:4', '9:16', '21:9'
 * @param {number} options.duration - 视频时长（秒）：5 或 10
 * @param {string} options.text - 文本提示词（可选）
 * @param {string} options.lastFrameUrl - 尾帧图片URL（可选，支持首尾帧模式）
 * @param {number} options.seed - 随机种子（可选）
 * @param {boolean} options.watermark - 是否添加水印，默认false
 * @returns {Promise<Object>} 返回任务ID和状态
 */
export async function generateVideoWithSeedance(imageUrl, options = {}) {
  const {
    model = 'seedance-3.0-lite',
    resolution = '720p',
    ratio = '16:9',
    duration = 5,
    text = '',
    lastFrameUrl = null,
    seed = null,
    watermark = false,
  } = options

  if (!SEEDANCE_API_KEY) {
    throw new Error('SEEDANCE_API_KEY 环境变量未设置，请检查 .env 文件')
  }

  // 映射模型名称到302.AI API需要的格式
  let apiModelName
  if (model === 'seedance-3.0-lite' || model === 'volcengine-video-3.0-pro') {
    apiModelName = 'doubao-seedance-1-0-lite-i2v-250428'
  } else if (model === 'seedance-3.0-pro') {
    apiModelName = 'doubao-seedance-1-0-pro-i2v-250528'
  } else {
    apiModelName = model // 直接使用传入的模型名
  }

  try {
    console.log(`🎬 调用 302.AI Seedance API (${apiModelName}):`, {
      imageUrl: imageUrl.substring(0, 100) + (imageUrl.length > 100 ? '...' : ''),
      lastFrameUrl: lastFrameUrl ? lastFrameUrl.substring(0, 100) + '...' : null,
      model: apiModelName,
      resolution,
      ratio,
      duration,
      hasText: !!text,
      hasLastFrame: !!lastFrameUrl,
    })

    // 构建提示词（包含参数）
    // 格式：提示词 --rs 分辨率 --dur 时长 --rt 宽高比 [--seed 种子] [--wm 水印]
    let promptWithParams = text || ''
    promptWithParams += ` --rs ${resolution} --dur ${duration} --rt ${ratio}`
    if (seed !== null) {
      promptWithParams += ` --seed ${seed}`
    }
    promptWithParams += ` --wm ${watermark}`

    // 构建请求体（302.AI Seedance格式）
    const content = []

    // 添加文本提示词（包含参数）
    content.push({
      type: 'text',
      text: promptWithParams.trim()
    })

    // 添加首帧图片
    content.push({
      type: 'image_url',
      image_url: {
        url: imageUrl
      },
      role: 'first_frame'
    })

    // 添加尾帧图片（如果提供）
    if (lastFrameUrl) {
      content.push({
        type: 'image_url',
        image_url: {
          url: lastFrameUrl
        },
        role: 'last_frame'
      })
    }

    const requestBody = {
      model: apiModelName,
      content: content,
    }

    console.log('📤 发送请求到:', `${API_BASE_URL}/doubao/doubao-seedance`)
    console.log('📤 请求体:', JSON.stringify(requestBody, null, 2))

    const response = await fetch(`${API_BASE_URL}/doubao/doubao-seedance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SEEDANCE_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ 302.AI Seedance API 错误响应:', errorText)
      let errorMessage = `302.AI Seedance API 请求失败: ${response.status} ${response.statusText}`
      try {
        const errorJson = JSON.parse(errorText)
        if (errorJson.error) {
          errorMessage = `302.AI Seedance API 错误: ${errorJson.error.message || errorJson.error}`
        } else if (errorJson.message) {
          errorMessage = `302.AI Seedance API 错误: ${errorJson.message}`
        }
      } catch (e) {
        // 如果无法解析JSON，使用默认错误消息
      }
      throw new Error(errorMessage)
    }

    const result = await response.json()
    console.log('📥 302.AI Seedance API 响应:', JSON.stringify(result, null, 2))

    // 解析响应 - 302.AI返回格式
    // 格式1: { id: "xxx", status: "succeeded", content: { video_url: "xxx" } }
    // 格式2: { code: 200, data: { id: "xxx", urls: { get: "xxx" }, status: "created" } }
    
    let taskId = null
    let status = 'processing'
    let videoUrl = null
    let queryUrl = null

    // 检查是否是新格式（ws API）
    if (result.code === 200 && result.data) {
      taskId = result.data.id
      status = result.data.status === 'created' ? 'processing' : result.data.status
      queryUrl = result.data.urls?.get
      
      // 保存查询URL
      if (taskId && queryUrl) {
        taskQueryUrls.set(taskId, queryUrl)
      }
    }
    // 检查是否直接返回结果
    else if (result.id) {
      taskId = result.id
      status = result.status || 'processing'
      
      if (result.status === 'succeeded' && result.content?.video_url) {
        status = 'completed'
        videoUrl = result.content.video_url
      }
    }
    // 检查嵌套的data结构
    else if (result.data?.id) {
      taskId = result.data.id
      status = result.data.status || 'processing'
      
      if (result.data.status === 'succeeded' && result.data.content?.video_url) {
        status = 'completed'
        videoUrl = result.data.content.video_url
      }
    }

    if (!taskId && !videoUrl) {
      console.error('❌ 302.AI Seedance API响应格式异常:', JSON.stringify(result, null, 2))
      throw new Error(`302.AI Seedance API 返回数据格式错误：缺少任务ID或视频URL。响应内容: ${JSON.stringify(result)}`)
    }

    return {
      taskId: taskId,
      status: status === 'succeeded' ? 'completed' : status,
      videoUrl: videoUrl,
      provider: 'seedance-302ai',
      model: apiModelName,
      queryUrl: queryUrl, // 保存查询URL供后续使用
    }
  } catch (error) {
    console.error('❌ 302.AI Seedance 视频生成失败:', error)
    throw error
  }
}

/**
 * 查询302.AI Seedance任务状态
 * @param {string} taskId - 任务ID
 * @returns {Promise<Object>} 返回任务状态和视频信息
 */
export async function getSeedanceTaskStatus(taskId) {
  if (!SEEDANCE_API_KEY) {
    throw new Error('SEEDANCE_API_KEY 环境变量未设置，请检查 .env 文件')
  }

  try {
    console.log(`🔍 查询 302.AI Seedance 任务状态: ${taskId}`)

    // 尝试从缓存获取查询URL
    let queryUrl = taskQueryUrls.get(taskId)
    
    // 如果没有缓存的查询URL，尝试构建默认的查询URL
    if (!queryUrl) {
      // 尝试doubao-seedance的查询接口
      queryUrl = `${API_BASE_URL}/doubao/doubao-seedance/${taskId}`
    }

    console.log('📤 查询URL:', queryUrl)

    const response = await fetch(queryUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SEEDANCE_API_KEY}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ 302.AI Seedance 查询错误响应:', errorText)
      throw new Error(`302.AI Seedance 查询失败: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()
    console.log('📥 302.AI Seedance 查询响应:', JSON.stringify(result, null, 2))

    // 解析状态
    let status = 'processing'
    let progress = 0
    let videoUrl = null
    let errorMessage = null

    // 解析不同的响应格式
    const data = result.data || result
    const taskStatus = data.status

    if (taskStatus === 'succeeded' || taskStatus === 'completed') {
      status = 'completed'
      progress = 100
      // 尝试从不同位置获取视频URL
      videoUrl = data.content?.video_url || 
                 data.video_url || 
                 data.videoUrl || 
                 data.outputs?.[0] ||
                 result.content?.video_url
    } else if (taskStatus === 'failed' || taskStatus === 'error') {
      status = 'failed'
      progress = 0
      errorMessage = data.error || data.message || result.error || '视频生成失败'
    } else if (taskStatus === 'processing' || taskStatus === 'running' || taskStatus === 'created' || taskStatus === 'pending') {
      status = 'processing'
      progress = data.progress || 50
    }

    return {
      status,
      progress,
      videoUrl,
      errorMessage,
      taskId,
      provider: 'seedance-302ai',
    }
  } catch (error) {
    console.error('❌ 302.AI Seedance 任务状态查询失败:', error)
    throw error
  }
}
