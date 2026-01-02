const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002'

export interface User {
  id: number
  username: string
  displayName: string
}

export interface LoginResponse {
  success: boolean
  token?: string
  user?: User
  error?: string
}

/**
 * 认证服务
 */
export class AuthService {
  private static readonly TOKEN_KEY = 'auth_token'
  private static readonly USER_KEY = 'auth_user'

  /**
   * 用户登录（带重试机制）
   */
  static async login(username: string, password: string, retries: number = 2): Promise<LoginResponse> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // 创建带超时的 fetch 请求
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000) // 10秒超时

        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username, password }),
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        const data = await response.json()

        if (!response.ok) {
          // HTTP状态码不是200-299，说明有错误
          return { success: false, error: data.error || '登录失败' }
        }

        if (data.success && data.token) {
          // 保存token和用户信息
          localStorage.setItem(this.TOKEN_KEY, data.token)
          localStorage.setItem(this.USER_KEY, JSON.stringify(data.user))
          return { success: true, token: data.token, user: data.user }
        }

        return { success: false, error: data.error || '登录失败' }
      } catch (error: any) {
        console.error(`登录失败 (尝试 ${attempt + 1}/${retries + 1}):`, error)
        
        // 如果是最后一次尝试，返回错误
        if (attempt === retries) {
          // 提供更详细的错误信息
          if (error instanceof TypeError && (error.message.includes('fetch') || error.message.includes('Failed to fetch'))) {
            return { success: false, error: '无法连接到服务器，请确保后端服务已启动（http://localhost:3002）' }
          }
          if (error.name === 'AbortError') {
            return { success: false, error: '请求超时，请稍后重试' }
          }
          return { success: false, error: '网络错误，请稍后重试' }
        }
        
        // 如果不是最后一次尝试，等待一段时间后重试
        await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1))) // 递增延迟：500ms, 1000ms
      }
    }
    
    return { success: false, error: '登录失败，请稍后重试' }
  }

  /**
   * 用户登出
   */
  static logout(): void {
    localStorage.removeItem(this.TOKEN_KEY)
    localStorage.removeItem(this.USER_KEY)
  }

  /**
   * 获取当前token
   */
  static getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY)
  }

  /**
   * 获取当前用户
   */
  static getCurrentUser(): User | null {
    const userStr = localStorage.getItem(this.USER_KEY)
    if (!userStr) return null
    try {
      return JSON.parse(userStr)
    } catch {
      return null
    }
  }

  /**
   * 验证token是否有效
   */
  static async verifyToken(): Promise<boolean> {
    const token = this.getToken()
    if (!token) return false

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()
      if (data.success && data.user) {
        // 更新用户信息
        localStorage.setItem(this.USER_KEY, JSON.stringify(data.user))
        return true
      }

      // token无效，清除
      this.logout()
      return false
    } catch (error) {
      console.error('验证token失败:', error)
      this.logout()
      return false
    }
  }

  /**
   * 获取认证请求头
   */
  static getAuthHeaders(): HeadersInit {
    const token = this.getToken()
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
  }
}

