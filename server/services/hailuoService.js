/**
 * MiniMax Hailuo 视频生成服务
 * 支持模型：
 * - MiniMax-Hailuo-02
 * - MiniMax-Hailuo-2.3
 * - MiniMax-Hailuo-2.3-fast
 * 
 * API文档：
 * - Hailuo-02: https://302ai.apifox.cn/api-310678678
 * - Hailuo-2.3: https://302ai.apifox.cn/367818096e0
 * - 任务查询: https://302ai.apifox.cn/211531465e0
 * - 视频下载: https://302ai.apifox.cn/211531587e0
 */

const API_BASE_URL = process.env.HAILUO_API_HOST || 'https://api.302.ai'

/**
 * 生成视频（图生视频）
 * @param {string} imageUrl - 图片URL或base64编码
 * @param {Object} options - 配置选项
 * @param {string} options.model - 模型名称：'minimax-hailuo-02' 或 'minimax-hailuo-2.3' 或 'minimax-hailuo-2.3-fast'
 * @param {string} options.resolution - 分辨率：'512P', '768P', '1080P'
 * @param {number} options.duration - 时长（秒）：6 或 10
 * @param {string} options.prompt - 提示词（可选）
 * @param {string} options.lastFrameImage - 末帧图片URL或base64（可选）
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
    promptOptimizer = true,
  } = options

  // 根据模型名称获取对应的API Key
  let apiKey
  if (model === 'minimax-hailuo-02') {
    apiKey = process.env.HAILUO_02_API_KEY
    if (!apiKey) {
      throw new Error('HAILUO_02_API_KEY 环境变量未设置，请检查 .env 文件')
    }
  } else if (model === 'minimax-hailuo-2.3' || model === 'minimax-hailuo-2.3-fast') {
    apiKey = process.env.HAILUO_23_API_KEY
    if (!apiKey) {
      throw new Error('HAILUO_23_API_KEY 环境变量未设置，请检查 .env 文件')
    }
  } else {
    throw new Error(`不支持的模型: ${model}`)
  }

  // 映射模型名称到API需要的格式
  let apiModelName
  if (model === 'minimax-hailuo-02') {
    apiModelName = 'MiniMax-Hailuo-02'
  } else if (model === 'minimax-hailuo-2.3') {
    apiModelName = 'MiniMax-Hailuo-2.3'
  } else if (model === 'minimax-hailuo-2.3-fast') {
    apiModelName = 'MiniMax-Hailuo-2.3-fast'
  }

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

  // 对于 512P，必须提供首帧图片
  if (resolution === '512P' && !imageUrl) {
    throw new Error('分辨率 512P 必须提供首帧图片（first_frame_image）')
  }

  try {
    console.log(`🎬 调用 MiniMax Hailuo API (${apiModelName}):`, {
      resolution,
      duration,
      hasFirstFrame: !!imageUrl,
      hasLastFrame: !!lastFrameImage,
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
      if (imageUrl.startsWith('data:image/') || imageUrl.startsWith('base64,')) {
        requestBody.first_frame_image = imageUrl
      } else if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        requestBody.first_frame_image = imageUrl
      } else {
        // 假设是base64字符串（没有data:前缀）
        requestBody.first_frame_image = imageUrl
      }
    }

    // 添加末帧图片（如果提供）
    if (lastFrameImage) {
      if (lastFrameImage.startsWith('data:image/') || lastFrameImage.startsWith('base64,')) {
        requestBody.last_frame_image = lastFrameImage
      } else if (lastFrameImage.startsWith('http://') || lastFrameImage.startsWith('https://')) {
        requestBody.last_frame_image = lastFrameImage
      } else {
        requestBody.last_frame_image = lastFrameImage
      }
    }

    console.log('📤 发送请求到:', `${API_BASE_URL}/minimaxi/v1/video_generation`)
    console.log('📤 请求体:', JSON.stringify({ ...requestBody, first_frame_image: requestBody.first_frame_image ? '[图片数据]' : undefined, last_frame_image: requestBody.last_frame_image ? '[图片数据]' : undefined }, null, 2))

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
      throw new Error(`MiniMax Hailuo API 请求失败: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()
    console.log('📥 MiniMax Hailuo API 响应:', result)

    if (result.base_resp && result.base_resp.status_code !== 0) {
      throw new Error(`MiniMax Hailuo API 错误: ${result.base_resp.status_msg || '未知错误'}`)
    }

    if (!result.task_id) {
      throw new Error('MiniMax Hailuo API 返回数据格式错误：缺少 task_id')
    }

    return {
      taskId: result.task_id,
      provider: 'hailuo',
      model: model,
    }
  } catch (error) {
    console.error('❌ MiniMax Hailuo 视频生成失败:', error)
    throw error
  }
}

/**
 * 查询任务状态
 * @param {string} taskId - 任务ID
 * @returns {Promise<Object>} 返回任务状态和视频信息
 */
export async function getHailuoTaskStatus(taskId) {
  // 尝试使用 Hailuo-02 的 API Key（因为查询接口是通用的）
  let apiKey = process.env.HAILUO_02_API_KEY || process.env.HAILUO_23_API_KEY
  if (!apiKey) {
    throw new Error('HAILUO_02_API_KEY 或 HAILUO_23_API_KEY 环境变量未设置，请检查 .env 文件')
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
          // 即使下载链接获取失败，也返回成功状态
        }
      }
    } else if (result.status === 'Failed' || result.status === 'Error') {
      status = 'failed'
      progress = 0
    } else {
      // 处理中
      status = 'processing'
      progress = 50 // 默认进度
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
      const errorText = await response.text()
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





