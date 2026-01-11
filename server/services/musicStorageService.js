import { uploadBuffer, generateKey as generateCosKey } from './storageService.js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 加载.env文件
const envPath = join(__dirname, '..', '.env')
if (existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

/**
 * 音乐存储服务
 * 将生成的音乐上传到 COS 并保存到数据库
 */

/**
 * 从 URL 下载音频文件
 * @param {string} audioUrl - 音频文件 URL
 * @returns {Promise<Buffer>} 音频文件 Buffer
 */
async function downloadAudioFromUrl(audioUrl) {
  try {
    console.log(`📥 正在下载音频: ${audioUrl}`)
    
    const response = await fetch(audioUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'audio/*',
      },
      signal: AbortSignal.timeout(60000), // 60秒超时
    })

    if (!response.ok) {
      throw new Error(`下载音频失败: HTTP ${response.status} ${response.statusText}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    console.log(`✅ 音频下载成功: ${buffer.length} bytes`)
    return buffer
  } catch (error) {
    console.error('❌ 下载音频失败:', error)
    throw new Error(`下载音频失败: ${error.message}`)
  }
}

/**
 * 上传音乐到 COS
 * @param {string} audioUrl - 原始音频 URL
 * @param {object} metadata - 音乐元数据
 * @param {string} metadata.title - 音乐标题
 * @param {string} metadata.prompt - 生成提示词
 * @param {string} metadata.provider - 提供商（suno/musicgpt）
 * @param {string} metadata.userId - 用户ID（可选）
 * @returns {Promise<{url: string, key: string, originalUrl: string}>}
 */
export async function uploadMusicToCOS(audioUrl, metadata = {}) {
  try {
    // 检查 COS 配置
    if (!process.env.COS_SECRET_ID || !process.env.COS_SECRET_KEY || !process.env.COS_BUCKET) {
      console.warn('⚠️ COS 配置不完整，跳过上传')
      return {
        url: audioUrl,
        key: null,
        originalUrl: audioUrl,
        uploaded: false,
      }
    }

    // 下载音频文件
    const audioBuffer = await downloadAudioFromUrl(audioUrl)

    // 确定文件扩展名和 MIME 类型
    let ext = 'mp3'
    let contentType = 'audio/mpeg'
    
    // 根据 URL 或 Content-Type 判断文件类型
    if (audioUrl.includes('.wav') || audioUrl.includes('audio/wav')) {
      ext = 'wav'
      contentType = 'audio/wav'
    } else if (audioUrl.includes('.m4a') || audioUrl.includes('audio/m4a')) {
      ext = 'm4a'
      contentType = 'audio/mp4'
    } else if (audioUrl.includes('.ogg') || audioUrl.includes('audio/ogg')) {
      ext = 'ogg'
      contentType = 'audio/ogg'
    }

    // 生成 COS key（使用扩展名）
    const cosKey = generateCosKey('music', ext || 'mp3')

    // 上传到 COS
    console.log(`📤 正在上传音乐到 COS: ${cosKey}`)
    const uploadResult = await uploadBuffer(audioBuffer, cosKey, contentType)

    console.log(`✅ 音乐已上传到 COS: ${uploadResult.url}`)
    console.log(`   原始URL: ${audioUrl}`)
    console.log(`   COS URL: ${uploadResult.url}`)
    console.log(`   文件大小: ${(audioBuffer.length / 1024).toFixed(2)} KB`)

    return {
      url: uploadResult.url,
      key: uploadResult.key,
      originalUrl: audioUrl,
      uploaded: true,
      size: audioBuffer.length,
      contentType,
    }
  } catch (error) {
    console.error('❌ 上传音乐到 COS 失败:', error)
    // 如果上传失败，返回原始 URL
    return {
      url: audioUrl,
      key: null,
      originalUrl: audioUrl,
      uploaded: false,
      error: error.message,
    }
  }
}

/**
 * 保存音乐记录到数据库
 * @param {object} musicData - 音乐数据
 * @param {string} musicData.cosUrl - COS URL
 * @param {string} musicData.originalUrl - 原始 URL
 * @param {string} musicData.title - 标题
 * @param {string} musicData.prompt - 提示词
 * @param {string} musicData.provider - 提供商
 * @param {number} musicData.userId - 用户ID
 * @param {string} musicData.projectId - 项目ID（可选）
 * @returns {Promise<object>} 保存的音乐记录
 */
export async function saveMusicToDatabase(musicData) {
  try {
    const pool = await import('../db/connection.js')
    const db = pool.default || pool
    
    const {
      cosUrl,
      originalUrl,
      title,
      prompt,
      provider,
      userId,
      projectId = null,
      cosKey = null,
      size = null,
      contentType = null,
    } = musicData

    // 插入音乐记录（表已在 Supabase 中创建）
    const insertQuery = `
      INSERT INTO music_files (
        title, prompt, provider, original_url, cos_url, cos_key, 
        size, content_type, user_id, project_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `

    const result = await db.query(insertQuery, [
      title || '未命名音乐',
      prompt || '',
      provider || 'unknown',
      originalUrl,
      cosUrl,
      cosKey,
      size,
      contentType,
      userId || null,
      projectId || null,
    ])

    console.log(`✅ 音乐记录已保存到数据库: ID ${result.rows[0].id}`)
    return result.rows[0]
  } catch (error) {
    console.error('保存音乐记录失败:', error)
    // 不抛出错误，允许继续执行
    return null
  }
}

/**
 * 获取用户的音乐列表
 * @param {number} userId - 用户ID
 * @param {number} projectId - 项目ID（可选）
 * @returns {Promise<Array>} 音乐列表
 */
export async function getUserMusicList(userId, projectId = null) {
  try {
    const pool = await import('../db/connection.js')
    const db = pool.default || pool
    
    let query = `
      SELECT * FROM music_files 
      WHERE user_id = $1
    `
    const params = [userId]

    if (projectId) {
      query += ' AND project_id = $2'
      params.push(projectId)
    }

    query += ' ORDER BY created_at DESC'

    const result = await db.query(query, params)
    return result.rows
  } catch (error) {
    console.error('获取音乐列表失败:', error)
    return []
  }
}

/**
 * 删除音乐记录
 * @param {number} musicId - 音乐ID
 * @param {number} userId - 用户ID（用于权限验证）
 * @returns {Promise<boolean>} 是否删除成功
 */
export async function deleteMusic(musicId, userId) {
  try {
    const pool = await import('../db/connection.js')
    const db = pool.default || pool
    
    // 先获取音乐信息（包括 COS key）
    const getQuery = 'SELECT * FROM music_files WHERE id = $1 AND user_id = $2'
    const getResult = await db.query(getQuery, [musicId, userId])

    if (getResult.rows.length === 0) {
      throw new Error('音乐不存在或无权删除')
    }

    const music = getResult.rows[0]

    // 如果存在 COS key，尝试删除 COS 文件
    if (music.cos_key && process.env.COS_SECRET_ID) {
      try {
        const { deleteFile } = await import('./cosService.js')
        await deleteFile(music.cos_key)
        console.log(`✅ COS 文件已删除: ${music.cos_key}`)
      } catch (cosError) {
        console.warn('⚠️ 删除 COS 文件失败:', cosError)
        // 继续删除数据库记录
      }
    }

    // 删除数据库记录
    const deleteQuery = 'DELETE FROM music_files WHERE id = $1 AND user_id = $2'
    await db.query(deleteQuery, [musicId, userId])

    console.log(`✅ 音乐记录已删除: ID ${musicId}`)
    return true
  } catch (error) {
    console.error('删除音乐失败:', error)
    throw error
  }
}

