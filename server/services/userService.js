import bcrypt from 'bcryptjs'
import pool from '../db/connection.js'

/**
 * 用户管理服务
 */
export class UserService {
  /**
   * 获取所有用户
   * @returns {Promise<Array>}
   */
  static async getAllUsers() {
    try {
      const result = await pool.query(
        'SELECT id, username, display_name, is_active, role, created_at, updated_at FROM users ORDER BY created_at DESC'
      )
      return result.rows
    } catch (error) {
      console.error('获取用户列表失败:', error)
      throw error
    }
  }

  /**
   * 根据ID获取用户
   * @param {number} userId - 用户ID
   * @returns {Promise<object|null>}
   */
  static async getUserById(userId) {
    try {
      const result = await pool.query(
        'SELECT id, username, display_name, is_active, created_at, updated_at FROM users WHERE id = $1',
        [userId]
      )
      return result.rows[0] || null
    } catch (error) {
      console.error('获取用户失败:', error)
      throw error
    }
  }

  /**
   * 创建用户
   * @param {string} username - 用户名
   * @param {string} password - 密码
   * @param {string} displayName - 显示名称
   * @returns {Promise<object>}
   */
  static async createUser(username, password, displayName = null) {
    try {
      // 检查用户名是否已存在
      const existingUser = await pool.query('SELECT id FROM users WHERE username = $1', [username])
      if (existingUser.rows.length > 0) {
        throw new Error('用户名已存在')
      }

      // 加密密码
      const passwordHash = await bcrypt.hash(password, 10)

      // 插入用户
      const result = await pool.query(
        'INSERT INTO users (username, password_hash, display_name) VALUES ($1, $2, $3) RETURNING id, username, display_name, is_active, created_at',
        [username, passwordHash, displayName || username]
      )

      const newUser = result.rows[0]

      // 自动将新用户加入默认组（group_id=1），角色为member
      // 这样新用户可以像管理员一样使用生图/生视频功能
      try {
        const defaultGroupId = 1 // 默认组ID
        await pool.query(
          'INSERT INTO user_groups (user_id, group_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
          [newUser.id, defaultGroupId, 'member']
        )
        console.log(`✅ 新用户 ${username} (ID: ${newUser.id}) 已自动加入默认组`)
      } catch (groupError) {
        // 加入组失败不影响用户创建
        console.warn(`⚠️ 新用户加入默认组失败:`, groupError.message)
      }

      return newUser
    } catch (error) {
      console.error('创建用户失败:', error)
      throw error
    }
  }

  /**
   * 更新用户
   * @param {number} userId - 用户ID
   * @param {object} updates - 更新字段
   * @returns {Promise<object>}
   */
  static async updateUser(userId, updates) {
    try {
      const fields = []
      const values = []
      let paramIndex = 1

      if (updates.username !== undefined) {
        // 检查用户名是否已被其他用户使用
        const existingUser = await pool.query(
          'SELECT id FROM users WHERE username = $1 AND id != $2',
          [updates.username, userId]
        )
        if (existingUser.rows.length > 0) {
          throw new Error('用户名已存在')
        }
        fields.push(`username = $${paramIndex++}`)
        values.push(updates.username)
      }

      if (updates.displayName !== undefined) {
        fields.push(`display_name = $${paramIndex++}`)
        values.push(updates.displayName)
      }

      if (updates.password !== undefined) {
        const passwordHash = await bcrypt.hash(updates.password, 10)
        fields.push(`password_hash = $${paramIndex++}`)
        values.push(passwordHash)
      }

      if (updates.isActive !== undefined) {
        fields.push(`is_active = $${paramIndex++}`)
        values.push(updates.isActive)
      }

      if (updates.role !== undefined) {
        const validRoles = ['user', 'admin', 'super_admin']
        if (!validRoles.includes(updates.role)) {
          throw new Error('无效的角色值')
        }
        fields.push(`role = $${paramIndex++}`)
        values.push(updates.role)
      }

      if (fields.length === 0) {
        throw new Error('没有要更新的字段')
      }

      fields.push(`updated_at = NOW()`)

      values.push(userId)
      const result = await pool.query(
        `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING id, username, display_name, is_active, role, updated_at`,
        values
      )

      if (result.rows.length === 0) {
        throw new Error('用户不存在')
      }

      return result.rows[0]
    } catch (error) {
      console.error('更新用户失败:', error)
      throw error
    }
  }

  /**
   * 验证用户密码
   * @param {number} userId - 用户ID
   * @param {string} password - 密码
   * @returns {Promise<boolean>}
   */
  static async verifyPassword(userId, password) {
    try {
      const result = await pool.query(
        'SELECT password_hash FROM users WHERE id = $1',
        [userId]
      )
      
      if (result.rows.length === 0) {
        return false
      }
      
      const passwordHash = result.rows[0].password_hash
      return await bcrypt.compare(password, passwordHash)
    } catch (error) {
      console.error('验证密码失败:', error)
      return false
    }
  }

  /**
   * 检查用户角色
   * @param {string} username - 用户名
   * @returns {string} 'superadmin' | 'admin' | 'user'
   */
  static getUserRole(username) {
    if (username === 'Chiefavefan') {
      return 'superadmin'
    }
    if (username === 'jubian888') {
      return 'admin'
    }
    return 'user'
  }

  /**
   * 删除用户
   * @param {number} userId - 用户ID
   * @param {number} currentUserId - 当前用户ID
   * @param {string} currentUsername - 当前用户名
   * @param {string} password - 当前用户密码（用于验证）
   * @returns {Promise<boolean>}
   */
  static async deleteUser(userId, currentUserId, currentUsername, password) {
    try {
      // 验证密码
      const isValidPassword = await this.verifyPassword(currentUserId, password)
      if (!isValidPassword) {
        throw new Error('密码错误')
      }

      // 获取要删除的用户信息
      const targetUser = await this.getUserById(userId)
      if (!targetUser) {
        throw new Error('用户不存在')
      }

      // 权限检查
      const currentUserRole = this.getUserRole(currentUsername)
      const targetUserRole = this.getUserRole(targetUser.username)

      // 超级管理员可以删除所有用户（除了自己）
      if (currentUserRole === 'superadmin') {
        if (targetUser.username === 'Chiefavefan') {
          throw new Error('不能删除超级管理员')
        }
      }
      // 超级管理员只能删除普通用户
      else if (currentUserRole === 'admin') {
        if (targetUserRole === 'superadmin' || targetUserRole === 'admin') {
          throw new Error('超级管理员不能删除其他管理员')
        }
      }
      // 普通用户不能删除任何人
      else {
        throw new Error('没有权限删除用户')
      }

      // 执行删除
      const result = await pool.query('DELETE FROM users WHERE id = $1', [userId])
      return result.rowCount > 0
    } catch (error) {
      console.error('删除用户失败:', error)
      throw error
    }
  }

  /**
   * 获取用户操作日志
   * @param {number} userId - 用户ID
   * @param {number} limit - 限制数量
   * @param {number} offset - 偏移量
   * @returns {Promise<{logs: Array, total: number}>}
   */
  static async getUserOperationLogs(userId, limit = 50, offset = 0) {
    try {
      // 获取总数
      const countResult = await pool.query(
        'SELECT COUNT(*) as total FROM operation_logs WHERE user_id = $1',
        [userId]
      )
      const total = parseInt(countResult.rows[0].total)

      // 获取日志列表
      const logsResult = await pool.query(
        `SELECT id, operation_type, operation_name, resource_type, resource_id, 
                description, points_consumed, status, error_message, metadata, created_at
         FROM operation_logs 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      )

      return {
        logs: logsResult.rows.map(log => ({
          ...log,
          metadata: log.metadata ? JSON.parse(log.metadata) : null,
        })),
        total,
      }
    } catch (error) {
      console.error('获取用户操作日志失败:', error)
      throw error
    }
  }

  /**
   * 获取用户总消耗积分
   * @param {number} userId - 用户ID
   * @returns {Promise<number>}
   */
  static async getUserTotalConsumption(userId) {
    try {
      const result = await pool.query(
        'SELECT COALESCE(SUM(points_consumed), 0) as total FROM operation_logs WHERE user_id = $1 AND status = $2',
        [userId, 'success']
      )
      return parseFloat(result.rows[0].total) || 0
    } catch (error) {
      console.error('获取用户总消耗失败:', error)
      throw error
    }
  }

  /**
   * 获取所有用户消耗排名（同时返回积分和实际成本）
   * @param {Date} startDate - 开始日期
   * @param {Date} endDate - 结束日期
   * @param {boolean} showRealCost - 是否显示真实成本
   * @returns {Promise<Array>}
   */
  static async getUserConsumptionRanking(startDate = null, endDate = null, showRealCost = false) {
    try {
      const conditions = []
      const params = []
      let paramIndex = 1

      if (startDate) {
        conditions.push(`ol.created_at >= $${paramIndex++}`)
        params.push(startDate)
      }

      if (endDate) {
        conditions.push(`ol.created_at <= $${paramIndex++}`)
        params.push(new Date(endDate.getTime() + 24 * 60 * 60 * 1000 - 1)) // 结束日期的23:59:59
      }

      const whereClause = conditions.length > 0 ? ' AND ' + conditions.join(' AND ') : ''

      // 如果需要显示真实成本
      if (showRealCost) {
        const costQuery = `
          SELECT 
            u.id,
            u.username,
            u.display_name,
            COALESCE(SUM(
              CASE 
                WHEN ol.metadata IS NOT NULL AND ol.metadata::text != 'null' 
                THEN COALESCE((ol.metadata->>'costInYuan')::numeric, 0)
                ELSE 0
              END
            ), 0) as total_cost
          FROM users u
          LEFT JOIN operation_logs ol ON u.id = ol.user_id AND ol.status = 'success' ${whereClause}
          GROUP BY u.id, u.username, u.display_name
          HAVING COALESCE(SUM(
            CASE 
              WHEN ol.metadata IS NOT NULL AND ol.metadata::text != 'null' 
              THEN COALESCE((ol.metadata->>'costInYuan')::numeric, 0)
              ELSE 0
            END
          ), 0) > 0
          ORDER BY total_cost DESC
        `

        const costResult = await pool.query(costQuery, params)
        return costResult.rows.map((row, index) => ({
          rank: index + 1,
          userId: row.id,
          username: row.username,
          displayName: row.display_name || row.username,
          totalConsumption: parseFloat(row.total_cost) || 0,
          isRealCost: true,
        }))
      }
      
      // 显示积分消耗
      const query = `
        SELECT 
          u.id,
          u.username,
          u.display_name,
          COALESCE(SUM(ol.points_consumed), 0) as total_points
        FROM users u
        LEFT JOIN operation_logs ol ON u.id = ol.user_id AND ol.status = 'success' ${whereClause}
        GROUP BY u.id, u.username, u.display_name
        HAVING COALESCE(SUM(ol.points_consumed), 0) > 0
        ORDER BY total_points DESC
      `

      const result = await pool.query(query, params)
      
      return result.rows.map((row, index) => ({
        rank: index + 1,
        userId: row.id,
        username: row.username,
        displayName: row.display_name || row.username,
        totalConsumption: parseFloat(row.total_points) || 0,
        isRealCost: false,
      }))
    } catch (error) {
      console.error('获取用户消耗排名失败:', error)
      throw error
    }
  }

  /**
   * 获取每日消耗趋势
   * @param {Date} startDate - 开始日期
   * @param {Date} endDate - 结束日期
   * @returns {Promise<Array>}
   */
  static async getDailyConsumptionTrend(startDate, endDate) {
    try {
      const result = await pool.query(
        `SELECT 
          date,
          total_points,
          user_count,
          operation_count
         FROM daily_consumption_stats
         WHERE date >= $1 AND date <= $2
         ORDER BY date ASC`,
        [startDate, endDate]
      )

      return result.rows.map(row => ({
        date: row.date.toISOString().split('T')[0], // YYYY-MM-DD格式
        totalPoints: parseFloat(row.total_points) || 0,
        userCount: parseInt(row.user_count) || 0,
        operationCount: parseInt(row.operation_count) || 0,
      }))
    } catch (error) {
      console.error('获取每日消耗趋势失败:', error)
      throw error
    }
  }
}
