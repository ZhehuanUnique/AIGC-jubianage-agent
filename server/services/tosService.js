import TOS from '@volcengine/tos-sdk'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync, readFileSync, statSync } from 'fs'

// 获取当前文件所在目录
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 加载.env文件
const envPath = join(__dirname, '..', '.env')
if (existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

// TOS配置
const TOS_CONFIG = {
  accessKeyId: process.env.TOS_ACCESS_KEY_ID,
  accessKeySecret: process.env.TOS_ACCESS_KEY_SECRET,
  region: process.env.TOS_REGION || 'cn-shanghai', // 华东2（上海）
  bucket: process.env.TOS_BUCKET || 'aigc-jubianage-agent',
  endpoint: process.env.TOS_ENDPOINT || 'tos-cn-shanghai.volces.com',
}

// 初始化TOS客户端
let tosClient = null

function getTosClient() {
  if (!tosClient) {
    tosClient = new TOS({
      accessKeyId: TOS_CONFIG.accessKeyId,
      accessKeySecret: TOS_CONFIG.accessKeySecret,
      region: TOS_CONFIG.region,
      endpoint: TOS_CONFIG.endpoint,
    })
  }
  return tosClient
}

/**
 * 上传文件到TOS
 * @param {string} filePath - 本地文件路径
 * @param {string} tosKey - TOS中的文件路径
 * @param {object} options - 可选参数
 * @returns {Promise<{url: string, key: string}>}
 */
export async function uploadFile(filePath, tosKey, options = {}) {
  try {
    if (!existsSync(filePath)) {
      throw new Error(`文件不存在: ${filePath}`)
    }

    const stats = statSync(filePath)
    if (!stats.isFile()) {
      throw new Error(`路径不是文件: ${filePath}`)
    }

    const fileBuffer = readFileSync(filePath)
    const ext = filePath.split('.').pop()?.toLowerCase() || ''
    const contentType = getContentType(ext)

    console.log(`📤 上传文件到TOS: ${tosKey} (Size: ${(fileBuffer.length / 1024).toFixed(2)} KB)`)

    const client = getTosClient()
    const result = await client.putObject({
      bucket: TOS_CONFIG.bucket,
      key: tosKey,
      body: fileBuffer,
      contentType: contentType,
      ...options,
    })

    const url = getFileUrl(tosKey)
    console.log(`✅ 文件上传成功: ${url}`)

    return {
      url,
      key: tosKey,
      etag: result.etag,
    }
  } catch (error) {
    console.error('❌ TOS文件上传失败:', error)
    throw new Error(`文件上传失败: ${error.message}`)
  }
}


/**
 * 上传Buffer到TOS
 * @param {Buffer} buffer - 文件内容Buffer
 * @param {string} tosKey - TOS中的文件路径
 * @param {string} contentType - 文件MIME类型
 * @returns {Promise<{url: string, key: string}>}
 */
export async function uploadBuffer(buffer, tosKey, contentType = 'application/octet-stream') {
  try {
    console.log(`📤 上传Buffer到TOS: ${tosKey}`)

    const client = getTosClient()
    const result = await client.putObject({
      bucket: TOS_CONFIG.bucket,
      key: tosKey,
      body: buffer,
      contentType: contentType,
    })

    const url = getFileUrl(tosKey)
    console.log(`✅ Buffer上传成功: ${url}`)

    return {
      url,
      key: tosKey,
      etag: result.etag,
    }
  } catch (error) {
    console.error('❌ TOS Buffer上传失败:', error)
    throw new Error(`文件上传失败: ${error.message}`)
  }
}

/**
 * 从URL下载文件并上传到TOS
 * @param {string} sourceUrl - 源文件URL
 * @param {string} tosKey - TOS中的文件路径
 * @returns {Promise<{url: string, key: string}>}
 */
export async function uploadFromUrl(sourceUrl, tosKey) {
  try {
    console.log(`📥 从URL下载: ${sourceUrl}`)
    
    const response = await fetch(sourceUrl)
    if (!response.ok) {
      throw new Error(`下载失败: ${response.status}`)
    }
    
    const buffer = Buffer.from(await response.arrayBuffer())
    const contentType = response.headers.get('content-type') || 'application/octet-stream'
    
    return await uploadBuffer(buffer, tosKey, contentType)
  } catch (error) {
    console.error('❌ 从URL上传到TOS失败:', error)
    throw new Error(`从URL上传失败: ${error.message}`)
  }
}

/**
 * 从TOS下载文件
 * @param {string} tosKey - TOS中的文件路径
 * @returns {Promise<Buffer>}
 */
export async function downloadFile(tosKey) {
  try {
    const client = getTosClient()
    const result = await client.getObject({
      bucket: TOS_CONFIG.bucket,
      key: tosKey,
    })

    console.log(`✅ 文件下载成功: ${tosKey}`)
    return result.content
  } catch (error) {
    console.error('❌ TOS文件下载失败:', error)
    throw new Error(`文件下载失败: ${error.message}`)
  }
}

/**
 * 删除TOS中的文件
 * @param {string} tosKey - TOS中的文件路径
 * @returns {Promise<void>}
 */
export async function deleteFile(tosKey) {
  try {
    const client = getTosClient()
    await client.deleteObject({
      bucket: TOS_CONFIG.bucket,
      key: tosKey,
    })
    console.log(`✅ 文件删除成功: ${tosKey}`)
  } catch (error) {
    console.error('❌ TOS文件删除失败:', error)
    throw new Error(`文件删除失败: ${error.message}`)
  }
}

/**
 * 获取文件URL
 * @param {string} tosKey - TOS中的文件路径
 * @returns {string} 文件URL
 */
export function getFileUrl(tosKey) {
  // 优先使用CDN域名
  if (process.env.TOS_CDN_DOMAIN) {
    return `${process.env.TOS_CDN_DOMAIN}/${tosKey}`
  }
  // 使用TOS直接域名
  return `https://${TOS_CONFIG.bucket}.${TOS_CONFIG.endpoint}/${tosKey}`
}

/**
 * 生成唯一的文件路径
 * @param {string} fileType - 文件类型（images, videos等）
 * @param {string} fileName - 原始文件名或扩展名
 * @returns {string} TOS中的文件路径
 */
export function generateTosKey(fileType, fileName) {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const ext = fileName.includes('.') ? fileName.split('.').pop() : fileName
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  
  return `${fileType}/${year}/${month}/${timestamp}_${random}.${ext}`
}

/**
 * 获取ContentType
 * @param {string} ext - 文件扩展名
 * @returns {string}
 */
function getContentType(ext) {
  const contentTypeMap = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'mp4': 'video/mp4',
    'mov': 'video/quicktime',
    'avi': 'video/x-msvideo',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'pdf': 'application/pdf',
  }
  return contentTypeMap[ext] || 'application/octet-stream'
}

/**
 * 获取TOS中的文件列表
 * @param {string} prefix - 文件路径前缀
 * @param {number} maxKeys - 最大返回数量
 * @returns {Promise<Array>}
 */
export async function listFiles(prefix = '', maxKeys = 100) {
  try {
    const client = getTosClient()
    const result = await client.listObjects({
      bucket: TOS_CONFIG.bucket,
      prefix: prefix,
      maxKeys: maxKeys,
    })

    if (!result.contents || result.contents.length === 0) {
      return []
    }

    const files = result.contents
      .filter(item => item.key && !item.key.endsWith('/'))
      .map(item => ({
        key: item.key,
        url: getFileUrl(item.key),
        lastModified: item.lastModified,
        size: item.size,
      }))
      .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified))

    console.log(`✅ 获取到 ${files.length} 个文件`)
    return files
  } catch (error) {
    console.error('❌ 获取TOS文件列表失败:', error)
    throw new Error(`获取文件列表失败: ${error.message}`)
  }
}

/**
 * 批量删除文件
 * @param {Array<string>} tosKeys - 文件路径数组
 * @returns {Promise<void>}
 */
export async function deleteFiles(tosKeys) {
  try {
    if (!tosKeys || tosKeys.length === 0) return

    const client = getTosClient()
    await client.deleteMultiObjects({
      bucket: TOS_CONFIG.bucket,
      objects: tosKeys.map(key => ({ key })),
    })
    console.log(`✅ 批量删除文件成功: ${tosKeys.length} 个文件`)
  } catch (error) {
    console.error('❌ TOS批量删除文件失败:', error)
    throw new Error(`批量删除文件失败: ${error.message}`)
  }
}

export default {
  uploadFile,
  uploadBuffer,
  uploadFromUrl,
  downloadFile,
  deleteFile,
  deleteFiles,
  getFileUrl,
  generateTosKey,
  listFiles,
}
