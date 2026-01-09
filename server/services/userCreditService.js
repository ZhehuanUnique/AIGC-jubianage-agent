/**
 * 用户积分服务
 * 用于记录和查询用户积分消耗
 */

import pool from '../db/connection.js'
import { calculateCreditFromCost, calculateVideoCost, calculateImageCost } from './creditService.js'

/**
 * 记录积分消耗
 * @param {number} userId - 用户ID
 * @param {Object} params - 消耗参数
 * @param {string} params.operationType - 操作类型：video_generation, image_generation, etc.
 * @param {string} params.model - 使用的模型
 * @param {string} params.resolution - 分辨率
 * @param {number} params.duration - 时长（秒）
 * @param {number} params.credits - 消耗积分（如果不提供则自动计算）
 * @param {number} params.costYuan - 实际成本（元）（如果不提供则自动计算）
 * @param {string} params.description - 描述
 * @param {Object} params.metadata - 额外元数据
 * @returns {Promise<Object>} 返回记录结果
 */
export async function recordCreditConsumption(userId, params) {
  const {
    operationType,
    model,
    resolution,
    duration,
    credits,
    costYuan,
    description,
    metadata
  } = params

  try {
    // 计算积分和成本
    let finalCredits = credits
    let finalCostYuan = costYuan

    if (operationType === 'video_generation' && model && duration) {
      if (!finalCostYuan) {
        finalCostYuan = calculateVideoCost(model, resolution || '720p', duration)
      }
      if (!finalCredits) {
        finalCredits = calculateCreditFromCost(finalCostYuan)
      }
    } else if (operationType === 'image_generation' && model) {
      if (!finalCostYuan) {
        finalCostYuan = calculateImageCost(model, 1)
      }
      if (!finalCredits) {
        finalCredits = calculateCreditFromCost(finalCostYuan)
      }
    }

    // 如果还是没有积分值，默认为0
    finalCredits = finalCredits || 0
    finalCostYuan = finalCostYuan || 0

    // 开始事务
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // 插入消耗记录
      const insertResult = await client.query(
        `INSERT INTO credit_transactions 
         (user_id, operation_type, model, resolution, duration, credits_consumed, cost_yuan, description, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [userId, operationType, model, resolution, duration, finalCredits, finalCostYuan, description, metadata ? JSON.stringify(metadata) : null]
      )

      // 更新用户积分汇总
      const creditColumn = operationType === 'video_generation' ? 'video_credits_used' :
                          operationType === 'image_generation' ? 'image_credits_used' : 'other_credits_used'

      await client.query(
        `INSERT INTO user_credits (user_id, total_credits_used, total_cost_yuan, ${creditColumn}, last_updated_at)
         VALUES ($1, $2, $3, $2, NOW())
         ON CONFLICT (user_id) DO UPDATE SET
           total_credits_used = user_credits.total_credits_used + $2,
           total_cost_yuan = user_credits.total_cost_yuan + $3,
           ${creditColumn} = user_credits.${creditColumn} + $2,
           last_updated_at = NOW()`,
        [userId, finalCredits, finalCostYuan]
      )

      await client.query('COMMIT')

      console.log(`✅ 记录用户 ${userId} 积分消耗: ${finalCredits} 积分, ${finalCostYuan.toFixed(4)} 元`)

      return {
        success: true,
        transactionId: insertResult.rows[0].id,
        credits: finalCredits,
        costYuan: finalCostYuan
      }
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('❌ 记录积分消耗失败:', error)
    throw error
  }
}

/**
 * 获取用户积分汇总
 * @param {number} userId - 用户ID
 * @returns {Promise<Object>} 返回积分汇总
 */
export async function getUserCreditSummary(userId) {
  try {
    const result = await pool.query(
      `SELECT * FROM user_credits WHERE user_id = $1`,
      [userId]
    )

    if (result.rows.length === 0) {
      // 如果没有记录，返回默认值
      return {
        userId,
        totalCreditsUsed: 0,
        totalCostYuan: 0,
        videoCreditsUsed: 0,
        imageCreditsUsed: 0,
        otherCreditsUsed: 0,
        lastUpdatedAt: null
      }
    }

    const row = result.rows[0]
    return {
      userId: row.user_id,
      totalCreditsUsed: parseFloat(row.total_credits_used) || 0,
      totalCostYuan: parseFloat(row.total_cost_yuan) || 0,
      videoCreditsUsed: parseFloat(row.video_credits_used) || 0,
      imageCreditsUsed: parseFloat(row.image_credits_used) || 0,
      otherCreditsUsed: parseFloat(row.other_credits_used) || 0,
      lastUpdatedAt: row.last_updated_at
    }
  } catch (error) {
    console.error('❌ 获取用户积分汇总失败:', error)
    throw error
  }
}

/**
 * 获取用户积分消耗历史
 * @param {number} userId - 用户ID
 * @param {Object} options - 查询选项
 * @param {number} options.limit - 限制数量
 * @param {number} options.offset - 偏移量
 * @param {string} options.startDate - 开始日期
 * @param {string} options.endDate - 结束日期
 * @returns {Promise<Array>} 返回消耗历史
 */
export async function getUserCreditHistory(userId, options = {}) {
  const { limit = 50, offset = 0, startDate, endDate } = options

  try {
    let query = `
      SELECT * FROM credit_transactions 
      WHERE user_id = $1
    `
    const params = [userId]
    let paramIndex = 2

    if (startDate) {
      query += ` AND created_at >= $${paramIndex++}`
      params.push(startDate)
    }

    if (endDate) {
      query += ` AND created_at <= $${paramIndex++}`
      params.push(endDate)
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`
    params.push(limit, offset)

    const result = await pool.query(query, params)

    return result.rows.map(row => ({
      id: row.id,
      operationType: row.operation_type,
      model: row.model,
      resolution: row.resolution,
      duration: row.duration,
      creditsConsumed: parseFloat(row.credits_consumed) || 0,
      costYuan: parseFloat(row.cost_yuan) || 0,
      description: row.description,
      metadata: row.metadata,
      createdAt: row.created_at
    }))
  } catch (error) {
    console.error('❌ 获取用户积分历史失败:', error)
    throw error
  }
}

/**
 * 获取所有用户积分排名
 * @param {Object} options - 查询选项
 * @param {string} options.startDate - 开始日期
 * @param {string} options.endDate - 结束日期
 * @returns {Promise<Array>} 返回积分排名
 */
export async function getUserCreditRanking(options = {}) {
  const { startDate, endDate } = options

  try {
    let query
    const params = []
    let paramIndex = 1

    if (startDate || endDate) {
      // 如果有日期范围，从交易记录中计算
      query = `
        SELECT 
          u.id as user_id,
          u.username,
          u.display_name,
          COALESCE(SUM(ct.credits_consumed), 0) as total_credits,
          COALESCE(SUM(ct.cost_yuan), 0) as total_cost
        FROM users u
        LEFT JOIN credit_transactions ct ON u.id = ct.user_id
      `

      const conditions = []
      if (startDate) {
        conditions.push(`ct.created_at >= $${paramIndex++}`)
        params.push(startDate)
      }
      if (endDate) {
        conditions.push(`ct.created_at <= $${paramIndex++}`)
        params.push(endDate)
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`
      }

      query += `
        GROUP BY u.id, u.username, u.display_name
        HAVING COALESCE(SUM(ct.credits_consumed), 0) > 0
        ORDER BY total_credits DESC
      `
    } else {
      // 如果没有日期范围，直接从汇总表查询
      query = `
        SELECT 
          u.id as user_id,
          u.username,
          u.display_name,
          COALESCE(uc.total_credits_used, 0) as total_credits,
          COALESCE(uc.total_cost_yuan, 0) as total_cost
        FROM users u
        LEFT JOIN user_credits uc ON u.id = uc.user_id
        WHERE COALESCE(uc.total_credits_used, 0) > 0
        ORDER BY total_credits DESC
      `
    }

    const result = await pool.query(query, params)

    return result.rows.map((row, index) => ({
      rank: index + 1,
      userId: row.user_id,
      username: row.username,
      displayName: row.display_name || row.username,
      totalCredits: parseFloat(row.total_credits) || 0,
      totalCost: parseFloat(row.total_cost) || 0
    }))
  } catch (error) {
    console.error('❌ 获取用户积分排名失败:', error)
    throw error
  }
}

/**
 * 初始化用户积分记录（如果不存在）
 * @param {number} userId - 用户ID
 */
export async function initUserCredits(userId) {
  try {
    await pool.query(
      `INSERT INTO user_credits (user_id, total_credits_used, total_cost_yuan)
       VALUES ($1, 0, 0)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId]
    )
  } catch (error) {
    console.error('❌ 初始化用户积分记录失败:', error)
    // 不抛出错误，因为这不是关键操作
  }
}
