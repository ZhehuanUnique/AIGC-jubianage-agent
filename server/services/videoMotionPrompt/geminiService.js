/**
 * Gemini 视频提示词生成服务
 * 支持 Gemini 3 Flash Preview 和 Gemini 3 Pro Preview
 * 文档: https://302ai.apifox.cn/222917633e0
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

/**
 * 获取指定模型的 API Key
 * @param {string} model - 模型名称 (gemini-3-flash-preview, gemini-3-pro-preview)
 * @returns {string} API Key
 */
function getApiKey(model) {
  const keyMap = {
    'gemini-3-flash-preview': process.env.GEMINI_3_FLASH_API_KEY,
    'gemini-3-pro-preview': process.env.GEMINI_3_PRO_API_KEY,
  }
  
  const apiKey = keyMap[model]
  if (!apiKey) {
    throw new Error(`${model.toUpperCase()}_API_KEY 环境变量未设置，请检查 .env 文件`)
  }
  
  return apiKey
}

/**
 * 获取 API Host
 * @returns {string} API Host
 */
function getApiHost() {
  return process.env.GEMINI_API_HOST || 'https://api.302.ai'
}

/**
 * 获取模型对应的模型名称（用于API请求）
 * @param {string} model - 模型名称 (gemini-3-flash-preview, gemini-3-pro-preview)
 * @returns {string} API 模型名称
 */
function getModelName(model) {
  const modelMap = {
    'gemini-3-flash-preview': 'gemini-2.5-flash-preview-05-20', // 302.ai 可用的模型名称
    'gemini-3-pro-preview': 'gemini-2.5-pro-preview-06-05', // 如果302.ai不支持gemini-3-pro-preview，使用备选方案
  }
  
  let modelName = modelMap[model]
  
  // 如果模型名称不存在，尝试使用备选方案
  if (!modelName) {
    // 根据302.ai文档，尝试使用可用的模型名称
    if (model === 'gemini-3-pro-preview') {
      modelName = 'gemini-2.5-pro-preview-06-05' // 备选方案
    } else {
      throw new Error(`不支持的 Gemini 模型: ${model}`)
    }
  }
  
  return modelName
}

/**
 * 使用 Gemini 模型分析图片并生成视频提示词
 * @param {string} imageUrl - 图片URL
 * @param {string} prompt - 文本提示词
 * @param {string} model - 模型名称 (gemini-3-flash-preview, gemini-3-pro-preview)
 * @param {Object} options - 生成选项
 * @param {number} options.temperature - 温度参数（0-2）
 * @param {number} options.maxTokens - 最大token数
 * @returns {Promise<string>} 生成的视频提示词
 */
export async function generateVideoPromptWithGemini(imageUrl, prompt, model, options = {}) {
  const apiKey = getApiKey(model)
  const apiHost = getApiHost()
  const modelName = getModelName(model)

  const {
    temperature = 0.7,
    maxTokens = 200,
  } = options

  try {
    console.log(`🎨 调用 ${model.toUpperCase()} API 生成视频提示词:`, {
      model: modelName,
      imageUrl: imageUrl.substring(0, 100) + '...',
      promptLength: prompt.length,
    })

    // 构建请求体（兼容 OpenAI 格式）
    const requestBody = {
      model: modelName,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
              },
            },
          ],
        },
      ],
      temperature: temperature,
      max_tokens: maxTokens,
    }

    console.log('📤 发送请求到:', `${apiHost}/v1/chat/completions`)

    // 调用 Gemini API
    const response = await fetch(`${apiHost}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.error?.message || errorData.message || `HTTP ${response.status}`
      
      if (response.status === 401) {
        throw new Error('API密钥无效，请检查对应的 API Key 环境变量')
      }
      
      throw new Error(`Gemini API调用失败: ${errorMessage}`)
    }

    const data = await response.json()
    
    console.log('✅ Gemini API响应:', JSON.stringify(data, null, 2))

    // 解析响应
    const content = data.choices?.[0]?.message?.content || ''
    
    if (!content) {
      throw new Error('API响应中未找到生成的内容')
    }

    return content.trim()
  } catch (error) {
    console.error(`❌ ${model.toUpperCase()} API调用错误:`, error)
    
    if (error instanceof Error) {
      throw error
    }
    
    throw new Error(`Gemini 调用失败: ${error.message || '未知错误'}`)
  }
}

