/**
 * COS 图片上传服务
 */

import { AuthService } from './auth'

const API_BASE_URL = (() => {
  if (import.meta.env.VITE_API_BASE_URL !== undefined) return import.meta.env.VITE_API_BASE_URL
  const isProduction = !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')
  return isProduction ? '' : 'http://localhost:3002'
})()

/**
 * 上传图片到COS
 * @param file 图片文件
 * @param folder 目标文件夹（如 'project-covers', 'avatars' 等）
 * @returns 上传结果，包含URL和key
 */
export async function uploadImageToCOS(
  file: File,
  folder: string = 'images'
): Promise<{ url: string; key: string }> {
  const token = AuthService.getToken()
  if (!token) {
    throw new Error('未登录，请先登录')
  }

  const formData = new FormData()
  formData.append('image', file)
  formData.append('folder', folder)

  const response = await fetch(`${API_BASE_URL}/api/upload-image`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || '上传图片失败')
  }

  const result = await response.json()
  if (result.success) {
    return result.data
  } else {
    throw new Error(result.error || '上传图片失败')
  }
}
