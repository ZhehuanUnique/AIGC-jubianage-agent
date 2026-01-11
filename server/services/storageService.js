/**
 * 统一存储服务
 * 自动在 TOS（火山引擎）和 COS（腾讯云）之间切换
 * 新数据优先写入 TOS，旧数据从 COS 读取
 */

import * as tosService from './tosService.js'
import * as cosService from './cosService.js'
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

// 存储服务配置
const STORAGE_CONFIG = {
  // 主存储：优先使用 TOS
  primary: process.env.TOS_ACCESS_KEY_ID ? 'tos' : 'cos',
  // 是否启用双写（同时写入 TOS 和 COS）
  dualWrite: process.env.STORAGE_DUAL_WRITE === 'true',
  // CDN 域名
  cdnDomain: process.env.VOLC_CDN_DOMAIN || process.env.TOS_CDN_DOMAIN || process.env.COS_CDN_DOMAIN,
}

console.log(`📦 存储服务初始化: 主存储=${STORAGE_CONFIG.primary}, 双写=${STORAGE_CONFIG.dualWrite}`)

/**
 * 获取当前存储服务
 */
function getService(provider = STORAGE_CONFIG.primary) {
  return provider === 'tos' ? tosService : cosService
}

/**
 * 上传文件
 * @param {string} filePath - 本地文件路径
 * @param {string} objectKey - 存储路径
 * @param {object} options - 选项
 */
export async function uploadFile(filePath, objectKey, options = {}) {
  const service = getService()
  
  try {
    const result = await service.uploadFile(filePath, objectKey, options)
    
    // 双写模式：同时写入另一个存储
    if (STORAGE_CONFIG.dualWrite) {
      const backupService = getService(STORAGE_CONFIG.primary === 'tos' ? 'cos' : 'tos')
      try {
        await backupService.uploadFile(filePath, objectKey, options)
        console.log(`📦 双写成功: ${objectKey}`)
      } catch (err) {
        console.warn(`⚠️ 双写备份失败: ${err.message}`)
      }
    }
    
    // 返回 CDN URL（如果配置了）
    if (STORAGE_CONFIG.cdnDomain) {
      result.url = `${STORAGE_CONFIG.cdnDomain}/${objectKey}`
    }
    
    return result
  } catch (error) {
    // 主存储失败，尝试备用存储
    console.warn(`⚠️ 主存储上传失败，尝试备用存储: ${error.message}`)
    const backupService = getService(STORAGE_CONFIG.primary === 'tos' ? 'cos' : 'tos')
    return await backupService.uploadFile(filePath, objectKey, options)
  }
}

/**
 * 上传 Buffer
 */
export async function uploadBuffer(buffer, objectKey, contentType = 'application/octet-stream') {
  const service = getService()
  
  try {
    const result = await service.uploadBuffer(buffer, objectKey, contentType)
    
    if (STORAGE_CONFIG.dualWrite) {
      const backupService = getService(STORAGE_CONFIG.primary === 'tos' ? 'cos' : 'tos')
      try {
        await backupService.uploadBuffer(buffer, objectKey, contentType)
      } catch (err) {
        console.warn(`⚠️ 双写备份失败: ${err.message}`)
      }
    }
    
    if (STORAGE_CONFIG.cdnDomain) {
      result.url = `${STORAGE_CONFIG.cdnDomain}/${objectKey}`
    }
    
    return result
  } catch (error) {
    console.warn(`⚠️ 主存储上传失败，尝试备用存储`)
    const backupService = getService(STORAGE_CONFIG.primary === 'tos' ? 'cos' : 'tos')
    return await backupService.uploadBuffer(buffer, objectKey, contentType)
  }
}

/**
 * 从 URL 下载并上传
 */
export async function uploadFromUrl(sourceUrl, objectKey) {
  try {
    console.log(`📥 从URL下载: ${sourceUrl}`)
    
    const response = await fetch(sourceUrl)
    if (!response.ok) {
      throw new Error(`下载失败: ${response.status}`)
    }
    
    const buffer = Buffer.from(await response.arrayBuffer())
    const contentType = response.headers.get('content-type') || 'application/octet-stream'
    
    return await uploadBuffer(buffer, objectKey, contentType)
  } catch (error) {
    console.error('❌ 从URL上传失败:', error)
    throw error
  }
}

/**
 * 下载文件
 */
export async function downloadFile(objectKey) {
  // 优先从主存储下载
  try {
    const service = getService()
    return await service.downloadFile(objectKey)
  } catch (error) {
    // 主存储失败，尝试备用存储（可能是旧数据在 COS）
    console.warn(`⚠️ 主存储下载失败，尝试备用存储`)
    const backupService = getService(STORAGE_CONFIG.primary === 'tos' ? 'cos' : 'tos')
    return await backupService.downloadFile(objectKey)
  }
}

/**
 * 删除文件
 */
export async function deleteFile(objectKey) {
  const service = getService()
  await service.deleteFile(objectKey)
  
  // 双写模式下也删除备用存储的文件
  if (STORAGE_CONFIG.dualWrite) {
    try {
      const backupService = getService(STORAGE_CONFIG.primary === 'tos' ? 'cos' : 'tos')
      await backupService.deleteFile(objectKey)
    } catch (err) {
      // 备用存储可能没有这个文件，忽略错误
    }
  }
}

/**
 * 获取文件 URL
 */
export function getFileUrl(objectKey) {
  if (STORAGE_CONFIG.cdnDomain) {
    return `${STORAGE_CONFIG.cdnDomain}/${objectKey}`
  }
  const service = getService()
  return service.getFileUrl(objectKey)
}

/**
 * 生成存储路径
 */
export function generateKey(fileType, fileName) {
  const service = getService()
  if (STORAGE_CONFIG.primary === 'tos') {
    return tosService.generateTosKey(fileType, fileName)
  }
  return cosService.generateCosKey(fileType, fileName)
}

/**
 * 获取当前存储服务信息
 */
export function getStorageInfo() {
  return {
    primary: STORAGE_CONFIG.primary,
    dualWrite: STORAGE_CONFIG.dualWrite,
    cdnEnabled: !!STORAGE_CONFIG.cdnDomain,
    cdnDomain: STORAGE_CONFIG.cdnDomain,
  }
}

export default {
  uploadFile,
  uploadBuffer,
  uploadFromUrl,
  downloadFile,
  deleteFile,
  getFileUrl,
  generateKey,
  getStorageInfo,
}
