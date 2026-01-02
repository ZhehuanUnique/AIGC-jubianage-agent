/**
 * IndexTTS2.5 音色创作 API 服务
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002'

export interface Voice {
  id: string
  name: string
  description?: string
  gender?: string
  language?: string
}

export interface GenerateSpeechRequest {
  text: string
  voiceId?: string
  speed?: number
  pitch?: number
  format?: 'wav' | 'mp3' | 'ogg'
}

export interface GenerateSpeechResponse {
  success: boolean
  audioUrl?: string
  audioData?: string // base64
  format?: string
  duration?: number
  error?: string
}

/**
 * 检查 IndexTTS2.5 服务健康状态
 */
export async function checkIndexTtsHealth(): Promise<boolean> {
  try {
    const token = localStorage.getItem('token')
    const response = await fetch(`${API_BASE_URL}/api/indextts/health`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    const data = await response.json()
    return data.success === true
  } catch (error) {
    console.error('检查 IndexTTS2.5 健康状态失败:', error)
    return false
  }
}

/**
 * 获取可用音色列表
 */
export async function getVoices(): Promise<Voice[]> {
  try {
    const token = localStorage.getItem('token')
    const response = await fetch(`${API_BASE_URL}/api/indextts/voices`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    return data.voices || []
  } catch (error) {
    console.error('获取音色列表失败:', error)
    throw error
  }
}

/**
 * 生成语音
 */
export async function generateSpeech(
  request: GenerateSpeechRequest
): Promise<GenerateSpeechResponse> {
  try {
    const token = localStorage.getItem('token')
    const response = await fetch(`${API_BASE_URL}/api/indextts/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '生成语音失败')
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('生成语音失败:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('网络错误，请检查服务器连接')
  }
}

/**
 * 批量生成语音
 */
export async function generateSpeechBatch(
  requests: GenerateSpeechRequest[]
): Promise<GenerateSpeechResponse[]> {
  try {
    const token = localStorage.getItem('token')
    const response = await fetch(`${API_BASE_URL}/api/indextts/generate-batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ texts: requests }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '批量生成语音失败')
    }

    const data = await response.json()
    return data.results || []
  } catch (error) {
    console.error('批量生成语音失败:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('网络错误，请检查服务器连接')
  }
}

