import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'
import { uploadBuffer, generateCosKey } from './cosService.js'

// 加载.env文件
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const envPath = join(__dirname, '../../.env')
if (existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

/**
 * Vidu V2 图生视频服务
 * 文档: https://302ai.apifox.cn/api-294604653
 * 
 * 支持的模型：
 * - viduq2-pro
 * - viduq2-turbo
 * - viduq1
 * - vidu2.0
 * - vidu1.5
 * - vidu1.0
 */

/**
 * 使用 Vidu V2 生成视频
 * @param {string} imageUrl - 图片URL或base64编码的图片
 * @param {Object} options - 生成选项
 * @param {string} options.model - 模型名称，默认 'viduq2-turbo'
 * @param {string} options.resolution - 分辨率，可选 '360p', '540p', '720p', '1080p'，默认 '720p'
 * @param {number} options.duration - 视频时长（秒），默认 5
 * @param {string} options.prompt - 文本提示词（可选）
 * @param {string} options.movementAmplitude - 运动幅度，可选 'auto', 'small', 'medium', 'large'，默认 'auto'
 * @param {boolean} options.bgm - 是否添加背景音乐，默认 false
 * @param {number} options.seed - 随机种子（可选）
 * @returns {Promise<Object>} 返回任务ID和视频信息
 */
export async function generateVideoWithViduV2(imageUrl, options = {}) {
  const apiKey = process.env.VIDU_V2_API_KEY || process.env.MIDJOURNEY_API_KEY

  if (!apiKey) {
    throw new Error('VIDU_V2_API_KEY 或 MIDJOURNEY_API_KEY 环境变量未设置，请检查 .env 文件')
  }

  const apiHost = process.env.VIDU_V2_API_HOST || process.env.MIDJOURNEY_API_HOST || 'https://api.302.ai'

  const {
    model = 'viduq2-turbo',
    resolution = '720p',
    duration = 5,
    prompt = '',
    movementAmplitude = 'auto',
    bgm = false,
    seed = 0,
  } = options

  // 验证模型名称
  const validModels = ['viduq2-pro', 'viduq2-turbo', 'viduq1', 'vidu2.0', 'vidu1.5', 'vidu1.0']
  if (!validModels.includes(model)) {
    throw new Error(`不支持的模型: ${model}。支持的模型: ${validModels.join(', ')}`)
  }

  // 验证分辨率
  const validResolutions = ['360p', '540p', '720p', '1080p']
  if (!validResolutions.includes(resolution)) {
    throw new Error(`不支持的分辨率: ${resolution}。支持的分辨率: ${validResolutions.join(', ')}`)
  }

  // 验证运动幅度
  const validMovementAmplitudes = ['auto', 'small', 'medium', 'large']
  if (!validMovementAmplitudes.includes(movementAmplitude)) {
    throw new Error(`不支持的运动幅度: ${movementAmplitude}。支持的运动幅度: ${validMovementAmplitudes.join(', ')}`)
  }

  try {
    console.log('🎬 调用 Vidu V2 图生视频API:', {
      model,
      resolution,
      duration,
      hasPrompt: !!prompt,
      movementAmplitude,
      bgm,
    })

    // 处理图片URL
    let finalImageUrl = imageUrl
    
    // 如果是base64，需要检查是否符合要求
    if (imageUrl.startsWith('data:image/')) {
      // base64格式需要包含内容类型前缀
      // 检查是否符合格式要求：data:image/(png|jpeg|jpg|webp);base64,XXX
      const base64Pattern = /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/
      if (!base64Pattern.test(imageUrl)) {
        console.log('📤 base64格式不符合要求，尝试转换为标准格式...')
        
        // 尝试修复格式
        const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/)
        if (match) {
          const mimeType = match[1]
          const base64Data = match[2]
          
          // 确保MIME类型正确
          let fixedMimeType = mimeType
          if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
            fixedMimeType = 'image/jpeg'
          } else if (mimeType.includes('png')) {
            fixedMimeType = 'image/png'
          } else if (mimeType.includes('webp')) {
            fixedMimeType = 'image/webp'
          } else {
            fixedMimeType = 'image/png' // 默认
          }
          
          finalImageUrl = `data:${fixedMimeType};base64,${base64Data}`
          console.log('✅ base64格式已修复')
        }
      }
      
      // 检查base64解码后字节长度（< 10MB）
      const base64Data = imageUrl.split(',')[1]
      if (base64Data) {
        const byteLength = (base64Data.length * 3) / 4
        const maxSize = 10 * 1024 * 1024 // 10MB
        if (byteLength >= maxSize) {
          console.warn('⚠️ base64图片可能超过10MB限制，建议上传到COS使用URL')
        }
      }
    } else if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      // HTTP/HTTPS URL，直接使用
      finalImageUrl = imageUrl
      console.log('📤 使用HTTP URL:', finalImageUrl.substring(0, 100) + (finalImageUrl.length > 100 ? '...' : ''))
    } else {
      // 如果不是base64也不是URL，尝试上传到COS
      console.log('📤 检测到非标准格式，尝试上传到COS...')
      
      if (!process.env.COS_SECRET_ID || !process.env.COS_SECRET_KEY || !process.env.COS_BUCKET) {
        throw new Error('图片需要上传到COS，但COS配置不完整。请检查 COS_SECRET_ID、COS_SECRET_KEY 和 COS_BUCKET 环境变量')
      }
      
      // 假设是base64但没有前缀，尝试添加
      if (imageUrl.match(/^[A-Za-z0-9+/=]+$/)) {
        // 纯base64数据，添加前缀
        finalImageUrl = `data:image/png;base64,${imageUrl}`
        console.log('✅ 已添加base64前缀')
      } else {
        throw new Error('图片URL格式不正确，必须是HTTP/HTTPS URL或base64格式（data:image/...;base64,XXX）')
      }
    }

    // 构建请求体
    const requestBody = {
      model: model,
      images: [finalImageUrl], // 图片数组，仅支持1张
      resolution: resolution,
      duration: duration,
      movement_amplitude: movementAmplitude,
      bgm: bgm,
    }

    // 可选参数
    if (prompt && prompt.trim()) {
      requestBody.prompt = prompt.trim()
    }
    if (seed && seed > 0) {
      requestBody.seed = seed
    }

    console.log('📤 发送请求到:', `${apiHost}/vidu/ent/v2/img2video`)
    console.log('📤 请求体:', JSON.stringify({
      ...requestBody,
      images: [requestBody.images[0].substring(0, 100) + (requestBody.images[0].length > 100 ? '...' : '')],
    }, null, 2))

    // 调用 Vidu V2 API
    const response = await fetch(`${apiHost}/vidu/ent/v2/img2video`, {
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
        throw new Error('API密钥无效，请检查 VIDU_V2_API_KEY 或 MIDJOURNEY_API_KEY 环境变量')
      }
      
      throw new Error(`Vidu V2 API调用失败: ${errorMessage}`)
    }

    const data = await response.json()
    
    console.log('✅ Vidu V2 API响应:', JSON.stringify(data, null, 2))

    // 返回任务ID（Vidu V2 API 返回的是 task_id）
    if (data.task_id || data.id) {
      return {
        taskId: data.task_id || data.id,
        status: data.state || 'pending',
        message: '视频生成任务已提交',
      }
    } else {
      throw new Error('API响应中未找到任务ID')
    }
  } catch (error) {
    console.error('❌ Vidu V2 API调用错误:', error)
    
    if (error instanceof Error) {
      throw error
    }
    
    throw new Error(`Vidu V2 调用失败: ${error.message || '未知错误'}`)
  }
}

/**
 * 查询视频生成任务状态
 * @param {string} taskId - 任务ID
 * @returns {Promise<Object>} 返回任务状态和视频信息
 */
export async function getViduV2TaskStatus(taskId) {
  const apiKey = process.env.VIDU_V2_API_KEY || process.env.MIDJOURNEY_API_KEY

  if (!apiKey) {
    throw new Error('VIDU_V2_API_KEY 或 MIDJOURNEY_API_KEY 环境变量未设置，请检查 .env 文件')
  }

  const apiHost = process.env.VIDU_V2_API_HOST || process.env.MIDJOURNEY_API_HOST || 'https://api.302.ai'

  try {
    console.log('🔍 查询 Vidu V2 任务状态:', taskId)

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
    // 根据API文档 (https://302ai.apifox.cn/294801984e0)，响应格式为：
    // - state: 状态 (success, processing, failed等)
    // - err_code: 错误代码
    // - creations: 生成的视频数组
    //   - id: 视频ID
    //   - url: 视频URL（注意：是 url，不是 video_url）
    //   - cover_url: 封面URL
    //   - video: 视频信息对象（duration, fps, resolution）
    const state = data.state || data.status || 'pending'
    
    // 根据官方API文档，视频URL在 creations 数组中
    // 处理所有视频（可能返回多个）
    let videoUrls = []
    if (data.creations && Array.isArray(data.creations) && data.creations.length > 0) {
      // 提取所有视频URL
      videoUrls = data.creations.map(creation => 
        creation.url || creation.video_url || creation.videoUrl || ''
      ).filter(url => url) // 过滤空URL
    }
    
    // 如果creations中没有，尝试其他路径（兼容其他可能的响应格式）
    if (videoUrls.length === 0) {
      const singleUrl = data.content?.video_url || 
                       data.content?.videoUrl || 
                       data.video_url || 
                       data.videoUrl || 
                       data.output?.video_url || 
                       data.output?.videoUrl || ''
      if (singleUrl) {
        videoUrls = [singleUrl]
      }
    }
    
    // 主视频URL（用于向后兼容，使用第一个视频）
    const videoUrl = videoUrls.length > 0 ? videoUrls[0] : ''
    
    // 计算进度（根据状态）
    let progress = data.progress
    if (progress === undefined || progress === null) {
      // 根据状态估算进度
      // 根据API文档，state 可能是 "success", "processing", "failed" 等
      if (state === 'succeeded' || state === 'completed' || state === 'success' || state === 'SUCCESS') {
        progress = 100
      } else if (state === 'processing' || state === 'running' || state === 'pending' || state === 'queued' || state === 'PROCESSING') {
        progress = 50 // 处理中，估算50%
      } else if (state === 'failed' || state === 'FAILED' || state === 'error' || state === 'ERROR') {
        progress = 0
      } else {
        progress = 10 // 默认10%
      }
    }

    // 检查错误代码
    const errCode = data.err_code || ''
    if (errCode && state !== 'success') {
      console.warn(`⚠️ 任务返回错误代码: ${errCode}`)
    }

    return {
      taskId: data.id || taskId,
      status: state === 'succeeded' || state === 'completed' || state === 'success' || state === 'SUCCESS' ? 'completed' :
              state === 'failed' || state === 'FAILED' || state === 'error' || state === 'ERROR' ? 'failed' :
              state === 'processing' || state === 'running' || state === 'pending' || state === 'queued' || state === 'PROCESSING' ? 'processing' : 'pending',
      videoUrl: videoUrl, // 主视频URL（向后兼容）
      videoUrls: videoUrls, // 所有视频URL数组（新增）
      progress: typeof progress === 'number' ? progress : parseInt(progress) || 10,
      message: data.message || data.description || (errCode ? `错误代码: ${errCode}` : '') || (state === 'success' ? '视频生成完成' : state === 'processing' ? '视频生成中...' : ''),
      // 额外信息：封面URL和视频信息
      coverUrl: data.creations?.[0]?.cover_url || '',
      videoInfo: data.creations?.[0]?.video || null,
    }
  } catch (error) {
    console.error('❌ 查询任务状态错误:', error)
    
    if (error instanceof Error) {
      throw error
    }
    
    throw new Error(`查询任务状态失败: ${error.message || '未知错误'}`)
  }
}

