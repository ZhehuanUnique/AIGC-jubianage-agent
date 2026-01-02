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

/**
 * 视频运动提示词生成模块配置
 */
export const config = {
  // Ollama 配置
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'qwen2.5:7b',
    timeout: parseInt(process.env.OLLAMA_TIMEOUT || '60000'), // 60秒
  },

  // RAG 配置
  rag: {
    enabled: process.env.RAG_ENABLED !== 'false', // 默认启用
    vectorDbPath: process.env.RAG_VECTOR_DB_PATH || './data/rag_vectors',
    topK: parseInt(process.env.RAG_TOP_K || '5'), // 检索前5个相关片段
    similarityThreshold: parseFloat(process.env.RAG_SIMILARITY_THRESHOLD || '0.6'),
  },

  // 提示词生成配置
  prompt: {
    maxLength: parseInt(process.env.MOTION_PROMPT_MAX_LENGTH || '50'), // 最大50字
    temperature: parseFloat(process.env.MOTION_PROMPT_TEMPERATURE || '0.7'),
    includeImageDescription: process.env.INCLUDE_IMAGE_DESCRIPTION !== 'false', // 默认包含图片描述
  },
}

/**
 * 获取当前使用的模型信息
 */
export function getModelInfo() {
  return {
    name: config.ollama.model,
    baseUrl: config.ollama.baseUrl,
    ragEnabled: config.rag.enabled,
  }
}


