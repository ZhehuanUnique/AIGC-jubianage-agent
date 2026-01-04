/**
 * 火山引擎即梦AI-视频生成服务
 * 支持模型：
 * - 即梦AI-视频生成3.0 Pro
 * 
 * 接口文档：
 * - 即梦AI-视频生成3.0 Pro: https://www.volcengine.com/docs/85621/1777001?lang=zh
 * - SDK文档: https://www.volcengine.com/docs/6444/1340578?lang=zh#0f05efc9
 * - Python SDK: https://github.com/volcengine/volc-sdk-python
 * 
 * 注意：
 * - 在线推理：实时生成，响应快但可能排队
 * - 离线推理：异步生成，提交任务后需要轮询结果，通常更快且更稳定
 * - 3.5 Pro 模型ID待确认，暂时不添加
 */

import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'
import crypto from 'crypto'

// 加载.env文件
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const envPath = join(__dirname, '../../.env')
if (existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

// 火山引擎 API 配置
const VOLCENGINE_AK = process.env.VOLCENGINE_AK || process.env.VOLCENGINE_ACCESS_KEY
const VOLCENGINE_SK = process.env.VOLCENGINE_SK || process.env.VOLCENGINE_SECRET_KEY
const VOLCENGINE_API_HOST = process.env.VOLCENGINE_API_HOST || 'https://visual.volcengineapi.com'

// 火山引擎服务配置
const VOLCENGINE_REGION = 'cn-north-1' // 默认区域
const VOLCENGINE_SERVICE = 'cv' // Visual API 服务名

/**
 * 根据模型名称获取对应的模型ID（req_key）
 * @param {string} model - 模型名称
 * @returns {string} 模型ID（req_key）
 */
function getModelId(model) {
  const modelMap = {
    'volcengine-video-3.0-pro': 'video_generation_3_0_pro',
    // 兼容旧名称
    'doubao-seedance-3.0-pro': 'video_generation_3_0_pro',
  }
  
  if (!modelMap[model]) {
    throw new Error(`不支持的火山引擎模型: ${model}。支持的模型: volcengine-video-3.0-pro`)
  }
  
  return modelMap[model]
}

/**
 * URL编码规范化（根据火山引擎规范）
 * @param {string} str - 要编码的字符串
 * @returns {string} 编码后的字符串
 */
function urlEncode(str) {
  return encodeURIComponent(str)
    .replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/%20/g, '+')
}

/**
 * 规范化查询字符串（根据火山引擎规范）
 * @param {Object} params - 查询参数对象
 * @returns {string} 规范化后的查询字符串
 */
function normalizeQueryString(params) {
  if (!params || Object.keys(params).length === 0) {
    return ''
  }
  
  const sortedKeys = Object.keys(params).sort()
  const pairs = sortedKeys.map(key => {
    const value = params[key]
    if (Array.isArray(value)) {
      return value.map(v => `${urlEncode(key)}=${urlEncode(String(v))}`).join('&')
    }
    return `${urlEncode(key)}=${urlEncode(String(value))}`
  })
  
  return pairs.join('&').replace(/\+/g, '%20')
}

/**
 * 生成火山引擎API签名（根据官方Python示例和文档）
 * 参考：https://github.com/volcengine/volc-openapi-demos/blob/main/signature/python/sign.py
 * 文档：https://www.volcengine.com/docs/6369/67270?lang=zh
 * @param {string} method - HTTP方法
 * @param {string} uri - 请求URI
 * @param {Object} queryParams - 查询参数对象
 * @param {string} host - 请求主机
 * @param {string} contentType - Content-Type
 * @param {string} payload - 请求体（JSON字符串）
 * @param {string} ak - Access Key ID
 * @param {string} sk - Secret Access Key
 * @param {string} region - 区域
 * @param {string} service - 服务名
 * @returns {Object} 包含签名和请求头的对象
 */
function generateVolcengineSignature(method, uri, queryParams, host, contentType, payload, ak, sk, region, service) {
  // 1. 获取当前UTC时间
  const now = new Date()
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '') // YYYYMMDD
  const timeStamp = now.toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z' // YYYYMMDDTHHMMSSZ
  
  // 2. 计算请求体哈希（X-Content-Sha256）
  const payloadHash = crypto.createHash('sha256').update(payload || '').digest('hex')
  
  // 3. 规范化查询字符串
  const canonicalQueryString = normalizeQueryString(queryParams)
  
  // 4. 构建规范化请求头（必须包含：content-type, host, x-content-sha256, x-date）
  // 注意：所有header key必须小写，按ASCII排序
  const canonicalHeaders = [
    `content-type:${contentType}`,
    `host:${host}`,
    `x-content-sha256:${payloadHash}`,
    `x-date:${timeStamp}`,
  ].join('\n') + '\n'
  
  // 5. SignedHeaders（参与签名的header列表，小写，分号分隔）
  const signedHeaders = 'content-type;host;x-content-sha256;x-date'
  
  // 6. 构建规范化请求（CanonicalRequest）
  const canonicalRequest = [
    method.toUpperCase(),
    uri,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n')
  
  // 7. 计算规范化请求的哈希
  const canonicalRequestHash = crypto.createHash('sha256').update(canonicalRequest).digest('hex')
  
  // 8. 构建待签名字符串（StringToSign）
  const algorithm = 'HMAC-SHA256'
  const credentialScope = `${dateStamp}/${region}/${service}/request`
  const stringToSign = [
    algorithm,
    timeStamp,
    credentialScope,
    canonicalRequestHash,
  ].join('\n')
  
  // 9. 计算签名密钥（SigningKey）
  // kSecret = SK
  // kDate = HMAC(kSecret, dateStamp)
  // kRegion = HMAC(kDate, region)
  // kService = HMAC(kRegion, service)
  // kSigning = HMAC(kService, "request")
  const kDate = crypto.createHmac('sha256', sk).update(dateStamp).digest()
  const kRegion = crypto.createHmac('sha256', kDate).update(region).digest()
  const kService = crypto.createHmac('sha256', kRegion).update(service).digest()
  const kSigning = crypto.createHmac('sha256', kService).update('request').digest()
  
  // 10. 计算签名（Signature）
  const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex')
  
  // 11. 构建Authorization头
  const authorization = `${algorithm} Credential=${ak}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
  
  return {
    authorization,
    timestamp: timeStamp,
    dateStamp,
    xContentSha256: payloadHash,
  }
}

/**
 * 使用火山引擎即梦AI生成视频（图生视频）
 * @param {string} imageUrl - 图片URL（必须是可访问的HTTP/HTTPS URL）
 * @param {Object} options - 生成选项
 * @param {string} options.model - 模型名称：'volcengine-video-3.0-pro'
 * @param {string} options.resolution - 分辨率：'480p', '720p', '1080p'
 * @param {string} options.ratio - 宽高比：'16:9', '4:3', '1:1', '3:4', '9:16', '21:9', 'adaptive'
 * @param {number} options.duration - 视频时长（秒），支持 2~12 秒
 * @param {string} options.text - 文本提示词（可选）
 * @param {string} options.serviceTier - 服务层级：'default'（在线推理）或 'offline'（离线推理），默认 'default'
 * @param {boolean} options.generateAudio - 是否生成音频，默认 true
 * @returns {Promise<Object>} 返回任务ID和状态
 */
export async function generateVideoWithVolcengine(imageUrl, options = {}) {
  const {
    model = 'volcengine-video-3.0-pro',
    resolution = '720p',
    ratio = 'adaptive',
    duration = 5,
    text = '',
    serviceTier = 'default', // 'default' 在线推理, 'offline' 离线推理
    generateAudio = true,
  } = options

  if (!VOLCENGINE_AK || !VOLCENGINE_SK) {
    throw new Error('VOLCENGINE_AK 和 VOLCENGINE_SK 环境变量未设置，请检查 .env 文件')
  }

  const modelId = getModelId(model)

  try {
    console.log(`🎬 调用火山引擎即梦AI ${model} 图生视频API:`, {
      imageUrl: imageUrl.substring(0, 100) + (imageUrl.length > 100 ? '...' : ''),
      model: modelId,
      resolution,
      ratio,
      duration,
      serviceTier,
      hasText: !!text,
      generateAudio,
    })

    // 构建请求体（根据火山引擎Visual API文档格式）
    // 火山引擎Visual API使用req_key来指定服务类型
    // 根据文档：https://www.volcengine.com/docs/85621/1777001?lang=zh
    const requestBody = {
      req_key: modelId, // 使用req_key指定模型：video_generation_3_0_pro
      prompt: text && text.trim() ? text.trim() : '', // 文本提示词（可选）
      image_url: imageUrl, // 图片URL（必须是可访问的HTTP/HTTPS URL）
      resolution: resolution || '720p', // 分辨率：480p, 720p, 1080p
      duration: duration || 5, // 视频时长（秒），支持 2~12 秒
      service_tier: serviceTier || 'default', // 'default' 在线推理, 'offline' 离线推理
      generate_audio: generateAudio !== false, // 是否生成音频，默认 true
    }

    // 设置宽高比（如果指定且不是adaptive）
    if (ratio && ratio !== 'adaptive') {
      requestBody.ratio = ratio
    }

    const requestBodyJson = JSON.stringify(requestBody)
    // 火山引擎Visual API使用POST请求到根路径，通过req_key指定服务
    const uri = '/'
    const queryParams = {} // Visual API通常不使用查询参数，req_key在body中
    
    // 解析API Host
    const urlObj = new URL(VOLCENGINE_API_HOST)
    const host = urlObj.host
    
    // 生成签名（根据官方Python示例）
    const contentType = 'application/json'
    const signatureInfo = generateVolcengineSignature(
      'POST',
      uri,
      queryParams,
      host,
      contentType,
      requestBodyJson,
      VOLCENGINE_AK,
      VOLCENGINE_SK,
      VOLCENGINE_REGION,
      VOLCENGINE_SERVICE
    )
    
    console.log('📤 发送请求到:', `${VOLCENGINE_API_HOST}${uri}`)
    console.log('📤 请求体:', JSON.stringify(requestBody, null, 2))

    // 使用签名发送请求（必须包含所有签名相关的header）
    const response = await fetch(`${VOLCENGINE_API_HOST}${uri}`, {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
        'Host': host,
        'X-Content-Sha256': signatureInfo.xContentSha256,
        'X-Date': signatureInfo.timestamp,
        'Authorization': signatureInfo.authorization,
      },
      body: requestBodyJson,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.message || errorData.error || `HTTP ${response.status}`
      throw new Error(`火山引擎视频生成API调用失败: ${errorMessage}`)
    }

    const result = await response.json()
    console.log('✅ 火山引擎API响应:', JSON.stringify(result, null, 2))

    // 解析响应（根据火山引擎Visual API响应格式）
    // 响应格式可能是：{ ResponseMetadata: {...}, Result: {...} }
    const responseData = result.Result || result
    
    // 检查是否有错误
    if (result.ResponseMetadata && result.ResponseMetadata.Error) {
      const error = result.ResponseMetadata.Error
      throw new Error(`火山引擎API错误: ${error.Message || error.Code || '未知错误'}`)
    }
    
    // 解析任务ID和状态
    if (responseData.task_id || responseData.taskId) {
      return {
        taskId: responseData.task_id || responseData.taskId,
        status: responseData.status || 'processing',
        provider: 'volcengine',
        model: modelId,
      }
    } else if (responseData.data && responseData.data.task_id) {
      // 某些API可能返回嵌套的data结构
      return {
        taskId: responseData.data.task_id,
        status: responseData.data.status || 'processing',
        provider: 'volcengine',
        model: modelId,
      }
    } else {
      // 如果是在线推理，可能直接返回视频URL
      if (responseData.video_url || responseData.videoUrl) {
        return {
          taskId: null,
          status: 'completed',
          videoUrl: responseData.video_url || responseData.videoUrl,
          provider: 'volcengine',
          model: modelId,
        }
      }
      throw new Error('火山引擎API返回数据格式错误：缺少 task_id 或 video_url')
    }
  } catch (error) {
    console.error('❌ 火山引擎视频生成失败:', error)
    throw error
  }
}

/**
 * 查询火山引擎视频生成任务状态
 * @param {string} taskId - 任务ID
 * @param {string} model - 模型名称（用于选择 API Key）
 * @returns {Promise<Object>} 返回任务状态和视频信息
 */
export async function getVolcengineTaskStatus(taskId, model = 'volcengine-video-3.0-pro') {
  if (!VOLCENGINE_AK || !VOLCENGINE_SK) {
    throw new Error('VOLCENGINE_AK 和 VOLCENGINE_SK 环境变量未设置，请检查 .env 文件')
  }

  try {
    console.log(`🔍 查询火山引擎任务状态: ${taskId} (模型: ${model})`)

    const modelId = getModelId(model)
    // 查询任务状态：使用POST请求
    // 注意：根据实际API文档，查询接口的req_key可能需要调整
    // 可能的格式：使用相同的req_key + task_id参数，或使用专门的查询接口
    const requestBody = {
      req_key: modelId, // 使用相同的模型req_key，或使用查询专用req_key
      task_id: taskId, // 任务ID
    }
    
    const requestBodyJson = JSON.stringify(requestBody)
    const uri = '/'
    const queryParams = {} // Visual API通常不使用查询参数
    
    // 解析API Host
    const urlObj = new URL(VOLCENGINE_API_HOST)
    const host = urlObj.host
    
    // 生成签名（根据官方Python示例）
    const contentType = 'application/json'
    const signatureInfo = generateVolcengineSignature(
      'POST',
      uri,
      queryParams,
      host,
      contentType,
      requestBodyJson,
      VOLCENGINE_AK,
      VOLCENGINE_SK,
      VOLCENGINE_REGION,
      VOLCENGINE_SERVICE
    )
    
    console.log('📤 查询请求到:', `${VOLCENGINE_API_HOST}${uri}`)
    console.log('📤 查询请求体:', JSON.stringify(requestBody, null, 2))
    
    const response = await fetch(`${VOLCENGINE_API_HOST}${uri}`, {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
        'Host': host,
        'X-Content-Sha256': signatureInfo.xContentSha256,
        'X-Date': signatureInfo.timestamp,
        'Authorization': signatureInfo.authorization,
      },
      body: requestBodyJson,
    })

    if (!response.ok) {
      throw new Error(`查询任务状态失败: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()
    console.log('📥 火山引擎查询响应:', JSON.stringify(result, null, 2))

    // 检查是否有错误
    if (result.ResponseMetadata && result.ResponseMetadata.Error) {
      const error = result.ResponseMetadata.Error
      throw new Error(`火山引擎API错误: ${error.Message || error.Code || '未知错误'}`)
    }

    // 解析响应（根据火山引擎Visual API响应格式）
    const responseData = result.Result || result
    
    // 解析状态
    let status = 'processing'
    let progress = 0
    let videoUrl = null

    // 根据实际API响应格式解析
    const taskStatus = responseData.status || responseData.Status || responseData.state
    const taskProgress = responseData.progress || responseData.Progress || 0
    
    if (taskStatus === 'completed' || taskStatus === 'success' || taskStatus === 'SUCCESS') {
      status = 'completed'
      progress = 100
      videoUrl = responseData.video_url || responseData.videoUrl || responseData.output_url || responseData.outputUrl
    } else if (taskStatus === 'failed' || taskStatus === 'error' || taskStatus === 'FAILED') {
      status = 'failed'
      progress = 0
    } else {
      status = 'processing'
      progress = typeof taskProgress === 'number' ? taskProgress : 50
    }

    return {
      status,
      progress,
      videoUrl,
      taskId,
      provider: 'volcengine',
    }
  } catch (error) {
    console.error('❌ 火山引擎任务状态查询失败:', error)
    throw error
  }
}

