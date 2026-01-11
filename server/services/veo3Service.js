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
 * Google Veo3.1 图生视频服务
 * 文档: https://doc.302.ai/361900600e0
 * 
 * 支持的模型：
 * - veo3.1: 0.5 PTC/次
 * - veo3.1-pro: 1 PTC/次
 */

/**
 * 使用 Veo3.1 生成视频
 * @param {string} imageUrl - 图片URL（必须是可访问的HTTP/HTTPS URL）
 * @param {Object} options - 生成选项
 * @param {string} options.model - 模型名称，'veo3.1' 或 'veo3.1-pro'，默认 'veo3.1'
 * @param {string} options.prompt - 视频生成提示词（必需）
 * @param {boolean} options.enhancePrompt - 是否自动增强提示词，默认 true
 * @param {string} options.aspectRatio - 宽高比，仅支持 '16:9' 或 '9:16'，默认 '16:9'
 * @returns {Promise<Object>} 返回任务ID和状态
 */
export async function generateVideoWithVeo3(imageUrl, options = {}) {
  const {
    model = 'veo3.1',
    prompt = '',
    enhancePrompt = true,
    aspectRatio = '16:9',
  } = options

  // 根据模型选择对应的 API Key
  let apiKey
  if (model === 'veo3.1') {
    apiKey = process.env.VEO3_API_KEY
  } else if (model === 'veo3.1-pro') {
    apiKey = process.env.VEO3_PRO_API_KEY
  } else {
    throw new Error(`不支持的模型: ${model}。支持的模型: veo3.1, veo3.1-pro`)
  }

  if (!apiKey) {
    throw new Error(`${model} 的 API Key 未设置，请检查 .env 文件中的 VEO3_API_KEY 或 VEO3_PRO_API_KEY`)
  }

  const apiHost = process.env.VEO3_API_HOST || process.env.MIDJOURNEY_API_HOST || 'https://api.302.ai'

  // 验证模型名称
  const validModels = ['veo3.1', 'veo3.1-pro']
  if (!validModels.includes(model)) {
    throw new Error(`不支持的模型: ${model}。支持的模型: ${validModels.join(', ')}`)
  }

  // 验证宽高比
  const validAspectRatios = ['16:9', '9:16']
  if (!validAspectRatios.includes(aspectRatio)) {
    throw new Error(`不支持的宽高比: ${aspectRatio}。支持的宽高比: ${validAspectRatios.join(', ')}`)
  }

  // 验证提示词
  if (!prompt || !prompt.trim()) {
    throw new Error('提示词不能为空，Veo3.1 需要提供视频生成提示词')
  }

  try {
    console.log('🎬 调用 Google Veo3.1 图生视频API:', {
      model,
      prompt: prompt.substring(0, 50) + (prompt.length > 50 ? '...' : ''),
      enhancePrompt,
      aspectRatio,
      imageUrl: imageUrl.substring(0, 100) + (imageUrl.length > 100 ? '...' : ''),
    })

    // Veo3.1 需要 HTTP/HTTPS URL，不支持 base64
    let finalImageUrl = imageUrl
    
    // 如果是base64，需要先上传到COS
    if (imageUrl.startsWith('data:image/')) {
      console.log('📤 Veo3.1 需要HTTP URL，上传base64图片到COS...')
      
      if (!process.env.TOS_ACCESS_KEY_ID && !process.env.COS_SECRET_ID) {
        throw new Error('Veo3.1 需要HTTP URL，但存储配置不完整。请检查 TOS 或 COS 环境变量')
      }
      
      // 导入统一存储服务
      const { uploadBuffer, generateKey: generateCosKey } = await import('./storageService.js')
      
      // 解析base64数据
      const base64Data = imageUrl.split(',')[1]
      if (!base64Data) {
        throw new Error('base64图片数据格式不正确')
      }
      
      const mimeType = imageUrl.match(/data:([^;]+)/)?.[1] || 'image/png'
      const imageBuffer = Buffer.from(base64Data, 'base64')
      
      // 生成COS key
      const ext = mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'jpg' :
                  mimeType.includes('png') ? 'png' :
                  mimeType.includes('gif') ? 'gif' :
                  mimeType.includes('webp') ? 'webp' : 'jpg'
      const cosKey = generateCosKey('image', ext)
      
      // 上传到COS
      const uploadResult = await uploadBuffer(imageBuffer, cosKey, mimeType)
      finalImageUrl = uploadResult.url
      
      console.log('✅ 图片已上传到COS:', finalImageUrl)
    } else if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      throw new Error('Veo3.1 需要HTTP/HTTPS URL格式的图片')
    }

    // 构建请求体
    const requestBody = {
      prompt: prompt.trim(),
      model: model,
      enhance_prompt: enhancePrompt,
      images: [finalImageUrl], // 图片数组
      aspect_ratio: aspectRatio,
    }

    console.log('📤 发送请求到:', `${apiHost}/302/submit/veo3-v2`)
    console.log('📤 请求体:', JSON.stringify({
      ...requestBody,
      images: [requestBody.images[0].substring(0, 100) + (requestBody.images[0].length > 100 ? '...' : '')],
    }, null, 2))

    // 调用 Veo3.1 API
    const response = await fetch(`${apiHost}/302/submit/veo3-v2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.message || errorData.error?.message || errorData.code || `HTTP ${response.status}`
      
      if (response.status === 401) {
        throw new Error(`API密钥无效，请检查 ${model === 'veo3.1' ? 'VEO3_API_KEY' : 'VEO3_PRO_API_KEY'} 环境变量`)
      }
      
      throw new Error(`Veo3.1 API调用失败: ${errorMessage}`)
    }

    const data = await response.json()
    
    console.log('✅ Veo3.1 API响应:', JSON.stringify(data, null, 2))

    // 返回任务ID（根据302.ai API文档，响应格式可能是 { data: "task_id" } 或 { task_id: "..." } 或 { id: "..." }）
    const taskId = data.data || data.task_id || data.id || data.taskId
    if (taskId) {
      return {
        taskId: taskId,
        status: data.status === 'IN_PROGRESS' || data.code === 'IN_PROGRESS' ? 'processing' : 'pending',
        message: data.message || '视频生成任务已提交',
      }
    } else {
      console.error('❌ Veo3.1 API响应格式异常:', JSON.stringify(data, null, 2))
      throw new Error(`API响应中未找到任务ID。响应内容: ${JSON.stringify(data)}`)
    }
  } catch (error) {
    console.error('❌ Veo3.1 API调用错误:', error)
    
    if (error instanceof Error) {
      throw error
    }
    
    throw new Error(`Veo3.1 调用失败: ${error.message || '未知错误'}`)
  }
}

/**
 * 查询视频生成任务状态
 * @param {string} taskId - 任务ID
 * @param {string} model - 模型名称，用于选择对应的 API Key
 * @returns {Promise<Object>} 返回任务状态和视频信息
 */
export async function getVeo3TaskStatus(taskId, model = 'veo3.1') {
  // 根据模型选择对应的 API Key
  let apiKey
  if (model === 'veo3.1') {
    apiKey = process.env.VEO3_API_KEY
  } else if (model === 'veo3.1-pro') {
    apiKey = process.env.VEO3_PRO_API_KEY
  } else {
    throw new Error(`不支持的模型: ${model}。支持的模型: veo3.1, veo3.1-pro`)
  }

  if (!apiKey) {
    throw new Error(`${model} 的 API Key 未设置，请检查 .env 文件中的 VEO3_API_KEY 或 VEO3_PRO_API_KEY`)
  }

  const apiHost = process.env.VEO3_API_HOST || process.env.MIDJOURNEY_API_HOST || 'https://api.302.ai'

  try {
    console.log('🔍 查询 Veo3.1 任务状态:', taskId)

    // 根据官方API文档 (https://doc.302.ai/361678530e0)
    // 查询接口：GET /302/submit/veo3-v2/{task_id}
    console.log('💡 使用302.ai官方接口: GET /302/submit/veo3-v2/{task_id}')
    const response = await fetch(`${apiHost}/302/submit/veo3-v2/${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.message || errorData.error?.message || errorData.code || `HTTP ${response.status}`
      
      if (response.status === 401) {
        throw new Error(`API密钥无效，请检查 ${model === 'veo3.1' ? 'VEO3_API_KEY' : 'VEO3_PRO_API_KEY'} 环境变量`)
      }
      
      throw new Error(`查询任务状态失败: ${errorMessage}`)
    }

    const data = await response.json()
    
    console.log('✅ 任务状态查询结果:', JSON.stringify(data, null, 2))

    // 解析响应格式
    // 根据官方API文档，响应格式为：
    // {
    //   "finishTime": 1753967874000,
    //   "startTime": 1753967636000,
    //   "status": "SUCCESS",  // IN_PROCESSING, SUCCESS, FAILURE
    //   "taskId": "...",
    //   "videoUrl": "..."
    // }
    const status = data.status || 'UNKNOWN'
    const videoUrl = data.videoUrl || data.video_url || ''
    const taskIdFromResponse = data.taskId || taskId
    
    // 计算进度（根据状态）
    let progress = data.progress
    if (progress === undefined || progress === null) {
      // 根据状态估算进度
      if (status === 'SUCCESS') {
        progress = 100
      } else if (status === 'IN_PROCESSING' || status === 'IN_PROGRESS' || status === 'PROCESSING') {
        // 如果有时间信息，可以根据时间计算进度
        if (data.startTime && data.finishTime) {
          const elapsed = Date.now() - data.startTime
          const total = data.finishTime - data.startTime
          if (total > 0) {
            progress = Math.min(90, Math.round((elapsed / total) * 90)) // 最多90%，完成时才是100%
          } else {
            progress = 50
          }
        } else {
          progress = 50 // 处理中，估算50%
        }
      } else if (status === 'FAILURE' || status === 'FAILED' || status === 'ERROR') {
        progress = 0
      } else {
        progress = 10 // 默认10%
      }
    }

    return {
      taskId: taskIdFromResponse,
      status: status === 'SUCCESS' ? 'completed' :
              status === 'FAILURE' || status === 'FAILED' || status === 'ERROR' ? 'failed' :
              status === 'IN_PROCESSING' || status === 'IN_PROGRESS' || status === 'PROCESSING' ? 'processing' : 'pending',
      videoUrl: videoUrl,
      progress: typeof progress === 'number' ? progress : parseInt(progress) || 10,
      message: status === 'SUCCESS' ? '视频生成完成' : 
               status === 'IN_PROCESSING' ? '视频生成中...' : 
               status === 'FAILURE' ? '视频生成失败' : '',
      // 额外信息
      startTime: data.startTime || null,
      finishTime: data.finishTime || null,
    }
  } catch (error) {
    console.error('❌ 查询任务状态错误:', error)
    
    if (error instanceof Error) {
      throw error
    }
    
    throw new Error(`查询任务状态失败: ${error.message || '未知错误'}`)
  }
}

