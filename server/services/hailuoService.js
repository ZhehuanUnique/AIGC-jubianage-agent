/**
 * MiniMax Hailuo 视频生成服务
 * 支持模型：
 * - Hailuo-02 (minimax-hailuo-02)
 * - Hailuo-2.3 (minimax-hailuo-2.3)
 * - Hailuo-2.3-fast (minimax-hailuo-2.3-fast)
 * - Hailuo-01-Live (minimax-i2v-01-live) - 首尾帧生视频
 * - Hailuo-01-Director (minimax-i2v-01-director) - 首尾帧+参考图+镜头控制
 * - Hailuo-S2V (minimax-s2v-01) - 主体参考视频
 * 
 * API文档：
 * - Hailuo-02: https://302ai.apifox.cn/api-310678678
 * - Hailuo-2.3: https://302ai.apifox.cn/367818096e0
 * - I2V-01-Live: https://302.ai/product/detail/minimax-i2v-01-live
 * - I2V-01-Director: https://302.ai/product/detail/minimax-i2v-01-director
 * - S2V-01: https://302.ai/product/detail/minimax-s2v-01
 * - 任务查询: https://302ai.apifox.cn/211531465e0
 * - 视频下载: https://302ai.apifox.cn/211531587e0
 */

const API_BASE_URL = process.env.HAILUO_API_HOST || 'https://api.302.ai'

/**
 * 获取模型对应的API Key
 * @param {string} model - 模型名称
 * @returns {string} API Key
 */
function getApiKeyForModel(model) {
  switch (model) {
    case 'minimax-hailuo-02':
      return process.env.HAILUO_02_API_KEY
    case 'minimax-hailuo-2.3':
    case 'minimax-hailuo-2.3-fast':
      return process.env.HAILUO_23_API_KEY
    case 'minimax-i2v-01-live':
      return process.env.HAILUO_I2V_01_LIVE_API_KEY
    case 'minimax-i2v-01-director':
      return process.env.HAILUO_I2V_01_DIRECTOR_API_KEY
    case 'minimax-s2v-01':
      return process.env.HAILUO_S2V_01_API_KEY
    default:
      return process.env.HAILUO_02_API_KEY
  }
}

/**
 * 获取模型的API名称
 * @param {string} model - 内部模型名称
 * @returns {string} API模型名称
 */
function getApiModelName(model) {
  const modelMap = {
    'minimax-hailuo-02': 'MiniMax-Hailuo-02',
    'minimax-hailuo-2.3': 'MiniMax-Hailuo-2.3',
    'minimax-hailuo-2.3-fast': 'MiniMax-Hailuo-2.3-fast',
    'minimax-i2v-01-live': 'I2V-01-Live',
    'minimax-i2v-01-director': 'I2V-01-Director',
    'minimax-s2v-01': 'S2V-01'
  }
  return modelMap[model] || model
}

/**
 * 生成视频（图生视频）
 * @param {string} imageUrl - 图片URL或base64编码
 * @param {Object} options - 配置选项
 * @param {string} options.model - 模型名称
 * @param {string} options.resolution - 分辨率：'512P', '768P', '1080P'
 * @param {number} options.duration - 时长（秒）：6 或 10
 * @param {string} options.prompt - 提示词（可选）
 * @param {string} options.lastFrameImage - 末帧图片URL或base64（可选，用于首尾帧生视频）
 * @param {string} options.referenceImage - 参考图片URL（可选，用于Director和S2V模型）
 * @param {boolean} options.promptOptimizer - 是否优化提示词，默认true
 * @returns {Promise<Object>} 返回任务ID
 */
export async function generateVideoWithHailuo(imageUrl, options = {}) {
  const {
    model = 'minimax-hailuo-02',
    resolution = '768P',
    duration = 6,
    prompt = '',
    lastFrameImage = null,
    referenceImage = null,
    promptOptimizer = true,
  } = options

  const apiKey = getApiKeyForModel(model)
  if (!apiKey) {
    throw new Error(`模型 ${model} 的 API Key 未配置，请检查 .env 文件`)
  }

  const apiModelName = getApiModelName(model)

  // 验证分辨率
  const validResolutions = ['512P', '768P', '1080P']
  if (!validResolutions.includes(resolution)) {
    throw new Error(`不支持的分辨率: ${resolution}，支持的分辨率: ${validResolutions.join(', ')}`)
  }

  // 验证时长
  let validDurations
  if (resolution === '1080P') {
    validDurations = [6]
  } else {
    validDurations = [6, 10]
  }
  if (!validDurations.includes(duration)) {
    throw new Error(`分辨率 ${resolution} 不支持时长 ${duration}秒，支持的时长: ${validDurations.join(', ')}秒`)
  }

  try {
    console.log(`🎬 调用 MiniMax Hailuo API (${apiModelName}):`, {
      resolution,
      duration,
      hasFirstFrame: !!imageUrl,
      hasLastFrame: !!lastFrameImage,
      hasReferenceImage: !!referenceImage,
      hasPrompt: !!prompt,
    })

    // 构建请求体
    const requestBody = {
      model: apiModelName,
      prompt: prompt || '',
      prompt_optimizer: promptOptimizer,
      duration,
      resolution,
    }

    // 添加首帧图片
    if (imageUrl) {
      requestBody.first_frame_image = imageUrl
    }

    // 添加末帧图片（首尾帧生视频）
    if (lastFrameImage) {
      requestBody.last_frame_image = lastFrameImage
    }

    // 添加参考图片（Director和S2V模型）
    if (referenceImage) {
      requestBody.subject_reference = referenceImage
    }

    console.log('📤 发送请求到:', `${API_BASE_URL}/minimaxi/v1/video_generation`)
    console.log('📤 请求体:', JSON.stringify({ 
      ...requestBody, 
      first_frame_image: requestBody.first_frame_image ? '[图片数据]' : undefined, 
      last_frame_image: requestBody.last_frame_image ? '[图片数据]' : undefined,
      subject_reference: requestBody.subject_reference ? '[图片数据]' : undefined
    }, null, 2))

    const response = await fetch(`${API_BASE_URL}/minimaxi/v1/video_generation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ MiniMax Hailuo API 错误响应:', errorText)
      let errorMessage = `MiniMax Hailuo API 请求失败: ${response.status} ${response.statusText}`
      try {
        const errorJson = JSON.parse(errorText)
        if (errorJson.base_resp && errorJson.base_resp.status_msg) {
          errorMessage = `MiniMax Hailuo API 错误: ${errorJson.base_resp.status_msg}`
        } else if (errorJson.message) {
          errorMessage = `MiniMax Hailuo API 错误: ${errorJson.message}`
        }
      } catch (e) {
        // 如果无法解析JSON，使用默认错误消息
      }
      throw new Error(errorMessage)
    }

    const result = await response.json()
    console.log('📥 MiniMax Hailuo API 响应:', result)

    if (result.base_resp && result.base_resp.status_code !== 0) {
      const errorMsg = result.base_resp.status_msg || '未知错误'
      throw new Error(`MiniMax Hailuo API 错误: ${errorMsg}`)
    }

    const taskId = result.task_id || result.id || result.taskId || result.data
    if (!taskId) {
      console.error('❌ MiniMax Hailuo API响应格式异常:', JSON.stringify(result, null, 2))
      throw new Error(`MiniMax Hailuo API 返回数据格式错误：缺少任务ID。响应内容: ${JSON.stringify(result)}`)
    }

    return {
      taskId: taskId,
      provider: 'hailuo',
      model: model,
      status: result.status || 'pending',
      message: result.message || '视频生成任务已提交',
    }
  } catch (error) {
    console.error('❌ MiniMax Hailuo 视频生成失败:', error)
    throw error
  }
}

/**
 * 查询任务状态
 * @param {string} taskId - 任务ID
 * @param {string} model - 模型名称（用于获取正确的API Key）
 * @returns {Promise<Object>} 返回任务状态和视频信息
 */
export async function getHailuoTaskStatus(taskId, model = null) {
  // 尝试使用对应模型的API Key，如果没有则使用默认的
  let apiKey = model ? getApiKeyForModel(model) : null
  if (!apiKey) {
    apiKey = process.env.HAILUO_02_API_KEY || process.env.HAILUO_23_API_KEY
  }
  
  if (!apiKey) {
    throw new Error('HAILUO API Key 环境变量未设置，请检查 .env 文件')
  }

  try {
    console.log(`🔍 查询 MiniMax Hailuo 任务状态: ${taskId}`)

    const response = await fetch(`${API_BASE_URL}/minimaxi/v1/query/video_generation?task_id=${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ MiniMax Hailuo 查询错误响应:', errorText)
      throw new Error(`MiniMax Hailuo 查询失败: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()
    console.log('📥 MiniMax Hailuo 查询响应:', result)

    if (result.base_resp && result.base_resp.status_code !== 0) {
      throw new Error(`MiniMax Hailuo 查询错误: ${result.base_resp.status_msg || '未知错误'}`)
    }

    // 解析状态
    let status = 'processing'
    let progress = 0
    let videoUrl = null
    let videoWidth = null
    let videoHeight = null

    if (result.status === 'Success') {
      status = 'completed'
      progress = 100
      
      // 如果有 file_id，需要调用下载接口获取视频URL
      if (result.file_id) {
        try {
          const downloadResult = await getHailuoVideoDownloadUrl(result.file_id, apiKey)
          videoUrl = downloadResult.download_url
          videoWidth = result.video_width
          videoHeight = result.video_height
        } catch (downloadError) {
          console.warn('⚠️ 获取视频下载链接失败:', downloadError)
        }
      }
    } else if (result.status === 'Failed' || result.status === 'Error') {
      status = 'failed'
      progress = 0
    } else {
      status = 'processing'
      progress = 50
    }

    return {
      status,
      progress,
      videoUrl,
      videoWidth,
      videoHeight,
      message: result.base_resp?.status_msg || '处理中',
    }
  } catch (error) {
    console.error('❌ MiniMax Hailuo 任务状态查询失败:', error)
    throw error
  }
}

/**
 * 获取视频下载链接
 * @param {string} fileId - 文件ID
 * @param {string} apiKey - API Key
 * @returns {Promise<Object>} 返回下载链接
 */
async function getHailuoVideoDownloadUrl(fileId, apiKey) {
  try {
    console.log(`📥 获取 MiniMax Hailuo 视频下载链接: ${fileId}`)

    const response = await fetch(`${API_BASE_URL}/minimaxi/v1/files/retrieve?file_id=${fileId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    })

    if (!response.ok) {
      throw new Error(`获取视频下载链接失败: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()

    if (result.base_resp && result.base_resp.status_code !== 0) {
      throw new Error(`获取视频下载链接错误: ${result.base_resp.status_msg || '未知错误'}`)
    }

    if (!result.file || !result.file.download_url) {
      throw new Error('视频下载链接格式错误：缺少 download_url')
    }

    return {
      download_url: result.file.download_url,
      file_id: result.file.file_id,
      filename: result.file.filename,
    }
  } catch (error) {
    console.error('❌ 获取视频下载链接失败:', error)
    throw error
  }
}

/**
 * 检查模型是否支持首尾帧生视频
 * @param {string} model - 模型名称
 * @returns {boolean}
 */
export function supportsFirstLastFrame(model) {
  const supportedModels = [
    'minimax-hailuo-02',
    'minimax-hailuo-2.3',
    'minimax-hailuo-2.3-fast',
    'minimax-i2v-01-live',
    'minimax-i2v-01-director'
  ]
  return supportedModels.includes(model)
}

/**
 * 检查模型是否支持参考图
 * @param {string} model - 模型名称
 * @returns {boolean}
 */
export function supportsReferenceImage(model) {
  const supportedModels = [
    'minimax-i2v-01-director',
    'minimax-s2v-01'
  ]
  return supportedModels.includes(model)
}
