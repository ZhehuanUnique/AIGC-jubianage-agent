import { config } from './config.js'

/**
 * Ollama 本地模型服务
 * 支持调用本地部署的 Qwen2.5 等模型
 */
class OllamaService {
  constructor() {
    this.baseUrl = config.ollama.baseUrl
    this.model = config.ollama.model
    this.timeout = config.ollama.timeout
  }

  /**
   * 检查 Ollama 服务是否可用
   */
  async checkHealth() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // 5秒超时
      })

      if (!response.ok) {
        return false
      }

      const data = await response.json()
      // 检查模型是否存在
      const modelExists = data.models?.some(m => m.name.includes(this.model.split(':')[0]))
      return modelExists
    } catch (error) {
      console.error('Ollama 健康检查失败:', error.message)
      return false
    }
  }

  /**
   * 调用 Ollama 模型生成文本
   * @param {string} prompt - 提示词
   * @param {Object} options - 选项
   * @param {number} options.temperature - 温度参数 (0-1)
   * @param {number} options.maxTokens - 最大token数
   * @param {boolean} options.stream - 是否流式输出
   * @returns {Promise<string>} 生成的文本
   */
  async generate(prompt, options = {}) {
    const {
      temperature = config.prompt.temperature,
      maxTokens = 500,
      stream = false,
    } = options

    try {
      console.log(`🤖 调用 Ollama 模型: ${this.model}`)
      console.log(`📝 提示词长度: ${prompt.length} 字符`)

      const requestBody = {
        model: this.model,
        prompt: prompt,
        stream: stream,
        options: {
          temperature: temperature,
          num_predict: maxTokens,
        },
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.timeout)

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      const result = data.response || ''

      console.log(`✅ Ollama 生成完成，返回长度: ${result.length} 字符`)
      return result.trim()
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Ollama 请求超时，请检查模型是否正常运行')
      }
      console.error('Ollama API 调用错误:', error)
      throw new Error(`Ollama 调用失败: ${error.message}`)
    }
  }

  /**
   * 使用 Chat 格式调用模型（推荐用于对话场景）
   * @param {Array} messages - 消息数组，格式: [{role: 'user', content: '...'}, ...]
   *   对于视觉模型，content 可以是数组: [{type: 'text', text: '...'}, {type: 'image', image: 'base64或url'}]
   * @param {Object} options - 选项
   * @param {string} options.imageUrl - 图片URL（用于视觉模型）
   * @returns {Promise<string>} 生成的回复
   */
  async chat(messages, options = {}) {
    const {
      temperature = config.prompt.temperature,
      maxTokens = 500,
      stream = false,
      imageUrl = null,
    } = options

    try {
      console.log(`🤖 调用 Ollama Chat API: ${this.model}`)
      console.log(`💬 消息数量: ${messages.length}`)
      if (imageUrl) {
        console.log(`🖼️  包含图片: ${imageUrl}`)
      }

      // 如果提供了图片URL且模型支持视觉，将图片添加到最后一条用户消息
      let processedMessages = messages
      if (imageUrl && this.isVisionModel()) {
        processedMessages = this.addImageToMessages(messages, imageUrl)
      }

      const requestBody = {
        model: this.model,
        messages: processedMessages,
        stream: stream,
        options: {
          temperature: temperature,
          num_predict: maxTokens,
        },
      }

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.timeout)

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      const result = data.message?.content || data.response || ''

      console.log(`✅ Ollama Chat 完成，返回长度: ${result.length} 字符`)
      return result.trim()
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Ollama 请求超时，请检查模型是否正常运行')
      }
      console.error('Ollama Chat API 调用错误:', error)
      throw new Error(`Ollama Chat 调用失败: ${error.message}`)
    }
  }

  /**
   * 获取可用模型列表
   */
  async listModels() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      return data.models || []
    } catch (error) {
      console.error('获取模型列表失败:', error)
      return []
    }
  }

  /**
   * 检查当前模型是否支持视觉
   */
  isVisionModel() {
    const visionModelPatterns = ['vl', 'vision', 'multimodal']
    return visionModelPatterns.some(pattern => 
      this.model.toLowerCase().includes(pattern)
    )
  }

  /**
   * 将图片添加到消息中（用于视觉模型）
   * @param {Array} messages - 原始消息数组
   * @param {string} imageUrl - 图片URL
   * @returns {Array} 处理后的消息数组
   */
  addImageToMessages(messages, imageUrl) {
    // 复制消息数组
    const processedMessages = JSON.parse(JSON.stringify(messages))
    
    // 找到最后一条用户消息
    let lastUserMessage = null
    for (let i = processedMessages.length - 1; i >= 0; i--) {
      if (processedMessages[i].role === 'user') {
        lastUserMessage = processedMessages[i]
        break
      }
    }

    if (lastUserMessage) {
      // 如果 content 是字符串，转换为数组格式
      if (typeof lastUserMessage.content === 'string') {
        lastUserMessage.content = [
          { type: 'text', text: lastUserMessage.content },
          { type: 'image', image: imageUrl }
        ]
      } else if (Array.isArray(lastUserMessage.content)) {
        // 如果已经是数组，添加图片
        lastUserMessage.content.push({ type: 'image', image: imageUrl })
      }
    } else {
      // 如果没有用户消息，添加一条新的
      processedMessages.push({
        role: 'user',
        content: [
          { type: 'text', text: '请分析这张图片' },
          { type: 'image', image: imageUrl }
        ]
      })
    }

    return processedMessages
  }

  /**
   * 将图片URL转换为base64（如果需要）
   * @param {string} imageUrl - 图片URL
   * @returns {Promise<string>} base64编码的图片或原始URL
   */
  async convertImageToBase64(imageUrl) {
    // 如果已经是base64，直接返回
    if (imageUrl.startsWith('data:image/')) {
      return imageUrl.split(',')[1] // 提取base64部分
    }

    // 如果是HTTP/HTTPS URL，Ollama可以直接使用URL
    // 但某些情况下可能需要转换为base64
    try {
      const response = await fetch(imageUrl)
      if (!response.ok) {
        console.warn('无法获取图片，使用原始URL:', imageUrl)
        return imageUrl
      }

      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const base64 = buffer.toString('base64')
      
      // 检测图片类型
      const contentType = response.headers.get('content-type') || 'image/jpeg'
      return `data:${contentType};base64,${base64}`
    } catch (error) {
      console.warn('图片转换失败，使用原始URL:', error.message)
      return imageUrl
    }
  }
}

// 导出单例
export const ollamaService = new OllamaService()


