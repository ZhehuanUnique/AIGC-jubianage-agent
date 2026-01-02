const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002'
import { AuthService } from './auth'

export interface SunoMusicGenerateRequest {
  customMode?: boolean // 是否自定义模式，默认false（非自定义模式更简单）
  instrumental?: boolean // 是否纯音乐，默认false
  model?: 'V4' | 'V4_5' | 'V4_5PLUS' | 'V4_5ALL' | 'V5' // 模型版本，默认V5
  callBackUrl?: string // 回调URL（可选，如果不提供则使用轮询查询）
  prompt: string // 提示词（必填）
  style?: string // 音乐风格（customMode为true时必填）
  title?: string // 音乐标题（customMode为true时必填）
  personaId?: string // Persona ID（可选）
  negativeTags?: string // 负面标签（可选）
  vocalGender?: 'm' | 'f' // 人声性别（可选）
  styleWeight?: number // 风格权重 0-1（可选）
  weirdnessConstraint?: number // 创意约束 0-1（可选）
  audioWeight?: number // 音频权重 0-1（可选）
}

export interface SunoMusicGenerateResponse {
  success: boolean
  code: number
  msg: string
  data: {
    taskId: string
  }
}

export interface SunoMusicDetails {
  taskId?: string
  id?: string
  title?: string
  audio_url?: string
  image_url?: string
  status?: string
  lyrics?: string
  [key: string]: any
}

export interface SunoLyricsGenerateRequest {
  prompt: string // 歌词描述提示词（必填，最多200字）
  callBackUrl?: string // 回调URL（可选）
}

export interface SunoCredits {
  credits: number
  [key: string]: any
}

/**
 * Suno API 服务
 */
export class SunoApi {
  /**
   * 生成音乐
   */
  static async generateMusic(request: SunoMusicGenerateRequest): Promise<SunoMusicGenerateResponse> {
    const response = await fetch(`${API_BASE_URL}/api/suno/generate`, {
      method: 'POST',
      headers: AuthService.getAuthHeaders(),
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || '音乐生成失败')
    }

    return response.json()
  }

  /**
   * 获取音乐详情
   */
  static async getMusicDetails(taskId: string): Promise<{ success: boolean; code: number; msg: string; data: SunoMusicDetails }> {
    const response = await fetch(`${API_BASE_URL}/api/suno/music/${taskId}`, {
      headers: AuthService.getAuthHeaders(),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || error.msg || '获取音乐详情失败')
    }

    return response.json()
  }

  /**
   * 生成歌词
   */
  static async generateLyrics(request: SunoLyricsGenerateRequest): Promise<{ success: boolean; code: number; msg: string; data: { taskId: string } }> {
    const response = await fetch(`${API_BASE_URL}/api/suno/lyrics`, {
      method: 'POST',
      headers: AuthService.getAuthHeaders(),
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || error.msg || '歌词生成失败')
    }

    return response.json()
  }

  /**
   * 获取歌词生成详情
   */
  static async getLyricsDetails(taskId: string): Promise<{ success: boolean; code: number; msg: string; data: any }> {
    const response = await fetch(`${API_BASE_URL}/api/suno/lyrics/${taskId}`, {
      headers: AuthService.getAuthHeaders(),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || error.msg || '获取歌词详情失败')
    }

    return response.json()
  }

  /**
   * 获取剩余积分
   */
  static async getCredits(): Promise<{ success: boolean; code: number; msg: string; data: SunoCredits }> {
    const response = await fetch(`${API_BASE_URL}/api/suno/credits`, {
      headers: AuthService.getAuthHeaders(),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || error.msg || '获取积分失败')
    }

    return response.json()
  }
}

