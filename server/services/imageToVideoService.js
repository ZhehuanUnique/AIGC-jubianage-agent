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

/**
 * 调用通义万相图生视频API
 * @param {string} imageUrl - 图片URL或base64编码的图片
 * @param {Object} options - 配置选项
 * @param {string} options.model - 模型名称，默认 'wan2.2-i2v-flash'
 * @param {string} options.resolution - 分辨率，可选 '480p', '720p', '1080p'，默认 '480p'
 * @param {number} options.duration - 视频时长（秒），默认 5
 * @returns {Promise<Object>} 返回任务ID和视频信息
 */
export async function generateVideoFromImage(imageUrl, options = {}) {
  const apiKey = process.env.DASHSCOPE_API_KEY

  if (!apiKey) {
    throw new Error('请设置 DASHSCOPE_API_KEY 环境变量')
  }

  const {
    model = 'wan2.2-i2v-flash',
    resolution = '480p',
    duration = 5,
  } = options

  try {
    // 构建请求体
    const requestBody = {
      model: model,
      input: {
        image_url: imageUrl, // 图片URL或base64
      },
      parameters: {
        resolution: resolution,
        duration: duration,
      },
    }

    console.log('📹 调用图生视频API:', {
      model,
      resolution,
      duration,
      imageUrl: imageUrl.substring(0, 50) + '...',
    })

    // 调用通义万相图生视频API
    const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/video-generation/generation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.message || errorData.error?.message || `HTTP ${response.status}`
      
      if (response.status === 401) {
        throw new Error('API密钥无效，请检查 DASHSCOPE_API_KEY 环境变量')
      }
      
      throw new Error(`图生视频API调用失败: ${errorMessage}`)
    }

    const data = await response.json()
    
    console.log('✅ 图生视频API响应:', JSON.stringify(data, null, 2))

    // 返回任务信息
    return {
      taskId: data.output?.task_id || data.task_id,
      videoUrl: data.output?.video_url || data.video_url,
      status: data.output?.status || data.status,
      message: data.message || '视频生成任务已提交',
    }
  } catch (error) {
    console.error('❌ 图生视频API调用错误:', error)
    
    if (error instanceof Error) {
      throw error
    }
    
    throw new Error(`图生视频调用失败: ${error.message || '未知错误'}`)
  }
}

/**
 * 查询视频生成任务状态
 * @param {string} taskId - 任务ID
 * @returns {Promise<Object>} 返回任务状态和视频信息
 */
export async function getVideoTaskStatus(taskId) {
  const apiKey = process.env.DASHSCOPE_API_KEY

  if (!apiKey) {
    throw new Error('请设置 DASHSCOPE_API_KEY 环境变量')
  }

  try {
    const response = await fetch(`https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.message || errorData.error?.message || `HTTP ${response.status}`
      throw new Error(`查询任务状态失败: ${errorMessage}`)
    }

    const data = await response.json()
    
    return {
      taskId: data.output?.task_id || data.task_id,
      status: data.output?.status || data.status,
      videoUrl: data.output?.video_url || data.video_url,
      progress: data.output?.progress || 0,
      message: data.message || '',
    }
  } catch (error) {
    console.error('❌ 查询任务状态错误:', error)
    throw error
  }
}

