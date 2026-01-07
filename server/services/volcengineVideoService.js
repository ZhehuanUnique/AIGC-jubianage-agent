/**
 * 火山引擎即梦-视频生成服务
 * 支持模型：
 * - 即梦-3.0Pro
 * 
 * 接口文档：
 * - 即梦-3.0Pro: https://www.volcengine.com/docs/85621/1777001?lang=zh
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
// 支持多种环境变量名称（兼容火山引擎 SDK 标准和自定义名称）
const VOLCENGINE_AK = process.env.VOLCENGINE_AK || process.env.VOLCENGINE_ACCESS_KEY || process.env.VOLC_ACCESSKEY
const VOLCENGINE_SK = process.env.VOLCENGINE_SK || process.env.VOLCENGINE_SECRET_KEY || process.env.VOLC_SECRETKEY
// ARK API Key（用于Bearer Token认证，如果提供则优先使用）
const VOLCENGINE_ARK_API_KEY = process.env.VOLCENGINE_ARK_API_KEY || process.env.VOLCENGINE_API_KEY
// 根据即梦-3.0Pro接口文档：https://www.volcengine.com/docs/85621/1777001?lang=zh
// Visual API接口地址：https://visual.volcengineapi.com
// ARK API接口地址：https://ark.cn-beijing.volces.com
const VOLCENGINE_API_HOST = process.env.VOLCENGINE_API_HOST || 'https://visual.volcengineapi.com'
const VOLCENGINE_ARK_API_HOST = process.env.VOLCENGINE_ARK_API_HOST || 'https://ark.cn-beijing.volces.com'

// 火山引擎服务配置
const VOLCENGINE_REGION = 'cn-north-1' // 默认区域
const VOLCENGINE_SERVICE = 'cv' // Visual API 服务名

/**
 * 根据模型名称获取对应的模型ID（req_key）
 * @param {string} model - 模型名称
 * @returns {string} 模型ID（req_key）
 */
function getModelId(model, useArkApi = false) {
  // ARK API和Visual API使用不同的模型标识符
  if (useArkApi) {
    // ARK API：根据模型列表，使用doubao-seedance-1-0-pro-250528（支持首尾帧）
    // 用户已开通的是 Doubao-Seedance-1.0-pro，对应模型ID是 doubao-seedance-1-0-pro-250528
    const arkModelMap = {
      'volcengine-video-3.0-pro': 'doubao-seedance-1-0-pro-250528', // 使用1-0-pro（支持首尾帧）
      'doubao-seedance-3.0-pro': 'doubao-seedance-1-0-pro-250528',
    }
    if (arkModelMap[model]) {
      return arkModelMap[model]
    }
    // 如果映射不存在，尝试直接使用模型名称
    return model
  } else {
    // Visual API使用固定的模型ID
    const visualModelMap = {
      'volcengine-video-3.0-pro': 'jimeng_ti2v_v30_pro',
      'doubao-seedance-3.0-pro': 'jimeng_ti2v_v30_pro',
    }
    if (!visualModelMap[model]) {
      throw new Error(`不支持的火山引擎模型: ${model}。支持的模型: volcengine-video-3.0-pro`)
    }
    return visualModelMap[model]
  }
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
 * 使用火山引擎即梦生成视频（图生视频，支持首尾帧）
 * @param {string} imageUrl - 图片URL（必须是可访问的HTTP/HTTPS URL）
 * @param {Object} options - 生成选项
 * @param {string} options.model - 模型名称：'volcengine-video-3.0-pro'
 * @param {string} options.resolution - 分辨率：'480p', '720p', '1080p'
 * @param {string} options.ratio - 宽高比：'16:9', '4:3', '1:1', '3:4', '9:16', '21:9', 'adaptive'
 * @param {number} options.duration - 视频时长（秒），支持 2~12 秒
 * @param {string} options.text - 文本提示词（可选）
 * @param {string} options.serviceTier - 服务层级：'default'（在线推理）或 'offline'（离线推理），默认 'default'
 * @param {boolean} options.generateAudio - 是否生成音频，默认 true
 * @param {string} options.lastFrameUrl - 尾帧图片URL（可选，支持首尾帧模式）
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
    lastFrameUrl = null, // 尾帧图片URL（可选）
  } = options

  // 检查认证方式：优先使用ARK API Key（Bearer Token），否则使用AK/SK（签名认证）
  const useArkApi = !!VOLCENGINE_ARK_API_KEY
  
  if (!useArkApi && (!VOLCENGINE_AK || !VOLCENGINE_SK)) {
    throw new Error('VOLCENGINE_AK 和 VOLCENGINE_SK 环境变量未设置，或未设置 VOLCENGINE_ARK_API_KEY，请检查 .env 文件')
  }

  const modelId = getModelId(model, useArkApi)

  try {
    console.log(`🎬 调用火山引擎即梦 ${model} 图生视频API (${useArkApi ? 'ARK API' : 'Visual API'}):`, {
      imageUrl: imageUrl.substring(0, 100) + (imageUrl.length > 100 ? '...' : ''),
      lastFrameUrl: lastFrameUrl ? lastFrameUrl.substring(0, 100) + (lastFrameUrl.length > 100 ? '...' : '') : null,
      model: modelId,
      resolution,
      ratio,
      duration,
      serviceTier,
      hasText: !!text,
      generateAudio,
      hasLastFrame: !!lastFrameUrl,
    })

    let requestBody
    let apiUrl
    let headers

    if (useArkApi) {
      // 使用ARK API（Bearer Token认证）
      // 根据用户提供的curl示例：https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks
      apiUrl = `${VOLCENGINE_ARK_API_HOST}/api/v3/contents/generations/tasks`
      
      // 构建请求体（ARK API格式，支持首尾帧）
      const content = []
      
      // 添加文本提示词
      if (text && text.trim()) {
        content.push({
          type: 'text',
          text: text.trim()
        })
      }
      
      // 添加首帧图片
      content.push({
        type: 'image_url',
        image_url: {
          url: imageUrl
        },
        role: 'first_frame'
      })
      
      // 添加尾帧图片（如果提供）
      if (lastFrameUrl) {
        content.push({
          type: 'image_url',
          image_url: {
            url: lastFrameUrl
          },
          role: 'last_frame'
        })
      }
      
      requestBody = {
        model: modelId, // 使用模型ID
        content: content,
      }
      
      // 只有 seedance-1-5-pro 支持 generate_audio 参数
      // doubao-seedance-1-0-pro-250528 不支持此参数
      if (modelId.includes('seedance-1-5-pro') && generateAudio) {
        requestBody.generate_audio = true
      }
      
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VOLCENGINE_ARK_API_KEY}`,
      }
    } else {
      // 使用Visual API（签名认证）
      apiUrl = VOLCENGINE_API_HOST
      
      // 构建请求体（根据即梦-3.0Pro接口文档格式）
      // 根据文档：https://www.volcengine.com/docs/85621/1777001?lang=zh
      // req_key固定值为 "jimeng_ti2v_v30_pro"
      // 使用 image_urls 数组格式，或 binary_data_base64
      // frames: 121帧=5秒，241帧=10秒
      requestBody = {
        req_key: modelId, // 固定值：jimeng_ti2v_v30_pro
        image_urls: [imageUrl], // 图片URL数组（必须是可访问的HTTP/HTTPS URL）
        seed: -1, // 随机种子，-1表示随机
        frames: duration === 5 ? 121 : duration === 10 ? 241 : 121, // 帧数：121=5秒，241=10秒
      }

      // 添加文本提示词（可选）
      if (text && text.trim()) {
        requestBody.prompt = text.trim()
      }

      // 设置宽高比（如果指定且不是adaptive）
      if (ratio && ratio !== 'adaptive') {
        requestBody.aspect_ratio = ratio
      }
      
      // Visual API暂不支持首尾帧，如果有尾帧则记录警告
      if (lastFrameUrl) {
        console.warn('⚠️  Visual API暂不支持首尾帧模式，将只使用首帧')
      }
    }

    const requestBodyJson = JSON.stringify(requestBody)
    let response

    if (useArkApi) {
      // ARK API：直接使用Bearer Token
      console.log('📤 发送请求到:', apiUrl)
      console.log('📤 请求体:', JSON.stringify(requestBody, null, 2))

      response = await fetch(apiUrl, {
        method: 'POST',
        headers: headers,
        body: requestBodyJson,
      })
      
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`
        try {
          const errorData = await response.json()
          console.error('❌ 火山引擎ARK API错误响应:', JSON.stringify(errorData, null, 2))
          errorMessage = errorData.message || errorData.error || JSON.stringify(errorData)
        } catch (parseError) {
          try {
            const text = await response.text()
            errorMessage = text || `HTTP ${response.status} ${response.statusText}`
          } catch (textError) {
            errorMessage = `HTTP ${response.status} ${response.statusText}`
          }
        }
        throw new Error(`火山引擎ARK API调用失败: ${errorMessage}`)
      }

      const result = await response.json()
      console.log('✅ 火山引擎ARK API响应:', JSON.stringify(result, null, 2))

      // 解析ARK API响应格式
      if (result.id || result.task_id || result.taskId) {
        return {
          taskId: result.id || result.task_id || result.taskId,
          status: result.status || 'processing',
          provider: 'volcengine',
          model: modelId,
        }
      } else {
        throw new Error('火山引擎ARK API返回数据格式错误：缺少任务ID')
      }
    } else {
      // Visual API：使用签名认证
      // 根据即梦-3.0Pro接口文档：https://www.volcengine.com/docs/85621/1777001?lang=zh
      // 接口地址：https://visual.volcengineapi.com
      // 请求方式：POST
      // 根据Visual API的调用方式，直接POST到根路径
      const uri = '/'
      const queryParams = {} // Visual API所有参数在Body中
      
      // 解析API Host（从Base URL中提取host，不包含路径）
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
      
      // 构建完整URL（包含查询参数）
      // 确保Base URL和URI正确拼接（避免双斜杠）
      const baseUrl = VOLCENGINE_API_HOST.endsWith('/') ? VOLCENGINE_API_HOST.slice(0, -1) : VOLCENGINE_API_HOST
      const uriPath = uri.startsWith('/') ? uri : `/${uri}`
      const queryString = normalizeQueryString(queryParams)
      const fullUrl = queryString ? `${baseUrl}${uriPath}?${queryString}` : `${baseUrl}${uriPath}`
      
      console.log('📤 发送请求到:', fullUrl)
      console.log('📤 查询参数:', JSON.stringify(queryParams, null, 2))
      console.log('📤 请求体:', JSON.stringify(requestBody, null, 2))

      // 使用签名发送请求（必须包含所有签名相关的header）
      response = await fetch(fullUrl, {
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
        let errorMessage = `HTTP ${response.status}`
        try {
          const errorData = await response.json()
          console.error('❌ 火山引擎Visual API错误响应:', JSON.stringify(errorData, null, 2))
          
          // 尝试从不同位置提取错误信息
          if (errorData.message) {
            errorMessage = typeof errorData.message === 'string' ? errorData.message : JSON.stringify(errorData.message)
          } else if (errorData.error) {
            errorMessage = typeof errorData.error === 'string' ? errorData.error : JSON.stringify(errorData.error)
          } else if (errorData.ResponseMetadata && errorData.ResponseMetadata.Error) {
            const error = errorData.ResponseMetadata.Error
            errorMessage = error.Message || error.Code || JSON.stringify(error)
          } else if (errorData.Result && errorData.Result.error) {
            errorMessage = typeof errorData.Result.error === 'string' ? errorData.Result.error : JSON.stringify(errorData.Result.error)
          } else {
            errorMessage = JSON.stringify(errorData)
          }
        } catch (parseError) {
          // 如果无法解析JSON，尝试读取文本
          try {
            const text = await response.text()
            errorMessage = text || `HTTP ${response.status} ${response.statusText}`
          } catch (textError) {
            errorMessage = `HTTP ${response.status} ${response.statusText}`
          }
        }
        throw new Error(`火山引擎Visual API调用失败: ${errorMessage}`)
      }

      const result = await response.json()
      console.log('✅ 火山引擎Visual API响应:', JSON.stringify(result, null, 2))

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
        throw new Error('火山引擎Visual API返回数据格式错误：缺少 task_id 或 video_url')
      }
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
  // 检查认证方式：优先使用ARK API Key（Bearer Token），否则使用AK/SK（签名认证）
  const useArkApi = !!VOLCENGINE_ARK_API_KEY
  
  if (!useArkApi && (!VOLCENGINE_AK || !VOLCENGINE_SK)) {
    throw new Error('VOLCENGINE_AK 和 VOLCENGINE_SK 环境变量未设置，或未设置 VOLCENGINE_ARK_API_KEY，请检查 .env 文件')
  }

  try {
    console.log(`🔍 查询火山引擎任务状态: ${taskId} (模型: ${model}, API: ${useArkApi ? 'ARK' : 'Visual'})`)

    if (useArkApi) {
      // 使用ARK API查询任务状态
      const apiUrl = `${VOLCENGINE_ARK_API_HOST}/api/v3/contents/generations/tasks/${taskId}`
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${VOLCENGINE_ARK_API_KEY}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`火山引擎ARK API查询失败: ${JSON.stringify(errorData)}`)
      }

      const data = await response.json()
      
      // 解析ARK API响应格式
      if (data.status === 'completed' || data.status === 'succeeded') {
        return {
          status: 'completed',
          videoUrl: data.video_url || data.output?.video_url || data.result?.video_url,
          progress: 100,
        }
      } else if (data.status === 'processing' || data.status === 'running') {
        return {
          status: 'processing',
          progress: data.progress || 0,
        }
      } else if (data.status === 'failed' || data.status === 'error') {
        return {
          status: 'failed',
          errorMessage: data.error?.message || data.message || '视频生成失败',
        }
      } else {
        return {
          status: data.status || 'processing',
          progress: data.progress || 0,
        }
      }
    }

    // 使用Visual API查询任务状态
    // 根据即梦-3.0Pro接口文档：https://www.volcengine.com/docs/85621/1777001?lang=zh
    // 接口地址：https://visual.volcengineapi.com
    // 查询任务状态：使用POST方法，在Body中传递req_key和task_id
    const uri = '/'
    const queryParams = {} // Visual API所有参数在Body中
    
    // 构建查询请求体
    const modelId = getModelId(model, false)
    const requestBody = {
      req_key: modelId,
      task_id: taskId,
    }
    
    // 解析API Host（从Base URL中提取host，不包含路径）
    const urlObj = new URL(VOLCENGINE_API_HOST)
    const host = urlObj.host
    
    // 生成签名（根据官方Python示例）
    const contentType = 'application/json'
    const requestBodyJson = JSON.stringify(requestBody)
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
    
    // 构建完整URL（包含查询参数）
    // 确保Base URL和URI正确拼接（避免双斜杠）
    const baseUrl = VOLCENGINE_API_HOST.endsWith('/') ? VOLCENGINE_API_HOST.slice(0, -1) : VOLCENGINE_API_HOST
    const uriPath = uri.startsWith('/') ? uri : `/${uri}`
    const queryString = normalizeQueryString(queryParams)
    const fullUrl = queryString ? `${baseUrl}${uriPath}?${queryString}` : `${baseUrl}${uriPath}`
    
    console.log('📤 查询请求到:', fullUrl)
    console.log('📤 查询参数:', JSON.stringify(queryParams, null, 2))
    console.log('📤 查询请求体:', JSON.stringify(requestBody, null, 2))
    
    // 查询任务状态也使用POST方法
    const response = await fetch(fullUrl, {
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

