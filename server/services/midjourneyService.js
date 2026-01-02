/**
 * Midjourney v7 t2i 文生图服务
 * 文档: https://302ai.apifox.cn/api-160578879
 */

/**
 * 使用 Midjourney v7 t2i 生成图片
 * @param {string} prompt - 文生图提示词
 * @param {Object} options - 生成选项
 * @param {string} options.botType - bot类型，MID_JOURNEY(默认) 或 NIJI_JOURNEY
 * @param {Array<string>} options.base64Array - 垫图base64数组（可选）
 * @param {string} options.notifyHook - 回调地址（可选）
 * @param {string} options.state - 自定义参数（可选）
 * @param {string} options.aspectRatio - 宽高比，如 '16:9', '9:16', '1:1'（会添加到 prompt 中）
 * @param {string} options.resolution - 分辨率：2K（需要通过 Upscaler 实现）
 * @returns {Promise<Object>} 返回任务ID和状态
 */
export async function generateImageWithMidjourney(prompt, options = {}) {
  const apiKey = process.env.MIDJOURNEY_API_KEY
  const apiHost = process.env.MIDJOURNEY_API_HOST || 'https://api.302.ai'

  if (!apiKey) {
    throw new Error('MIDJOURNEY_API_KEY 环境变量未设置，请检查 .env 文件')
  }

  const {
    botType = 'MID_JOURNEY',
    base64Array = [],
    notifyHook = '',
    state = '',
    aspectRatio, // 宽高比，如 '16:9', '9:16', '1:1'
    resolution, // 分辨率：2K（需要通过 Upscaler 实现）
  } = options

  try {
    // 处理宽高比：Midjourney 需要在 prompt 中添加 --ar 参数
    let finalPrompt = prompt
    if (aspectRatio && aspectRatio !== 'auto') {
      // 检查 prompt 中是否已经包含 --ar 参数
      const hasAspectRatio = /--ar\s+\d+:\d+/i.test(prompt)
      if (!hasAspectRatio) {
        // 将宽高比添加到 prompt 末尾
        // 注意：即使设置了 --ar，Midjourney 仍然会生成4张图片的网格，但每张图片会按照指定的宽高比生成
        finalPrompt = `${prompt} --ar ${aspectRatio}`
      }
    } else {
      // 如果没有指定宽高比，默认使用 16:9（而不是 1:1）
      const hasAspectRatio = /--ar\s+\d+:\d+/i.test(prompt)
      if (!hasAspectRatio) {
        finalPrompt = `${prompt} --ar 16:9`
      }
    }

    console.log('🎨 调用 Midjourney v7 t2i API:', {
      prompt: finalPrompt.substring(0, 50) + '...',
      botType,
      aspectRatio: aspectRatio || '未设置（默认16:9）',
      finalPrompt: finalPrompt, // 输出完整的 prompt 以便调试
    })

    // 构建请求体
    const requestBody = {
      prompt: finalPrompt, // 使用包含 --ar 参数的 prompt
      botType: botType,
      base64Array: base64Array,
      notifyHook: notifyHook,
      state: state,
    }

    // 调用 Midjourney Imagine 接口
    const response = await fetch(`${apiHost}/mj/submit/imagine`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'mj-api-secret': apiKey,
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.description || errorData.message || `HTTP ${response.status}`
      
      if (response.status === 401) {
        throw new Error('API密钥无效，请检查 MIDJOURNEY_API_KEY 环境变量')
      }
      
      throw new Error(`Midjourney API调用失败: ${errorMessage}`)
    }

    const data = await response.json()
    
    console.log('✅ Midjourney API响应:', JSON.stringify(data, null, 2))

    // 解析响应
    // code: 1(提交成功), 22(排队中), other(错误)
    if (data.code === 1 || data.code === 22) {
      return {
        taskId: data.result,
        status: data.code === 1 ? 'submitted' : 'queued',
        message: data.description || '图片生成任务已提交',
      }
    } else {
      throw new Error(data.description || '任务提交失败')
    }
  } catch (error) {
    console.error('❌ Midjourney API调用错误:', error)
    
    if (error instanceof Error) {
      throw error
    }
    
    throw new Error(`Midjourney 调用失败: ${error.message || '未知错误'}`)
  }
}

/**
 * 查询图片生成任务状态
 * @param {string} taskId - 任务ID
 * @param {Object} options - 查询选项
 * @param {string} options.resolution - 分辨率：2K（如果任务完成且需要放大，会自动调用 Upscale）
 * @returns {Promise<Object>} 返回任务状态和图片信息
 */
export async function getMidjourneyTaskStatus(taskId, options = {}) {
  const apiKey = process.env.MIDJOURNEY_API_KEY
  const apiHost = process.env.MIDJOURNEY_API_HOST || 'https://api.302.ai'

  if (!apiKey) {
    throw new Error('MIDJOURNEY_API_KEY 环境变量未设置，请检查 .env 文件')
  }

  const { resolution } = options

  try {
    console.log('🔍 查询 Midjourney 任务状态:', taskId)

    // 使用 /mj/task/{id}/fetch 接口查询任务状态
    const response = await fetch(`${apiHost}/mj/task/${taskId}/fetch`, {
      method: 'GET',
      headers: {
        'mj-api-secret': apiKey,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.description || errorData.message || `HTTP ${response.status}`
      throw new Error(`查询任务状态失败: ${errorMessage}`)
    }

    const data = await response.json()
    
    console.log('✅ 任务状态查询结果:', JSON.stringify(data, null, 2))

    // Midjourney 生成4张图片的网格后，直接返回网格图，不等待 Upscale
    // 网格图生成完成就返回，让前端立即跳转
    if (data.status === 'SUCCESS' && data.buttons && data.buttons.length > 0) {
      // 如果有网格图 URL，直接返回完成状态
      const gridImageUrl = data.imageUrl || (data.imageUrls && data.imageUrls.length > 0 ? data.imageUrls[0] : '')
      
      if (gridImageUrl) {
        console.log('✅ Midjourney 网格图生成完成，直接返回网格图，不等待 Upscale')
        return {
          taskId: data.id || taskId,
          status: 'completed', // 直接返回完成状态
          imageUrl: gridImageUrl, // 返回网格图 URL
          progress: 100,
          message: '网格图生成完成',
          buttons: data.buttons || [], // 保存按钮信息，供后续使用
          isGridImage: true, // 标记这是网格图
        }
      }
    }
    
    // 检查任务是否完成
    // 如果 status 是 SUCCESS，检查是否有图片URL
    const imageUrl = data.imageUrl || (data.imageUrls && data.imageUrls.length > 0 ? data.imageUrls[0] : '')
    const action = data.action || ''
    
    // 如果是 Upscale/LOW_VARIATION 等 action 完成，返回最终的单张图片
    // 或者 status 是 SUCCESS 且有 imageUrl，且没有 buttons（Upscale 完成后通常没有按钮）
    const isUpscaleAction = action === 'UPSCALE' || action === 'upscale' || action === 'LOW_VARIATION' || action === 'low_variation'
    const hasImage = !!imageUrl
    const hasNoButtons = !data.buttons || data.buttons.length === 0
    
    if (data.status === 'SUCCESS' && hasImage && (isUpscaleAction || hasNoButtons)) {
      // Upscale/LOW_VARIATION 完成，返回单张图片
      console.log(`✅ 检测到任务完成 (action: ${action}), 返回单张图片:`, imageUrl)
      return {
        taskId: data.id || taskId,
        status: 'completed',
        imageUrl: imageUrl,
        progress: 100,
        message: '图片生成完成',
      }
    }
    
    // 如果 status 是 SUCCESS 且有 imageUrl，但还有 buttons，说明是网格图，需要继续 Upscale
    // 这种情况已经在上面处理了（检测到 buttons 时会自动触发 Upscale）
    
    // 如果 status 是 SUCCESS 但没有 imageUrl，可能是 Upscale 还在处理中
    if (data.status === 'SUCCESS' && !imageUrl) {
      console.log(`⏳ 任务状态 SUCCESS 但没有图片URL (action: ${action}), 继续等待...`)
      return {
        taskId: data.id || taskId,
        status: 'processing',
        imageUrl: '',
        progress: 75, // Upscale 处理中，进度设为75%
        message: '正在处理 Upscale...',
      }
    }

    // 根据实际API响应格式返回
    // 注意：如果 status 是 SUCCESS 但上面没有匹配到完成条件，可能是其他情况
    const finalImageUrl = data.imageUrl || (data.imageUrls && data.imageUrls.length > 0 ? data.imageUrls[0] : '')
    const finalStatus = data.status === 'SUCCESS' && finalImageUrl ? 'completed' : 
                       data.status === 'SUCCESS' ? 'processing' :
                       data.status === 'FAILURE' ? 'failed' : 'pending'
    
    console.log(`📊 Midjourney 任务状态: ${finalStatus}, action: ${data.action || 'N/A'}, hasImage: ${!!finalImageUrl}, progress: ${data.progress || 'N/A'}`)
    
    return {
      taskId: data.id || taskId,
      status: finalStatus,
      imageUrl: finalImageUrl,
      progress: data.progress ? parseInt(data.progress.replace('%', '')) : (finalStatus === 'completed' ? 100 : 0),
      message: data.description || '',
      buttons: data.buttons || [], // 返回按钮列表，供前端使用
    }
  } catch (error) {
    console.error('❌ 查询任务状态错误:', error)
    
    if (error instanceof Error) {
      throw error
    }
    
    throw new Error(`查询任务状态失败: ${error.message || '未知错误'}`)
  }
}

/**
 * 提交 Midjourney Upscale 任务
 * @param {Object} button - 按钮信息（包含 customId 或 label）
 * @param {string} resultUrl - 302.ai 的查询URL（可选）
 * @returns {Promise<Object>} 返回任务ID和状态
 */
export async function submitMidjourneyUpscale(button, resultUrl = null) {
  const apiKey = process.env.MIDJOURNEY_API_KEY
  const apiHost = process.env.MIDJOURNEY_API_HOST || 'https://api.302.ai'

  if (!apiKey) {
    throw new Error('MIDJOURNEY_API_KEY 环境变量未设置，请检查 .env 文件')
  }

  try {
    // 获取按钮的 customId（U1, U2, U3, U4）
    const customId = button.customId || button.label || ''
    
    console.log('📸 提交 Midjourney Upscale 任务:', {
      customId,
      button: JSON.stringify(button, null, 2),
    })

    // 构建请求体
    const requestBody = {
      customId: customId,
      notifyHook: '',
      state: '',
    }

    // 如果提供了 resultUrl，添加到请求中
    if (resultUrl) {
      requestBody.resultUrl = resultUrl
    }

    // 调用 Midjourney Change 接口（用于 Upscale）
    const response = await fetch(`${apiHost}/mj/submit/change`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'mj-api-secret': apiKey,
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.description || errorData.message || `HTTP ${response.status}`
      
      if (response.status === 401) {
        throw new Error('API密钥无效，请检查 MIDJOURNEY_API_KEY 环境变量')
      }
      
      throw new Error(`Midjourney Upscale API调用失败: ${errorMessage}`)
    }

    const data = await response.json()
    
    console.log('✅ Midjourney Upscale API响应:', JSON.stringify(data, null, 2))

    // 解析响应
    // code: 1(提交成功), 22(排队中), other(错误)
    if (data.code === 1 || data.code === 22) {
      return {
        taskId: data.result,
        status: data.code === 1 ? 'submitted' : 'queued',
        message: data.description || 'Upscale 任务已提交',
      }
    } else {
      throw new Error(data.description || 'Upscale 任务提交失败')
    }
  } catch (error) {
    console.error('❌ Midjourney Upscale API调用错误:', error)
    
    if (error instanceof Error) {
      throw error
    }
    
    throw new Error(`Midjourney Upscale 调用失败: ${error.message || '未知错误'}`)
  }
}
