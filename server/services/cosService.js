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
    
    // 检测账户欠费错误
    const errorMessage = error.message || error.Error?.Message || ''
    if (errorMessage.includes('arrears') || errorMessage.includes('欠费') || errorMessage.includes('recharge')) {
      throw new Error('文件上传失败: 腾讯云COS账户欠费，请充值后再试')
    }
    
    throw new Error(`文件上传失败: ${errorMessage}`)
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
    
    // 检测账户欠费错误
    const errorMessage = error.message || error.Error?.Message || ''
    if (errorMessage.includes('arrears') || errorMessage.includes('欠费') || errorMessage.includes('recharge')) {
      throw new Error('文件上传失败: 腾讯云COS账户欠费，请充值后再试')
    }
    
    throw new Error(`文件上传失败: ${errorMessage}`)
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
  // 如果 fileName 包含点号，提取扩展名；否则直接使用（可能是纯扩展名如 'mp3'）
  const ext = fileName.includes('.') ? fileName.split('.').pop() : fileName
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  
  return `${fileType}/${year}/${month}/${timestamp}_${random}.${ext}`
}

/**
 * 获取COS中的文件列表
 * @param {string} prefix - 文件路径前缀（如：images/recreation/）
 * @param {number} maxKeys - 最大返回数量，默认100
 * @returns {Promise<Array<{key: string, url: string, lastModified: string, size: number}>>}
 */
export async function listFiles(prefix = '', maxKeys = 100) {
  try {
    const params = {
      Bucket: COS_CONFIG.Bucket,
      Region: COS_CONFIG.Region,
      Prefix: prefix,
      MaxKeys: maxKeys,
    }

    console.log(`📋 获取COS文件列表: prefix=${prefix}, maxKeys=${maxKeys}`)

    const result = await cos.getBucket(params)
    
    if (!result.Contents || result.Contents.length === 0) {
      console.log(`📋 未找到文件: prefix=${prefix}`)
      return []
    }

    // 构建文件列表，包含URL
    const files = result.Contents
      .filter(item => item.Key && !item.Key.endsWith('/')) // 过滤掉目录
      .map(item => ({
        key: item.Key,
        url: getFileUrl(item.Key),
        lastModified: item.LastModified,
        size: item.Size,
      }))
      .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified)) // 按时间倒序

    console.log(`✅ 获取到 ${files.length} 个文件`)
    
    return files
  } catch (error) {
    console.error('❌ 获取COS文件列表失败:', error)
    throw new Error(`获取文件列表失败: ${error.message}`)
  }
}

/**
 * 批量删除COS中的文件
 * @param {Array<string>} cosKeys - COS中的文件路径数组
 * @returns {Promise<void>}
 */
export async function deleteFiles(cosKeys) {
  try {
    if (!cosKeys || cosKeys.length === 0) {
      return
    }

    // COS批量删除最多支持1000个文件
    const batchSize = 1000
    for (let i = 0; i < cosKeys.length; i += batchSize) {
      const batch = cosKeys.slice(i, i + batchSize)
      const params = {
        Bucket: COS_CONFIG.Bucket,
        Region: COS_CONFIG.Region,
        Objects: batch.map(key => ({ Key: key })),
      }

      await cos.deleteMultipleObject(params)
      console.log(`✅ 批量删除文件成功: ${batch.length} 个文件`)
    }
  } catch (error) {
    console.error('❌ COS批量删除文件失败:', error)
    throw new Error(`批量删除文件失败: ${error.message}`)
  }
}

/**
 * 清理项目相关的COS文件
 * @param {string} projectName - 项目名称（用于标识，实际通过keepKeys过滤）
 * @param {Array<string>} keepKeys - 需要保留的文件key列表（从数据库获取的正在使用的文件）
 * @returns {Promise<{deleted: number, kept: number}>}
 */
export async function cleanupProjectFiles(projectName, keepKeys = []) {
  try {
    // 获取所有相关文件
    const prefixes = [
      `characters/`,
      `scenes/`,
      `items/`,
      `videos/`,
      `images/`,
    ]

    const allFiles = []
    for (const prefix of prefixes) {
      try {
        const files = await listFiles(prefix, 10000) // 获取最多10000个文件
        allFiles.push(...files)
      } catch (error) {
        console.warn(`获取 ${prefix} 文件列表失败:`, error)
      }
    }

    // 将keepKeys转换为Set以便快速查找
    const keepKeysSet = new Set(keepKeys.map(key => {
      // 处理URL格式的key，提取实际的COS key
      if (key && key.includes('/')) {
        // 从URL中提取key（最后一个/之后的部分，或者完整路径）
        const urlMatch = key.match(/https?:\/\/[^\/]+\/(.+)/)
        return urlMatch ? urlMatch[1] : key
      }
      return key
    }))

    // 过滤出需要删除的文件（不在保留列表中的文件）
    const filesToDelete = allFiles.filter(file => {
      // 检查文件key是否在保留列表中
      return !keepKeysSet.has(file.key)
    })

    if (filesToDelete.length === 0) {
      console.log('📋 没有需要清理的文件')
      return { deleted: 0, kept: keepKeys.length }
    }

    // 批量删除
    const keysToDelete = filesToDelete.map(file => file.key)
    await deleteFiles(keysToDelete)

    console.log(`✅ 清理完成: 删除 ${filesToDelete.length} 个文件，保留 ${keepKeys.length} 个文件`)
    return { deleted: filesToDelete.length, kept: keepKeys.length }
  } catch (error) {
    console.error('❌ 清理项目文件失败:', error)
    throw new Error(`清理项目文件失败: ${error.message}`)
  }
}

export default cos



