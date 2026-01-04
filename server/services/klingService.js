/**
 * Kling 可灵视频生成服务
 * 支持模型：
 * - Kling-2.6-5秒 (kling-2.6-5s)
 * - Kling-O1 (kling-o1)
 * 
 * API文档：
 * - Kling-2.6-5秒: https://302ai.apifox.cn/386524568e0
 * - Kling-O1: https://doc.302.ai/385221088e0
 * - 任务查询: https://302ai.apifox.cn/211531465e0
 */

import { uploadBuffer } from './cosService.js'

const API_BASE_URL = process.env.KLING_API_HOST || 'https://api.302.ai'

/**
 * 根据模型获取对应的 API Key
 * @param {string} model - 模型名称
 * @returns {string} API Key
 */
function getApiKeyForModel(model) {
  if (model === 'kling-2.6-5s' || model === 'kling-2.6-10s') {
    return process.env.KLING_26_API_KEY
  } else if (model === 'kling-o1') {
    return process.env.KLING_O1_API_KEY
  } else {
    throw new Error(`不支持的 Kling 模型: ${model}`)
  }
}

/**
 * 生成视频（图生视频）- Kling-2.6-5秒
 * @param {string} imageUrl - 图片URL或base64编码
 * @param {Object} options - 配置选项
 * @param {string} options.prompt - 提示词（可选）
 * @param {string} options.lastFrameImage - 尾帧图片URL或base64（可选）
 * @param {boolean} options.enableAudio - 是否生成音频，默认 false（开启音频后无法使用首尾帧）
 * @returns {Promise<Object>} 返回任务ID
 */
export async function generateVideoWithKling26(imageUrl, options = {}) {
  const {
    prompt = '',
    lastFrameImage = null,
    enableAudio = false,
  } = options

  const apiKey = process.env.KLING_26_API_KEY
  if (!apiKey) {
    throw new Error('KLING_26_API_KEY 环境变量未设置，请检查 .env 文件')
  }

  try {
    console.log('🎬 调用 Kling-2.6-5秒 API:', {
      hasFirstFrame: !!imageUrl,
      hasLastFrame: !!lastFrameImage,
      hasPrompt: !!prompt,
      enableAudio,
    })

    // 准备 multipart/form-data
    const FormData = (await import('form-data')).default
    const formData = new FormData()

    // 处理首帧图片
    if (imageUrl) {
      let imageBuffer
      if (imageUrl.startsWith('data:image/')) {
        // base64 图片
        const base64Data = imageUrl.split(',')[1] || imageUrl
        imageBuffer = Buffer.from(base64Data, 'base64')
      } else if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        // HTTP URL，需要下载
        const response = await fetch(imageUrl)
        if (!response.ok) {
          throw new Error(`下载首帧图片失败: ${response.status} ${response.statusText}`)
        }
        imageBuffer = Buffer.from(await response.arrayBuffer())
      } else {
        // 假设是 base64 字符串（没有 data: 前缀）
        imageBuffer = Buffer.from(imageUrl, 'base64')
      }
      formData.append('input_image', imageBuffer, {
        filename: 'first_frame.jpg',
        contentType: 'image/jpeg',
      })
    }

    // 处理尾帧图片（如果提供且未开启音频）
    if (lastFrameImage && !enableAudio) {
      let tailImageBuffer
      if (lastFrameImage.startsWith('data:image/')) {
        const base64Data = lastFrameImage.split(',')[1] || lastFrameImage
        tailImageBuffer = Buffer.from(base64Data, 'base64')
      } else if (lastFrameImage.startsWith('http://') || lastFrameImage.startsWith('https://')) {
        const response = await fetch(lastFrameImage)
        if (!response.ok) {
          throw new Error(`下载尾帧图片失败: ${response.status} ${response.statusText}`)
        }
        tailImageBuffer = Buffer.from(await response.arrayBuffer())
      } else {
        tailImageBuffer = Buffer.from(lastFrameImage, 'base64')
      }
      formData.append('tail_image', tailImageBuffer, {
        filename: 'last_frame.jpg',
        contentType: 'image/jpeg',
      })
    }

    // 添加提示词
    if (prompt) {
      formData.append('prompt', prompt)
    }

    // 添加音频选项
    formData.append('enable_audio', enableAudio.toString())

    console.log('📤 发送请求到:', `${API_BASE_URL}/klingai/m2v_26_image2video_5s`)

    const response = await fetch(`${API_BASE_URL}/klingai/m2v_26_image2video_5s`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        ...formData.getHeaders(),
      },
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Kling-2.6 API 错误响应:', errorText)
      throw new Error(`Kling-2.6 API 请求失败: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()
    console.log('📥 Kling-2.6 API 响应:', result)

    if (result.status !== 200 || result.result !== 1) {
      throw new Error(`Kling-2.6 API 错误: ${result.message || '未知错误'}`)
    }

    if (!result.data || !result.data.task || !result.data.task.id) {
      throw new Error('Kling-2.6 API 返回数据格式错误：缺少 task_id')
    }

    return {
      taskId: result.data.task.id,
      status: 'processing',
      provider: 'kling',
      model: 'kling-2.6-5s',
    }
  } catch (error) {
    console.error('❌ Kling-2.6 视频生成失败:', error)
    throw error
  }
}

/**
 * 生成视频（图生视频）- Kling-O1
 * @param {string} imageUrl - 图片URL或base64编码
 * @param {Object} options - 配置选项
 * @param {string} options.prompt - 提示词（必需）
 * @param {string} options.lastFrameImage - 尾帧图片URL或base64（可选，用于首尾帧模式）
 * @param {string} options.o1Type - O1类型：'referImage'（图片参考）、'firstTail'（首尾帧）、'baseVideo'（视频编辑）、'referVideo'（视频参考），默认 'referImage'
 * @param {string} options.aspectRatio - 宽高比：'auto', '9:16', '1:1', '16:9'，默认 'auto'
 * @param {number} options.duration - 视频时长（秒），5-10秒，默认 5
 * @param {boolean} options.keepOriginalSound - 是否使用视频原声（仅视频编辑模式），默认 false
 * @returns {Promise<Object>} 返回任务ID
 */
export async function generateVideoWithKlingO1(imageUrl, options = {}) {
  const {
    prompt = '',
    lastFrameImage = null,
    o1Type = 'referImage',
    aspectRatio = 'auto',
    duration = 5,
    keepOriginalSound = false,
  } = options

  const apiKey = process.env.KLING_O1_API_KEY
  if (!apiKey) {
    throw new Error('KLING_O1_API_KEY 环境变量未设置，请检查 .env 文件')
  }

  try {
    console.log('🎬 调用 Kling-O1 API:', {
      o1Type,
      aspectRatio,
      duration,
      hasFirstFrame: !!imageUrl,
      hasLastFrame: !!lastFrameImage,
      hasPrompt: !!prompt,
    })

    // 构建请求体
    const requestBody = {
      prompt,
      duration: Math.max(5, Math.min(10, duration)), // 限制在 5-10 秒
      aspect_ratio: aspectRatio,
      o1_type: o1Type,
      images: [],
      videos: [],
    }

    // 处理图片（首帧和尾帧）
    if (imageUrl) {
      // 如果是 URL，直接使用；如果是 base64，需要转换为 URL 或上传到 COS
      let firstFrameUrl = imageUrl
      if (imageUrl.startsWith('data:image/') || (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://'))) {
        // base64 图片，需要上传到 COS
        const base64Data = imageUrl.includes(',') ? imageUrl.split(',')[1] : imageUrl
        const imageBuffer = Buffer.from(base64Data, 'base64')
        const cosKey = `kling/first_frame_${Date.now()}.jpg`
        const uploadResult = await uploadBuffer(imageBuffer, cosKey, 'image/jpeg')
        firstFrameUrl = uploadResult.url
      }
      requestBody.images.push(firstFrameUrl)

      // 如果有尾帧（首尾帧模式）
      if (lastFrameImage && o1Type === 'firstTail') {
        let lastFrameUrl = lastFrameImage
        if (lastFrameImage.startsWith('data:image/') || (!lastFrameImage.startsWith('http://') && !lastFrameImage.startsWith('https://'))) {
          const base64Data = lastFrameImage.includes(',') ? lastFrameImage.split(',')[1] : lastFrameImage
          const imageBuffer = Buffer.from(base64Data, 'base64')
          const cosKey = `kling/last_frame_${Date.now()}.jpg`
          const uploadResult = await uploadBuffer(imageBuffer, cosKey, 'image/jpeg')
          lastFrameUrl = uploadResult.url
        }
        requestBody.images.push(lastFrameUrl)
      }
    }

    // 视频编辑和视频参考模式需要视频 URL（这里暂时不支持，需要前端传入）
    // if (o1Type === 'baseVideo' || o1Type === 'referVideo') {
    //   requestBody.videos = [videoUrl]
    // }

    // 视频原声选项（仅视频编辑模式）
    if (o1Type === 'baseVideo') {
      requestBody.keep_original_sound = keepOriginalSound
    }

    console.log('📤 发送请求到:', `${API_BASE_URL}/klingai/m2v_omni_video`)
    console.log('📤 请求体:', JSON.stringify({ ...requestBody, images: requestBody.images.map(() => '[图片URL]') }, null, 2))

    const response = await fetch(`${API_BASE_URL}/klingai/m2v_omni_video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Kling-O1 API 错误响应:', errorText)
      throw new Error(`Kling-O1 API 请求失败: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()
    console.log('📥 Kling-O1 API 响应:', result)

    if (result.status !== 200 || result.result !== 1) {
      throw new Error(`Kling-O1 API 错误: ${result.message || '未知错误'}`)
    }

    if (!result.data || !result.data.task || !result.data.task.id) {
      throw new Error('Kling-O1 API 返回数据格式错误：缺少 task_id')
    }

    return {
      taskId: result.data.task.id,
      status: 'processing',
      provider: 'kling',
      model: 'kling-o1',
    }
  } catch (error) {
    console.error('❌ Kling-O1 视频生成失败:', error)
    throw error
  }
}

/**
 * 查询任务状态（Kling 2.6 和 O1 共用查询接口）
 * @param {string} taskId - 任务ID
 * @param {string} model - 模型名称（用于选择 API Key）
 * @returns {Promise<Object>} 返回任务状态和视频信息
 */
export async function getKlingTaskStatus(taskId, model = 'kling-2.6-5s') {
  // 尝试使用对应模型的 API Key
  let apiKey = getApiKeyForModel(model)
  if (!apiKey) {
    // 如果获取失败，尝试使用另一个模型的 API Key（查询接口是通用的）
    apiKey = process.env.KLING_26_API_KEY || process.env.KLING_O1_API_KEY
  }

  if (!apiKey) {
    throw new Error('KLING_26_API_KEY 或 KLING_O1_API_KEY 环境变量未设置，请检查 .env 文件')
  }

  try {
    console.log(`🔍 查询 Kling 任务状态: ${taskId} (模型: ${model})`)

    const response = await fetch(`${API_BASE_URL}/klingai/query?task_id=${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Kling 查询错误响应:', errorText)
      throw new Error(`Kling 查询失败: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()
    console.log('📥 Kling 查询响应:', result)

    if (result.status !== 200 || result.result !== 1) {
      throw new Error(`Kling 查询错误: ${result.message || '未知错误'}`)
    }

    // 解析状态
    let status = 'processing'
    let progress = 0
    let videoUrl = null

    const taskStatus = result.data?.task?.status
    if (taskStatus === 10) {
      status = 'processing'
      progress = 50 // 处理中，假设 50%
    } else if (taskStatus === 50) {
      status = 'failed'
      progress = 0
    } else if (taskStatus === 99) {
      status = 'completed'
      progress = 100
      // 获取视频 URL
      if (result.data?.works && result.data.works.length > 0) {
        videoUrl = result.data.works[0]
      }
    }

    return {
      status,
      progress,
      videoUrl,
      taskId,
      provider: 'kling',
    }
  } catch (error) {
    console.error('❌ Kling 任务状态查询失败:', error)
    throw error
  }
}

