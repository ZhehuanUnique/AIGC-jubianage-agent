import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'
import WebSocket from 'ws'
import { v4 as uuid } from 'uuid'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 加载.env文件
const envPath = join(__dirname, '..', '.env')
if (existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

const MUSICGPT_BASE_URL = process.env.MUSICGPT_BASE_URL || 'ws://localhost:8642'
const MUSICGPT_HTTP_URL = process.env.MUSICGPT_HTTP_URL || 'http://localhost:8642'

/**
 * MusicGPT 服务
 * MusicGPT 是一个基于 WebSocket 的本地音乐生成工具
 * 文档: https://github.com/gabotechs/MusicGPT
 */
export class MusicGptService {
  /**
   * 生成音乐
   * @param {object} options - 生成选项
   * @param {string} options.prompt - 音乐描述提示词（必填）
   * @param {number} options.secs - 音乐时长（秒），1-30，默认10
   * @returns {Promise<object>} 生成结果
   */
  static async generateMusic(options = {}) {
    const { prompt, secs = 10 } = options

    if (!prompt || !prompt.trim()) {
      throw new Error('提示词不能为空')
    }

    if (secs < 1 || secs > 30) {
      throw new Error('时长必须在1-30秒之间')
    }

    return new Promise((resolve, reject) => {
      const wsUrl = MUSICGPT_BASE_URL.replace('http://', 'ws://').replace('https://', 'wss://') + '/ws'
      const ws = new WebSocket(wsUrl)

      const chatId = uuid()
      const id = uuid()
      let audioUrl = null
      let error = null
      let progress = 0

      const timeout = setTimeout(() => {
        ws.close()
        reject(new Error('生成超时，请检查MusicGPT服务是否正常运行'))
      }, 300000) // 5分钟超时

      ws.on('open', () => {
        // 发送生成请求
        const request = {
          GenerateAudioNewChat: {
            id,
            chat_id: chatId,
            prompt: prompt.trim(),
            secs: Math.max(1, Math.min(30, Math.floor(secs))),
          },
        }
        ws.send(JSON.stringify(request))
      })

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString())

          // MusicGPT的ID格式是JSON序列化的[chat_id, id]数组
          // 我们需要检查ID是否匹配（可能是字符串格式的JSON数组）
          const expectedIdJson = JSON.stringify([chatId, id])
          const isIdMatch = (msgId) => {
            if (!msgId) return false
            // 尝试解析为数组
            try {
              const parsed = JSON.parse(msgId)
              if (Array.isArray(parsed) && parsed.length === 2) {
                return parsed[0] === chatId && parsed[1] === id
              }
            } catch {
              // 如果不是JSON，可能是其他格式
            }
            // 也检查是否直接匹配
            return msgId === id || msgId === expectedIdJson
          }

          // 处理生成进度
          if (message.Generation) {
            if (message.Generation.Start) {
              const startMsg = message.Generation.Start
              if (isIdMatch(startMsg.id)) {
                progress = 0
              }
            } else if (message.Generation.Progress) {
              const progressMsg = message.Generation.Progress
              if (isIdMatch(progressMsg.id)) {
                progress = progressMsg.progress || 0
              }
            } else if (message.Generation.Result) {
              const resultMsg = message.Generation.Result
              // 检查ID是否匹配
              if (isIdMatch(resultMsg.id)) {
                clearTimeout(timeout)
                // 构建音频URL
                const relpath = resultMsg.relpath
                if (relpath) {
                  const httpUrl = MUSICGPT_HTTP_URL.replace(/\/$/, '')
                  audioUrl = `${httpUrl}/files${relpath.startsWith('/') ? relpath : '/' + relpath}`
                }
                ws.close()
                resolve({
                  success: true,
                  data: {
                    id,
                    audio_url: audioUrl,
                    progress: 1,
                  },
                })
              }
            } else if (message.Generation.Error) {
              const errorMsg = message.Generation.Error
              if (isIdMatch(errorMsg.id)) {
                clearTimeout(timeout)
                error = errorMsg.error || '生成失败'
                ws.close()
                reject(new Error(error))
              }
            }
          }
        } catch (err) {
          console.error('解析WebSocket消息失败:', err)
        }
      })

      ws.on('error', (err) => {
        clearTimeout(timeout)
        reject(new Error(`MusicGPT连接失败: ${err.message}。请确保MusicGPT服务正在运行（默认端口8642）`))
      })

      ws.on('close', () => {
        clearTimeout(timeout)
        if (!audioUrl && !error) {
          reject(new Error('连接已关闭，但未收到生成结果'))
        }
      })
    })
  }

  /**
   * 检查 MusicGPT 服务是否可用
   * @returns {Promise<boolean>}
   */
  static async checkHealth() {
    try {
      const httpUrl = MUSICGPT_HTTP_URL
      const response = await fetch(`${httpUrl}/`, {
        method: 'GET',
        timeout: 3000,
      })
      return response.ok
    } catch (error) {
      return false
    }
  }
}

