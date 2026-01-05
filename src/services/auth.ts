// 生产环境使用相对路径，开发环境使用完整URL
// 使用运行时检测，确保生产环境使用相对路径
const API_BASE_URL = (() => {
  // 如果设置了环境变量，优先使用
  if (import.meta.env.VITE_API_BASE_URL !== undefined) {
    return import.meta.env.VITE_API_BASE_URL
  }
  // 运行时检测：如果当前域名不是 localhost，使用相对路径
  const isProduction = typeof window !== 'undefined' && 
    !window.location.hostname.includes('localhost') && 
    !window.location.hostname.includes('127.0.0.1')
  return isProduction ? '' : 'http://localhost:3002'
})()

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
  private static isVerifying = false // 防止重复验证

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

        // 检查响应类型，如果是HTML说明服务器返回了错误页面（502等）
        const contentType = response.headers.get('content-type')
        if (contentType && !contentType.includes('application/json')) {
          // 服务器返回了非JSON响应（可能是HTML错误页面）
          const text = await response.text()
          console.error('服务器返回非JSON响应:', text.substring(0, 200))
          if (response.status === 502 || response.status === 503) {
            return { success: false, error: '服务器暂时不可用，请稍后重试' }
          }
          return { success: false, error: '服务器错误，请稍后重试' }
        }

        const data = await response.json()

        if (!response.ok) {
          // HTTP状态码不是200-299，说明有错误
          return { success: false, error: data.error || '登录失败' }
        }

        if (data.success && data.token) {
          // 保存token和用户信息
          localStorage.setItem(this.TOKEN_KEY, data.token)
          localStorage.setItem(this.USER_KEY, JSON.stringify(data.user))
          // 触发自定义事件通知其他组件登录状态变化
          window.dispatchEvent(new Event('auth-changed'))
          return { success: true, token: data.token, user: data.user }
        }

        return { success: false, error: data.error || '登录失败' }
      } catch (error: any) {
        console.error(`登录失败 (尝试 ${attempt + 1}/${retries + 1}):`, error)
        
        // 如果是最后一次尝试，返回错误
        if (attempt === retries) {
          // 提供更详细的错误信息
          if (error instanceof TypeError && (error.message.includes('fetch') || error.message.includes('Failed to fetch'))) {
            const serverUrl = import.meta.env.MODE === 'production' ? '服务器' : 'http://localhost:3002'
            return { success: false, error: `无法连接到服务器，请确保后端服务已启动${import.meta.env.MODE === 'production' ? '' : `（${serverUrl}）`}` }
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
    // 触发自定义事件通知其他组件登录状态变化
    window.dispatchEvent(new Event('auth-changed'))
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
    // 如果正在验证中，直接返回当前状态，避免重复调用
    if (this.isVerifying) {
      const user = this.getCurrentUser()
      return !!user && !!this.getToken()
    }

    const token = this.getToken()
    if (!token) {
      // 如果没有token，直接返回false，不触发logout（避免循环）
      return false
    }

    this.isVerifying = true
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      // 如果响应不是 200，说明 token 无效或服务器错误
      if (!response.ok) {
        // 502/503错误不清除token，可能是服务器暂时不可用
        if (response.status === 502 || response.status === 503) {
          console.warn('服务器暂时不可用，保留token')
          return false
        }
        // 其他错误清除token和用户信息
        localStorage.removeItem(this.TOKEN_KEY)
        localStorage.removeItem(this.USER_KEY)
        return false
      }

      // 检查响应类型
      const contentType = response.headers.get('content-type')
      if (contentType && !contentType.includes('application/json')) {
        // 服务器返回了非JSON响应（可能是HTML错误页面）
        console.error('验证token时服务器返回非JSON响应')
        return false
      }

      const data = await response.json()
      if (data.success && data.user) {
        // 更新用户信息
        const oldUser = this.getCurrentUser()
        localStorage.setItem(this.USER_KEY, JSON.stringify(data.user))
        
        // 只有用户信息真正改变时才触发事件
        const newUser = data.user
        if (!oldUser || oldUser.id !== newUser.id || oldUser.username !== newUser.username) {
          window.dispatchEvent(new Event('auth-changed'))
        }
        return true
      }

      // token无效，清除
      localStorage.removeItem(this.TOKEN_KEY)
      localStorage.removeItem(this.USER_KEY)
      return false
    } catch (error) {
      console.error('验证token失败:', error)
      // 网络错误时不清除token，只返回false
      return false
    } finally {
      this.isVerifying = false
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

