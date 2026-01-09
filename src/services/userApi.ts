// 生产环境使用相对路径，开发环境使用完整URL
const API_BASE_URL = (() => {
  if (import.meta.env.VITE_API_BASE_URL !== undefined) return import.meta.env.VITE_API_BASE_URL
  const isProduction = typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')
  return isProduction ? '' : 'http://localhost:3002'
})()
import { AuthService } from './auth'

export interface User {
  id: number
  username: string
  displayName: string
  isActive: boolean
  role: 'user' | 'admin' | 'super_admin'
  createdAt: string
  updatedAt: string
}

export interface OperationLog {
  id: number
  operationType: string
  operationName: string
  resourceType: string | null
  resourceId: string | null
  description: string
  pointsConsumed: number
  status: string
  errorMessage: string | null
  metadata: any
  createdAt: string
}

export interface ConsumptionRanking {
  rank: number
  userId: number
  username: string
  displayName: string
  totalConsumption: number
}

export interface DailyConsumption {
  date: string
  totalPoints: number
  userCount: number
  operationCount: number
}

/**
 * 用户管理API
 */
export class UserApi {
  /**
   * 获取所有用户
   */
  static async getAllUsers(): Promise<User[]> {
    const response = await fetch(`${API_BASE_URL}/api/users`, {
      headers: AuthService.getAuthHeaders(),
    })
    
    if (!response.ok) {
      throw new Error('获取用户列表失败')
    }
    
    const data = await response.json()
    return data.users
  }

  /**
   * 创建用户
   */
  static async createUser(username: string, password: string, displayName?: string): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/api/users`, {
      method: 'POST',
      headers: AuthService.getAuthHeaders(),
      body: JSON.stringify({ username, password, displayName }),
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '创建用户失败')
    }
    
    const data = await response.json()
    return data.user
  }

  /**
   * 更新用户
   */
  static async updateUser(userId: number, updates: { 
    username?: string
    displayName?: string
    password?: string
    isActive?: boolean
    role?: 'user' | 'admin' | 'super_admin'
  }): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
      method: 'PUT',
      headers: AuthService.getAuthHeaders(),
      body: JSON.stringify(updates),
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '更新用户失败')
    }
    
    const data = await response.json()
    return data.user
  }

  /**
   * 删除用户
   */
  static async deleteUser(userId: number, password: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
      method: 'DELETE',
      headers: {
        ...AuthService.getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password }),
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '删除用户失败')
    }
  }

  /**
   * 获取用户操作日志
   */
  static async getUserOperationLogs(userId: number, limit = 50, offset = 0): Promise<{ logs: OperationLog[]; total: number }> {
    const response = await fetch(`${API_BASE_URL}/api/users/${userId}/logs?limit=${limit}&offset=${offset}`, {
      headers: AuthService.getAuthHeaders(),
    })
    
    if (!response.ok) {
      throw new Error('获取用户操作日志失败')
    }
    
    const data = await response.json()
    return data
  }

  /**
   * 获取用户消耗排名
   */
  static async getConsumptionRanking(startDate?: string, endDate?: string, showRealCost?: boolean): Promise<ConsumptionRanking[]> {
    let url = `${API_BASE_URL}/api/analytics/consumption-ranking`
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)
    if (showRealCost) params.append('showRealCost', 'true')
    if (params.toString()) url += '?' + params.toString()
    
    const response = await fetch(url, {
      headers: AuthService.getAuthHeaders(),
    })
    
    if (!response.ok) {
      throw new Error('获取用户消耗排名失败')
    }
    
    const data = await response.json()
    return data.ranking
  }

  /**
   * 获取每日消耗趋势
   */
  static async getDailyConsumption(startDate?: string, endDate?: string): Promise<DailyConsumption[]> {
    let url = `${API_BASE_URL}/api/analytics/daily-consumption`
    const params = new URLSearchParams()
    if (startDate) params.append('startDate', startDate)
    if (endDate) params.append('endDate', endDate)
    if (params.toString()) url += '?' + params.toString()
    
    const response = await fetch(url, {
      headers: AuthService.getAuthHeaders(),
    })
    
    if (!response.ok) {
      throw new Error('获取每日消耗趋势失败')
    }
    
    const data = await response.json()
    return data.trend
  }
}
