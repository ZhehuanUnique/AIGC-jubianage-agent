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
 * 豆包 Seedance 视频生成服务
 * 文档: 
 * - 文/图生视频: https://302ai.apifox.cn/305249446e0
 * - 参考生视频: https://302ai.apifox.cn/344076582e0
 * - 首尾帧生视频: https://302ai.apifox.cn/344076585e0
 * - 获取任务结果: https://302ai.apifox.cn/305262977e0
 */

/**
 * 根据模型获取对应的 API Key
 * @param {string} model - 模型名称
 * @returns {string} API Key
 */
function getApiKeyForModel(model) {
  // 根据模型选择对应的 API Key
  if (model === 'doubao-seedance-1-5-pro-251215') {
    return process.env.DOUBAO_SEEDANCE_1_5_PRO_API_KEY || 
           process.env.DOUBAO_SEEDANCE_API_KEY || 
           process.env.MIDJOURNEY_API_KEY
  } else if (model === 'doubao-seedance-1-0-pro-250528' || model === 'doubao-seedance-1-0-pro') {
    return process.env.DOUBAO_SEEDANCE_1_0_PRO_API_KEY || 
           process.env.DOUBAO_SEEDANCE_API_KEY || 
           process.env.MIDJOURNEY_API_KEY
  } else {
    // 默认使用通用 API Key
    return process.env.DOUBAO_SEEDANCE_API_KEY || 
           process.env.MIDJOURNEY_API_KEY
  }
}

/**
 * 使用豆包 Seedance 生成视频（文/图生视频）
 * @param {string} imageUrl - 图片URL（必须是可访问的HTTP/HTTPS URL）
 * @param {Object} options - 生成选项
 * @param {string} options.model - 模型名称，默认 'doubao-seedance-1-5-pro-251215'
 * @param {string} options.resolution - 分辨率 (480p, 720p, 1080p)
 * @param {string} options.ratio - 宽高比 (16:9, 4:3, 1:1, 3:4, 9:16, 21:9, adaptive)
 * @param {number} options.duration - 视频时长（秒），支持 2~12 秒，默认 5
 * @param {string} options.text - 文本提示词（可选，用于图生视频）
 * @param {boolean} options.generateAudio - 是否生成音频，默认 true
 * @returns {Promise<Object>} 返回任务ID和状态
 */
export async function generateVideoWithSeedance(imageUrl, options = {}) {
  const {
    model = 'doubao-seedance-1-5-pro-251215', // 默认使用 1.5 Pro，也支持 1.0 Lite
    resolution = '720p',
    ratio = 'adaptive', // 图生视频默认使用 adaptive
    duration = 5,
    text = '', // 文本提示词（可选）
    generateAudio = true,
  } = options

  const apiKey = getApiKeyForModel(model)

  if (!apiKey) {
    throw new Error('DOUBAO_SEEDANCE_API_KEY 或相关模型专用 API Key 环境变量未设置，请检查 .env 文件')
  }

  const apiHost = process.env.DOUBAO_SEEDANCE_API_HOST || process.env.MIDJOURNEY_API_HOST || 'https://api.302.ai'

  try {
    const modelName = model
    
    console.log(`🎬 调用豆包 Seedance ${modelName} 文/图生视频API:`, {
      imageUrl: imageUrl.substring(0, 100) + (imageUrl.length > 100 ? '...' : ''),
      model: modelName,
      resolution,
      ratio,
      duration,
      hasText: !!text,
      generateAudio,
    })

    // 构建请求体
    const requestBody = {
      model: modelName,
      content: [
        {
          type: 'image_url',
          image_url: {
            url: imageUrl,
          },
        },
      ],
      service_tier: 'default', // 在线推理模式
      generate_audio: generateAudio,
    }

    // 如果有文本提示词，添加到 content 中
    if (text && text.trim()) {
      // 构建文本提示词，包含参数（按照官方文档格式）
      let textPrompt = text.trim()
      // 在文本提示词中添加参数（如果还没有）
      if (ratio && ratio !== 'adaptive' && !textPrompt.includes('--ratio')) {
        textPrompt += ` --ratio ${ratio}`
      }
      if (duration && !textPrompt.includes('--dur')) {
        textPrompt += ` --dur ${duration}`
      }
      
      requestBody.content.unshift({
        type: 'text',
        text: textPrompt,
        resolution: resolution,
        ratio: ratio,
        duration: duration,
      })
    } else {
      // 如果没有文本，只设置图片参数（图生视频）
      // 注意：图生视频时，resolution、ratio、duration 应该设置在 image_url 对象中
      // 但根据官方文档，这些参数也可以设置在 content 的顶层
      requestBody.content[0].resolution = resolution
      requestBody.content[0].ratio = ratio
      requestBody.content[0].duration = duration
    }

    console.log('📤 发送请求到:', `${apiHost}/doubao/doubao-seedance`)
    console.log('📤 请求体:', JSON.stringify(requestBody, null, 2))

    // 调用豆包 Seedance API
    const response = await fetch(`${apiHost}/doubao/doubao-seedance`, {
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
        throw new Error(`API密钥无效，请检查 DOUBAO_SEEDANCE_1_5_PRO_API_KEY 或 DOUBAO_SEEDANCE_API_KEY 环境变量`)
      }
      
      throw new Error(`豆包 Seedance API调用失败: ${errorMessage}`)
    }

    const data = await response.json()
    
    console.log('✅ 豆包 Seedance API响应:', JSON.stringify(data, null, 2))

    // 返回任务ID
    if (data.id) {
      return {
        taskId: data.id,
        status: 'pending',
        message: '视频生成任务已提交',
      }
    } else {
      throw new Error('API响应中未找到任务ID')
    }
  } catch (error) {
    console.error('❌ 豆包 Seedance API调用错误:', error)
    
    if (error instanceof Error) {
      throw error
    }
    
    throw new Error(`豆包 Seedance 调用失败: ${error.message || '未知错误'}`)
  }
}

/**
 * 使用豆包 Seedance 生成参考生视频
 * 注意：此功能需要 doubao-seedance-1-0-lite-i2v-250428 模型，但该模型已不可用
 * @param {string} referenceImageUrl - 参考图片URL
 * @param {string} referenceVideoUrl - 参考视频URL
 * @param {Object} options - 生成选项
 * @param {string} options.text - 文本提示词
 * @param {string} options.resolution - 分辨率 (480p, 720p, 1080p)
 * @param {string} options.ratio - 宽高比 (16:9, 4:3, 1:1, 3:4, 9:16, 21:9)
 * @param {number} options.duration - 视频时长（秒），支持 5 或 10 秒
 * @returns {Promise<Object>} 返回任务ID和状态
 */
export async function generateReferenceVideoWithSeedance(referenceImageUrl, referenceVideoUrl, options = {}) {
  const model = 'doubao-seedance-1-0-lite-i2v-250428' // 注意：此模型已不可用，此功能将失败
  const apiKey = getApiKeyForModel(model)

  if (!apiKey) {
    throw new Error('DOUBAO_SEEDANCE_1_0_LITE_API_KEY 或 DOUBAO_SEEDANCE_API_KEY 环境变量未设置，请检查 .env 文件')
  }

  const apiHost = process.env.DOUBAO_SEEDANCE_API_HOST || process.env.MIDJOURNEY_API_HOST || 'https://api.302.ai'

  const {
    text = '',
    resolution = '720p',
    ratio = '16:9',
    duration = 5,
  } = options

  try {
    console.log(`🎬 调用豆包 Seedance 1.0 Lite 参考生视频API:`, {
      referenceImageUrl: referenceImageUrl.substring(0, 100) + (referenceImageUrl.length > 100 ? '...' : ''),
      referenceVideoUrl: referenceVideoUrl.substring(0, 100) + (referenceVideoUrl.length > 100 ? '...' : ''),
      model,
      resolution,
      ratio,
      duration,
      hasText: !!text,
    })

    // 构建请求体（根据官方文档：参考生视频需要 reference_image 和 reference_video）
    const requestBody = {
      model: model,
      content: [
        {
          type: 'text',
          text: text || '生成参考视频风格的视频',
        },
        {
          type: 'image_url',
          image_url: {
            url: referenceImageUrl,
          },
          role: 'reference_image',
        },
        {
          type: 'image_url',
          image_url: {
            url: referenceVideoUrl,
          },
          role: 'reference_video',
        },
      ],
      service_tier: 'default',
      generate_audio: false, // 参考生视频不支持音频
    }

    // 设置参数
    if (resolution) {
      requestBody.content[0].resolution = resolution
    }
    if (ratio) {
      requestBody.content[0].ratio = ratio
    }
    if (duration) {
      requestBody.content[0].duration = duration
    }

    console.log('📤 发送请求到:', `${apiHost}/doubao/doubao-seedance`)
    console.log('📤 请求体:', JSON.stringify(requestBody, null, 2))

    const response = await fetch(`${apiHost}/doubao/doubao-seedance`, {
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
        throw new Error('API密钥无效，请检查 DOUBAO_SEEDANCE_1_0_LITE_API_KEY 或 DOUBAO_SEEDANCE_API_KEY 环境变量')
      }
      
      throw new Error(`豆包 Seedance 参考生视频API调用失败: ${errorMessage}`)
    }

    const data = await response.json()
    
    console.log('✅ 豆包 Seedance 参考生视频API响应:', JSON.stringify(data, null, 2))

    if (data.id) {
      return {
        taskId: data.id,
        status: 'pending',
        message: '参考生视频任务已提交',
      }
    } else {
      throw new Error('API响应中未找到任务ID')
    }
  } catch (error) {
    console.error('❌ 豆包 Seedance 参考生视频API调用错误:', error)
    
    if (error instanceof Error) {
      throw error
    }
    
    throw new Error(`豆包 Seedance 参考生视频调用失败: ${error.message || '未知错误'}`)
  }
}

/**
 * 使用豆包 Seedance 生成首尾帧生视频
 * 支持模型：doubao-seedance-1-5-pro-251215
 * @param {string} firstFrameUrl - 首帧图片URL
 * @param {string} lastFrameUrl - 尾帧图片URL
 * @param {Object} options - 生成选项
 * @param {string} options.model - 模型名称，默认 'doubao-seedance-1-5-pro-251215'
 * @param {string} options.text - 文本提示词
 * @param {string} options.resolution - 分辨率 (480p, 720p, 1080p)
 * @param {string} options.ratio - 宽高比 (16:9, 4:3, 1:1, 3:4, 9:16, 21:9)
 * @param {number} options.duration - 视频时长（秒），支持 2~12 秒
 * @returns {Promise<Object>} 返回任务ID和状态
 */
export async function generateFirstLastFrameVideoWithSeedance(firstFrameUrl, lastFrameUrl, options = {}) {
  const {
    model = 'doubao-seedance-1-5-pro-251215',
    text = '',
    resolution = '720p',
    ratio = '16:9',
    duration = 5,
  } = options

  const apiKey = getApiKeyForModel(model)

  if (!apiKey) {
    throw new Error('DOUBAO_SEEDANCE_API_KEY 或相关模型专用 API Key 环境变量未设置，请检查 .env 文件')
  }

  const apiHost = process.env.DOUBAO_SEEDANCE_API_HOST || process.env.MIDJOURNEY_API_HOST || 'https://api.302.ai'

  try {
    // 使用 1.5 Pro 模型（唯一支持首尾帧生视频的模型）
    const actualModel = 'doubao-seedance-1-5-pro-251215'

    console.log(`🎬 调用豆包 Seedance ${actualModel} 首尾帧生视频API:`, {
      firstFrameUrl: firstFrameUrl.substring(0, 100) + (firstFrameUrl.length > 100 ? '...' : ''),
      lastFrameUrl: lastFrameUrl.substring(0, 100) + (lastFrameUrl.length > 100 ? '...' : ''),
      model: actualModel,
      resolution,
      ratio,
      duration,
      hasText: !!text,
    })

    // 构建请求体（根据官方文档：首尾帧生视频需要 first_frame 和 last_frame）
    const requestBody = {
      model: actualModel,
      content: [
        {
          type: 'text',
          text: text || '生成从首帧到尾帧的视频',
        },
        {
          type: 'image_url',
          image_url: {
            url: firstFrameUrl,
          },
          role: 'first_frame',
        },
        {
          type: 'image_url',
          image_url: {
            url: lastFrameUrl,
          },
          role: 'last_frame',
        },
      ],
      service_tier: 'default',
      generate_audio: true, // 1.5 Pro 支持音频
    }

    // 设置参数
    if (resolution) {
      requestBody.content[0].resolution = resolution
    }
    if (ratio) {
      requestBody.content[0].ratio = ratio
    }
    if (duration) {
      requestBody.content[0].duration = duration
    }

    console.log('📤 发送请求到:', `${apiHost}/doubao/doubao-seedance`)
    console.log('📤 请求体:', JSON.stringify(requestBody, null, 2))

    const response = await fetch(`${apiHost}/doubao/doubao-seedance`, {
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
        throw new Error(`API密钥无效，请检查 DOUBAO_SEEDANCE_1_5_PRO_API_KEY 或 DOUBAO_SEEDANCE_API_KEY 环境变量`)
      }
      
      throw new Error(`豆包 Seedance 首尾帧生视频API调用失败: ${errorMessage}`)
    }

    const data = await response.json()
    
    console.log('✅ 豆包 Seedance 首尾帧生视频API响应:', JSON.stringify(data, null, 2))

    if (data.id) {
      return {
        taskId: data.id,
        status: 'pending',
        message: '首尾帧生视频任务已提交',
      }
    } else {
      throw new Error('API响应中未找到任务ID')
    }
  } catch (error) {
    console.error('❌ 豆包 Seedance 首尾帧生视频API调用错误:', error)
    
    if (error instanceof Error) {
      throw error
    }
    
    throw new Error(`豆包 Seedance 首尾帧生视频调用失败: ${error.message || '未知错误'}`)
  }
}

/**
 * 查询视频生成任务状态
 * @param {string} taskId - 任务ID
 * @returns {Promise<Object>} 返回任务状态和视频信息
 */
export async function getSeedanceTaskStatus(taskId) {
  // 尝试使用默认 API Key（查询接口可能不需要特定模型的 Key）
  const apiKey = process.env.DOUBAO_SEEDANCE_1_5_PRO_API_KEY || 
                 process.env.DOUBAO_SEEDANCE_1_0_LITE_API_KEY ||
                 process.env.DOUBAO_SEEDANCE_API_KEY || 
                 process.env.MIDJOURNEY_API_KEY

  if (!apiKey) {
    throw new Error('DOUBAO_SEEDANCE_API_KEY 或相关模型专用 API Key 环境变量未设置，请检查 .env 文件')
  }

  // 302.ai 使用火山引擎的API
  // 创建任务使用302.ai的接口：https://api.302.ai/doubao/doubao-seedance
  // 查询任务使用火山引擎官方接口：https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks/{id}
  const apiHost = process.env.DOUBAO_SEEDANCE_API_HOST || process.env.MIDJOURNEY_API_HOST || 'https://api.302.ai'
  const volcengineApiHost = process.env.VOLCENGINE_API_HOST || 'https://ark.cn-beijing.volces.com'

  try {
    console.log('🔍 查询豆包 Seedance 任务状态:', taskId)

    // 注意：302.ai的API Key不能直接用于火山引擎官方API
    // 应该使用302.ai自己的查询接口
    // 根据302.ai API文档，查询接口可能是：GET /doubao/task/{id} 或 GET /doubao/task/{id}/fetch
    
    let response = null
    let lastError = null
    
    // 尝试1: 302.ai官方查询接口 (根据官方文档：GET /doubao/doubao-seedance/{task_id})
    try {
      console.log('💡 使用302.ai官方接口: GET /doubao/doubao-seedance/{task_id}')
      response = await fetch(`${apiHost}/doubao/doubao-seedance/${taskId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (response.ok) {
        console.log('✅ 使用302.ai官方接口成功')
      } else {
        const errorData = await response.json().catch(() => ({}))
        lastError = errorData.message || errorData.error?.message || errorData.description || `HTTP ${response.status}`
        console.log(`⚠️ 302.ai官方接口返回: ${response.status}, 错误: ${lastError}`)
      }
    } catch (e) {
      console.log('⚠️ 302.ai官方接口失败，尝试备选接口...', e.message)
      lastError = e.message
    }
    
    // 尝试2: 302.ai的备选接口格式 (如果官方接口失败)
    if (!response || !response.ok) {
      try {
        console.log('💡 尝试302.ai备选接口: GET /doubao/task/{id}')
        response = await fetch(`${apiHost}/doubao/task/${taskId}`, {
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
          const tempError = errorData.message || errorData.error?.message || errorData.description || `HTTP ${response.status}`
          if (!lastError) {
            lastError = tempError
          }
        }
      } catch (e) {
        console.log('⚠️ 302.ai备选接口也失败')
      }
    }
    
    // 尝试4: 火山引擎官方API (需要单独的火山引擎API Key，302.ai的Key不能用)
    // 注意：如果302.ai的API Key不能用于火山引擎，这个接口会返回401
    // 只有在有单独的火山引擎API Key时才使用
    if ((!response || !response.ok) && process.env.VOLCENGINE_API_KEY) {
      try {
        console.log('💡 尝试火山引擎官方API: GET /api/v3/contents/generations/tasks/{id}')
        const volcengineApiKey = process.env.VOLCENGINE_API_KEY
        response = await fetch(`${volcengineApiHost}/api/v3/contents/generations/tasks/${taskId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${volcengineApiKey}`,
            'Content-Type': 'application/json',
          },
        })
        
        if (response.ok) {
          console.log('✅ 使用火山引擎官方API成功')
        } else {
          const errorData = await response.json().catch(() => ({}))
          const tempError = errorData.message || errorData.error?.message || errorData.description || `HTTP ${response.status}`
          if (!lastError) {
            lastError = tempError
          }
          console.log(`⚠️ 火山引擎官方API返回: ${response.status}, 错误: ${tempError}`)
        }
      } catch (e) {
        console.log('⚠️ 火山引擎官方API失败', e.message)
      }
    }

    if (!response || !response.ok) {
      const errorData = await response?.json().catch(() => ({}))
      const errorMessage = errorData.message || errorData.error?.message || errorData.description || lastError || `HTTP ${response?.status || 'unknown'}`
      
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
      // 返回处理中状态，让前端继续轮询
      return {
        taskId: data.id || taskId,
        status: 'processing',
        videoUrl: '',
        progress: 10, // 初始进度
        message: '任务已提交，等待模型可用...',
      }
    }

    // 解析响应格式（根据火山引擎官方文档）
    // 火山引擎官方API响应格式：
    // {
    //   "id": "cgt-2025******-****",
    //   "status": "succeeded",
    //   "content": {
    //     "video_url": "https://..."
    //   },
    //   ...
    // }
    const status = data.status || 'pending'
    
    // 视频URL在 content.video_url 中（火山引擎官方格式）
    const videoUrl = data.content?.video_url || data.content?.videoUrl || 
                     data.video_url || data.videoUrl || 
                     data.output?.video_url || data.output?.videoUrl || ''
    
    // 计算进度（根据状态）
    let progress = data.progress
    if (progress === undefined || progress === null) {
      // 根据状态估算进度
      if (status === 'succeeded' || status === 'completed' || status === 'success' || status === 'SUCCESS') {
        progress = 100
      } else if (status === 'processing' || status === 'running' || status === 'pending' || status === 'queued') {
        progress = 50 // 处理中，估算50%
      } else if (status === 'failed' || status === 'FAILED' || status === 'error') {
        progress = 0
      } else {
        progress = 10 // 默认10%
      }
    }

    return {
      taskId: data.id || taskId,
      status: status === 'succeeded' || status === 'completed' || status === 'success' || status === 'SUCCESS' ? 'completed' :
              status === 'failed' || status === 'FAILED' || status === 'error' ? 'failed' :
              status === 'processing' || status === 'running' || status === 'pending' || status === 'queued' ? 'processing' : 'pending',
      videoUrl: videoUrl,
      progress: typeof progress === 'number' ? progress : parseInt(progress) || 10,
      message: data.message || data.description || (status === 'succeeded' ? '视频生成完成' : status === 'processing' ? '视频生成中...' : ''),
    }
  } catch (error) {
    console.error('❌ 查询任务状态错误:', error)
    
    if (error instanceof Error) {
      throw error
    }
    
    throw new Error(`查询任务状态失败: ${error.message || '未知错误'}`)
  }
}

