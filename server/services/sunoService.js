import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 加载.env文件
const envPath = join(__dirname, '..', '.env')
if (existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

const SUNO_API_BASE_URL = process.env.SUNO_API_BASE_URL || 'https://api.sunoapi.org'
const SUNO_API_KEY = process.env.SUNO_API_KEY

/**
 * Suno API 服务
 * 文档: https://docs.sunoapi.org/cn
 */
export class SunoService {
  /**
   * 生成音乐
   * @param {object} options - 生成选项
   * @param {boolean} options.customMode - 是否使用自定义模式（必填）
   * @param {boolean} options.instrumental - 是否纯音乐（必填）
   * @param {string} options.model - 模型版本（必填）：V4, V4_5, V4_5PLUS, V4_5ALL, V5
   * @param {string} options.callBackUrl - 回调URL（必填）
   * @param {string} options.prompt - 提示词（根据customMode和instrumental决定是否必填）
   * @param {string} options.style - 音乐风格（customMode为true时必填）
   * @param {string} options.title - 音乐标题（customMode为true时必填）
   * @param {string} options.personaId - Persona ID（可选）
   * @param {string} options.negativeTags - 负面标签（可选）
   * @param {string} options.vocalGender - 人声性别：m/f（可选）
   * @param {number} options.styleWeight - 风格权重 0-1（可选）
   * @param {number} options.weirdnessConstraint - 创意约束 0-1（可选）
   * @param {number} options.audioWeight - 音频权重 0-1（可选）
   * @returns {Promise<object>} 生成结果 { code: 200, msg: "success", data: { taskId: "..." } }
   */
  static async generateMusic(options = {}) {
    if (!SUNO_API_KEY) {
      throw new Error('SUNO_API_KEY 未配置，请在 .env 文件中设置')
    }

    const {
      customMode = false, // 默认非自定义模式，更简单
      instrumental = false,
      model = 'V5',
      callBackUrl = '', // 如果没有回调URL，可以留空，使用轮询查询
      prompt = '',
      style = '',
      title = '',
      personaId = '',
      negativeTags = '',
      vocalGender = '',
      styleWeight,
      weirdnessConstraint,
      audioWeight,
    } = options

    // 参数验证
    if (customMode) {
      // 自定义模式：需要 style 和 title
      if (!style || !title) {
        throw new Error('自定义模式下，style 和 title 为必填项')
      }
      // 如果 instrumental 为 false，还需要 prompt
      if (!instrumental && !prompt) {
        throw new Error('自定义模式下，非纯音乐需要提供 prompt（作为歌词）')
      }
    } else {
      // 非自定义模式：只需要 prompt
      if (!prompt) {
        throw new Error('非自定义模式下，prompt 为必填项')
      }
    }

    // 构建请求体
    const requestBody = {
      customMode,
      instrumental,
      model,
    }

    // 根据模式添加必填字段
    if (customMode) {
      requestBody.style = style
      requestBody.title = title
      if (!instrumental) {
        requestBody.prompt = prompt
      }
    } else {
      requestBody.prompt = prompt
    }

    // 添加可选字段
    // 注意：对于V5模型，如果callBackUrl为空，不添加到请求体中（避免API报错）
    // 如果提供了callBackUrl，则使用回调方式；否则使用轮询方式查询状态
    if (callBackUrl && callBackUrl.trim()) {
      requestBody.callBackUrl = callBackUrl.trim()
    } else if (model === 'V5') {
      // V5模型如果callBackUrl为空，不添加该字段，使用轮询方式
      // 这样可以避免API返回"Please enter callBackUrl"错误
    } else {
      // 对于其他模型版本，如果提供了callBackUrl则添加
      if (callBackUrl) {
        requestBody.callBackUrl = callBackUrl
      }
    }
    if (personaId) {
      requestBody.personaId = personaId
    }
    if (negativeTags) {
      requestBody.negativeTags = negativeTags
    }
    if (vocalGender) {
      requestBody.vocalGender = vocalGender
    }
    if (styleWeight !== undefined) {
      requestBody.styleWeight = styleWeight
    }
    if (weirdnessConstraint !== undefined) {
      requestBody.weirdnessConstraint = weirdnessConstraint
    }
    if (audioWeight !== undefined) {
      requestBody.audioWeight = audioWeight
    }

    try {
      const response = await fetch(`${SUNO_API_BASE_URL}/api/v1/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUNO_API_KEY}`,
        },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()

      if (data.code !== 200) {
        throw new Error(data.msg || data.error || '音乐生成失败')
      }

      return {
        success: true,
        code: data.code,
        msg: data.msg,
        data: data.data,
      }
    } catch (error) {
      console.error('Suno API 调用失败:', error)
      throw error
    }
  }

  /**
   * 获取音乐生成详情
   * @param {string} taskId - 任务ID（从生成音乐接口返回的taskId）
   * @returns {Promise<object>} 音乐详情
   */
  static async getMusicDetails(taskId) {
    if (!SUNO_API_KEY) {
      throw new Error('SUNO_API_KEY 未配置')
    }

    if (!taskId) {
      throw new Error('任务ID不能为空')
    }

    try {
      const response = await fetch(`${SUNO_API_BASE_URL}/api/v1/get/${taskId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${SUNO_API_KEY}`,
        },
      })

      const data = await response.json()

      if (data.code !== 200) {
        throw new Error(data.msg || data.error || '获取音乐详情失败')
      }

      return {
        success: true,
        code: data.code,
        msg: data.msg,
        data: data.data,
      }
    } catch (error) {
      console.error('获取音乐详情失败:', error)
      throw error
    }
  }

  /**
   * 生成歌词
   * @param {object} options - 生成选项
   * @param {string} options.prompt - 歌词描述提示词（必填，最多200字）
   * @param {string} options.callBackUrl - 回调URL（必填）
   * @returns {Promise<object>} 生成结果 { code: 200, msg: "success", data: { taskId: "..." } }
   */
  static async generateLyrics(options = {}) {
    if (!SUNO_API_KEY) {
      throw new Error('SUNO_API_KEY 未配置')
    }

    const { prompt, callBackUrl = '' } = options

    if (!prompt) {
      throw new Error('提示词不能为空')
    }

    if (prompt.length > 200) {
      throw new Error('提示词最多200字')
    }

    try {
      const requestBody = {
        prompt,
      }

      if (callBackUrl) {
        requestBody.callBackUrl = callBackUrl
      }

      const response = await fetch(`${SUNO_API_BASE_URL}/api/v1/lyrics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUNO_API_KEY}`,
        },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()

      if (data.code !== 200) {
        throw new Error(data.msg || data.error || '歌词生成失败')
      }

      return {
        success: true,
        code: data.code,
        msg: data.msg,
        data: data.data,
      }
    } catch (error) {
      console.error('歌词生成失败:', error)
      throw error
    }
  }

  /**
   * 获取歌词生成详情
   * @param {string} taskId - 任务ID（从生成歌词接口返回的taskId）
   * @returns {Promise<object>} 歌词详情
   */
  static async getLyricsDetails(taskId) {
    if (!SUNO_API_KEY) {
      throw new Error('SUNO_API_KEY 未配置')
    }

    if (!taskId) {
      throw new Error('任务ID不能为空')
    }

    try {
      const response = await fetch(`${SUNO_API_BASE_URL}/api/v1/get_lyrics/${taskId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${SUNO_API_KEY}`,
        },
      })

      const data = await response.json()

      if (data.code !== 200) {
        throw new Error(data.msg || data.error || '获取歌词详情失败')
      }

      return {
        success: true,
        code: data.code,
        msg: data.msg,
        data: data.data,
      }
    } catch (error) {
      console.error('获取歌词详情失败:', error)
      throw error
    }
  }

  /**
   * 获取剩余积分
   * @returns {Promise<object>} 积分信息
   */
  static async getCredits() {
    if (!SUNO_API_KEY) {
      throw new Error('SUNO_API_KEY 未配置')
    }

    try {
      const response = await fetch(`${SUNO_API_BASE_URL}/api/v1/get_credits`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${SUNO_API_KEY}`,
        },
      })

      const data = await response.json()

      if (data.code !== 200) {
        throw new Error(data.msg || data.error || '获取积分失败')
      }

      return {
        success: true,
        code: data.code,
        msg: data.msg,
        data: data.data,
      }
    } catch (error) {
      console.error('获取积分失败:', error)
      throw error
    }
  }
}

