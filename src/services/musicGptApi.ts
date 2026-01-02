const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002'
import { AuthService } from './auth'

export interface MusicGptGenerateRequest {
  prompt: string
  secs?: number // 时长（秒），1-30，默认10
}

export interface MusicGptGenerateResponse {
  success: boolean
  data: {
    id: string
    audio_url: string
    progress?: number
  }
}

/**
 * MusicGPT API 服务
 * MusicGPT 是一个本地部署的开源音乐生成工具
 * 默认运行在 http://localhost:8642
 */
export class MusicGptApi {
  private static readonly MUSICGPT_BASE_URL = import.meta.env.VITE_MUSICGPT_BASE_URL || 'http://localhost:8642'

  /**
   * 生成音乐
   * 通过后端代理调用 MusicGPT WebSocket API
   */
  static async generateMusic(request: MusicGptGenerateRequest): Promise<MusicGptGenerateResponse> {
    const response = await fetch(`${API_BASE_URL}/api/musicgpt/generate`, {
      method: 'POST',
      headers: AuthService.getAuthHeaders(),
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || error.msg || '生成音乐失败')
    }

    return response.json()
  }

  /**
   * 检查 MusicGPT 服务是否可用
   */
  static async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/musicgpt/health`, {
        headers: AuthService.getAuthHeaders(),
      })
      const data = await response.json()
      return data.success === true
    } catch {
      return false
    }
  }
}


