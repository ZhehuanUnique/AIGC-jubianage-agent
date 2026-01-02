import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import pool from '../db/connection.js'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

/**
 * 用户认证服务
 */
export class AuthService {
  /**
   * 用户登录
   * @param {string} username - 用户名
   * @param {string} password - 密码
   * @returns {Promise<{success: boolean, token?: string, user?: object, error?: string}>}
   */
  static async login(username, password) {
    try {
      console.log(`🔐 尝试登录: 用户名=${username}`)
      
      // 查询用户
      const result = await pool.query(
        'SELECT id, username, password_hash, display_name, is_active FROM users WHERE username = $1',
        [username]
      )

      if (result.rows.length === 0) {
        console.log(`❌ 用户 ${username} 不存在`)
        return { success: false, error: '用户名或密码错误' }
      }

      const user = result.rows[0]
      console.log(`✅ 找到用户: ${user.username} (ID: ${user.id}, 激活: ${user.is_active})`)

      // 检查用户是否激活
      if (!user.is_active) {
        console.log(`❌ 用户 ${username} 已被禁用`)
        return { success: false, error: '用户已被禁用' }
      }

      // 验证密码
      const isValidPassword = await bcrypt.compare(password, user.password_hash)
      console.log(`🔑 密码验证: ${isValidPassword ? '✅ 正确' : '❌ 错误'}`)
      if (!isValidPassword) {
        return { success: false, error: '用户名或密码错误' }
      }

      // 生成JWT token
      const token = jwt.sign(
        {
          userId: user.id,
          username: user.username,
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      )

      // 记录登录操作日志
      await this.logOperation(user.id, user.username, 'login', '用户登录', null, null, 0, 'success')

      return {
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.display_name || user.username,
        },
      }
    } catch (error) {
      console.error('登录失败:', error)
      return { success: false, error: '登录失败，请稍后重试' }
    }
  }

  /**
   * 验证JWT token
   * @param {string} token - JWT token
   * @returns {Promise<{success: boolean, user?: object, error?: string}>}
   */
  static async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET)
      
      // 查询用户信息
      const result = await pool.query(
        'SELECT id, username, display_name, is_active FROM users WHERE id = $1',
        [decoded.userId]
      )

      if (result.rows.length === 0 || !result.rows[0].is_active) {
        return { success: false, error: '用户不存在或已被禁用' }
      }

      const user = result.rows[0]
      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.display_name || user.username,
        },
      }
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return { success: false, error: '无效的token' }
      }
      if (error.name === 'TokenExpiredError') {
        return { success: false, error: 'token已过期' }
      }
      return { success: false, error: 'token验证失败' }
    }
  }

  /**
   * 记录操作日志
   * @param {number} userId - 用户ID
   * @param {string} username - 用户名
   * @param {string} operationType - 操作类型
   * @param {string} operationName - 操作名称
   * @param {string} resourceType - 资源类型
   * @param {string} resourceId - 资源ID
   * @param {number} pointsConsumed - 消耗的积分
   * @param {string} status - 操作状态
   * @param {string} errorMessage - 错误信息
   * @param {object} metadata - 额外的元数据
   */
  static async logOperation(
    userId,
    username,
    operationType,
    operationName,
    resourceType = null,
    resourceId = null,
    pointsConsumed = 0,
    status = 'success',
    errorMessage = null,
    metadata = null
  ) {
    try {
      await pool.query(
        `INSERT INTO operation_logs 
         (user_id, username, operation_type, operation_name, resource_type, resource_id, 
          description, points_consumed, status, error_message, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          userId,
          username,
          operationType,
          operationName,
          resourceType,
          resourceId,
          `${operationName} - ${resourceType || '未知资源'}`,
          pointsConsumed,
          status,
          errorMessage,
          metadata ? JSON.stringify(metadata) : null,
        ]
      )
    } catch (error) {
      console.error('记录操作日志失败:', error)
      // 不抛出错误，避免影响主流程
    }
  }
}

