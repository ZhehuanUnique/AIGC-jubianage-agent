import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'

// 加载.env文件
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const envPath = join(__dirname, '../../.env')
if (existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

/**
 * IndexTTS2.5 音色创作服务
 * 用于文本转语音（TTS）功能
 */

const INDEXTTS_BASE_URL = process.env.INDEXTTS_BASE_URL || 'http://localhost:8000'
const INDEXTTS_ENABLED = process.env.INDEXTTS_ENABLED !== 'false'
const INDEXTTS_PATH = process.env.INDEXTTS_PATH || 'C:\\Users\\Administrator\\Desktop\\index-tt2.5'
const INDEXTTS_TIMEOUT = parseInt(process.env.INDEXTTS_TIMEOUT || '60000') // 60秒

/**
 * 检查服务健康状态
 * @returns {Promise<boolean>} 服务是否可用
 */
export async function checkIndexTtsHealth() {
  if (!INDEXTTS_ENABLED) {
    return false
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5秒超时

    const response = await fetch(`${INDEXTTS_BASE_URL}/api/health`, {
      method: 'GET',
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (response.ok) {
      return true
    }
    return false
  } catch (error) {
    console.warn('IndexTTS2.5 健康检查失败:', error.message)
    console.warn('IndexTTS2.5 服务地址:', INDEXTTS_BASE_URL)
    return false
  }
}

/**
 * 获取可用音色列表
 * @returns {Promise<Array>} 音色列表
 */
export async function getVoices() {
  if (!INDEXTTS_ENABLED) {
    throw new Error('IndexTTS2.5 服务未启用')
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), INDEXTTS_TIMEOUT)

    const response = await fetch(`${INDEXTTS_BASE_URL}/api/voices`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    // Handle both array response and object with voices property
    if (Array.isArray(data)) {
      return data
    }
    return data.voices || data || []
  } catch (error) {
    console.error('获取音色列表失败:', error)
    console.error('IndexTTS2.5 服务地址:', INDEXTTS_BASE_URL)
    console.error('错误详情:', error)
    throw new Error(`获取音色列表失败: ${error.message}`)
  }
}

/**
 * 生成语音
 * @param {Object} options - 生成选项
 * @param {string} options.text - 要转换的文本
 * @param {string} options.voiceId - 音色ID（可选）
 * @param {number} options.speed - 语速（可选，默认1.0）
 * @param {number} options.pitch - 音调（可选，默认0）
 * @param {string} options.format - 输出格式（可选，默认wav）
 * @returns {Promise<Object>} 生成结果，包含音频URL或base64数据
 */
export async function generateSpeech(options = {}) {
  const {
    text,
    voiceId = 'default',
    speed = 1.0,
    pitch = 0,
    format = 'wav',
  } = options

  if (!INDEXTTS_ENABLED) {
    throw new Error('IndexTTS2.5 服务未启用')
  }

  if (!text || !text.trim()) {
    throw new Error('文本不能为空')
  }

  try {
    console.log('🎤 调用 IndexTTS2.5 生成语音:', {
      text: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
      voiceId,
      speed,
      pitch,
    })

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), INDEXTTS_TIMEOUT)

    const requestBody = {
      text: text.trim(),
      voice_id: voiceId,
      speed: speed,
      pitch: pitch,
      format: format,
    }

    const response = await fetch(`${INDEXTTS_BASE_URL}/api/tts/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`)
    }

    const data = await response.json()

    console.log('✅ IndexTTS2.5 生成完成')

    return {
      success: true,
      audioUrl: data.audio_url || data.url,
      audioData: data.audio_data || data.base64,
      format: data.format || format,
      duration: data.duration,
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('IndexTTS2.5 请求超时，请检查服务是否正常运行')
    }
    console.error('IndexTTS2.5 生成语音失败:', error)
    throw new Error(`生成语音失败: ${error.message}`)
  }
}

/**
 * 批量生成语音
 * @param {Array<Object>} texts - 文本数组，每个对象包含 text 和其他选项
 * @returns {Promise<Array>} 生成结果数组
 */
export async function generateSpeechBatch(texts) {
  if (!Array.isArray(texts) || texts.length === 0) {
    throw new Error('文本数组不能为空')
  }

  const results = []
  for (const item of texts) {
    try {
      const result = await generateSpeech(item)
      results.push({ success: true, ...result })
    } catch (error) {
      results.push({ success: false, error: error.message })
    }
  }

  return results
}

