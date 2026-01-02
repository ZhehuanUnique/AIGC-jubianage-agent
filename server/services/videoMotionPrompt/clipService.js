/**
 * CLIP 本地向量生成服务
 * 用于敏感剧本切片的本地向量化（保护隐私）
 */

import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'

// 加载 .env 文件
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const envPath = join(__dirname, '../../../.env')
if (existsSync(envPath)) {
  dotenv.config({ path: envPath })
}

// 动态导入 CLIP 相关模块（如果已安装）
let CLIPModel = null
let CLIPProcessor = null

try {
  // 尝试导入 @xenova/transformers（轻量级 CLIP 实现）
  const { pipeline } = await import('@xenova/transformers')
  CLIPModel = pipeline
  console.log('✅ CLIP 模型加载器可用')
} catch (error) {
  console.warn('⚠️ @xenova/transformers 未安装，CLIP 功能将使用简化版本')
}

/**
 * CLIP 服务类
 */
class CLIPService {
  constructor() {
    this.model = null
    this.initialized = false
    this.modelName = process.env.CLIP_MODEL_NAME || 'Xenova/clip-vit-base-patch32'
  }

  /**
   * 初始化 CLIP 模型
   */
  async initialize() {
    if (this.initialized) {
      return
    }

    try {
      if (!CLIPModel) {
        console.warn('⚠️ CLIP 模型未安装，使用简化 embedding')
        this.initialized = true
        return
      }

      console.log(`🔄 正在加载 CLIP 模型: ${this.modelName}`)
      this.model = await CLIPModel('feature-extraction', this.modelName, {
        quantized: true, // 使用量化模型以节省内存
      })
      
      this.initialized = true
      console.log('✅ CLIP 模型加载完成')
    } catch (error) {
      console.error('❌ CLIP 模型加载失败:', error)
      this.initialized = true // 标记为已初始化，避免重复尝试
    }
  }

  /**
   * 使用 CLIP 生成文本向量
   * @param {string} text - 文本内容
   * @returns {Promise<number[]>} 向量
   */
  async generateEmbedding(text) {
    try {
      // 确保模型已初始化
      if (!this.initialized) {
        await this.initialize()
      }

      // 如果模型不可用，使用简化实现
      if (!this.model) {
        return this.simpleEmbedding(text)
      }

      // 使用 CLIP 生成向量
      const result = await this.model(text, {
        pooling: 'mean',
        normalize: true,
      })

      // 转换为数组
      const embedding = Array.from(result.data)
      return embedding
    } catch (error) {
      console.error('CLIP 生成向量失败:', error)
      return this.simpleEmbedding(text)
    }
  }

  /**
   * 简化的 embedding 实现（作为后备方案）
   * @param {string} text - 文本
   * @returns {number[]} 向量
   */
  simpleEmbedding(text) {
    // 简单的词频向量（作为后备方案）
    const words = text.toLowerCase().split(/\s+/)
    const vector = new Array(512).fill(0) // CLIP 通常是 512 维
    words.forEach((word) => {
      const hash = this.simpleHash(word)
      vector[hash % 512] += 1
    })
    // 归一化
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0))
    return norm > 0 ? vector.map(val => val / norm) : vector
  }

  /**
   * 简单的字符串哈希
   */
  simpleHash(str) {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return Math.abs(hash)
  }
}

// 导出单例
export const clipService = new CLIPService()





