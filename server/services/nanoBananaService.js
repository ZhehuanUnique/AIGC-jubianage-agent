/**
 * Nano Banana Pro 文生图服务
 * 文档: https://grsai.com/zh/dashboard/documents/nano-banana
 * 备选方案: 302.ai API (如果 Grsai API 失败)
 */

/**
 * 使用 302.ai API 生成图片（备选方案，支持文生图和图生图）
 */
async function generateImageWith302AI(prompt, options = {}) {
  const apiKey = process.env.MIDJOURNEY_API_KEY || process.env.DASHSCOPE_API_KEY // 使用 302.ai 的 API Key
  const apiHost = process.env.MIDJOURNEY_API_HOST || 'https://api.302.ai'

  if (!apiKey) {
    throw new Error('未配置 302.ai API Key，请设置 MIDJOURNEY_API_KEY 或 DASHSCOPE_API_KEY 环境变量')
  }

  const { 
    aspectRatio = 'auto', 
    size = '2K',
    referenceImage, // 参考图片（用于图生图）
  } = options

  const isImageToImage = !!referenceImage

  try {
    console.log(`🔄 使用 302.ai API 生成图片 (${isImageToImage ? '图生图' : '文生图'})`)

    // 构建请求体
    const requestBody = {
      prompt: prompt,
      aspect_ratio: aspectRatio === 'auto' ? '16:9' : aspectRatio,
      resolution: size.toLowerCase(), // 1k, 2k, 4k
    }

    // 如果有参考图片，添加到请求体中
    if (referenceImage) {
      if (referenceImage.startsWith('data:image/') || referenceImage.startsWith('base64,')) {
        requestBody.image = referenceImage
      } else if (referenceImage.startsWith('http://') || referenceImage.startsWith('https://')) {
        requestBody.image_url = referenceImage
      } else {
        requestBody.image = referenceImage
      }
    }

    // 根据是否有参考图片选择不同的API端点
    const apiEndpoint = isImageToImage
      ? `${apiHost}/ws/api/v3/google/nano-banana-pro/image-to-image`
      : `${apiHost}/ws/api/v3/google/nano-banana-pro/text-to-image`

    // 302.ai 的 nano-banana-pro API
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP ${response.status}`)
    }

    const data = await response.json()
    console.log('✅ 302.ai API响应:', JSON.stringify(data, null, 2))

    if (data.code === 200 && data.data) {
      // 清理 taskId，移除末尾的斜杠
      const cleanTaskId = (data.data.id || '').replace(/\/$/, '')
      const resultUrl = data.data.urls?.get || ''
      
      const result = {
        taskId: cleanTaskId,
        status: data.data.status || 'pending',
        message: data.message || '图片生成任务已提交',
        resultUrl: resultUrl, // 302.ai 的查询URL
        provider: '302ai', // 标记使用 302.ai
      }
      console.log('✅ 302.ai 返回的任务信息:', JSON.stringify(result, null, 2))
      return result
    } else {
      throw new Error(data.message || '302.ai API 调用失败')
    }
  } catch (error) {
    console.error('❌ 302.ai API调用错误:', error)
    throw error
  }
}

/**
 * 使用 Nano Banana Pro 生成图片（支持文生图和图生图）
 * @param {string} prompt - 文生图提示词
 * @param {Object} options - 生成选项
 * @param {string} options.aspectRatio - 宽高比 (auto, 16:9, 1:1, 9:16, 21:9)
 * @param {string} options.size - 图片尺寸 (1K, 2K, 4K)
 * @param {string} options.referenceImage - 参考图片URL或base64（用于图生图）
 * @param {string} options.referenceImageUrl - 参考图片URL（用于图生图，与referenceImage二选一）
 * @returns {Promise<Object>} 返回任务ID和状态
 */
export async function generateImageWithNanoBanana(prompt, options = {}) {
  const apiKey = process.env.NANO_BANANA_API_KEY
  const apiHost = process.env.NANO_BANANA_API_HOST || 'https://grsai.dakka.com.cn'

  if (!apiKey) {
    throw new Error('NANO_BANANA_API_KEY 环境变量未设置，请检查 .env 文件')
  }

  const {
    aspectRatio = 'auto',
    size = '1K',
    referenceImage, // 参考图片（base64或URL）
    referenceImageUrl, // 参考图片URL
  } = options

  // 确定参考图片（优先使用 referenceImageUrl，其次 referenceImage）
  const imageRef = referenceImageUrl || referenceImage
  const isImageToImage = !!imageRef

  try {
    console.log(`🎨 调用 Nano Banana Pro ${isImageToImage ? '图生图' : '文生图'}API:`, {
      prompt: prompt.substring(0, 50) + '...',
      aspectRatio,
      size,
      hasReferenceImage: !!imageRef,
    })

    // 构建请求体
    const requestBody = {
      prompt: prompt,
      aspect_ratio: aspectRatio,
      size: size,
    }

    // 如果有参考图片，添加到请求体中（图生图模式）
    if (imageRef) {
      // 判断是base64还是URL
      if (imageRef.startsWith('data:image/') || imageRef.startsWith('base64,')) {
        // base64格式
        requestBody.image = imageRef
      } else if (imageRef.startsWith('http://') || imageRef.startsWith('https://')) {
        // URL格式
        requestBody.image_url = imageRef
      } else {
        // 假设是base64字符串（没有data:前缀）
        requestBody.image = imageRef
      }
    }

    // 根据是否有参考图片选择不同的API端点
    const apiEndpoint = isImageToImage 
      ? `${apiHost}/v1/draw/nano-banana-image-to-image` 
      : `${apiHost}/v1/draw/nano-banana`
    
    console.log('📤 发送请求到:', apiEndpoint)
    console.log('📤 请求体:', JSON.stringify({
      ...requestBody,
      image: requestBody.image ? '[base64数据已隐藏]' : undefined,
      image_url: requestBody.image_url || undefined,
    }, null, 2))

    // 调用 Nano Banana Pro 接口（文生图或图生图）
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    })

    const data = await response.json()
    console.log('📥 API响应状态:', response.status, response.statusText)
    console.log('✅ Nano Banana Pro API响应:', JSON.stringify(data, null, 2))

    // 检查 API 是否返回错误
    if (data.code === -1 || data.msg === 'model not found') {
      console.error('❌ Grsai API 返回 "model not found"，尝试使用 302.ai API')
      
      // 如果 Grsai API 失败，尝试使用 302.ai 的 API
      return await generateImageWith302AI(prompt, { 
        aspectRatio, 
        size,
        referenceImage: imageRef, // 传递参考图片
      })
    }

    if (!response.ok) {
      const errorMessage = data.msg || data.message || data.error?.message || `HTTP ${response.status}`
      
      if (response.status === 401) {
        throw new Error('API密钥无效，请检查 NANO_BANANA_API_KEY 环境变量')
      }
      
      throw new Error(`Nano Banana Pro API调用失败: ${errorMessage}`)
    }

    // 检查并提取 taskId
    const taskId = data.task_id || data.taskId || data.result?.task_id || data.result?.taskId || data.data?.task_id || data.data?.taskId || data.id
    
    if (!taskId) {
      console.error('❌ Nano Banana Pro API响应中未找到 taskId:', JSON.stringify(data, null, 2))
      // 如果 Grsai API 失败，尝试使用 302.ai 的 API
      console.log('🔄 尝试使用 302.ai API 作为备选方案')
      return await generateImageWith302AI(prompt, { 
        aspectRatio, 
        size,
        referenceImage: imageRef, // 传递参考图片
      })
    }

    console.log('✅ 提取的 taskId:', taskId)

    // 返回任务信息
    const result = {
      taskId: taskId,
      status: data.status || 'pending',
      message: data.message || '图片生成任务已提交',
    }
    
    // 如果使用了 302.ai API，保存 resultUrl
    if (data.resultUrl) {
      result.resultUrl = data.resultUrl
      result.provider = '302ai' // 标记使用 302.ai
    } else {
      result.provider = 'grsai' // 标记使用 Grsai
    }
    
    return result
  } catch (error) {
    console.error('❌ Nano Banana Pro API调用错误:', error)
    
    if (error instanceof Error) {
      throw error
    }
    
    throw new Error(`Nano Banana Pro 调用失败: ${error.message || '未知错误'}`)
  }
}

/**
 * 查询图片生成任务状态
 * @param {string} taskId - 任务ID
 * @param {string} resultUrl - 302.ai 的查询URL（可选）
 * @returns {Promise<Object>} 返回任务状态和图片信息
 */
export async function getNanoBananaTaskStatus(taskId, resultUrl = null) {
  // 如果提供了 302.ai 的查询URL，使用 302.ai API
  if (resultUrl) {
    const apiKey = process.env.MIDJOURNEY_API_KEY || process.env.DASHSCOPE_API_KEY
    if (apiKey) {
      try {
        console.log('🔍 使用 302.ai API 查询任务状态:', resultUrl)
        const response = await fetch(resultUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
        })

        if (response.ok) {
          const responseData = await response.json()
          console.log('✅ 302.ai 任务状态查询结果:', JSON.stringify(responseData, null, 2))

          // 302.ai API 返回的数据结构：{ code, message, data: { status, outputs, ... } }
          const taskData = responseData.data || responseData
          const taskStatus = taskData.status || 'pending'
          
          // 尝试多种可能的 outputs 字段名
          const outputs = taskData.outputs || taskData.output || taskData.images || taskData.image_urls || []
          // 如果 outputs 是字符串，转换为数组
          const outputArray = Array.isArray(outputs) ? outputs : (outputs ? [outputs] : [])
          
          // 尝试获取图片URL（可能是单个字符串或数组）
          const imageUrl = taskData.image_url || taskData.imageUrl || taskData.url || 
                          (outputArray.length > 0 ? outputArray[0] : '')
          
          console.log('📊 302.ai 任务状态详情:', {
            taskStatus,
            hasOutputs: outputArray.length > 0,
            hasImageUrl: !!imageUrl,
            createdAt: taskData.created_at,
            error: taskData.error,
            progress: taskData.progress,
            fullData: JSON.stringify(taskData, null, 2),
          })

          // 检查任务是否完成：状态为 succeeded/success/completed，且有图片URL
          const isCompleted = (
            (taskStatus === 'succeeded' || taskStatus === 'success' || taskStatus === 'completed' || taskStatus === 'SUCCESS') &&
            (imageUrl || outputArray.length > 0)
          )
          
          if (isCompleted) {
            const finalImageUrl = imageUrl || outputArray[0]
            console.log('✅ 302.ai 任务完成，返回图片URL:', finalImageUrl)
            return {
              taskId: taskId,
              status: 'completed',
              imageUrl: finalImageUrl,
              progress: 100,
              message: '生成完成',
            }
          } else if (taskStatus === 'failed' || taskStatus === 'FAILURE' || taskData.error) {
            console.log('❌ 302.ai 任务失败:', taskData.error)
            return {
              taskId: taskId,
              status: 'failed',
              progress: 0,
              message: taskData.error || '生成失败',
            }
          } else {
            // 处理中或等待中，统一使用 processing 状态
            // 计算进度：根据执行时间估算（302.ai 通常需要 10-60 秒）
            const createdAt = taskData.created_at ? new Date(taskData.created_at).getTime() : Date.now()
            const elapsed = (Date.now() - createdAt) / 1000 // 秒
            
            // 根据状态调整进度计算
            let estimatedProgress = 10 // 默认进度
            
            if (taskStatus === 'processing' || taskStatus === 'running') {
              // 处理中：根据时间估算，最多到95%
              estimatedProgress = Math.min(95, Math.max(20, Math.floor((elapsed / 60) * 100)))
            } else if (taskStatus === 'created' || taskStatus === 'queued') {
              // 已创建/排队中：固定进度10-20%
              estimatedProgress = Math.min(20, Math.max(10, Math.floor((elapsed / 10) * 10)))
            } else if (taskStatus === 'pending') {
              // 等待中：固定进度10%
              estimatedProgress = 10
            }
            
            console.log(`⏳ 302.ai 任务处理中: ${taskStatus}, 已耗时 ${elapsed.toFixed(1)}秒, 估算进度 ${estimatedProgress}%`)
            
            return {
              taskId: taskId,
              status: 'processing', // 统一返回 processing，避免状态切换导致进度倒退
              progress: estimatedProgress,
              message: taskStatus === 'processing' || taskStatus === 'running' ? '生成中...' : '等待处理...',
            }
          }
        }
      } catch (error) {
        console.warn('⚠️ 302.ai API 查询失败，尝试 Grsai API:', error)
      }
    }
  }

  // 使用 Grsai API
  const apiKey = process.env.NANO_BANANA_API_KEY
  const apiHost = process.env.NANO_BANANA_API_HOST || 'https://grsai.dakka.com.cn'

  if (!apiKey) {
    throw new Error('NANO_BANANA_API_KEY 环境变量未设置，请检查 .env 文件')
  }

  try {
    console.log('🔍 查询 Nano Banana Pro 任务状态:', taskId)

    const response = await fetch(`${apiHost}/v1/draw/result`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        task_id: taskId,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.message || errorData.error?.message || `HTTP ${response.status}`
      throw new Error(`查询任务状态失败: ${errorMessage}`)
    }

    const data = await response.json()
    
    console.log('✅ 任务状态查询结果:', JSON.stringify(data, null, 2))

    return {
      taskId: data.task_id || taskId,
      status: data.status || 'pending', // pending, processing, completed, failed
      imageUrl: data.image_url || data.imageUrl,
      progress: data.progress || 0,
      message: data.message || '',
    }
  } catch (error) {
    console.error('❌ 查询任务状态错误:', error)
    
    if (error instanceof Error) {
      throw error
    }
    
    throw new Error(`查询任务状态失败: ${error.message || '未知错误'}`)
  }
}

