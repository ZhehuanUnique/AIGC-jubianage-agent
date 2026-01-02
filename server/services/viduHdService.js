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
 * Vidu V2 智能超清-尊享 视频超分辨率服务
 * 文档: https://302ai.apifox.cn/api-294660218
 * 
 * 注意：此接口用于视频超分辨率（upscale），需要先有一个视频URL
 * 如果需要图生视频，可能需要使用其他接口（如 /vidu/ent/v2/img2video）
 */

/**
 * 使用 Vidu V2 智能超清-尊享 进行视频超分辨率
 * @param {string} videoUrl - 视频URL（必须是可访问的HTTP/HTTPS URL）
 * @param {Object} options - 生成选项
 * @param {string} options.upscaleResolution - 超分辨率选项 (1080p, 2K, 4K, 8K)
 * @returns {Promise<Object>} 返回任务ID和状态
 */
export async function upscaleVideoWithViduHd(videoUrl, options = {}) {
  const apiKey = process.env.VIDU_HD_API_KEY || process.env.MIDJOURNEY_API_KEY

  if (!apiKey) {
    throw new Error('VIDU_HD_API_KEY 或 MIDJOURNEY_API_KEY 环境变量未设置，请检查 .env 文件')
  }

  const apiHost = process.env.VIDU_HD_API_HOST || process.env.MIDJOURNEY_API_HOST || 'https://api.302.ai'

  const {
    upscaleResolution = '1080p', // 默认1080p
  } = options

  // 验证分辨率选项
  const validResolutions = ['1080p', '2K', '4K', '8K']
  if (!validResolutions.includes(upscaleResolution)) {
    throw new Error(`不支持的分辨率: ${upscaleResolution}。支持的分辨率: ${validResolutions.join(', ')}`)
  }

  try {
    console.log('🎬 调用 Vidu V2 智能超清-尊享 视频超分辨率API:', {
      videoUrl: videoUrl.substring(0, 100) + (videoUrl.length > 100 ? '...' : ''),
      upscaleResolution,
    })

    // 构建请求体
    const requestBody = {
      video_url: videoUrl,
      upscale_resolution: upscaleResolution,
    }

    console.log('📤 发送请求到:', `${apiHost}/vidu/ent/v2/upscale-new`)
    console.log('📤 请求体:', JSON.stringify(requestBody, null, 2))

    // 调用 Vidu HD API
    const response = await fetch(`${apiHost}/vidu/ent/v2/upscale-new`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.message || errorData.error?.message || errorData.err_code || `HTTP ${response.status}`
      
      if (response.status === 401) {
        throw new Error('API密钥无效，请检查 VIDU_HD_API_KEY 或 MIDJOURNEY_API_KEY 环境变量')
      }
      
      throw new Error(`Vidu HD API调用失败: ${errorMessage}`)
    }

    const data = await response.json()
    
    console.log('✅ Vidu HD API响应:', JSON.stringify(data, null, 2))

    // 返回任务ID
    if (data.id) {
      return {
        taskId: data.id,
        status: data.state || 'pending',
        message: '视频超分辨率任务已提交',
      }
    } else {
      throw new Error('API响应中未找到任务ID')
    }
  } catch (error) {
    console.error('❌ Vidu HD API调用错误:', error)
    
    if (error instanceof Error) {
      throw error
    }
    
    throw new Error(`Vidu HD 调用失败: ${error.message || '未知错误'}`)
  }
}

/**
 * 查询视频超分辨率任务状态
 * @param {string} taskId - 任务ID
 * @returns {Promise<Object>} 返回任务状态和视频信息
 */
export async function getViduHdTaskStatus(taskId) {
  const apiKey = process.env.VIDU_HD_API_KEY || process.env.MIDJOURNEY_API_KEY

  if (!apiKey) {
    throw new Error('VIDU_HD_API_KEY 或 MIDJOURNEY_API_KEY 环境变量未设置，请检查 .env 文件')
  }

  const apiHost = process.env.VIDU_HD_API_HOST || process.env.MIDJOURNEY_API_HOST || 'https://api.302.ai'

  try {
    console.log('🔍 查询 Vidu HD 任务状态:', taskId)

    // 根据302.ai的API模式，查询接口可能是：
    // GET /vidu/ent/v2/tasks/{id}/creations 或类似
    // 参考豆包Seedance的实现，尝试多个可能的接口
    
    let response = null
    let lastError = null
    
    // 尝试1: 302.ai V2 标准查询接口
    try {
      console.log('💡 使用302.ai V2标准接口: GET /vidu/ent/v2/tasks/{id}/creations')
      response = await fetch(`${apiHost}/vidu/ent/v2/tasks/${taskId}/creations`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (response.ok) {
        console.log('✅ 使用302.ai V2标准接口成功')
      } else {
        const errorData = await response.json().catch(() => ({}))
        lastError = errorData.message || errorData.error?.message || errorData.err_code || `HTTP ${response.status}`
        console.log(`⚠️ 302.ai V2标准接口返回: ${response.status}, 错误: ${lastError}`)
      }
    } catch (e) {
      console.log('⚠️ 302.ai V2标准接口失败，尝试备选接口...', e.message)
      lastError = e.message
    }
    
    // 尝试2: 备选接口格式
    if (!response || !response.ok) {
      try {
        console.log('💡 尝试302.ai备选接口: GET /vidu/ent/v2/tasks/{id}')
        response = await fetch(`${apiHost}/vidu/ent/v2/tasks/${taskId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        })
        
        if (response.ok) {
          console.log('✅ 使用302.ai备选接口成功')
        } else {
          const errorData = await response.json().catch(() => ({}))
          const tempError = errorData.message || errorData.error?.message || errorData.err_code || `HTTP ${response.status}`
          if (!lastError) {
            lastError = tempError
          }
        }
      } catch (e) {
        console.log('⚠️ 302.ai备选接口也失败')
      }
    }

    if (!response || !response.ok) {
      const errorData = await response?.json().catch(() => ({}))
      const errorMessage = errorData.message || errorData.error?.message || errorData.err_code || lastError || `HTTP ${response?.status || 'unknown'}`
      
      // 如果是"No available models"错误，返回处理中状态，让前端继续轮询
      if (errorMessage.includes('No available models')) {
        console.warn('⚠️ 302.ai 当前没有可用的模型实例，任务可能正在排队中...')
        return {
          taskId: taskId,
          status: 'processing',
          videoUrl: '',
          progress: 10,
          message: '任务已提交，等待模型可用...',
        }
      }
      
      throw new Error(`查询任务状态失败: ${errorMessage}`)
    }

    const data = await response.json()
    
    console.log('✅ 任务状态查询结果:', JSON.stringify(data, null, 2))

    // 检查是否有错误信息
    if (data.message && data.message.includes('No available models')) {
      console.warn('⚠️ 302.ai 当前没有可用的模型实例，任务可能正在排队中...')
      return {
        taskId: data.id || taskId,
        status: 'processing',
        videoUrl: '',
        progress: 10,
        message: '任务已提交，等待模型可用...',
      }
    }

    // 解析响应格式
    // 根据API文档，响应格式可能包含：
    // - id: 任务ID
    // - state: 状态 (pending, processing, succeeded, failed)
    // - output_params: 输出参数
    // - creations: 生成的视频列表（可能）
    const state = data.state || data.status || 'pending'
    
    // 视频URL可能在多个位置，尝试不同的路径
    const videoUrl = data.creations?.[0]?.video_url || 
                     data.creations?.[0]?.videoUrl || 
                     data.content?.video_url || 
                     data.content?.videoUrl || 
                     data.video_url || 
                     data.videoUrl || 
                     data.output?.video_url || 
                     data.output?.videoUrl || ''
    
    // 计算进度（根据状态）
    let progress = data.progress
    if (progress === undefined || progress === null) {
      // 根据状态估算进度
      if (state === 'succeeded' || state === 'completed' || state === 'success' || state === 'SUCCESS') {
        progress = 100
      } else if (state === 'processing' || state === 'running' || state === 'pending' || state === 'queued') {
        progress = 50 // 处理中，估算50%
      } else if (state === 'failed' || state === 'FAILED' || state === 'error') {
        progress = 0
      } else {
        progress = 10 // 默认10%
      }
    }

    return {
      taskId: data.id || taskId,
      status: state === 'succeeded' || state === 'completed' || state === 'success' || state === 'SUCCESS' ? 'completed' :
              state === 'failed' || state === 'FAILED' || state === 'error' ? 'failed' :
              state === 'processing' || state === 'running' || state === 'pending' || state === 'queued' ? 'processing' : 'pending',
      videoUrl: videoUrl,
      progress: typeof progress === 'number' ? progress : parseInt(progress) || 10,
      message: data.message || data.description || (state === 'succeeded' ? '视频超分辨率完成' : state === 'processing' ? '视频超分辨率中...' : ''),
    }
  } catch (error) {
    console.error('❌ 查询任务状态错误:', error)
    
    if (error instanceof Error) {
      throw error
    }
    
    throw new Error(`查询任务状态失败: ${error.message || '未知错误'}`)
  }
}





