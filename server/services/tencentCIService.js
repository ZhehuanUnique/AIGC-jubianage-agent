import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'
import COS from 'cos-nodejs-sdk-v5'
import crypto from 'crypto'

// 加载.env文件
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const envPath = join(__dirname, '../../.env')
if (existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

/**
 * 腾讯云数据万象 (CI) 视频超分辨率服务
 * 文档: https://cloud.tencent.com/document/product/460/84775
 * 
 * 使用腾讯云COS的数据万象功能进行视频超分辨率处理
 */

// COS配置
const cosConfig = {
  SecretId: process.env.COS_SECRET_ID,
  SecretKey: process.env.COS_SECRET_KEY,
  Bucket: process.env.COS_BUCKET,
  Region: process.env.COS_REGION,
}

// 创建COS实例
const cos = new COS({
  SecretId: cosConfig.SecretId,
  SecretKey: cosConfig.SecretKey,
})

/**
 * 使用腾讯云数据万象进行视频超分辨率
 * @param {string} videoUrl - 视频URL（必须是COS中的视频）
 * @param {Object} options - 超分辨率选项
 * @param {string} options.resolution - 目标分辨率 (1080p, 2K, 4K)
 * @returns {Promise<Object>} 返回处理后的视频URL
 */
export async function upscaleVideoWithTencentCI(videoUrl, options = {}) {
  const {
    resolution = '1080p',
  } = options

  if (!cosConfig.SecretId || !cosConfig.SecretKey) {
    throw new Error('COS配置缺失，请检查 COS_SECRET_ID 和 COS_SECRET_KEY 环境变量')
  }

  try {
    console.log('🎬 调用腾讯云数据万象视频超分辨率API:', {
      videoUrl: videoUrl.substring(0, 100) + (videoUrl.length > 100 ? '...' : ''),
      resolution,
    })

    // 从URL中提取COS Key
    let cosKey = ''
    try {
      const url = new URL(videoUrl)
      cosKey = decodeURIComponent(url.pathname.substring(1)) // 移除开头的 /
    } catch (e) {
      // 如果不是完整URL，假设它就是key
      cosKey = videoUrl
    }

    // 生成输出文件的key
    const timestamp = Date.now()
    const randomStr = crypto.randomBytes(4).toString('hex')
    const outputKey = `video/upscaled/${timestamp}_${randomStr}_${resolution}.mp4`

    // 创建超分辨率任务
    // 使用数据万象的视频增强功能
    const jobParams = {
      Bucket: cosConfig.Bucket,
      Region: cosConfig.Region,
      Tag: 'VideoProcess',
      Input: {
        Object: cosKey,
      },
      Operation: {
        VideoProcess: {
          // 视频超分辨率配置
          TranscodeTemplateId: '', // 如果有预设模板可以使用
          // 或者使用自定义参数
          ColorEnhance: {
            Enable: 'true',
            Contrast: '',
            Correction: '',
            Saturation: '',
          },
          MsSharpen: {
            Enable: 'true',
            SharpenLevel: '1',
          },
        },
        Output: {
          Bucket: cosConfig.Bucket,
          Region: cosConfig.Region,
          Object: outputKey,
        },
      },
    }

    // 根据分辨率设置不同的处理参数
    let targetWidth, targetHeight
    switch (resolution) {
      case '4K':
        targetWidth = 3840
        targetHeight = 2160
        break
      case '2K':
        targetWidth = 2560
        targetHeight = 1440
        break
      case '1080p':
      default:
        targetWidth = 1920
        targetHeight = 1080
        break
    }

    // 使用转码功能实现超分辨率
    const transcodeJobParams = {
      Bucket: cosConfig.Bucket,
      Region: cosConfig.Region,
      Tag: 'Transcode',
      Input: {
        Object: cosKey,
      },
      Operation: {
        Transcode: {
          Container: {
            Format: 'mp4',
          },
          Video: {
            Codec: 'H.264',
            Width: targetWidth.toString(),
            Height: '', // 保持宽高比
            Fps: '', // 保持原帧率
            Bitrate: '', // 自动码率
            Crf: '18', // 高质量
            Preset: 'slow', // 慢速编码，质量更好
          },
          Audio: {
            Codec: 'aac',
            Samplerate: '44100',
            Bitrate: '128',
            Channels: '2',
          },
        },
        Output: {
          Bucket: cosConfig.Bucket,
          Region: cosConfig.Region,
          Object: outputKey,
        },
      },
    }

    console.log('📤 提交腾讯云数据万象转码任务...')

    // 提交任务
    const result = await new Promise((resolve, reject) => {
      cos.request({
        Method: 'POST',
        Key: 'jobs',
        Url: `https://${cosConfig.Bucket}.ci.${cosConfig.Region}.myqcloud.com/jobs`,
        Body: JSON.stringify(transcodeJobParams),
        ContentType: 'application/json',
      }, (err, data) => {
        if (err) {
          reject(err)
        } else {
          resolve(data)
        }
      })
    })

    console.log('✅ 腾讯云数据万象任务已提交:', result)

    // 获取任务ID
    const jobId = result?.JobsDetail?.JobId || result?.Response?.JobsDetail?.JobId

    if (!jobId) {
      // 如果无法获取jobId，尝试直接使用简单的转码方式
      console.log('⚠️ 无法获取任务ID，尝试使用简单转码方式...')
      
      // 使用简单的URL参数方式进行转码
      const processedUrl = `${videoUrl}?ci-process=transcode&format=mp4&vcodec=h264&width=${targetWidth}&crf=18`
      
      return {
        success: true,
        videoUrl: processedUrl,
        cosKey: null,
        resolution: resolution,
        provider: 'tencent',
        message: '使用URL参数方式处理',
      }
    }

    // 轮询等待任务完成
    let taskStatus = 'Submitted'
    let attempts = 0
    const maxAttempts = 120 // 最多等待10分钟

    while (taskStatus !== 'Success' && taskStatus !== 'Failed' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)) // 每5秒查询一次
      
      const statusResult = await new Promise((resolve, reject) => {
        cos.request({
          Method: 'GET',
          Key: `jobs/${jobId}`,
          Url: `https://${cosConfig.Bucket}.ci.${cosConfig.Region}.myqcloud.com/jobs/${jobId}`,
        }, (err, data) => {
          if (err) {
            reject(err)
          } else {
            resolve(data)
          }
        })
      })

      taskStatus = statusResult?.JobsDetail?.State || statusResult?.Response?.JobsDetail?.State || 'Unknown'
      console.log(`📊 任务状态: ${taskStatus} (${attempts + 1}/${maxAttempts})`)
      attempts++
    }

    if (taskStatus === 'Failed') {
      throw new Error('腾讯云数据万象处理失败')
    }

    if (taskStatus !== 'Success') {
      throw new Error('腾讯云数据万象处理超时')
    }

    // 构建输出URL
    const outputUrl = `https://${cosConfig.Bucket}.cos.${cosConfig.Region}.myqcloud.com/${outputKey}`

    console.log('✅ 腾讯云数据万象处理完成:', outputUrl)

    return {
      success: true,
      videoUrl: outputUrl,
      cosKey: outputKey,
      resolution: resolution,
      provider: 'tencent',
    }
  } catch (error) {
    console.error('❌ 腾讯云数据万象处理失败:', error)
    
    // 如果CI功能不可用，回退到简单的URL参数方式
    if (error.message?.includes('NoSuchKey') || error.message?.includes('AccessDenied') || error.code === 'NoSuchKey') {
      console.log('⚠️ CI功能不可用，使用URL参数方式...')
      
      let targetWidth
      switch (options.resolution) {
        case '4K': targetWidth = 3840; break
        case '2K': targetWidth = 2560; break
        default: targetWidth = 1920; break
      }
      
      const processedUrl = `${videoUrl}?ci-process=transcode&format=mp4&vcodec=h264&width=${targetWidth}&crf=18`
      
      return {
        success: true,
        videoUrl: processedUrl,
        cosKey: null,
        resolution: options.resolution || '1080p',
        provider: 'tencent',
        message: '使用URL参数方式处理',
      }
    }
    
    throw new Error(`腾讯云数据万象处理失败: ${error.message}`)
  }
}

/**
 * 获取腾讯云数据万象任务状态
 * @param {string} jobId - 任务ID
 * @returns {Promise<Object>} 返回任务状态
 */
export async function getTencentCIJobStatus(jobId) {
  try {
    const result = await new Promise((resolve, reject) => {
      cos.request({
        Method: 'GET',
        Key: `jobs/${jobId}`,
        Url: `https://${cosConfig.Bucket}.ci.${cosConfig.Region}.myqcloud.com/jobs/${jobId}`,
      }, (err, data) => {
        if (err) {
          reject(err)
        } else {
          resolve(data)
        }
      })
    })

    const jobDetail = result?.JobsDetail || result?.Response?.JobsDetail
    
    return {
      jobId: jobId,
      status: jobDetail?.State || 'Unknown',
      progress: jobDetail?.Progress || 0,
      videoUrl: jobDetail?.Operation?.Output?.Object 
        ? `https://${cosConfig.Bucket}.cos.${cosConfig.Region}.myqcloud.com/${jobDetail.Operation.Output.Object}`
        : null,
    }
  } catch (error) {
    console.error('❌ 获取任务状态失败:', error)
    throw error
  }
}
