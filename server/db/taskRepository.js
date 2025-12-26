import pool from './connection.js'

/**
 * 任务数据仓库
 */
export class TaskRepository {
  /**
   * 获取所有任务
   */
  static async getAllTasks() {
    try {
      const result = await pool.query(`
        SELECT 
          t.*,
          p.name as project_name
        FROM tasks t
        LEFT JOIN projects p ON t.project_id = p.id
        ORDER BY t.created_at DESC
      `)
      return result.rows
    } catch (error) {
      console.error('获取任务列表失败:', error)
      throw error
    }
  }

  /**
   * 根据ID获取任务
   */
  static async getTaskById(id) {
    try {
      const result = await pool.query(
        'SELECT * FROM tasks WHERE id = $1',
        [id]
      )
      return result.rows[0] || null
    } catch (error) {
      console.error('获取任务失败:', error)
      throw error
    }
  }

  /**
   * 创建任务
   */
  static async createTask(taskData) {
    try {
      const {
        project_id,
        title,
        description,
        date,
        progress1 = 0,
        progress2 = 0,
        is_completed1 = false,
        mode = 'image',
      } = taskData

      const result = await pool.query(
        `INSERT INTO tasks 
         (project_id, title, description, date, progress1, progress2, is_completed1, mode)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [project_id, title, description, date, progress1, progress2, is_completed1, mode]
      )
      return result.rows[0]
    } catch (error) {
      console.error('创建任务失败:', error)
      throw error
    }
  }

  /**
   * 更新任务
   */
  static async updateTask(id, updates) {
    try {
      const fields = []
      const values = []
      let paramIndex = 1

      Object.keys(updates).forEach(key => {
        if (updates[key] !== undefined) {
          fields.push(`${key} = $${paramIndex}`)
          values.push(updates[key])
          paramIndex++
        }
      })

      if (fields.length === 0) {
        return await this.getTaskById(id)
      }

      values.push(id)
      const query = `
        UPDATE tasks 
        SET ${fields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `

      const result = await pool.query(query, values)
      return result.rows[0] || null
    } catch (error) {
      console.error('更新任务失败:', error)
      throw error
    }
  }

  /**
   * 删除任务
   */
  static async deleteTask(id) {
    try {
      const result = await pool.query(
        'DELETE FROM tasks WHERE id = $1 RETURNING *',
        [id]
      )
      return result.rows[0] || null
    } catch (error) {
      console.error('删除任务失败:', error)
      throw error
    }
  }

  /**
   * 更新任务进度
   */
  static async updateTaskProgress(id, progress1, progress2, isCompleted1 = false) {
    try {
      const result = await pool.query(
        `UPDATE tasks 
         SET progress1 = $1, progress2 = $2, is_completed1 = $3
         WHERE id = $4
         RETURNING *`,
        [progress1, progress2, isCompleted1, id]
      )
      return result.rows[0] || null
    } catch (error) {
      console.error('更新任务进度失败:', error)
      throw error
    }
  }
}



