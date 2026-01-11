/**
 * 火山引擎服务集成
 * 包含：CDN、视频点播、边缘计算等服务
 */

import crypto from 'crypto'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const envPath = join(__dirname, '..', '.env')
if (existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

// 火山引擎通用配置
const VOLC_CONFIG = {
  accessKeyId: process.env.VOLCENGINE_ACCESS_KEY_ID || process.env.VOLCENGINE_AK,
  accessKeySecret: process.env.VOLCENGINE_ACCESS_KEY_SECRET || process.env.VOLCENGINE_SK,
  region: process.env.VOLCENGINE_REGION || 'cn-shanghai',
}

/**
 * 生成火山引擎API签名
 */
function generateSignature(method, path, params, timestamp) {
  const ak = VOLC_CONFIG.accessKeyId
  const sk = VOLC_CONFIG.accessKeySecret
  
  const sortedParams = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&')
  const stringToSign = `${method}\n${path}\n${sortedParams}\n${timestamp}`
  
  const signature = crypto
    .createHmac('sha256', sk)
    .update(stringToSign)
    .digest('hex')
  
  return signature
}

// ==================== CDN 服务 ====================

/**
 * CDN 配置管理
 */
export const CDNService = {
  /**
   * 获取CDN加速域名URL
   * @param {string} objectKey - 对象存储中的文件路径
   * @returns {string} CDN加速URL
   */
  getCdnUrl(objectKey) {
    const cdnDomain = process.env.VOLC_CDN_DOMAIN
    if (!cdnDomain) {
      console.warn('⚠️ CDN域名未配置，使用源站URL')
      return null
    }
    return `${cdnDomain}/${objectKey}`
  },

  /**
   * 刷新CDN缓存
   * @param {Array<string>} urls - 需要刷新的URL列表
   */
  async refreshCache(urls) {
    try {
      console.log(`🔄 刷新CDN缓存: ${urls.length} 个URL`)
      
      const response = await fetch('https://cdn.volcengineapi.com/?Action=SubmitRefreshTask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Date': new Date().toISOString(),
        },
        body: JSON.stringify({
          Type: 'file',
          Urls: urls.join('\n'),
        }),
      })
      
      const result = await response.json()
      console.log('✅ CDN缓存刷新任务已提交')
      return result
    } catch (error) {
      console.error('❌ CDN缓存刷新失败:', error)
      throw error
    }
  },

  /**
   * 预热CDN缓存（提前加载热门内容）
   * @param {Array<string>} urls - 需要预热的URL列表
   */
  async preheatCache(urls) {
    try {
      console.log(`🔥 预热CDN缓存: ${urls.length} 个URL`)
      
      const response = await fetch('https://cdn.volcengineapi.com/?Action=SubmitPreloadTask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          Urls: urls.join('\n'),
        }),
      })
      
      const result = await response.json()
      console.log('✅ CDN预热任务已提交')
      return result
    } catch (error) {
      console.error('❌ CDN预热失败:', error)
      throw error
    }
  },
}


// ==================== 视频点播服务 (VOD) ====================

/**
 * 视频点播服务
 * 用于视频转码、水印、审核等
 */
export const VODService = {
  apiEndpoint: 'https://vod.volcengineapi.com',

  /**
   * 提交视频转码任务
   * @param {string} videoUrl - 视频URL
   * @param {object} options - 转码选项
   */
  async submitTranscodeTask(videoUrl, options = {}) {
    try {
      const {
        resolution = '1080p',  // 720p, 1080p, 4k
        format = 'mp4',
        watermark = null,
      } = options

      console.log(`🎬 提交视频转码任务: ${resolution} ${format}`)

      // 转码模板映射
      const templateMap = {
        '720p': 'template_720p_h264',
        '1080p': 'template_1080p_h264',
        '4k': 'template_4k_h265',
      }

      const params = {
        Action: 'SubmitWorkflow',
        Version: '2023-01-01',
        Input: {
          Type: 'URL',
          URL: videoUrl,
        },
        Output: {
          Format: format,
          Template: templateMap[resolution] || templateMap['1080p'],
        },
      }

      if (watermark) {
        params.Output.Watermark = {
          Type: watermark.type || 'text',
          Content: watermark.content || 'jubianai.cn',
          Position: watermark.position || 'bottom-right',
          Opacity: watermark.opacity || 0.5,
        }
      }

      const response = await fetch(`${this.apiEndpoint}/?Action=SubmitWorkflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })

      const result = await response.json()
      console.log('✅ 转码任务已提交:', result.TaskId)
      return result
    } catch (error) {
      console.error('❌ 视频转码任务提交失败:', error)
      throw error
    }
  },

  /**
   * 查询转码任务状态
   * @param {string} taskId - 任务ID
   */
  async getTaskStatus(taskId) {
    try {
      const response = await fetch(
        `${this.apiEndpoint}/?Action=GetWorkflowExecution&TaskId=${taskId}`
      )
      const result = await response.json()
      return result
    } catch (error) {
      console.error('❌ 查询任务状态失败:', error)
      throw error
    }
  },

  /**
   * 生成多分辨率视频（自适应码率）
   * @param {string} videoUrl - 原始视频URL
   */
  async generateAdaptiveStream(videoUrl) {
    try {
      console.log('📺 生成自适应码率流')
      
      const resolutions = ['480p', '720p', '1080p']
      const tasks = resolutions.map(res => 
        this.submitTranscodeTask(videoUrl, { resolution: res })
      )
      
      const results = await Promise.all(tasks)
      console.log('✅ 多分辨率转码任务已提交')
      return results
    } catch (error) {
      console.error('❌ 自适应码率生成失败:', error)
      throw error
    }
  },
}

// ==================== 边缘计算服务 ====================

/**
 * 边缘计算服务
 * 用于低延迟处理
 */
export const EdgeService = {
  /**
   * 获取最近的边缘节点
   * @param {string} clientIp - 客户端IP
   */
  async getNearestEdgeNode(clientIp) {
    // 边缘节点列表（华东区域）
    const edgeNodes = [
      { id: 'edge-shanghai-1', region: 'shanghai', latency: 5 },
      { id: 'edge-hangzhou-1', region: 'hangzhou', latency: 8 },
      { id: 'edge-nanjing-1', region: 'nanjing', latency: 12 },
    ]
    
    // 简单返回延迟最低的节点
    return edgeNodes.sort((a, b) => a.latency - b.latency)[0]
  },

  /**
   * 在边缘节点执行图片处理
   * @param {string} imageUrl - 图片URL
   * @param {object} operations - 处理操作
   */
  async processImageAtEdge(imageUrl, operations = {}) {
    const {
      resize = null,      // { width: 800, height: 600 }
      quality = 85,       // 图片质量 1-100
      format = 'webp',    // 输出格式
      watermark = null,   // 水印配置
    } = operations

    // 构建图片处理URL参数
    let params = []
    
    if (resize) {
      params.push(`resize,w_${resize.width},h_${resize.height}`)
    }
    params.push(`quality,q_${quality}`)
    params.push(`format,${format}`)
    
    if (watermark) {
      params.push(`watermark,text_${Buffer.from(watermark).toString('base64')}`)
    }

    // 返回带处理参数的URL
    const processedUrl = `${imageUrl}?x-tos-process=image/${params.join('/')}`
    return processedUrl
  },
}

// ==================== 存储服务统一接口 ====================

/**
 * 统一存储服务
 * 自动选择 TOS 或 COS
 */
export const StorageService = {
  /**
   * 获取当前使用的存储服务
   */
  getProvider() {
    // 优先使用 TOS（火山引擎）
    if (process.env.TOS_ACCESS_KEY_ID) {
      return 'tos'
    }
    // 回退到 COS（腾讯云）
    if (process.env.COS_SECRET_ID) {
      return 'cos'
    }
    return null
  },

  /**
   * 获取文件的最优访问URL
   * @param {string} objectKey - 文件路径
   * @param {object} options - 选项
   */
  getOptimalUrl(objectKey, options = {}) {
    const { useCdn = true, useEdge = false } = options
    
    // 1. 优先使用CDN
    if (useCdn && process.env.VOLC_CDN_DOMAIN) {
      return `${process.env.VOLC_CDN_DOMAIN}/${objectKey}`
    }
    
    // 2. 使用TOS直接访问
    if (process.env.TOS_BUCKET) {
      const endpoint = process.env.TOS_ENDPOINT || 'tos-cn-shanghai.volces.com'
      return `https://${process.env.TOS_BUCKET}.${endpoint}/${objectKey}`
    }
    
    // 3. 回退到COS
    if (process.env.COS_BUCKET) {
      const region = process.env.COS_REGION || 'ap-guangzhou'
      return `https://${process.env.COS_BUCKET}.cos.${region}.myqcloud.com/${objectKey}`
    }
    
    return null
  },
}

export default {
  CDNService,
  VODService,
  EdgeService,
  StorageService,
}
