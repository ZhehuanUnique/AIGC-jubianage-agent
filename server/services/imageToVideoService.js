import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'
import { uploadBuffer } from './cosService.js'
import { generateCosKey } from './cosService.js'
import { generateVideoWithSeedance, getSeedanceTaskStatus } from './doubaoSeedanceService.js'

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
  const {
    model = 'wan2.2-i2v-flash',
    resolution = '480p',
    duration = 5,
    text = '',
    ratio = 'adaptive',
  } = options

  // 如果是豆包 Seedance 模型，使用专门的服务
  if (model === 'doubao-seedance-1-5-pro-251215') {
    // 豆包 Seedance 需要可访问的HTTP/HTTPS URL，不能是base64
    let finalImageUrl = imageUrl
    
    // 如果是base64，需要先上传到COS
    if (imageUrl.startsWith('data:image/')) {
      console.log('📤 豆包 Seedance 需要HTTP URL，上传base64图片到COS...')
      
      if (!process.env.COS_SECRET_ID || !process.env.COS_SECRET_KEY || !process.env.COS_BUCKET) {
        throw new Error('豆包 Seedance 需要HTTP URL，但COS配置不完整。请检查 COS_SECRET_ID、COS_SECRET_KEY 和 COS_BUCKET 环境变量')
      }
      
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
    } else if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      // 外部URL，直接使用（豆包 Seedance 应该能访问302.ai的URL）
      finalImageUrl = imageUrl
      console.log('📤 使用外部URL:', finalImageUrl)
    } else {
      throw new Error('豆包 Seedance 需要HTTP/HTTPS URL或base64格式的图片')
    }
    
    // 调用豆包 Seedance API
    return await generateVideoWithSeedance(finalImageUrl, {
      resolution,
      ratio,
      duration,
      text,
      generateAudio: true,
    })
  }

  // 否则使用阿里云通义万相API
  const apiKey = process.env.DASHSCOPE_API_KEY

  if (!apiKey) {
    throw new Error('请设置 DASHSCOPE_API_KEY 环境变量')
  }

  try {
    // 检查图片URL格式，统一上传到COS获取可访问的URL
    let finalImageUrl = imageUrl
    let originalImageUrl = imageUrl // 保存原始URL，用于失败时重试
    let imageBuffer = null
    let mimeType = 'image/png'
    
    // 检查是否是base64格式的data URI
    if (imageUrl.startsWith('data:image/')) {
      console.log('📤 检测到base64格式图片，上传到COS获取可访问URL...')
      
      // 解析base64数据
      const base64Data = imageUrl.split(',')[1]
      if (!base64Data) {
        throw new Error('base64图片数据格式不正确')
      }
      
      mimeType = imageUrl.match(/data:([^;]+)/)?.[1] || 'image/png'
      imageBuffer = Buffer.from(base64Data, 'base64')
    } else if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      // 对于外部URL，先下载再上传到COS，确保可访问
      console.log('📤 检测到外部URL，下载并上传到COS获取可访问URL...')
      console.log('   原始URL:', imageUrl)
      
      // 重试机制：最多重试3次
      let downloadSuccess = false
      let lastError = null
      const maxRetries = 3
      const timeoutMs = 60000 // 增加到60秒超时
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`   尝试下载 (${attempt}/${maxRetries})...`)
          
          // 下载图片
          const response = await fetch(imageUrl, {
            method: 'GET',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'image/*',
              'Referer': imageUrl, // 某些网站需要Referer
            },
            signal: AbortSignal.timeout(timeoutMs), // 60秒超时
          })
          
          if (!response.ok) {
            throw new Error(`下载图片失败: HTTP ${response.status} ${response.statusText}`)
          }
          
          // 获取Content-Type
          const contentType = response.headers.get('content-type') || 'image/png'
          mimeType = contentType.split(';')[0] // 移除charset等参数
          
          // 转换为Buffer
          const arrayBuffer = await response.arrayBuffer()
          imageBuffer = Buffer.from(arrayBuffer)
          
          console.log(`✅ 图片下载成功: ${imageBuffer.length} bytes, MIME: ${mimeType}`)
          downloadSuccess = true
          break // 成功，退出重试循环
        } catch (downloadError) {
          lastError = downloadError
          console.warn(`⚠️ 下载失败 (${attempt}/${maxRetries}):`, downloadError.message)
          
          if (attempt < maxRetries) {
            // 等待后重试（指数退避）
            const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000) // 1s, 2s, 4s, 最多5s
            console.log(`   等待 ${waitTime}ms 后重试...`)
            await new Promise(resolve => setTimeout(resolve, waitTime))
          }
        }
      }
      
      if (!downloadSuccess) {
        console.error('❌ 下载外部图片失败，已重试', maxRetries, '次')
        console.error('   最后错误:', lastError?.message)
        
        // 如果是302.ai的URL，尝试直接使用（可能API可以直接访问）
        if (imageUrl.includes('302.ai') || imageUrl.includes('file.302.ai')) {
          console.log('💡 检测到302.ai URL，尝试直接使用原始URL（不下载）')
          console.log('   注意: 如果仍然失败，可能需要配置302.ai的访问权限')
          finalImageUrl = imageUrl // 直接使用原始URL
        } else {
          throw new Error(`无法下载外部图片: ${lastError?.message}。已重试${maxRetries}次。请检查URL是否可访问，或使用base64格式。`)
        }
      }
    } else {
      throw new Error('图片URL格式不正确，必须是HTTP/HTTPS URL或base64格式')
    }
    
    // 如果有图片Buffer，上传到COS
    if (imageBuffer) {
      // 检查COS配置
      if (!process.env.COS_SECRET_ID || !process.env.COS_SECRET_KEY || !process.env.COS_BUCKET) {
        throw new Error('图片需要上传到COS，但COS配置不完整。请检查 COS_SECRET_ID、COS_SECRET_KEY 和 COS_BUCKET 环境变量')
      }
      
      // 生成COS key（根据MIME类型确定扩展名）
      const ext = mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'jpg' :
                  mimeType.includes('png') ? 'png' :
                  mimeType.includes('gif') ? 'gif' :
                  mimeType.includes('webp') ? 'webp' : 'jpg'
      const cosKey = generateCosKey('image', ext)
      
      // 上传到COS
      const uploadResult = await uploadBuffer(imageBuffer, cosKey, mimeType)
      finalImageUrl = uploadResult.url
      
      console.log('✅ 图片已上传到COS:', finalImageUrl)
      console.log(`   图片大小: ${(imageBuffer.length / 1024).toFixed(2)} KB`)
      console.log(`   图片格式: ${mimeType}`)
      
      // 验证COS URL是否可访问
      try {
        console.log('🔍 验证COS URL可访问性...')
        const verifyResponse = await fetch(finalImageUrl, {
          method: 'HEAD',
          signal: AbortSignal.timeout(10000), // 10秒超时
        })
        
        if (verifyResponse.ok) {
          const contentType = verifyResponse.headers.get('content-type') || 'unknown'
          const contentLength = verifyResponse.headers.get('content-length') || 'unknown'
          const sizeKB = parseInt(contentLength) / 1024
          
          console.log(`✅ COS URL可访问: Content-Type: ${contentType}, Size: ${sizeKB.toFixed(2)} KB`)
          
          // 检查图片大小（阿里云API通常要求至少几KB，太小的图片可能无法处理）
          if (sizeKB < 1) {
            console.warn(`⚠️ 警告: 图片太小 (${sizeKB.toFixed(2)} KB)，可能无法生成视频`)
            console.warn('   建议: 使用至少几KB的真实图片，而不是测试用的纯白图片')
          }
        } else {
          console.error(`❌ COS URL返回状态码: ${verifyResponse.status}`)
          console.error('   可能原因: 存储桶权限设置不正确，需要设置为"公共读"')
          console.error('   解决方案: 在腾讯云控制台设置存储桶为"公共读"或"公共读写"')
        }
      } catch (verifyError) {
        console.error('❌ COS URL验证失败:', verifyError.message)
        console.error('   可能原因: 存储桶权限设置不正确或网络问题')
        // 不抛出错误，继续尝试调用API（让API返回具体错误）
      }
    }

    // 确保URL是完整的，没有被截断
    // 注意：阿里云API可能不需要URL编码，直接使用原始URL
    // 如果URL包含特殊字符，只对查询参数部分进行编码
    let imageUrlForApi = finalImageUrl
    
    // 检查URL是否包含查询参数，如果有，只对查询参数部分编码
    if (finalImageUrl.includes('?')) {
      const [baseUrl, queryString] = finalImageUrl.split('?')
      imageUrlForApi = baseUrl + '?' + encodeURIComponent(queryString)
    } else {
      // 对于没有查询参数的URL，直接使用（不编码）
      // 阿里云API应该能处理标准的HTTP/HTTPS URL
      imageUrlForApi = finalImageUrl
    }
    
    // 构建请求体
    const requestBody = {
      model: model,
      input: {
        image_url: imageUrlForApi, // 使用处理后的URL（不编码整个URL）
      },
      parameters: {
        resolution: resolution,
        duration: duration,
      },
    }
    
    console.log('📹 准备调用API，URL长度:', finalImageUrl.length)

    console.log('📹 调用图生视频API:', {
      model,
      resolution,
      duration,
      originalUrlType: imageUrl.startsWith('data:') ? 'base64' : imageUrl.startsWith('http') ? 'http' : 'unknown',
      finalImageUrl: finalImageUrl.substring(0, 100) + (finalImageUrl.length > 100 ? '...' : ''),
      imageUrlForApi: imageUrlForApi.substring(0, 100) + (imageUrlForApi.length > 100 ? '...' : ''),
      urlChanged: imageUrl !== finalImageUrl,
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
      const errorMessage = errorData.message || errorData.error?.message || errorData.error || `HTTP ${response.status}`
      
      console.error('❌ 图生视频API调用失败详情:')
      console.error('   状态码:', response.status)
      console.error('   错误信息:', errorMessage)
      console.error('   请求URL (完整):', finalImageUrl)
      console.error('   API使用URL (完整):', imageUrlForApi)
      console.error('   URL长度:', finalImageUrl.length)
      console.error('   完整错误响应:', JSON.stringify(errorData, null, 2))
      
      // 如果是URL错误，提供更多调试信息
      if (errorMessage.includes('url error')) {
        console.error('💡 URL错误调试信息:')
        console.error('   - 检查URL是否包含特殊字符')
        console.error('   - 检查URL长度是否超过限制')
        console.error('   - 检查COS存储桶权限是否为"公共读"')
        console.error('   - 尝试在浏览器中直接访问URL验证')
      }
      
      if (response.status === 401) {
        throw new Error('API密钥无效，请检查 DASHSCOPE_API_KEY 环境变量')
      }
      
      if (errorMessage.includes('url error') || errorMessage.includes('url')) {
        // 如果是COS URL失败，且原始URL是外部URL，尝试直接使用原始URL
        if (finalImageUrl !== originalImageUrl && originalImageUrl.startsWith('http')) {
          console.log('💡 COS URL失败，尝试使用原始外部URL...')
          console.log('   原始URL:', originalImageUrl)
          
          // 重新构建请求，使用原始URL（不编码）
          const retryRequestBody = {
            model: model,
            input: {
              image_url: originalImageUrl, // 使用原始URL，不编码
            },
            parameters: {
              resolution: resolution,
              duration: duration,
            },
          }
          
          console.log('🔄 使用原始URL重试API调用...')
          const retryResponse = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/video-generation/generation', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify(retryRequestBody),
          })
          
          if (retryResponse.ok) {
            const retryData = await retryResponse.json()
            console.log('✅ 使用原始URL成功!')
            return {
              taskId: retryData.output?.task_id || retryData.task_id,
              videoUrl: retryData.output?.video_url || retryData.video_url,
              status: retryData.output?.status || retryData.status,
              message: retryData.message || '视频生成任务已提交',
            }
          } else {
            const retryErrorData = await retryResponse.json().catch(() => ({}))
            const retryErrorMessage = retryErrorData.message || retryErrorData.error?.message || `HTTP ${retryResponse.status}`
            console.error('❌ 使用原始URL也失败:', retryErrorMessage)
          }
        }
        
        throw new Error(`图片URL错误: ${errorMessage}。请检查图片URL是否可访问，或配置COS以支持base64图片上传。`)
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
 * @param {string} model - 模型名称，用于选择不同的查询服务
 * @returns {Promise<Object>} 返回任务状态和视频信息
 */
export async function getVideoTaskStatus(taskId, model = 'wan2.2-i2v-flash') {
  // 如果是豆包 Seedance 模型，使用专门的服务
  if (model === 'doubao-seedance-1-5-pro-251215') {
    const { getSeedanceTaskStatus } = await import('./doubaoSeedanceService.js')
    return await getSeedanceTaskStatus(taskId)
  }

  // 否则使用阿里云通义万相API
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

