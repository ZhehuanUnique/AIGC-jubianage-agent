import COS from 'cos-nodejs-sdk-v5'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'

// 获取当前文件所在目录
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 加载.env文件
const envPath = join(__dirname, '..', '.env')
if (existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

// 初始化COS客户端
const cos = new COS({
  SecretId: process.env.COS_SECRET_ID,
  SecretKey: process.env.COS_SECRET_KEY,
  Region: process.env.COS_REGION || 'ap-guangzhou', // 默认广州
})

// COS配置
const COS_CONFIG = {
  Bucket: process.env.COS_BUCKET, // 存储桶名称
  Region: process.env.COS_REGION || 'ap-guangzhou',
}

/**
 * 上传文件到COS
 * @param {string} filePath - 本地文件路径
 * @param {string} cosKey - COS中的文件路径（如：images/2024/01/image.jpg）
 * @param {object} options - 可选参数
 * @returns {Promise<{url: string, key: string}>}
 */
export async function uploadFile(filePath, cosKey, options = {}) {
  try {
    const params = {
      Bucket: COS_CONFIG.Bucket,
      Region: COS_CONFIG.Region,
      Key: cosKey,
      FilePath: filePath,
      ACL: 'public-read', // 设置为公共读，允许公开访问
      ...options,
    }

    console.log(`📤 上传文件到COS: ${cosKey} (ACL: public-read)`)

    const result = await cos.putObject(params)
    
    // 构建文件URL
    // 优先使用CDN域名（如果配置了），否则使用COS直接域名
    let url
    if (process.env.COS_CDN_DOMAIN) {
      // 使用CDN域名（格式：https://cdn.example.com/path）
      url = `${process.env.COS_CDN_DOMAIN}/${cosKey}`
      console.log(`✅ 使用CDN域名: ${url}`)
    } else {
      // 使用COS直接域名
      url = `https://${COS_CONFIG.Bucket}.cos.${COS_CONFIG.Region}.myqcloud.com/${cosKey}`
    }
    
    console.log(`✅ 文件上传成功: ${url}`)
    
    return {
      url,
      key: cosKey,
      etag: result.ETag,
    }
  } catch (error) {
    console.error('❌ COS文件上传失败:', error)
    throw new Error(`文件上传失败: ${error.message}`)
  }
}

/**
 * 上传Buffer到COS
 * @param {Buffer} buffer - 文件内容Buffer
 * @param {string} cosKey - COS中的文件路径
 * @param {string} contentType - 文件MIME类型
 * @returns {Promise<{url: string, key: string}>}
 */
export async function uploadBuffer(buffer, cosKey, contentType = 'application/octet-stream') {
  try {
    const params = {
      Bucket: COS_CONFIG.Bucket,
      Region: COS_CONFIG.Region,
      Key: cosKey,
      Body: buffer,
      ContentType: contentType,
      ACL: 'public-read', // 设置为公共读，允许公开访问
    }

    console.log(`📤 上传Buffer到COS: ${cosKey} (ACL: public-read)`)

    const result = await cos.putObject(params)
    
    // 构建文件URL
    // 优先使用CDN域名（如果配置了），否则使用COS直接域名
    let url
    if (process.env.COS_CDN_DOMAIN) {
      // 使用CDN域名（格式：https://cdn.example.com/path）
      url = `${process.env.COS_CDN_DOMAIN}/${cosKey}`
      console.log(`✅ 使用CDN域名: ${url}`)
    } else {
      // 使用COS直接域名
      url = `https://${COS_CONFIG.Bucket}.cos.${COS_CONFIG.Region}.myqcloud.com/${cosKey}`
    }
    
    console.log(`✅ Buffer上传成功: ${url}`)
    
    return {
      url,
      key: cosKey,
      etag: result.ETag,
    }
  } catch (error) {
    console.error('❌ COS Buffer上传失败:', error)
    throw new Error(`文件上传失败: ${error.message}`)
  }
}

/**
 * 从COS下载文件
 * @param {string} cosKey - COS中的文件路径
 * @param {string} localPath - 本地保存路径（可选）
 * @returns {Promise<Buffer>}
 */
export async function downloadFile(cosKey, localPath = null) {
  try {
    const params = {
      Bucket: COS_CONFIG.Bucket,
      Region: COS_CONFIG.Region,
      Key: cosKey,
    }

    if (localPath) {
      // 下载到本地文件
      await cos.getObject({
        ...params,
        Output: localPath,
      })
      console.log(`✅ 文件下载成功: ${localPath}`)
      return null
    } else {
      // 返回Buffer
      const result = await cos.getObject(params)
      console.log(`✅ 文件下载成功: ${cosKey}`)
      return result.Body
    }
  } catch (error) {
    console.error('❌ COS文件下载失败:', error)
    throw new Error(`文件下载失败: ${error.message}`)
  }
}

/**
 * 删除COS中的文件
 * @param {string} cosKey - COS中的文件路径
 * @returns {Promise<void>}
 */
export async function deleteFile(cosKey) {
  try {
    const params = {
      Bucket: COS_CONFIG.Bucket,
      Region: COS_CONFIG.Region,
      Key: cosKey,
    }

    await cos.deleteObject(params)
    console.log(`✅ 文件删除成功: ${cosKey}`)
  } catch (error) {
    console.error('❌ COS文件删除失败:', error)
    throw new Error(`文件删除失败: ${error.message}`)
  }
}

/**
 * 获取文件URL（如果文件已存在）
 * @param {string} cosKey - COS中的文件路径
 * @returns {string} 文件URL
 */
export function getFileUrl(cosKey) {
  // 优先使用CDN域名（如果配置了），否则使用COS直接域名
  if (process.env.COS_CDN_DOMAIN) {
    return `${process.env.COS_CDN_DOMAIN}/${cosKey}`
  } else {
    return `https://${COS_CONFIG.Bucket}.cos.${COS_CONFIG.Region}.myqcloud.com/${cosKey}`
  }
}

/**
 * 生成唯一的文件路径
 * @param {string} fileType - 文件类型（images, videos, documents等）
 * @param {string} fileName - 原始文件名
 * @returns {string} COS中的文件路径
 */
export function generateCosKey(fileType, fileName) {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const ext = fileName.split('.').pop()
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  
  return `${fileType}/${year}/${month}/${timestamp}_${random}.${ext}`
}

export default cos



