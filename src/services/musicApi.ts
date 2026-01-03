/**
 * 音乐存储 API 服务
 */

// 生产环境使用相对路径，开发环境使用完整URL
const API_BASE_URL = (() => {
  if (import.meta.env.VITE_API_BASE_URL !== undefined) return import.meta.env.VITE_API_BASE_URL
  const isProduction = typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')
  return isProduction ? '' : 'http://localhost:3002'
})()
import { AuthService } from './auth'

export interface MusicFile {
  id: number
  title: string
  prompt: string
  provider: 'suno' | 'musicgpt'
  original_url: string
  cos_url: string
  cos_key: string | null
  size: number | null
  content_type: string | null
  user_id: number
  project_id: number | null
  created_at: string
  updated_at: string
}

/**
 * 获取用户的音乐列表
 */
export async function getMusicList(projectId?: number): Promise<MusicFile[]> {
  try {
    const url = projectId 
      ? `${API_BASE_URL}/api/music/list?projectId=${projectId}`
      : `${API_BASE_URL}/api/music/list`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: AuthService.getAuthHeaders(),
    })

    if (!response.ok) {
      throw new Error('获取音乐列表失败')
    }

    const data = await response.json()
    return data.data || []
  } catch (error) {
    console.error('获取音乐列表失败:', error)
    throw error
  }
}

/**
 * 删除音乐
 */
export async function deleteMusicFile(musicId: number): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/music/${musicId}`, {
      method: 'DELETE',
      headers: AuthService.getAuthHeaders(),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || '删除音乐失败')
    }
  } catch (error) {
    console.error('删除音乐失败:', error)
    throw error
  }
}

